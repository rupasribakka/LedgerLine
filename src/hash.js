import crypto from 'node:crypto';

export const GENESIS_HASH = '0'.repeat(64);

/**
 * Format canonical ledger string for deterministic sha256 hashing.
 * Hard rule 8: sha256(prev_hash || canonical row fields)
 */
export function canonicalLedgerString({
  prev_hash,
  txn_id,
  account_id,
  kind,
  amount_paise,
  balance_after_paise,
  initiated_by,
  idempotency_key,
  reason,
}) {
  return [
    prev_hash,
    txn_id,
    account_id,
    kind,
    amount_paise.toString(),
    balance_after_paise.toString(),
    initiated_by !== null && initiated_by !== undefined ? initiated_by.toString() : '',
    idempotency_key || '',
    reason || '',
  ].join('|');
}

/**
 * Compute SHA256 cryptographic hash of the ledger row.
 */
export function computeLedgerHash(prevHash, rowData) {
  const canonical = canonicalLedgerString({
    prev_hash: prevHash,
    ...rowData,
  });
  return crypto.createHash('sha256').update(canonical, 'utf8').digest('hex');
}

/**
 * Verify integrity of a single ledger row against its expected previous hash.
 */
export function verifyLedgerRow(row, expectedPrevHash) {
  if (row.prev_hash !== expectedPrevHash) {
    return {
      valid: false,
      error: `Previous hash mismatch: expected ${expectedPrevHash}, found ${row.prev_hash}`,
    };
  }

  const computed = computeLedgerHash(row.prev_hash, {
    txn_id: row.txn_id,
    account_id: row.account_id,
    kind: row.kind,
    amount_paise: row.amount_paise,
    balance_after_paise: row.balance_after_paise,
    initiated_by: row.initiated_by,
    idempotency_key: row.idempotency_key,
    reason: row.reason,
  });

  if (computed !== row.hash) {
    return {
      valid: false,
      error: `Row hash mismatch: computed ${computed}, recorded ${row.hash}`,
    };
  }

  return { valid: true };
}
