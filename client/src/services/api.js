/**
 * LedgerLine API Client Service
 * 
 * Centralized service for communicating with the LedgerLine backend.
 * Handles JWT auth token persistence, automated Idempotency-Key generation,
 * currency conversion (Paise <-> Rupees), and robust error extraction.
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

// Token and User session keys
const TOKEN_KEY = 'ledgerline_jwt_token';
const USER_KEY = 'ledgerline_user_data';

export function getStoredToken() {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setStoredSession(token, user) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch (e) {
    console.error('Failed to save session to localStorage:', e);
  }
}

export function clearStoredSession() {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  } catch (e) {
    console.error('Failed to clear session from localStorage:', e);
  }
}

export function getStoredUser() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
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
  const rupees = (num / 100).toFixed(2);
  return `₹${rupees.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
}

export function parseRupeesToPaise(rupeesInput) {
  if (!rupeesInput && rupeesInput !== 0) return 0;
  const cleaned = String(rupeesInput).replace(/[^0-9.]/g, '');
  const parsed = parseFloat(cleaned);
  if (isNaN(parsed)) return 0;
  return Math.round(parsed * 100);
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

    const isReplay = response.headers.get('X-Cache') === 'REPLAY';
    let data = null;

    try {
      data = await response.json();
    } catch {
      data = null;
    }

    if (!response.ok) {
      if (response.status === 401) {
        // Token expired or invalid
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
 * 2. Authentication API
 */
export async function loginUser(username, password) {
  const res = await request('/api/auth/login', {
    method: 'POST',
    body: { username, password },
  });

  if (res.ok && res.data?.token) {
    setStoredSession(res.data.token, res.data.user);
  }
  return res;
}

export async function registerUser({ username, password, role = 'holder', name }) {
  return await request('/api/auth/register', {
    method: 'POST',
    body: { username, password, role, name },
  });
}

/**
 * 3. Accounts API
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
    body: { accountId: Number(accountId), amountPaise: Number(amountPaise) },
  });
}

export async function executeWithdrawal({ accountId, amountPaise, idempotencyKey }) {
  const key = idempotencyKey || generateIdempotencyKey();
  return await request('/api/withdrawals', {
    method: 'POST',
    headers: { 'Idempotency-Key': key },
    body: { accountId: Number(accountId), amountPaise: Number(amountPaise) },
  });
}

export async function executeTransfer({ fromAccountId, toAccountId, amountPaise, idempotencyKey }) {
  const key = idempotencyKey || generateIdempotencyKey();
  return await request('/api/transfers', {
    method: 'POST',
    headers: { 'Idempotency-Key': key },
    body: {
      fromAccountId: Number(fromAccountId),
      toAccountId: Number(toAccountId),
      amountPaise: Number(amountPaise),
    },
  });
}

/**
 * 5. Auditor & Verification API
 */
export async function verifySystemIntegrity() {
  return await request('/api/verify', { method: 'GET' });
}

export async function fetchAuditLogs() {
  return await request('/api/audit/logs', { method: 'GET' });
}
