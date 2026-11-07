import { query } from './db.js';
import { GENESIS_HASH, verifyLedgerRow } from './hash.js';

/**
 * Fetch account statement with full transaction details,
 * duplicate replay markers, initiated_by user info, and pagination.
 */
export async function getAccountStatement(accountId, { limit = 50, offset = 0, order = 'DESC' } = {}) {
  const parsedLimit = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 100);
  const parsedOffset = Math.max(parseInt(offset, 10) || 0, 0);
  const sortDirection = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

  // 1. Fetch account metadata
  const accRes = await query(
    `SELECT a.id, a.account_no, a.owner_id, a.name, a.balance_paise, a.is_external,
            u.email as owner_email, u.name as owner_name
     FROM accounts a
     LEFT JOIN users u ON a.owner_id = u.id
     WHERE a.id = $1`,
    [accountId]
  );

  if (accRes.rowCount === 0) {
    return { notFound: true };
  }

  const account = accRes.rows[0];

  // 2. Fetch total row count for pagination
  const countRes = await query('SELECT COUNT(*) FROM ledger WHERE account_id = $1', [accountId]);
  const total = parseInt(countRes.rows[0].count, 10);

  // 3. Fetch ledger entries with duplicate replay markers and user info
  const statementRes = await query(
    `SELECT 
       l.id,
       l.txn_id,
       l.account_id,
       l.kind,
       l.amount_paise,
       l.balance_after_paise,
       l.initiated_by,
       u.name as initiated_by_name,
       u.email as initiated_by_email,
       l.idempotency_key,
       l.reason,
       l.prev_hash,
       l.hash,
       l.created_at,
       (
         SELECT COUNT(*) 
         FROM idempotency_replays r 
         WHERE r.idempotency_key = l.idempotency_key
       )::int as replay_count
     FROM ledger l
     LEFT JOIN users u ON l.initiated_by = u.id
     WHERE l.account_id = $1
     ORDER BY l.id ${sortDirection}
     LIMIT $2 OFFSET $3`,
    [accountId, parsedLimit, parsedOffset]
  );

  const entries = statementRes.rows.map((row) => ({
    id: Number(row.id),
    txn_id: row.txn_id,
    account_id: row.account_id,
    kind: row.kind,
    amount_paise: Number(row.amount_paise),
    balance_after_paise: Number(row.balance_after_paise),
    initiated_by: {
      id: row.initiated_by,
      name: row.initiated_by_name || 'System / Admin',
      email: row.initiated_by_email || 'system@ledgerline.local',
    },
    idempotency_key: row.idempotency_key,
    is_replayed: row.replay_count > 0,
    replay_count: row.replay_count,
    reason: row.reason,
    prev_hash: row.prev_hash,
    hash: row.hash,
    created_at: row.created_at,
  }));

  return {
    account,
    statement: entries,
    pagination: {
      total,
      limit: parsedLimit,
      offset: parsedOffset,
      pages: Math.ceil(total / parsedLimit),
    },
  };
}

/**
 * Recomputes every hash chain, verifies global zero-sum conservation,
 * and checks each account balance against the mathematical sum of its ledger entries.
 */
