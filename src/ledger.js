import crypto from 'node:crypto';
import { v4 as uuidv4 } from 'uuid';
import { withTransaction, query } from './db.js';
import { GENESIS_HASH, computeLedgerHash, computeRequestHash } from './hash.js';
import { recordAuditLog } from './audit.js';

export const MAX_AMOUNT_PAISE = 10_000_000n; // 10,000,000 paise (₹100,000.00 max cap)

/**
 * Validate that an amount is a strictly positive integer in paise within system cap.
 * Hard Rule 1: Money = integer paise in BIGINT. Never floats.
 * Reject strings, decimals, negatives, zero, NaN, huge values.
 */
export function validatePaiseAmount(amount) {
  if (amount === undefined || amount === null) {
    return { valid: false, error: 'Amount is required.', code: 'INVALID_AMOUNT' };
  }

  // Reject strings, boolean, objects
  if (typeof amount !== 'number' && typeof amount !== 'bigint') {
    return { valid: false, error: 'Amount must be an integer number of paise.', code: 'INVALID_AMOUNT' };
  }

  if (typeof amount === 'number') {
    if (!Number.isFinite(amount) || Number.isNaN(amount)) {
      return { valid: false, error: 'Amount cannot be NaN or infinite.', code: 'INVALID_AMOUNT' };
    }
    if (!Number.isInteger(amount)) {
      return { valid: false, error: 'Amount must be a whole integer in paise. Floats are prohibited.', code: 'INVALID_AMOUNT' };
    }
    if (amount <= 0) {
      return { valid: false, error: 'Amount must be strictly greater than 0 paise.', code: 'INVALID_AMOUNT' };
    }
    if (amount > Number(MAX_AMOUNT_PAISE)) {
      return { valid: false, error: `Amount exceeds maximum cap of ${MAX_AMOUNT_PAISE} paise.`, code: 'AMOUNT_EXCEEDS_CAP' };
    }
  } else if (typeof amount === 'bigint') {
    if (amount <= 0n) {
      return { valid: false, error: 'Amount must be strictly greater than 0 paise.', code: 'INVALID_AMOUNT' };
    }
    if (amount > MAX_AMOUNT_PAISE) {
      return { valid: false, error: `Amount exceeds maximum cap of ${MAX_AMOUNT_PAISE} paise.`, code: 'AMOUNT_EXCEEDS_CAP' };
    }
  }

  return { valid: true, amountPaise: BigInt(amount) };
}

/**
 * Validate that an account ID is a strictly positive safe integer.
 * Requirement 2.b: Rejects "2abc", 1.9, -1, 1e30 with 400.
 */
export function isValidPositiveSafeInteger(val) {
  if (val === null || val === undefined) return false;
  if (typeof val === 'number') {
    return Number.isSafeInteger(val) && val > 0;
  }
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (!/^[1-9]\d*$/.test(trimmed)) return false;
    const num = Number(trimmed);
    return Number.isSafeInteger(num) && num > 0;
  }
  return false;
}

/**
 * Find the system EXTERNAL clearing account.
 */
export async function getExternalAccountId(dbClient = null) {
  const runQuery = dbClient ? dbClient.query.bind(dbClient) : query;
  const res = await runQuery("SELECT id FROM accounts WHERE account_no = 'ACC-EXTERNAL' AND is_external = TRUE");
  if (res.rowCount === 0) {
    throw new Error('System configuration error: ACC-EXTERNAL account not found.');
  }
  return res.rows[0].id;
}

/**
 * Core money movement engine for all financial transactions.
 * Follows Hard Rules 1 through 9.
 *
 * =========================================================================
 * CRITICAL TRANSACTION INVARIANT SEQUENCE:
 * 1. Idempotency Key Claim: INSERT ON CONFLICT DO NOTHING + SELECT FOR UPDATE
 * 2. Deterministic Row Locks: SELECT ... FOR UPDATE ORDER BY id ASC (Line 137)
 * 3. Server-Side Authorisation: Checked from DB data inside lock (Line 153)
 * 4. Available Balance Check: fromBalance >= amount (Line 191)
 * 5. Atomic Balance Updates & Debit: from - amount, to + amount (Line 245)
 * 6. Cryptographic Hash-Chained Append-Only Ledger Rows (Lines 263-295)
 * =========================================================================
 */
