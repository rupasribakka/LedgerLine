import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { query } from './db.js';
import { getJwtSecret } from './config.js';

dotenv.config();

export function normalizeRole(role) {
  if (!role || typeof role !== 'string') return '';
  const r = role.trim().toLowerCase();
  if (r === 'account_holder') return 'holder';
  return r;
}

const JWT_SECRET = getJwtSecret();
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
  const normalizedAllowed = allowedRoles.map(normalizeRole);
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required.',
        code: 'UNAUTHORIZED',
      });
    }

    const userRole = normalizeRole(req.user.role);
    if (!normalizedAllowed.includes(userRole)) {
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

  const userRole = normalizeRole(user.role);

  // Auditor is strictly read-only on everything
  if (userRole === 'auditor') {
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
  if (userRole === 'admin') {
    return { allowed: true, account };
  }

  // Account Holder can only move funds from accounts they own
  if (userRole === 'holder') {
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
 * Register a new user in the system.
 * By default creates 'holder' role. Role escalation to admin/auditor is rejected
 * unless created by an authenticated admin.
 */
export async function registerUser({ email, password, name, role = 'holder', creator = null }) {
  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return { error: 'Valid email address is required.', code: 'INVALID_EMAIL', status: 400 };
  }

  if (!password || typeof password !== 'string' || password.length < 8) {
    return {
      error: 'Password must be at least 8 characters long.',
      code: 'WEAK_PASSWORD',
      status: 400,
    };
  }

  const cleanEmail = email.trim().toLowerCase();
  const cleanName = (name && typeof name === 'string' && name.trim()) || 'Account User';
  const targetRole = normalizeRole(role) || 'holder';

  if (!['admin', 'holder', 'auditor'].includes(targetRole)) {
    return { error: `Invalid role: ${role}. Valid roles are admin, holder, auditor.`, code: 'INVALID_ROLE', status: 400 };
  }

  // Prevent unauthenticated or non-admin callers from creating admin or auditor users
  if ((targetRole === 'admin' || targetRole === 'auditor') && (!creator || normalizeRole(creator.role) !== 'admin')) {
    return {
      error: 'Only administrators can create users with admin or auditor privileges.',
      code: 'UNAUTHORIZED_ROLE_ESCALATION',
      status: 403,
    };
  }

  const existingRes = await query('SELECT id FROM users WHERE email = $1', [cleanEmail]);
  if (existingRes.rowCount > 0) {
    return {
      error: 'A user with this email address already exists.',
      code: 'EMAIL_ALREADY_EXISTS',
      status: 409,
    };
  }

  const passwordHash = bcrypt.hashSync(password, 10);
  const insertRes = await query(
    'INSERT INTO users (email, password_hash, role, name) VALUES ($1, $2, $3, $4) RETURNING id, email, role, name, created_at',
    [cleanEmail, passwordHash, targetRole, cleanName]
  );

  return { user: insertRes.rows[0], status: 201 };
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