export async function verifySystemIntegrity() {
  const timestamp = new Date().toISOString();
  const errors = [];

  // --- CHECK 1: Global Conservation (Sum of all accounts == 0) ---
  const sumRes = await query('SELECT SUM(balance_paise) as global_sum FROM accounts');
  const globalSum = BigInt(sumRes.rows[0].global_sum || 0);

  const globalConservationPassed = globalSum === 0n;
  if (!globalConservationPassed) {
    errors.push({
      check: 'GLOBAL_CONSERVATION',
      message: `Global sum of balances is ${globalSum} paise, expected 0.`,
      discrepancy_paise: Number(globalSum),
    });
  }

  // --- CHECK 2: Hash Chain Verification for Every Account ---
  const accountsRes = await query('SELECT id, account_no, balance_paise FROM accounts ORDER BY id ASC');
  const accounts = accountsRes.rows;

  const hashChainFailures = [];
  let totalRowsChecked = 0;

  for (const acc of accounts) {
    const rowsRes = await query('SELECT * FROM ledger WHERE account_id = $1 ORDER BY id ASC', [acc.id]);
    totalRowsChecked += rowsRes.rowCount;

    let expectedPrev = GENESIS_HASH;
    for (const row of rowsRes.rows) {
      const result = verifyLedgerRow(row, expectedPrev);
      if (!result.valid) {
        hashChainFailures.push({
          account_id: acc.id,
          account_no: acc.account_no,
          ledger_id: Number(row.id),
          txn_id: row.txn_id,
          error: result.error,
          found_hash: row.hash,
        });
      }
      expectedPrev = row.hash;
    }
  }

  if (hashChainFailures.length > 0) {
    errors.push({
      check: 'HASH_CHAIN',
      message: `${hashChainFailures.length} hash chain integrity failure(s) detected.`,
      failures: hashChainFailures,
    });
  }

  // --- CHECK 3: Balance Reconciliation against Ledger Journal ---
  const balanceMismatches = [];

  for (const acc of accounts) {
    const rowsRes = await query(
      "SELECT kind, amount_paise FROM ledger WHERE account_id = $1 AND kind IN ('debit', 'credit') ORDER BY id ASC",
      [acc.id]
    );

    let calculatedBalance = 0n;
    for (const row of rowsRes.rows) {
      const amount = BigInt(row.amount_paise);
      if (row.kind === 'credit') {
        calculatedBalance += amount;
      } else if (row.kind === 'debit') {
        calculatedBalance -= amount;
      }
    }

    const currentBalance = BigInt(acc.balance_paise);
    if (calculatedBalance !== currentBalance) {
      balanceMismatches.push({
        account_id: acc.id,
        account_no: acc.account_no,
        current_balance_paise: Number(currentBalance),
        calculated_balance_paise: Number(calculatedBalance),
        diff_paise: Number(currentBalance - calculatedBalance),
      });
    }
  }

  if (balanceMismatches.length > 0) {
    errors.push({
      check: 'BALANCE_RECONCILIATION',
      message: `${balanceMismatches.length} account balance discrepancy(ies) detected.`,
      mismatches: balanceMismatches,
    });
  }

  // Replay count
  const replayCountRes = await query('SELECT COUNT(*) FROM idempotency_replays');
  const replayCount = parseInt(replayCountRes.rows[0].count, 10);

  const verified = errors.length === 0;

  return {
    verified,
    timestamp,
    summary: {
      accounts_checked: accounts.length,
      ledger_rows_verified: totalRowsChecked,
      replays_recorded: replayCount,
      global_balance_sum_paise: Number(globalSum),
    },
    checks: {
      global_conservation: {
        status: globalConservationPassed ? 'PASSED' : 'FAILED',
        global_sum_paise: Number(globalSum),
      },
      hash_chain: {
        status: hashChainFailures.length === 0 ? 'PASSED' : 'FAILED',
        failures: hashChainFailures,
      },
      balance_reconciliation: {
        status: balanceMismatches.length === 0 ? 'PASSED' : 'FAILED',
        mismatches: balanceMismatches,
      },
    },
    errors: verified ? [] : errors,
  };
}

/**
 * Fetch recorded duplicate replayed requests.
 */
export async function getDuplicateReplays({ limit = 50, offset = 0 } = {}) {
  const parsedLimit = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 100);
  const parsedOffset = Math.max(parseInt(offset, 10) || 0, 0);

  const countRes = await query('SELECT COUNT(*) FROM idempotency_replays');
  const total = parseInt(countRes.rows[0].count, 10);

  const replaysRes = await query(
    `SELECT r.id, r.user_id, u.email as user_email, u.name as user_name,
            r.idempotency_key, r.request_hash, r.replayed_at
     FROM idempotency_replays r
     LEFT JOIN users u ON r.user_id = u.id
     ORDER BY r.id DESC
     LIMIT $1 OFFSET $2`,
    [parsedLimit, parsedOffset]
  );

  return {
    replays: replaysRes.rows.map((r) => ({
      id: Number(r.id),
      user_id: r.user_id,
      user_email: r.user_email,
      user_name: r.user_name,
      idempotency_key: r.idempotency_key,
      request_hash: r.request_hash,
      replayed_at: r.replayed_at,
    })),
    pagination: {
      total,
      limit: parsedLimit,
      offset: parsedOffset,
      pages: Math.ceil(total / parsedLimit),
    },
  };
}

/**
 * Strips sensitive keys like passwords, tokens, and hashes from audit metadata.
 */
