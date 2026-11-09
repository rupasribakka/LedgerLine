/**
 * LedgerLine API Client Service
 * 
 * Communicates with the LedgerLine financial backend.
 * Enforces in-memory-only JWT token storage, exact integer paise arithmetic (no floats),
 * robust Idempotency-Key handling, and Idempotent-Replay detection.
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

// JWT and session state kept in memory only (page refresh returns to login)
let inMemoryToken = typeof window !== 'undefined' ? (window.__PRELOADED_TOKEN__ || null) : null;
let inMemoryUser = typeof window !== 'undefined' ? (window.__PRELOADED_USER__ || null) : null;

export function getStoredToken() {
  return inMemoryToken;
}

export function setStoredSession(token, user) {
  inMemoryToken = token || null;
  inMemoryUser = user || null;
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('session_sync'));
  }
}

export function clearStoredSession() {
  inMemoryToken = null;
  inMemoryUser = null;
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('session_sync'));
  }
}

if (typeof window !== 'undefined') {
  window.__SET_MOCK_SESSION__ = (user, token = 'dev-token') => {
    setStoredSession(token, user);
  };
}

export function getStoredUser() {
  return inMemoryUser;
}

/**
 * Generate a cryptographically strong UUID v4 idempotency key
 */
export function generateIdempotencyKey() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Currency conversion helpers
 * Precision rule: 1 Rupee = 100 Paise. All backend operations run strictly in integer paise.
 */
