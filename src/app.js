import express from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { query, withTransaction } from './db.js';
import {
  signToken,
  authenticate,
  requireRole,
  loginLimiter,
  loginRateLimitMiddleware,
  registerUser,
} from './auth.js';
import {
  postMovement,
  getExternalAccountId,
  getTransactionById,
  getTransactions,
  getLedgerEntries,
  getLedgerByTransactionId,
} from './ledger.js';
import {
  getAccountStatement,
  verifySystemIntegrity,
  getDuplicateReplays,
  recordAuditLog,
  getAuditLogs,
  getAuditLogById,
} from './audit.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Security: Enforce request size limit (15. Security Requirements)
app.use(express.json({ limit: '50kb' }));

// Security Headers Middleware (Helmet-equivalent standard headers)
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('Content-Security-Policy', "default-src 'self'");
  // Safe CORS configuration
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Idempotency-Key');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

// Serve static vanilla HTML/CSS/JS frontend from public/
const publicDir = path.resolve(__dirname, '../public');
app.use(express.static(publicDir));

// -------------------------------------------------------------------------
// SYSTEM HEALTH
// -------------------------------------------------------------------------

/**
 * GET /api/health
 * Returns DB liveness and system invariant declarations.
 */
app.get(['/api/health', '/health'], async (req, res) => {
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
 * User registration handler.
 * POST /api/auth/register, /auth/register
 */
const handleRegister = async (req, res, next) => {
  const { email, password, name, role } = req.body || {};
  try {
    const result = await registerUser({
      email,
      password,
      name,
      role,
      creator: req.user || null,
    });

    if (result.error) {
      await recordAuditLog({
        actorId: req.user?.id || null,
        action: 'AUTH_REGISTER_FAILED',
        resource: 'users',
        outcome: 'FAILURE',
        metadata: { email, reason: result.error, code: result.code },
        ipAddress: req.ip,
      });
      return res.status(result.status).json({
        error: result.error,
        code: result.code,
      });
    }

    const token = signToken(result.user);

    await recordAuditLog({
      actorId: result.user.id,
      action: 'AUTH_REGISTER_SUCCESS',
      resource: `users/${result.user.id}`,
      outcome: 'SUCCESS',
      metadata: { email: result.user.email, role: result.user.role },
      ipAddress: req.ip,
    });

    return res.status(201).json({
      user: result.user,
      token,
    });
  } catch (error) {
    next(error);
  }
};

app.post(['/api/auth/register', '/auth/register'], handleRegister);

/**
 * User login handler.
 * POST /api/auth/login, /auth/login
 */
const handleLogin = async (req, res, next) => {
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
      await recordAuditLog({
        action: 'AUTH_LOGIN_FAILED',
        resource: 'users',
        outcome: 'FAILURE',
        metadata: { email: cleanEmail, reason: 'User not found' },
        ipAddress: req.ip,
      });
      return res.status(401).json({
        error: 'Invalid email or password.',
        code: 'INVALID_CREDENTIALS',
      });
    }

    const user = userRes.rows[0];
    const passwordValid = bcrypt.compareSync(password, user.password_hash);

    if (!passwordValid) {
      loginLimiter.recordAttempt(req.rateLimitKey);
      await recordAuditLog({
        actorId: user.id,
        action: 'AUTH_LOGIN_FAILED',
        resource: `users/${user.id}`,
        outcome: 'FAILURE',
        metadata: { email: cleanEmail, reason: 'Password mismatch' },
        ipAddress: req.ip,
      });
      return res.status(401).json({
        error: 'Invalid email or password.',
        code: 'INVALID_CREDENTIALS',
      });
    }

    // Reset rate limiter on successful authentication
    loginLimiter.reset(req.rateLimitKey);

    const token = signToken(user);

    await recordAuditLog({
      actorId: user.id,
      action: 'AUTH_LOGIN_SUCCESS',
      resource: `users/${user.id}`,
      outcome: 'SUCCESS',
      metadata: { email: user.email, role: user.role },
      ipAddress: req.ip,
    });

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
};

app.post(['/api/auth/login', '/auth/login'], loginRateLimitMiddleware, handleLogin);

/**
 * Logout handler.
 * POST /api/auth/logout, /auth/logout
 */
const handleLogout = async (req, res) => {
  if (req.user) {
    await recordAuditLog({
      actorId: req.user.id,
      action: 'AUTH_LOGOUT',
      resource: `users/${req.user.id}`,
      outcome: 'SUCCESS',
      ipAddress: req.ip,
    });
  }
  return res.status(200).json({
    message: 'Successfully logged out.',
  });
};

app.post(['/api/auth/logout', '/auth/logout'], handleLogout);

/**
 * GET /api/auth/me, /auth/me
 * Retrieves current authenticated user profile from DB.
 */
app.get(['/api/auth/me', '/auth/me'], authenticate, (req, res) => {
  return res.status(200).json({
    user: req.user,
  });
});

// -------------------------------------------------------------------------
// ACCOUNTS ROUTES
// -------------------------------------------------------------------------

/**
 * GET /api/accounts, /accounts
 * Lists accounts based on caller role:
 * - Admin & Auditor: view all accounts
 * - Holder: view own accounts only
 */
app.get(['/api/accounts', '/accounts'], authenticate, async (req, res, next) => {
  try {
    let accountsRes;

    if (req.user.role === 'admin' || req.user.role === 'auditor') {
      accountsRes = await query(`
        SELECT a.id, a.account_no, a.owner_id, u.email as owner_email,
               a.name, a.balance_paise, a.status, a.is_external, a.created_at
        FROM accounts a
        LEFT JOIN users u ON a.owner_id = u.id
        ORDER BY a.id ASC
      `);
    } else {
      accountsRes = await query(
        `
        SELECT a.id, a.account_no, a.owner_id, a.name, a.balance_paise,
               a.status, a.is_external, a.created_at
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
 * POST /api/accounts, /accounts
 * Creates a new account. Admin role required.
 * Initial balances are funded through a recorded double-entry opening entry.
 */
app.post(['/api/accounts', '/accounts'], authenticate, requireRole('admin'), async (req, res, next) => {
  const { name, owner_id, initial_balance_paise, initial_balance } = req.body || {};

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
    const rawOpening = initial_balance_paise ?? initial_balance;
    const openingPaise = rawOpening !== undefined && rawOpening !== null ? Number(rawOpening) : 0;

    const newAccount = await withTransaction(async (txClient) => {
      const insRes = await txClient.query(
        `INSERT INTO accounts (account_no, owner_id, name, balance_paise, status, is_external)
         VALUES ($1, $2, $3, 0, 'ACTIVE', FALSE)
         RETURNING id, account_no, owner_id, name, balance_paise, status, is_external, created_at`,
        [accountNo, parsedOwnerId, name.trim()]
      );

      const createdAccount = insRes.rows[0];

      // Audit log account creation within same transaction
      await recordAuditLog(
        {
          actorId: req.user.id,
          action: 'ACCOUNT_CREATE',
          resource: `accounts/${createdAccount.id}`,
          outcome: 'SUCCESS',
          metadata: { accountNo: createdAccount.account_no, ownerId: parsedOwnerId, name: createdAccount.name },
          ipAddress: req.ip,
        },
        txClient
      );

      // Post opening amount through postMovement logic in ONE transaction using unique internal key
      if (openingPaise > 0) {
        const extId = await getExternalAccountId(txClient);
        const openKey = req.headers['idempotency-key'] || `opening-dep-${createdAccount.id}-${crypto.randomUUID()}`;
        const moveResult = await postMovement({
          kind: 'deposit',
          fromAccountId: extId,
          toAccountId: createdAccount.id,
          amount: openingPaise,
          key: openKey,
          user: req.user,
          body: { account_id: createdAccount.id, amount: openingPaise },
          dbClient: txClient,
        });

        if (moveResult.status !== 200 || !moveResult.body?.to_account) {
          const err = new Error(moveResult.body?.error || 'Failed to deposit opening balance');
          err.status = moveResult.status || 400;
          err.code = moveResult.body?.code || 'OPENING_BALANCE_FAILED';
          throw err;
        }

        createdAccount.balance_paise = moveResult.body.to_account.balance_after_paise;
      }

      return createdAccount;
    });

    return res.status(201).json({
      account: newAccount,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/accounts/:id, /accounts/:id
 * Fetches account details.
 * Authorized for: Account Owner, Admin, Auditor.
 */
app.get(['/api/accounts/:id', '/accounts/:id'], authenticate, async (req, res, next) => {
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
              a.name, a.balance_paise, a.status, a.is_external, a.created_at
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

/**
 * GET /api/accounts/:id/balance, /accounts/:id/balance
 * Returns real-time settled balance and status for an authorized account.
 */
app.get(['/api/accounts/:id/balance', '/accounts/:id/balance'], authenticate, async (req, res, next) => {
  const accountId = parseInt(req.params.id, 10);
  if (isNaN(accountId) || accountId <= 0) {
    return res.status(400).json({
      error: 'Invalid account id parameter.',
      code: 'INVALID_ID',
    });
  }

  try {
    const accRes = await query(
      'SELECT id, account_no, owner_id, balance_paise, status, is_external FROM accounts WHERE id = $1',
      [accountId]
    );

    if (accRes.rowCount === 0) {
      return res.status(404).json({
        error: 'Account not found.',
        code: 'NOT_FOUND',
      });
    }

    const account = accRes.rows[0];

    // Ownership check
    if (req.user.role === 'holder' && account.owner_id !== req.user.id) {
      return res.status(403).json({
        error: 'Access denied: you do not own this account.',
        code: 'FORBIDDEN',
      });
    }

    return res.status(200).json({
      account: {
        id: account.id,
        account_no: account.account_no,
        balance_paise: Number(account.balance_paise),
        status: account.status,
        is_external: account.is_external,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/accounts/:id/status, /accounts/:id/status
 * Manages account lifecycle state (ACTIVE, FROZEN, CLOSED). Admin role required.
 */
app.patch(['/api/accounts/:id/status', '/accounts/:id/status'], authenticate, requireRole('admin'), async (req, res, next) => {
  const accountId = parseInt(req.params.id, 10);
  const { status } = req.body || {};

  if (isNaN(accountId) || accountId <= 0) {
    return res.status(400).json({
      error: 'Invalid account id parameter.',
      code: 'INVALID_ID',
    });
  }

  const cleanStatus = status && typeof status === 'string' ? status.trim().toUpperCase() : null;
  if (!cleanStatus || !['ACTIVE', 'FROZEN', 'CLOSED'].includes(cleanStatus)) {
    return res.status(400).json({
      error: "Status must be one of: 'ACTIVE', 'FROZEN', 'CLOSED'.",
      code: 'INVALID_STATUS',
    });
  }

  try {
    const accRes = await query('SELECT id, account_no, status, is_external FROM accounts WHERE id = $1', [accountId]);
    if (accRes.rowCount === 0) {
      return res.status(404).json({
        error: 'Account not found.',
        code: 'NOT_FOUND',
      });
    }

    const currentAccount = accRes.rows[0];
    if (currentAccount.is_external) {
      return res.status(400).json({
        error: 'Status of the external clearing account cannot be modified.',
        code: 'INVALID_OPERATION',
      });
    }

    const oldStatus = currentAccount.status;
    const updRes = await query(
      'UPDATE accounts SET status = $1 WHERE id = $2 RETURNING id, account_no, owner_id, name, balance_paise, status, created_at',
      [cleanStatus, accountId]
    );

    await recordAuditLog({
      actorId: req.user.id,
      action: 'ACCOUNT_STATUS_CHANGE',
      resource: `accounts/${accountId}`,
      outcome: 'SUCCESS',
      metadata: { oldStatus, newStatus: cleanStatus, accountNo: currentAccount.account_no },
      ipAddress: req.ip,
    });

    return res.status(200).json({
      account: updRes.rows[0],
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/accounts/:id/statement, /accounts/:id/statement
 * Retrieves account transaction journal history.
 */
app.get(['/api/accounts/:id/statement', '/accounts/:id/statement'], authenticate, async (req, res, next) => {
  const accountId = parseInt(req.params.id, 10);
  if (isNaN(accountId) || accountId <= 0) {
    return res.status(400).json({
      error: 'Invalid account ID parameter.',
      code: 'INVALID_ID',
    });
  }

  try {
    const accRes = await query('SELECT id, owner_id FROM accounts WHERE id = $1', [accountId]);
    if (accRes.rowCount === 0) {
      return res.status(404).json({
        error: 'Account not found.',
        code: 'NOT_FOUND',
      });
    }

    const account = accRes.rows[0];
    if (req.user.role === 'holder' && account.owner_id !== req.user.id) {
      return res.status(403).json({
        error: 'Access denied: you do not have permission to view this account statement.',
        code: 'FORBIDDEN',
      });
    }

    const { limit, offset, order } = req.query;
    const result = await getAccountStatement(accountId, { limit, offset, order });

    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
});

// -------------------------------------------------------------------------
// MONEY MOVEMENT ROUTES
// -------------------------------------------------------------------------

/**
 * Deposit handler.
 * POST /api/transactions/deposit, /deposits
 */
const handleDeposit = async (req, res, next) => {
  const key = req.headers['idempotency-key'];
  const { account_id, account_no, amount } = req.body || {};

  try {
    const extId = await getExternalAccountId();
    let targetAccountId = account_id;

    if (!targetAccountId && account_no) {
      const accRes = await query('SELECT id FROM accounts WHERE account_no = $1', [account_no]);
      if (accRes.rowCount === 0) {
        return res.status(404).json({
          error: `Target account ${account_no} not found.`,
          code: 'ACCOUNT_NOT_FOUND',
        });
      }
      targetAccountId = accRes.rows[0].id;
    }

    const result = await postMovement({
      kind: 'deposit',
      fromAccountId: extId,
      toAccountId: targetAccountId,
      amount,
      key,
      user: req.user,
      body: req.body,
    });

    if (result.isReplay) {
      res.setHeader('Idempotent-Replay', 'true');
    }

    return res.status(result.status).json(result.body);
  } catch (error) {
    next(error);
  }
};

app.post(['/api/transactions/deposit', '/deposits'], authenticate, handleDeposit);

/**
 * Withdrawal handler.
 * POST /api/transactions/withdraw, /withdrawals
 */
const handleWithdrawal = async (req, res, next) => {
  const key = req.headers['idempotency-key'];
  const { account_id, amount } = req.body || {};

  try {
    const extId = await getExternalAccountId();

    const result = await postMovement({
      kind: 'withdrawal',
      fromAccountId: account_id,
      toAccountId: extId,
      amount,
      key,
      user: req.user,
      body: req.body,
    });

    if (result.isReplay) {
      res.setHeader('Idempotent-Replay', 'true');
    }

    return res.status(result.status).json(result.body);
  } catch (error) {
    next(error);
  }
};

app.post(['/api/transactions/withdraw', '/withdrawals'], authenticate, handleWithdrawal);

/**
 * Transfer handler.
 * POST /api/transactions/transfer, /transfers
 */
const handleTransfer = async (req, res, next) => {
  const key = req.headers['idempotency-key'];
  const { from_account_id, to_account_id, to_account_no, amount } = req.body || {};

  try {
    let resolvedToId = to_account_id;

    if (!resolvedToId && to_account_no) {
      const targetRes = await query('SELECT id FROM accounts WHERE account_no = $1', [to_account_no.trim()]);
      if (targetRes.rowCount === 0) {
        return res.status(404).json({
          error: `Recipient account ${to_account_no} not found.`,
          code: 'RECIPIENT_NOT_FOUND',
        });
      }
      resolvedToId = targetRes.rows[0].id;
    }

    const result = await postMovement({
      kind: 'transfer',
      fromAccountId: from_account_id,
      toAccountId: resolvedToId,
      amount,
      key,
      user: req.user,
      body: req.body,
    });

    if (result.isReplay) {
      res.setHeader('Idempotent-Replay', 'true');
    }

    return res.status(result.status).json(result.body);
  } catch (error) {
    next(error);
  }
};

app.post(['/api/transactions/transfer', '/transfers'], authenticate, handleTransfer);

/**
 * GET /api/transactions, /transactions
 * Lists transactions with filters and role scoping.
 */
app.get(['/api/transactions', '/transactions'], authenticate, async (req, res, next) => {
  try {
    const { limit, offset, account_id, type, status } = req.query;
    const result = await getTransactions({
      limit,
      offset,
      accountId: account_id,
      type,
      status,
      user: req.user,
    });
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/transactions/:id, /transactions/:id
 * Fetches transaction details and associated ledger journal entries.
 */
app.get(['/api/transactions/:id', '/transactions/:id'], authenticate, async (req, res, next) => {
  try {
    const result = await getTransactionById(req.params.id, req.user);
    if (!result) {
      return res.status(404).json({
        error: 'Transaction not found.',
        code: 'NOT_FOUND',
      });
    }
    if (result.forbidden) {
      return res.status(403).json({
        error: 'Access denied: you do not own the accounts in this transaction.',
        code: 'FORBIDDEN',
      });
    }
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
});

// -------------------------------------------------------------------------
// LEDGER ROUTES
// -------------------------------------------------------------------------

/**
 * GET /api/ledger, /ledger
 * Queries raw ledger entries with pagination and role scoping.
 */
app.get(['/api/ledger', '/ledger'], authenticate, async (req, res, next) => {
  try {
    const { limit, offset, account_id, txn_id } = req.query;
    const result = await getLedgerEntries({
      limit,
      offset,
      accountId: account_id,
      txnId: txn_id,
      user: req.user,
    });
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/ledger/verify, /audit/verify
 * Recomputes hash chains and verifies zero-sum balance reconciliation.
 */
app.get(['/api/ledger/verify', '/audit/verify'], authenticate, requireRole('admin', 'auditor'), async (req, res, next) => {
  try {
    const report = await verifySystemIntegrity();
    return res.status(200).json(report);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/ledger/:transactionId, /ledger/:transactionId
 * Fetches ledger journal entries for a specific transaction ID.
 */
app.get(['/api/ledger/:transactionId', '/ledger/:transactionId'], authenticate, async (req, res, next) => {
  try {
    const result = await getLedgerByTransactionId(req.params.transactionId, req.user);
    if (!result) {
      return res.status(404).json({
        error: 'Ledger entries for transaction not found.',
        code: 'NOT_FOUND',
      });
    }
    if (result.forbidden) {
      return res.status(403).json({
        error: 'Access denied: you do not have permission to view ledger entries for this transaction.',
        code: 'FORBIDDEN',
      });
    }
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
});

// -------------------------------------------------------------------------
// AUDIT LOG ROUTES
// -------------------------------------------------------------------------

/**
 * GET /api/audit, /audit
 * Paginated security and business audit logs. Authorized for Admin & Auditor.
 */
app.get(['/api/audit', '/audit'], authenticate, requireRole('admin', 'auditor'), async (req, res, next) => {
  try {
    const { limit, offset, action, outcome, actor_id } = req.query;
    const result = await getAuditLogs({
      limit,
      offset,
      action,
      outcome,
      actorId: actor_id,
    });
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/audit/duplicates, /audit/duplicates
 * Lists duplicate replay attempts.
 */
app.get(['/api/audit/duplicates', '/audit/duplicates'], authenticate, requireRole('admin', 'auditor'), async (req, res, next) => {
  try {
    const { limit, offset } = req.query;
    const result = await getDuplicateReplays({ limit, offset });
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/audit/:id, /audit/:id
 * Retrieve a specific audit log by ID.
 */
app.get(['/api/audit/:id', '/audit/:id'], authenticate, requireRole('admin', 'auditor'), async (req, res, next) => {
  try {
    const log = await getAuditLogById(req.params.id);
    if (!log) {
      return res.status(404).json({
        error: 'Audit log not found.',
        code: 'NOT_FOUND',
      });
    }
    return res.status(200).json({
      audit_log: log,
    });
  } catch (error) {
    next(error);
  }
});

// -------------------------------------------------------------------------
// ADMIN ROUTES
// -------------------------------------------------------------------------

/**
 * GET /api/admin/users, /admin/users
 * Lists all users with pagination. Admin only.
 */
app.get(['/api/admin/users', '/admin/users'], authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const { limit = 50, offset = 0 } = req.query;
    const parsedLimit = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 100);
    const parsedOffset = Math.max(parseInt(offset, 10) || 0, 0);

    const countRes = await query('SELECT COUNT(*) FROM users');
    const total = parseInt(countRes.rows[0].count, 10);

    const usersRes = await query(
      `SELECT id, email, role, name, created_at
       FROM users
       ORDER BY id ASC
       LIMIT $1 OFFSET $2`,
      [parsedLimit, parsedOffset]
    );

    return res.status(200).json({
      users: usersRes.rows,
      pagination: {
        total,
        limit: parsedLimit,
        offset: parsedOffset,
        pages: Math.ceil(total / parsedLimit),
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/admin/overview, /admin/overview
 * System-wide overview of accounts, reserves, transaction volumes, and health.
 */
app.get(['/api/admin/overview', '/admin/overview'], authenticate, requireRole('admin', 'auditor'), async (req, res, next) => {
  try {
    const userCountRes = await query('SELECT COUNT(*) FROM users');
    const accStatsRes = await query(`
      SELECT 
        COUNT(*) as total_accounts,
        COUNT(*) FILTER (WHERE status = 'ACTIVE' AND NOT is_external) as active_accounts,
        COUNT(*) FILTER (WHERE status = 'FROZEN' AND NOT is_external) as frozen_accounts,
        COUNT(*) FILTER (WHERE status = 'CLOSED' AND NOT is_external) as closed_accounts,
        COALESCE(SUM(balance_paise) FILTER (WHERE NOT is_external), 0) as total_customer_deposits_paise,
        COALESCE(SUM(balance_paise) FILTER (WHERE is_external), 0) as external_clearing_balance_paise
      FROM accounts
    `);
    const txnCountRes = await query(`
      SELECT 
        COUNT(*) as total_transactions,
        COUNT(*) FILTER (WHERE status = 'completed') as completed_transactions,
        COUNT(*) FILTER (WHERE status = 'refused') as refused_transactions,
        COALESCE(SUM(amount_paise) FILTER (WHERE status = 'completed'), 0) as total_volume_paise
      FROM transactions
    `);
    const integrity = await verifySystemIntegrity();

    return res.status(200).json({
      overview: {
        users: {
          total: parseInt(userCountRes.rows[0].count, 10),
        },
        accounts: {
          total: parseInt(accStatsRes.rows[0].total_accounts, 10),
          active: parseInt(accStatsRes.rows[0].active_accounts, 10),
          frozen: parseInt(accStatsRes.rows[0].frozen_accounts, 10),
          closed: parseInt(accStatsRes.rows[0].closed_accounts, 10),
          customer_deposits_paise: Number(accStatsRes.rows[0].total_customer_deposits_paise),
          external_clearing_paise: Number(accStatsRes.rows[0].external_clearing_balance_paise),
        },
        transactions: {
          total: parseInt(txnCountRes.rows[0].total_transactions, 10),
          completed: parseInt(txnCountRes.rows[0].completed_transactions, 10),
          refused: parseInt(txnCountRes.rows[0].refused_transactions, 10),
          volume_paise: Number(txnCountRes.rows[0].total_volume_paise),
        },
        system_integrity: {
          verified: integrity.verified,
          global_conservation: integrity.checks.global_conservation.status,
          hash_chain: integrity.checks.hash_chain.status,
          balance_reconciliation: integrity.checks.balance_reconciliation.status,
        },
      },
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
