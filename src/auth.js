import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { query } from './db.js';

dotenv.config();

// Crash immediately if JWT_SECRET is missing from environment
if (!process.env.JWT_SECRET) {
  throw new Error('FATAL: JWT_SECRET environment variable is required.');
}

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = '24h';

/**
 * Generate a signed JWT token.
 * Token carries minimal claims (user id and role).
 */
export function signToken(user) {
  return jwt.sign(
    {
      id: user.id,
      role: user.role,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

/**
 * Authentication Middleware.
 * Hard Rule 9: Authorisation is decided on the server from DB data.
 * JWT only carries user id and role, and the role is re-read from the DB.
 */
export async function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Authentication required. Missing Bearer token.',
      code: 'UNAUTHORIZED',
    });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    // Hard Rule 9: Re-read role and user data fresh from DB
    const userRes = await query('SELECT id, email, role FROM users WHERE id = $1', [decoded.id]);
    if (userRes.rowCount === 0) {
      return res.status(401).json({
        error: 'User session invalid. User not found.',
        code: 'USER_NOT_FOUND',
      });
    }

    req.user = userRes.rows[0];
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Authentication token expired. Please log in again.',
        code: 'TOKEN_EXPIRED',
      });
    }
    return res.status(401).json({
      error: 'Invalid authentication token.',
      code: 'INVALID_TOKEN',
    });
  }
}

/**
 * Middleware to enforce role requirements.
 * Hard Rule 10: Roles: admin, holder, auditor (403 on every write).
 */
export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required.',
        code: 'UNAUTHORIZED',
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Access denied. Requires one of roles: ${allowedRoles.join(', ')}.`,
        code: 'FORBIDDEN',
      });
    }

    next();
  };
}

/**
 * Server-side authorisation helper: canMoveFrom(user, accountId).
 * Hard Rule 9 & 10:
 * - Admin: can withdraw/transfer from any non-external account (and external for deposits)
 * - Holder: withdraw and transfer FROM own accounts only (!is_external && owner_id === user.id)
 * - Auditor: 403 on every write (returns false)
 *
 * @param {object} user - User object with id and role
 * @param {number|string} accountId - Database ID of the source account
 * @param {object} [dbClient] - Optional active db client for use inside transactions
 * @returns {Promise<{ allowed: boolean, account?: object, reason?: string }>}
 */
export async function canMoveFrom(user, accountId, dbClient = null) {
  if (!user) return { allowed: false, reason: 'Unauthenticated user' };

  // Auditor is strictly read-only on everything
  if (user.role === 'auditor') {
    return { allowed: false, reason: 'Auditor role is strictly read-only' };
  }

  const runQuery = dbClient ? dbClient.query.bind(dbClient) : query;
  const res = await runQuery(
    'SELECT id, account_no, owner_id, is_external, balance_paise FROM accounts WHERE id = $1',
    [accountId]
  );

  if (res.rowCount === 0) {
    return { allowed: false, reason: 'Account not found' };
  }

  const account = res.rows[0];

  // Admin has authority over all accounts
  if (user.role === 'admin') {
    return { allowed: true, account };
  }

  // Account Holder can only move funds from accounts they own
  if (user.role === 'holder') {
    if (account.is_external) {
      return { allowed: false, reason: 'Holders cannot move funds from external clearing account' };
    }
    if (account.owner_id !== user.id) {
      return { allowed: false, reason: 'Holder does not own this account' };
    }
    return { allowed: true, account };
  }

  return { allowed: false, reason: 'Unauthorized role' };
}

/**
 * In-memory sliding window rate limiter for login attempts.
 * Protects against brute-force password guessing.
 */
class LoginRateLimiter {
  constructor(windowMs = 60000, maxAttempts = 5) {
    this.windowMs = windowMs;
    this.maxAttempts = maxAttempts;
    this.attempts = new Map();
  }

  isRateLimited(key) {
    const now = Date.now();
    const timestamps = this.attempts.get(key) || [];
    const validTimestamps = timestamps.filter((t) => now - t < this.windowMs);

    if (validTimestamps.length >= this.maxAttempts) {
      this.attempts.set(key, validTimestamps);
      return true;
    }

    return false;
  }

  recordAttempt(key) {
    const now = Date.now();
    const timestamps = this.attempts.get(key) || [];
    timestamps.push(now);
    this.attempts.set(key, timestamps);
  }

  reset(key) {
    this.attempts.delete(key);
  }
}

export const loginLimiter = new LoginRateLimiter(60000, 5);

export function loginRateLimitMiddleware(req, res, next) {
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  const key = `${ip}:${req.body?.email || ''}`;

  if (loginLimiter.isRateLimited(key)) {
    return res.status(429).json({
      error: 'Too many login attempts. Please wait 60 seconds before trying again.',
      code: 'RATE_LIMITED',
    });
  }

  req.rateLimitKey = key;
  next();
}