export async function postMovement({
  kind,
  fromAccountId,
  toAccountId,
  amount,
  key,
  user,
  body,
  dbClient = null,
}) {
  // --- 1. Validation (Hard Rule 1 & Requirements) ---
  if (!key || typeof key !== 'string' || key.trim().length === 0) {
    return {
      status: 400,
      body: { error: 'Idempotency-Key header is required on financial operations.', code: 'MISSING_IDEMPOTENCY_KEY' },
    };
  }

  if (!user || !user.id || !user.role) {
    return {
      status: 401,
      body: { error: 'Authentication required.', code: 'UNAUTHORIZED' },
    };
  }

  const cleanKey = key.trim();

  // Requirement 2.b: Account IDs accept only positive safe integers ("2abc", 1.9, -1, 1e30 are rejected with 400)
  if (!isValidPositiveSafeInteger(fromAccountId) || !isValidPositiveSafeInteger(toAccountId)) {
    return {
      status: 400,
      body: { error: 'Invalid fromAccountId or toAccountId. Account IDs must be positive safe integers.', code: 'INVALID_ACCOUNT_ID' },
    };
  }

  const parsedFromId = Number(fromAccountId);
  const parsedToId = Number(toAccountId);

  // Reject from == to
  if (parsedFromId === parsedToId) {
    return {
      status: 400,
      body: { error: 'Source and destination accounts must be distinct.', code: 'SAME_ACCOUNT_TRANSFER' },
    };
  }

  const amountValidation = validatePaiseAmount(amount);
  if (!amountValidation.valid) {
    return {
      status: 400,
      body: { error: amountValidation.error, code: amountValidation.code },
    };
  }

  const amountPaise = amountValidation.amountPaise;

  // Requirement 2.a: requestHash is sha256 of canonical sorted-key JSON of {kind, fromAccountId, toAccountId, amount}
  const requestHash = computeRequestHash({
    kind,
    fromAccountId: parsedFromId,
    toAccountId: parsedToId,
    amount: amountPaise,
  });

  // --- 2. Execute within ONE DB Transaction ---
  const executeOperation = async (client) => {
    // ---------------------------------------------------------------------
    // STEP A: IDEMPOTENCY KEY ROW LOCK (Hard Rule 5)
    // ---------------------------------------------------------------------
    await client.query(
      `INSERT INTO idempotency_keys (user_id, key, request_hash, state)
       VALUES ($1, $2, $3, 'in_flight')
       ON CONFLICT (user_id, key) DO NOTHING`,
      [user.id, cleanKey, requestHash]
    );

    const keyRes = await client.query(
      `SELECT user_id, key, request_hash, state, response_status, response_body
       FROM idempotency_keys
       WHERE user_id = $1 AND key = $2
       FOR UPDATE`,
      [user.id, cleanKey]
    );

    const existingKey = keyRes.rows[0];

    // If key has already been resolved in a prior completed/refused request
    if (existingKey.state === 'completed' || existingKey.state === 'refused') {
      // Hard Rule 5: Same key + different body => 422
      if (existingKey.request_hash !== requestHash) {
        return {
          status: 422,
          body: {
            error: 'Idempotency key was previously submitted with a different request payload.',
            code: 'IDEMPOTENCY_KEY_REUSE_PAYLOAD_MISMATCH',
          },
        };
      }

      // Hard Rule 5: Same key + same body => return stored response & record replay
      await client.query(
        `INSERT INTO idempotency_replays (user_id, idempotency_key, request_hash)
         VALUES ($1, $2, $3)`,
        [user.id, cleanKey, requestHash]
      );

      return {
        status: existingKey.response_status,
        body: existingKey.response_body,
        isReplay: true,
      };
    }

    // ---------------------------------------------------------------------
    // STEP B: DEADLOCK-FREE ROW LOCKING (Hard Rule 4: ORDER BY id ASC)
    // [LOCK OCCURS HERE]
    // ---------------------------------------------------------------------
    const [firstId, secondId] = [parsedFromId, parsedToId].sort((a, b) => a - b);
    const accountsRes = await client.query(
      `SELECT id, account_no, owner_id, balance_paise, is_external, status
       FROM accounts
       WHERE id IN ($1, $2)
       ORDER BY id ASC
       FOR UPDATE`,
      [firstId, secondId]
    );

    const accountMap = new Map(accountsRes.rows.map((a) => [a.id, a]));
    const fromAccount = accountMap.get(parsedFromId);
    const toAccount = accountMap.get(parsedToId);

    if (!fromAccount || !toAccount) {
      const missingId = !fromAccount ? parsedFromId : parsedToId;
      const responseBody = { error: `Account with ID ${missingId} not found.`, code: 'ACCOUNT_NOT_FOUND' };
      await client.query(
        `UPDATE idempotency_keys
         SET state = 'refused', response_status = 404, response_body = $1, updated_at = NOW()
         WHERE user_id = $2 AND key = $3`,
        [JSON.stringify(responseBody), user.id, cleanKey]
      );
      return { status: 404, body: responseBody };
    }

    // Requirement 2.c: /transfers rejects ACC-EXTERNAL as source or destination
    if (
      kind === 'transfer' &&
      (fromAccount.is_external ||
        toAccount.is_external ||
        fromAccount.account_no === 'ACC-EXTERNAL' ||
        toAccount.account_no === 'ACC-EXTERNAL')
    ) {
      const responseBody = {
        error: 'Transfers cannot use ACC-EXTERNAL as source or destination.',
        code: 'EXTERNAL_TRANSFER_PROHIBITED',
      };
      await client.query(
        `UPDATE idempotency_keys
         SET state = 'refused', response_status = 400, response_body = $1, updated_at = NOW()
         WHERE user_id = $2 AND key = $3`,
        [JSON.stringify(responseBody), user.id, cleanKey]
      );
      return { status: 400, body: responseBody };
    }

    // ---------------------------------------------------------------------
    // STEP C: SERVER-SIDE AUTHORISATION & ACCOUNT LIFECYCLE CHECK (Hard Rule 4, 9, 10)
    // ---------------------------------------------------------------------
    let authRefusalReason = null;
    let authStatusCode = 403;
    let authErrorCode = 'FORBIDDEN';

    // Account status lifecycle validation
    if (fromAccount.status === 'FROZEN') {
      authRefusalReason = `Source account ${fromAccount.account_no} is FROZEN. Financial operations are prohibited.`;
      authErrorCode = 'ACCOUNT_FROZEN';
    } else if (fromAccount.status === 'CLOSED') {
      authRefusalReason = `Source account ${fromAccount.account_no} is CLOSED. Closed accounts cannot send or receive money.`;
      authErrorCode = 'ACCOUNT_CLOSED';
    } else if (toAccount.status === 'CLOSED') {
      authRefusalReason = `Recipient account ${toAccount.account_no} is CLOSED. Closed accounts cannot receive or send money.`;
      authErrorCode = 'ACCOUNT_CLOSED';
    } else if (toAccount.status === 'FROZEN' && kind !== 'deposit') {
      authRefusalReason = `Recipient account ${toAccount.account_no} is FROZEN.`;
      authErrorCode = 'ACCOUNT_FROZEN';
    } else if (user.role === 'auditor') {
      authRefusalReason = 'Auditor role is strictly read-only on all financial transactions.';
    } else if (kind === 'deposit') {
      // Hard Rule 10: Default: holders cannot deposit; admin only
      if (user.role !== 'admin') {
        authRefusalReason = 'Account holders are not permitted to initiate deposits directly.';
      }
    } else if (kind === 'withdrawal' || kind === 'transfer') {
      // Hard Rule 10: Holders can withdraw/transfer FROM own accounts only
      if (user.role === 'holder') {
        if (fromAccount.is_external) {
          authRefusalReason = 'Holders cannot move funds from external clearing accounts.';
        } else if (fromAccount.owner_id !== user.id) {
          authRefusalReason = `Holder does not own source account ${fromAccount.account_no}.`;
        }
      }
    }

    if (authRefusalReason) {
      return recordRefusal(client, {
        fromAccount,
        toAccount,
        kind,
        amountPaise,
        user,
        cleanKey,
        statusCode: authStatusCode,
        errorCode: authErrorCode,
        reason: authRefusalReason,
      });
    }

    // ---------------------------------------------------------------------
    // STEP D: BALANCE CHECK (Hard Rule 3 & 4)
    // [BALANCE CHECK OCCURS HERE: after row lock, inside transaction]
    // ---------------------------------------------------------------------
    const currentFromBalance = BigInt(fromAccount.balance_paise);
    const currentToBalance = BigInt(toAccount.balance_paise);

    // User accounts floor is 0; external account is permitted to go negative
    if (!fromAccount.is_external && currentFromBalance < amountPaise) {
      const reason = `Insufficient funds: balance ${currentFromBalance} paise is less than requested ${amountPaise} paise.`;
      return recordRefusal(client, {
        fromAccount,
        toAccount,
        kind,
        amountPaise,
        user,
        cleanKey,
        statusCode: 422,
        errorCode: 'INSUFFICIENT_FUNDS',
        reason,
      });
    }

    // ---------------------------------------------------------------------
    // STEP E: EXECUTE DEBIT & CREDIT (Hard Rule 2, 4, 8)
    // [DEBIT OCCURS HERE: fromBalance - amountPaise]
    // ---------------------------------------------------------------------
    const newFromBalance = currentFromBalance - amountPaise;
    const newToBalance = currentToBalance + amountPaise;

    await client.query('UPDATE accounts SET balance_paise = $1 WHERE id = $2', [newFromBalance, fromAccount.id]);
    await client.query('UPDATE accounts SET balance_paise = $1 WHERE id = $2', [newToBalance, toAccount.id]);

    // ---------------------------------------------------------------------
    // STEP F: CRYPTOGRAPHIC HASH CHAIN COMPUTATION (Hard Rule 8)
    // ---------------------------------------------------------------------
    const txnId = uuidv4();

    const prevFromRes = await client.query(
      'SELECT hash FROM ledger WHERE account_id = $1 ORDER BY id DESC LIMIT 1',
      [fromAccount.id]
    );
    const prevToRes = await client.query(
      'SELECT hash FROM ledger WHERE account_id = $1 ORDER BY id DESC LIMIT 1',
      [toAccount.id]
    );

    const prevFromHash = prevFromRes.rowCount > 0 ? prevFromRes.rows[0].hash : GENESIS_HASH;
    const prevToHash = prevToRes.rowCount > 0 ? prevToRes.rows[0].hash : GENESIS_HASH;

    const debitDescription = `${kind.toUpperCase()}: debited ${amountPaise} paise`;
    const creditDescription = `${kind.toUpperCase()}: credited ${amountPaise} paise`;

    const debitHash = computeLedgerHash(prevFromHash, {
      txn_id: txnId,
      account_id: fromAccount.id,
      kind: 'debit',
      amount_paise: amountPaise,
      balance_after_paise: newFromBalance,
      initiated_by: user.id,
      idempotency_key: cleanKey,
      reason: debitDescription,
    });

    const creditHash = computeLedgerHash(prevToHash, {
      txn_id: txnId,
      account_id: toAccount.id,
      kind: 'credit',
      amount_paise: amountPaise,
      balance_after_paise: newToBalance,
      initiated_by: user.id,
      idempotency_key: cleanKey,
      reason: creditDescription,
    });

    // ---------------------------------------------------------------------
    // STEP G: APPEND-ONLY LEDGER INSERTIONS (Hard Rule 2 & 6)
    // ---------------------------------------------------------------------
    const debitInsertRes = await client.query(
      `INSERT INTO ledger (
        txn_id, account_id, kind, amount_paise, balance_after_paise,
        initiated_by, idempotency_key, reason, prev_hash, hash
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING id, created_at`,
      [
        txnId,
        fromAccount.id,
        'debit',
        amountPaise,
        newFromBalance,
        user.id,
        cleanKey,
        debitDescription,
        prevFromHash,
        debitHash,
      ]
    );

    const creditInsertRes = await client.query(
      `INSERT INTO ledger (
        txn_id, account_id, kind, amount_paise, balance_after_paise,
        initiated_by, idempotency_key, reason, prev_hash, hash
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING id, created_at`,
      [
        txnId,
        toAccount.id,
        'credit',
        amountPaise,
        newToBalance,
        user.id,
        cleanKey,
        creditDescription,
        prevToHash,
        creditHash,
      ]
    );

    // Record completed transaction
    await client.query(
      `INSERT INTO transactions (
        id, type, status, amount_paise, from_account_id, to_account_id,
        initiated_by, idempotency_key, description, error_reason
      ) VALUES ($1, $2, 'completed', $3, $4, $5, $6, $7, $8, NULL)`,
      [
        txnId,
        kind,
        amountPaise,
        fromAccount.id,
        toAccount.id,
        user.id,
        cleanKey,
        `${kind.toUpperCase()}: ${amountPaise} paise`,
      ]
    );

    // Record audit event
    await recordAuditLog(
      {
        actorId: user.id,
        action: `${kind.toUpperCase()}_SUCCESS`,
        resource: `transactions/${txnId}`,
        correlationId: txnId,
        outcome: 'SUCCESS',
        metadata: {
          fromAccountId: fromAccount.id,
          toAccountId: toAccount.id,
          amountPaise: Number(amountPaise),
          key: cleanKey,
        },
      },
      client
    );

    // ---------------------------------------------------------------------
    // STEP H: COMMIT IDEMPOTENT RESPONSE (Hard Rule 5)
    // ---------------------------------------------------------------------
    const successResponse = {
      success: true,
      txn_id: txnId,
      kind,
      amount_paise: Number(amountPaise),
      from_account: {
        id: fromAccount.id,
        account_no: fromAccount.account_no,
        balance_after_paise: Number(newFromBalance),
      },
      to_account: {
        id: toAccount.id,
        account_no: toAccount.account_no,
        balance_after_paise: Number(newToBalance),
      },
      entries: [
        { id: Number(debitInsertRes.rows[0].id), account_id: fromAccount.id, kind: 'debit', hash: debitHash },
        { id: Number(creditInsertRes.rows[0].id), account_id: toAccount.id, kind: 'credit', hash: creditHash },
      ],
      timestamp: debitInsertRes.rows[0].created_at,
    };

    await client.query(
      `UPDATE idempotency_keys
       SET state = 'completed', response_status = 200, response_body = $1, updated_at = NOW()
       WHERE user_id = $2 AND key = $3`,
      [JSON.stringify(successResponse), user.id, cleanKey]
    );

    return {
      status: 200,
      body: successResponse,
      isReplay: false,
    };
  };

  if (dbClient) {
    return executeOperation(dbClient);
  }
  return withTransaction(executeOperation);
}

