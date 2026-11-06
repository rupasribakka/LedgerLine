import express from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { query } from './db.js';
import {
  signToken,
  authenticate,
  requireRole,
  loginLimiter,
  loginRateLimitMiddleware,
} from './auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(express.json());

// Serve static vanilla HTML/CSS/JS frontend from public/
const publicDir = path.resolve(__dirname, '../public');
app.use(express.static(publicDir));

// System Health Probe Endpoint
app.get('/api/health', async (req, res) => {
  try {
    const dbRes = await query('SELECT NOW() as current_time');
    res.status(200).json({
      status: 'UP',
      service: 'LedgerLine Core Financial API',
      timestamp: dbRes.rows[0].current_time,
      invariants: {
        currencyPrecision: 'integer_paise',
        doubleEntryEnforced: true,
        rowLockingStrategy: 'pessimistic_select_for_update',
        idempotencyEnforced: true,
        aiAutonomousApproval: false,
      },
    });
  } catch (err) {
    res.status(503).json({
      status: 'DOWN',
      error: 'Database connection failed',
      code: 'DB_UNAVAILABLE',
    });
  }
});

// -------------------------------------------------------------------------
// AUTHENTICATION ROUTES
// -------------------------------------------------------------------------

/**
 * POST /auth/login
 * User login with rate limiting & bcrypt verification.
 */
app.post('/auth/login', loginRateLimitMiddleware, async (req, res, next) => {
  const { email, password } = req.body || {};

  if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
    return res.status(400).json({
      error: 'Email and password are required strings.',
      code: 'INVALID_INPUT',
    });
  }

  try {
    const cleanEmail = email.trim().toLowerCase();
    const userRes = await query('SELECT id, email, password_hash, role FROM users WHERE email = $1', [
      cleanEmail,
    ]);

    if (userRes.rowCount === 0) {
      loginLimiter.recordAttempt(req.rateLimitKey);
      return res.status(401).json({
        error: 'Invalid email or password.',
        code: 'INVALID_CREDENTIALS',
      });
    }

    const user = userRes.rows[0];
    const passwordValid = bcrypt.compareSync(password, user.password_hash);

    if (!passwordValid) {
      loginLimiter.recordAttempt(req.rateLimitKey);
      return res.status(401).json({
        error: 'Invalid email or password.',
        code: 'INVALID_CREDENTIALS',
      });
    }

    // Reset rate limiter on successful authentication
    loginLimiter.reset(req.rateLimitKey);

    const token = signToken(user);

    return res.status(200).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /auth/me
 * Retrieves current authenticated user profile from DB.
 */
app.get('/auth/me', authenticate, (req, res) => {
  return res.status(200).json({
    user: req.user,
  });
});

// -------------------------------------------------------------------------
// ACCOUNTS ROUTES
// -------------------------------------------------------------------------

/**
 * GET /accounts
 * Lists accounts based on caller role:
 * - Admin & Auditor: view all accounts
 * - Holder: view own accounts only
 */
app.get('/accounts', authenticate, async (req, res, next) => {
  try {
    let accountsRes;

    if (req.user.role === 'admin' || req.user.role === 'auditor') {
      accountsRes = await query(`
        SELECT a.id, a.account_no, a.owner_id, u.email as owner_email,
               a.name, a.balance_paise, a.is_external, a.created_at
        FROM accounts a
        LEFT JOIN users u ON a.owner_id = u.id
        ORDER BY a.id ASC
      `);
    } else {
      accountsRes = await query(
        `
        SELECT a.id, a.account_no, a.owner_id, a.name, a.balance_paise,
               a.is_external, a.created_at
        FROM accounts a
        WHERE a.owner_id = $1
        ORDER BY a.id ASC
      `,
        [req.user.id]
      );
    }

    return res.status(200).json({
      accounts: accountsRes.rows,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /accounts
 * Creates a new account. Admin role required.
 */
app.post('/accounts', authenticate, requireRole('admin'), async (req, res, next) => {
  const { name, owner_id } = req.body || {};

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return res.status(400).json({
      error: 'Account name is required.',
      code: 'INVALID_INPUT',
    });
  }

  const parsedOwnerId = parseInt(owner_id, 10);
  if (isNaN(parsedOwnerId) || parsedOwnerId <= 0) {
    return res.status(400).json({
      error: 'Valid owner_id integer is required.',
      code: 'INVALID_INPUT',
    });
  }

  try {
    // Verify owner user exists and is an account holder
    const ownerRes = await query('SELECT id, role, email FROM users WHERE id = $1', [parsedOwnerId]);
    if (ownerRes.rowCount === 0) {
      return res.status(404).json({
        error: `User with id ${parsedOwnerId} not found.`,
        code: 'USER_NOT_FOUND',
      });
    }

    if (ownerRes.rows[0].role !== 'holder') {
      return res.status(400).json({
        error: `Account owner must have role 'holder'. Target user has role '${ownerRes.rows[0].role}'.`,
        code: 'INVALID_ROLE',
      });
    }

    const uniqueSuffix = crypto.randomBytes(3).toString('hex').toUpperCase();
    const accountNo = `ACC-H${parsedOwnerId}-${uniqueSuffix}`;

    const insRes = await query(
      `INSERT INTO accounts (account_no, owner_id, name, balance_paise, is_external)
       VALUES ($1, $2, $3, 0, FALSE)
       RETURNING id, account_no, owner_id, name, balance_paise, is_external, created_at`,
      [accountNo, parsedOwnerId, name.trim()]
    );

    return res.status(201).json({
      account: insRes.rows[0],
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /accounts/:id
 * Fetches account details.
 * Authorized for: Account Owner, Admin, Auditor.
 */
app.get('/accounts/:id', authenticate, async (req, res, next) => {
  const accountId = parseInt(req.params.id, 10);
  if (isNaN(accountId) || accountId <= 0) {
    return res.status(400).json({
      error: 'Invalid account id parameter.',
      code: 'INVALID_ID',
    });
  }

  try {
    const accRes = await query(
      `SELECT a.id, a.account_no, a.owner_id, u.email as owner_email,
              a.name, a.balance_paise, a.is_external, a.created_at
       FROM accounts a
       LEFT JOIN users u ON a.owner_id = u.id
       WHERE a.id = $1`,
      [accountId]
    );

    if (accRes.rowCount === 0) {
      return res.status(404).json({
        error: 'Account not found.',
        code: 'NOT_FOUND',
      });
    }

    const account = accRes.rows[0];

    // Authorization check
    if (req.user.role === 'holder') {
      if (account.owner_id !== req.user.id) {
        return res.status(403).json({
          error: 'Access denied: you do not own this account.',
          code: 'FORBIDDEN',
        });
      }
    }

    return res.status(200).json({
      account,
    });
  } catch (error) {
    next(error);
  }
});

// -------------------------------------------------------------------------
// CENTRALIZED ERROR HANDLING (Hard Rule 11)
// -------------------------------------------------------------------------
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  // Hard Rule 11: Never leak stack traces or internal SQL in error responses
  const statusCode = err.status || err.statusCode || 500;
  const code = err.code && typeof err.code === 'string' ? err.code : 'INTERNAL_SERVER_ERROR';
  const message = err.message && statusCode < 500 ? err.message : 'An unexpected server error occurred.';

  res.status(statusCode).json({
    error: message,
    code,
  });
});

export default app;
