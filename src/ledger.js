import crypto from 'node:crypto';
import { v4 as uuidv4 } from 'uuid';
import { withTransaction, query } from './db.js';
import { GENESIS_HASH, computeLedgerHash } from './hash.js';

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
  const parsedFromId = parseInt(fromAccountId, 10);
  const parsedToId = parseInt(toAccountId, 10);

  if (isNaN(parsedFromId) || isNaN(parsedToId)) {
    return {
      status: 400,
      body: { error: 'Invalid fromAccountId or toAccountId.', code: 'INVALID_ACCOUNT_ID' },
    };
  }

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
  const requestHash = crypto.createHash('sha256').update(JSON.stringify(body || {})).digest('hex');

  // --- 2. Execute within ONE DB Transaction ---
  return withTransaction(async (client) => {
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
      `SELECT id, account_no, owner_id, balance_paise, is_external
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

    // ---------------------------------------------------------------------
    // STEP C: SERVER-SIDE AUTHORISATION CHECK (Hard Rule 4, 9, 10)
    // ---------------------------------------------------------------------
    let authRefusalReason = null;

    if (user.role === 'auditor') {
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
        amountPaise,
        user,
        cleanKey,
        statusCode: 403,
        errorCode: 'FORBIDDEN',
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
  });
}

/**
 * Helper to record a refused attempt to the ledger and commit it.
 * Hard Rule 7: Refused attempts are written to the ledger as kind='refused'
 * with a reason and COMMITTED. A replayed refused request returns the same refusal.
 */
async function recordRefusal(client, { fromAccount, amountPaise, user, cleanKey, statusCode, errorCode, reason }) {
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