/**
 * Helper to record a refused attempt to the ledger and commit it.
 * Hard Rule 7: Refused attempts are written to the ledger as kind='refused'
 * with a reason and COMMITTED. A replayed refused request returns the same refusal.
 */
async function recordRefusal(
  client,
  { fromAccount, toAccount = null, kind = 'transfer', amountPaise, user, cleanKey, statusCode, errorCode, reason }
) {
  const txnId = uuidv4();
  const currentBalance = BigInt(fromAccount.balance_paise);

  const prevRes = await client.query(
    'SELECT hash FROM ledger WHERE account_id = $1 ORDER BY id DESC LIMIT 1',
    [fromAccount.id]
  );
  const prevHash = prevRes.rowCount > 0 ? prevRes.rows[0].hash : GENESIS_HASH;

  const refusalHash = computeLedgerHash(prevHash, {
    txn_id: txnId,
    account_id: fromAccount.id,
    kind: 'refused',
    amount_paise: amountPaise,
    balance_after_paise: currentBalance,
    initiated_by: user.id,
    idempotency_key: cleanKey,
    reason,
  });

  await client.query(
    `INSERT INTO ledger (
      txn_id, account_id, kind, amount_paise, balance_after_paise,
      initiated_by, idempotency_key, reason, prev_hash, hash
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
    [
      txnId,
      fromAccount.id,
      'refused',
      amountPaise,
      currentBalance,
      user.id,
      cleanKey,
      reason,
      prevHash,
      refusalHash,
    ]
  );

  // Record refused transaction entry
  await client.query(
    `INSERT INTO transactions (
      id, type, status, amount_paise, from_account_id, to_account_id,
      initiated_by, idempotency_key, description, error_reason
    ) VALUES ($1, $2, 'refused', $3, $4, $5, $6, $7, $8, $9)`,
    [
      txnId,
      kind,
      amountPaise,
      fromAccount.id,
      toAccount ? toAccount.id : null,
      user.id,
      cleanKey,
      `Refused ${kind}`,
      reason,
    ]
  );

  // Record audit log
  await recordAuditLog(
    {
      actorId: user.id,
      action: `${kind.toUpperCase()}_REFUSED`,
      resource: `accounts/${fromAccount.id}`,
      correlationId: txnId,
      outcome: 'REFUSED',
      metadata: {
        fromAccountId: fromAccount.id,
        toAccountId: toAccount ? toAccount.id : null,
        amountPaise: Number(amountPaise),
        reason,
        code: errorCode,
        key: cleanKey,
      },
    },
    client
  );

  const responseBody = {
    error: reason,
    code: errorCode,
    txn_id: txnId,
  };

  await client.query(
    `UPDATE idempotency_keys
     SET state = 'refused', response_status = $1, response_body = $2, updated_at = NOW()
     WHERE user_id = $3 AND key = $4`,
    [statusCode, JSON.stringify(responseBody), user.id, cleanKey]
  );

  return {
    status: statusCode,
    body: responseBody,
    isReplay: false,
  };
}

/**
 * Fetch a transaction by ID along with its paired ledger entries and account metadata.
 */
export async function getTransactionById(txnId, user = null) {
  const txnRes = await query(
    `SELECT t.id, t.type, t.status, t.amount_paise, t.from_account_id, t.to_account_id,
            t.initiated_by, t.idempotency_key, t.description, t.error_reason,
            t.created_at, t.updated_at,
            fa.account_no as from_account_no, fa.owner_id as from_owner_id,
            ta.account_no as to_account_no, ta.owner_id as to_owner_id,
            u.email as initiated_by_email, u.name as initiated_by_name
     FROM transactions t
     LEFT JOIN accounts fa ON t.from_account_id = fa.id
     LEFT JOIN accounts ta ON t.to_account_id = ta.id
     LEFT JOIN users u ON t.initiated_by = u.id
     WHERE t.id = $1`,
    [txnId]
  );

  if (txnRes.rowCount === 0) return null;
  const txn = txnRes.rows[0];

  // Role check: holders can only view transactions involving their own accounts
  if (user && user.role === 'holder') {
    if (txn.from_owner_id !== user.id && txn.to_owner_id !== user.id) {
      return { forbidden: true };
    }
  }

  // Fetch associated ledger entries
  const entriesRes = await query(
    `SELECT id, account_id, kind, amount_paise, balance_after_paise, prev_hash, hash, created_at
     FROM ledger
     WHERE txn_id = $1
     ORDER BY id ASC`,
    [txnId]
  );

  return {
    transaction: {
      id: txn.id,
      type: txn.type,
      status: txn.status,
      amount_paise: Number(txn.amount_paise),
      from_account: {
        id: txn.from_account_id,
        account_no: txn.from_account_no,
      },
      to_account: {
        id: txn.to_account_id,
        account_no: txn.to_account_no,
      },
      initiated_by: {
        id: txn.initiated_by,
        email: txn.initiated_by_email,
        name: txn.initiated_by_name,
      },
      idempotency_key: txn.idempotency_key,
      description: txn.description,
      error_reason: txn.error_reason,
      created_at: txn.created_at,
      updated_at: txn.updated_at,
    },
    entries: entriesRes.rows.map((r) => ({
      id: Number(r.id),
      account_id: r.account_id,
      kind: r.kind,
      amount_paise: Number(r.amount_paise),
      balance_after_paise: Number(r.balance_after_paise),
      prev_hash: r.prev_hash,
      hash: r.hash,
      created_at: r.created_at,
    })),
  };
}

/**
 * Fetch paginated list of transactions, scoped by role and permissions.
 */
export async function getTransactions({
  limit = 50,
  offset = 0,
  accountId = null,
  type = null,
  status = null,
  user = null,
} = {}) {
  const parsedLimit = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 100);
  const parsedOffset = Math.max(parseInt(offset, 10) || 0, 0);

  const conditions = [];
  const params = [];

  if (user && user.role === 'holder') {
    params.push(user.id);
    conditions.push(`(fa.owner_id = $${params.length} OR ta.owner_id = $${params.length})`);
  }

  if (accountId) {
    params.push(parseInt(accountId, 10));
    conditions.push(`(t.from_account_id = $${params.length} OR t.to_account_id = $${params.length})`);
  }

  if (type) {
    params.push(type);
    conditions.push(`t.type = $${params.length}`);
  }

  if (status) {
    params.push(status);
    conditions.push(`t.status = $${params.length}`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const countRes = await query(
    `SELECT COUNT(*) FROM transactions t
     LEFT JOIN accounts fa ON t.from_account_id = fa.id
     LEFT JOIN accounts ta ON t.to_account_id = ta.id
     ${whereClause}`,
    params
  );
  const total = parseInt(countRes.rows[0].count, 10);

  params.push(parsedLimit, parsedOffset);
  const txnsRes = await query(
    `SELECT t.id, t.type, t.status, t.amount_paise, t.from_account_id, t.to_account_id,
            t.initiated_by, t.idempotency_key, t.description, t.error_reason,
            t.created_at, t.updated_at,
            fa.account_no as from_account_no, ta.account_no as to_account_no,
            u.email as initiated_by_email, u.name as initiated_by_name
     FROM transactions t
     LEFT JOIN accounts fa ON t.from_account_id = fa.id
     LEFT JOIN accounts ta ON t.to_account_id = ta.id
     LEFT JOIN users u ON t.initiated_by = u.id
     ${whereClause}
     ORDER BY t.created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );

  return {
    transactions: txnsRes.rows.map((txn) => ({
      id: txn.id,
      type: txn.type,
      status: txn.status,
      amount_paise: Number(txn.amount_paise),
      from_account: {
        id: txn.from_account_id,
        account_no: txn.from_account_no,
      },
      to_account: {
        id: txn.to_account_id,
        account_no: txn.to_account_no,
      },
      initiated_by: {
        id: txn.initiated_by,
        email: txn.initiated_by_email,
        name: txn.initiated_by_name,
      },
      idempotency_key: txn.idempotency_key,
      description: txn.description,
      error_reason: txn.error_reason,
      created_at: txn.created_at,
      updated_at: txn.updated_at,
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
 * Fetch paginated raw ledger entries, scoped by role.
 */
export async function getLedgerEntries({
  limit = 50,
  offset = 0,
  accountId = null,
  txnId = null,
  user = null,
} = {}) {
  const parsedLimit = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 100);
  const parsedOffset = Math.max(parseInt(offset, 10) || 0, 0);

  const conditions = [];
  const params = [];

  if (user && user.role === 'holder') {
    params.push(user.id);
    conditions.push(`a.owner_id = $${params.length}`);
  }

  if (accountId) {
    params.push(parseInt(accountId, 10));
    conditions.push(`l.account_id = $${params.length}`);
  }

  if (txnId) {
    params.push(txnId);
    conditions.push(`l.txn_id = $${params.length}`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const countRes = await query(
    `SELECT COUNT(*) FROM ledger l
     LEFT JOIN accounts a ON l.account_id = a.id
     ${whereClause}`,
    params
  );
  const total = parseInt(countRes.rows[0].count, 10);

  params.push(parsedLimit, parsedOffset);
  const entriesRes = await query(
    `SELECT l.id, l.txn_id, l.account_id, a.account_no, l.kind,
            l.amount_paise, l.balance_after_paise, l.initiated_by,
            l.idempotency_key, l.reason, l.prev_hash, l.hash, l.created_at
     FROM ledger l
     LEFT JOIN accounts a ON l.account_id = a.id
     ${whereClause}
     ORDER BY l.id DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );

  return {
    entries: entriesRes.rows.map((row) => ({
      id: Number(row.id),
      txn_id: row.txn_id,
      account_id: row.account_id,
      account_no: row.account_no,
      kind: row.kind,
      amount_paise: Number(row.amount_paise),
      balance_after_paise: Number(row.balance_after_paise),
      initiated_by: row.initiated_by,
      idempotency_key: row.idempotency_key,
      reason: row.reason,
      prev_hash: row.prev_hash,
      hash: row.hash,
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
 * Fetch all ledger rows for a single transaction.
 */
export async function getLedgerByTransactionId(txnId, user = null) {
  const rowsRes = await query(
    `SELECT l.id, l.txn_id, l.account_id, a.account_no, a.owner_id, l.kind,
            l.amount_paise, l.balance_after_paise, l.initiated_by,
            l.idempotency_key, l.reason, l.prev_hash, l.hash, l.created_at
     FROM ledger l
     LEFT JOIN accounts a ON l.account_id = a.id
     WHERE l.txn_id = $1
     ORDER BY l.id ASC`,
    [txnId]
  );

  if (rowsRes.rowCount === 0) return null;

  if (user && user.role === 'holder') {
    const hasOwnAccount = rowsRes.rows.some((r) => r.owner_id === user.id);
    if (!hasOwnAccount) {
      return { forbidden: true };
    }
  }

  return {
    txn_id: txnId,
    entries: rowsRes.rows.map((row) => ({
      id: Number(row.id),
      account_id: row.account_id,
      account_no: row.account_no,
      kind: row.kind,
      amount_paise: Number(row.amount_paise),
      balance_after_paise: Number(row.balance_after_paise),
      initiated_by: row.initiated_by,
      idempotency_key: row.idempotency_key,
      reason: row.reason,
      prev_hash: row.prev_hash,
      hash: row.hash,
      created_at: row.created_at,
    })),
  };
}