function sanitizeAuditMetadata(metadata) {
  if (!metadata || typeof metadata !== 'object') return metadata;
  const sanitized = Array.isArray(metadata) ? [...metadata] : { ...metadata };
  const sensitiveKeys = ['password', 'password_hash', 'token', 'jwt', 'secret', 'authorization'];
  for (const key of Object.keys(sanitized)) {
    if (sensitiveKeys.some((s) => key.toLowerCase().includes(s))) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
      sanitized[key] = sanitizeAuditMetadata(sanitized[key]);
    }
  }
  return sanitized;
}

/**
 * Record an immutable audit log entry.
 * Never stores passwords, tokens, or raw secrets.
 */
export async function recordAuditLog(
  {
    actorId = null,
    action,
    resource,
    correlationId = null,
    outcome = 'SUCCESS',
    metadata = null,
    ipAddress = null,
  },
  dbClient = null
) {
  try {
    const runQuery = dbClient ? dbClient.query.bind(dbClient) : query;
    const sanitized = metadata ? sanitizeAuditMetadata(metadata) : null;
    const res = await runQuery(
      `INSERT INTO audit_logs (actor_id, action, resource, correlation_id, outcome, metadata, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, created_at`,
      [
        actorId,
        action,
        resource,
        correlationId,
        outcome,
        sanitized ? JSON.stringify(sanitized) : null,
        ipAddress,
      ]
    );
    return res.rows[0];
  } catch (err) {
    console.error('[AUDIT_LOG] Failed to record audit log:', err.message);
    return null;
  }
}

/**
 * Retrieve paginated audit logs with optional filters for action, outcome, or actor.
 * Authorized for ADMIN and AUDITOR roles.
 */
export async function getAuditLogs({
  limit = 50,
  offset = 0,
  action = null,
  outcome = null,
  actorId = null,
} = {}) {
  const parsedLimit = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 100);
  const parsedOffset = Math.max(parseInt(offset, 10) || 0, 0);

  const conditions = [];
  const params = [];

  if (action) {
    params.push(action);
    conditions.push(`al.action = $${params.length}`);
  }
  if (outcome) {
    params.push(outcome);
    conditions.push(`al.outcome = $${params.length}`);
  }
  if (actorId) {
    params.push(parseInt(actorId, 10));
    conditions.push(`al.actor_id = $${params.length}`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const countRes = await query(`SELECT COUNT(*) FROM audit_logs al ${whereClause}`, params);
  const total = parseInt(countRes.rows[0].count, 10);

  params.push(parsedLimit, parsedOffset);
  const logsRes = await query(
    `SELECT al.id, al.actor_id, u.email as actor_email, u.name as actor_name, u.role as actor_role,
            al.action, al.resource, al.correlation_id, al.outcome, al.metadata, al.ip_address, al.created_at
     FROM audit_logs al
     LEFT JOIN users u ON al.actor_id = u.id
     ${whereClause}
     ORDER BY al.id DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );

  return {
    audit_logs: logsRes.rows.map((row) => ({
      id: Number(row.id),
      actor_id: row.actor_id,
      actor_email: row.actor_email,
      actor_name: row.actor_name,
      actor_role: row.actor_role,
      action: row.action,
      resource: row.resource,
      correlation_id: row.correlation_id,
      outcome: row.outcome,
      metadata: row.metadata,
      ip_address: row.ip_address,
      created_at: row.created_at,
    })),
    pagination: {
      total,
      limit: parsedLimit,
      offset: parsedOffset,
      pages: Math.ceil(total / parsedLimit),
    },
  };
}

/**
 * Retrieve a specific audit log by ID.
 */
export async function getAuditLogById(id) {
  const parsedId = parseInt(id, 10);
  if (isNaN(parsedId) || parsedId <= 0) return null;

  const res = await query(
    `SELECT al.id, al.actor_id, u.email as actor_email, u.name as actor_name, u.role as actor_role,
            al.action, al.resource, al.correlation_id, al.outcome, al.metadata, al.ip_address, al.created_at
     FROM audit_logs al
     LEFT JOIN users u ON al.actor_id = u.id
     WHERE al.id = $1`,
    [parsedId]
  );

  if (res.rowCount === 0) return null;
  const row = res.rows[0];
  return {
    id: Number(row.id),
    actor_id: row.actor_id,
    actor_email: row.actor_email,
    actor_name: row.actor_name,
    actor_role: row.actor_role,
    action: row.action,
    resource: row.resource,
    correlation_id: row.correlation_id,
    outcome: row.outcome,
    metadata: row.metadata,
    ip_address: row.ip_address,
    created_at: row.created_at,
  };
}