export function formatPaiseToRupees(paise) {
  if (paise === null || paise === undefined) return '₹0.00';
  const num = typeof paise === 'bigint' ? Number(paise) : Number(paise);
  if (isNaN(num)) return '₹0.00';
  const isNegative = num < 0;
  const abs = Math.abs(num);
  const rupeesInt = Math.floor(abs / 100);
  const paiseRem = String(abs % 100).padStart(2, '0');
  const formattedInt = String(rupeesInt).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${isNegative ? '-' : ''}₹${formattedInt}.${paiseRem}`;
}

/**
 * Pure string parsing for monetary inputs.
 * Splits on dot, enforces max 2 decimal places, avoids parseFloat & Math.round.
 * Returns positive integer paise, 0 for zero, or null for invalid input.
 */
export function parseRupeesToPaise(rupeesInput) {
  if (rupeesInput === null || rupeesInput === undefined) return null;
  const str = String(rupeesInput).trim();
  if (!str) return null;

  // Reject negative signs, scientific notation, and non-numeric characters
  if (!/^\d*(\.\d*)?$/.test(str) || str === '.') {
    return null;
  }

  const parts = str.split('.');
  if (parts.length > 2) return null;

  const wholeStr = parts[0] || '0';
  const fracStr = parts.length === 2 ? parts[1] : '';

  // Max 2 decimals allowed
  if (fracStr.length > 2) return null;

  // Pad fraction to 2 digits: "5" -> "50", "" -> "00", "05" -> "05"
  const fracPadded = fracStr.padEnd(2, '0');

  // Verify only digits
  if (!/^\d+$/.test(wholeStr) || !/^\d{2}$/.test(fracPadded)) {
    return null;
  }

  // Combine whole and fraction digits into whole integer paise
  const combined = `${wholeStr}${fracPadded}`.replace(/^0+(?=\d)/, '');
  const paise = Number(combined);

  if (!Number.isSafeInteger(paise) || paise < 0) {
    return null;
  }

  return paise;
}

/**
 * Core HTTP Request Wrapper
 */
async function request(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const headers = {
    'Accept': 'application/json',
    ...(options.headers || {}),
  };

  const token = getStoredToken();
  if (token && !headers['Authorization']) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (options.body && typeof options.body === 'object') {
    headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(options.body);
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    // Detect replay from Idempotent-Replay: true or X-Cache: REPLAY
    const idempHeader = response.headers.get('Idempotent-Replay') || response.headers.get('idempotent-replay');
    const xCacheHeader = response.headers.get('X-Cache') || response.headers.get('x-cache');
    const isReplay = idempHeader === 'true' || xCacheHeader === 'REPLAY';

    let data = null;
    try {
      data = await response.json();
    } catch {
      data = null;
    }

    if (!response.ok) {
      if (response.status === 401) {
        clearStoredSession();
      }
      return {
        ok: false,
        status: response.status,
        error: data?.error || `HTTP error ${response.status}`,
        code: data?.code || 'HTTP_ERROR',
        data,
      };
    }

    return {
      ok: true,
      status: response.status,
      data,
      isReplay,
      headers: {
        idempotentReplay: idempHeader,
        xCache: xCacheHeader,
      },
    };
  } catch (err) {
    return {
      ok: false,
      status: 0,
      error: err.message || 'Network connection failed. Ensure backend server is reachable.',
      code: 'NETWORK_ERROR',
    };
  }
}

/**
 * 1. Health Probe
 */
export async function checkBackendHealth() {
  const startTime = performance.now();
  try {
    const response = await fetch(`${API_BASE_URL}/api/health`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });
    const endTime = performance.now();
    const responseTime = Math.round(endTime - startTime);

    if (!response.ok) {
      return {
        ok: false,
        error: `Server responded with HTTP ${response.status}`,
        responseTime,
      };
    }
    const data = await response.json();
    return {
      ok: true,
      data,
      responseTime,
    };
  } catch (err) {
    const endTime = performance.now();
    return {
      ok: false,
      error: err.message || 'Cannot reach backend server.',
      responseTime: Math.round(endTime - startTime),
    };
  }
}

/**
 * 2. Authentication API (Must send { email, password })
 */
export async function loginUser(email, password) {
  const res = await request('/api/auth/login', {
    method: 'POST',
    body: { email, password },
  });

  if (res.ok && res.data?.token) {
    setStoredSession(res.data.token, res.data.user);
  }
  return res;
}

export async function registerUser({ email, password, name, role = 'holder' }) {
  return await request('/api/auth/register', {
    method: 'POST',
    body: { email, password, name, role },
  });
}

export async function logoutUser() {
  try {
    await request('/api/auth/logout', { method: 'POST' });
  } finally {
    clearStoredSession();
  }
}

/**
 * 3. Accounts API (Fetches real balances from database)
 */
export async function fetchAccounts() {
  return await request('/api/accounts', { method: 'GET' });
}

export async function fetchAccountStatement(accountId) {
  return await request(`/api/accounts/${accountId}/statement`, { method: 'GET' });
}

/**
 * 4. Money Movement API (Strict Idempotency Required)
 */
export async function executeDeposit({ accountId, amountPaise, idempotencyKey }) {
  const key = idempotencyKey || generateIdempotencyKey();
  return await request('/api/deposits', {
    method: 'POST',
    headers: { 'Idempotency-Key': key },
    body: {
      account_id: Number(accountId),
      amount: Number(amountPaise),
    },
  });
}

export async function executeWithdrawal({ accountId, amountPaise, idempotencyKey }) {
  const key = idempotencyKey || generateIdempotencyKey();
  return await request('/api/withdrawals', {
    method: 'POST',
    headers: { 'Idempotency-Key': key },
    body: {
      account_id: Number(accountId),
      amount: Number(amountPaise),
    },
  });
}

export async function executeTransfer({ fromAccountId, toAccountId, amountPaise, idempotencyKey }) {
  const key = idempotencyKey || generateIdempotencyKey();
  return await request('/api/transfers', {
    method: 'POST',
    headers: { 'Idempotency-Key': key },
    body: {
      from_account_id: Number(fromAccountId),
      to_account_id: Number(toAccountId),
      amount: Number(amountPaise),
    },
  });
}

/**
 * 5. Auditor & Verification API (Calls GET /api/ledger/verify)
 */
export async function verifySystemIntegrity() {
  return await request('/api/ledger/verify', { method: 'GET' });
}

export async function fetchAuditLogs() {
  return await request('/api/audit/logs', { method: 'GET' });
}

export async function fetchDuplicateReplays() {
  return await request('/api/audit/duplicates', { method: 'GET' });
}

/**
 * 6. Admin API (Admin Only)
 */
export async function createAccount({ name, ownerId, initialBalancePaise = 0 }) {
  return await request('/api/accounts', {
    method: 'POST',
    body: {
      name,
      owner_id: Number(ownerId),
      initial_balance_paise: Number(initialBalancePaise),
    },
  });
}

export async function fetchAdminUsers({ limit = 50, offset = 0 } = {}) {
  return await request(`/api/admin/users?limit=${limit}&offset=${offset}`, { method: 'GET' });
}

export async function fetchAdminOverview() {
  return await request('/api/admin/overview', { method: 'GET' });
}

