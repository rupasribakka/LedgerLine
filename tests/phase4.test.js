/**
 * Phase 4 Tests — Statement, Audit Verify, Hash Tamper Detection, Duplicate Replay Log
 *
 * Covers:
 *   - GET /accounts/:id/statement  (all roles, pagination, debit/credit/refused rows)
 *   - GET /audit/verify            (conservation, hash chain, balance reconciliation)
 *   - Hash tamper detection        (direct DB update bypassing triggers via owner role)
 *   - GET /audit/duplicates        (lists replays, role restriction)
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { v4 as uuidv4 } from 'uuid';
import { initDbPool, closeDb, getClient } from '../src/db.js';
import app from '../src/app.js';
import { runMigrations } from '../src/migrate.js';
import { seedDatabase } from '../src/seed.js';

// ---------------------------------------------------------------------------
// Bootstrap
// ---------------------------------------------------------------------------

let adminToken, holder1Token, holder2Token, auditorToken;
let h1Acc1Id, h1Acc2Id, h2Acc1Id;

beforeAll(async () => {
  await initDbPool();
  await runMigrations();
  await seedDatabase();

  // --- Login all four roles ---
  const adminLogin = await request(app)
    .post('/auth/login')
    .send({ email: 'admin@ledgerline.local', password: 'AdminPassword123!' });
  adminToken = adminLogin.body.token;

  const h1Login = await request(app)
    .post('/auth/login')
    .send({ email: 'holder1@ledgerline.local', password: 'Holder1Password123!' });
  holder1Token = h1Login.body.token;

  const h2Login = await request(app)
    .post('/auth/login')
    .send({ email: 'holder2@ledgerline.local', password: 'Holder2Password123!' });
  holder2Token = h2Login.body.token;

  const auditorLogin = await request(app)
    .post('/auth/login')
    .send({ email: 'auditor@ledgerline.local', password: 'AuditorPassword123!' });
  auditorToken = auditorLogin.body.token;

  // --- Resolve account IDs ---
  const accountsRes = await request(app)
    .get('/accounts')
    .set('Authorization', `Bearer ${adminToken}`);
  const accounts = accountsRes.body.accounts;

  const h1Accounts = accounts.filter((a) => !a.is_external && a.owner_email === 'holder1@ledgerline.local');
  const h2Accounts = accounts.filter((a) => !a.is_external && a.owner_email === 'holder2@ledgerline.local');
  h1Acc1Id = h1Accounts.find((a) => a.account_no.includes('H1-01') || h1Accounts[0])?.id ?? h1Accounts[0]?.id;
  h1Acc2Id = h1Accounts.find((a) => a.account_no.includes('H1-02') || h1Accounts[1])?.id ?? h1Accounts[1]?.id;
  h2Acc1Id = h2Accounts[0]?.id;

  // --- Seed a few transactions so statements have content ---
  // Deposit 100,000 paise into H1-Acc1 (admin)
  await request(app)
    .post('/deposits')
    .set('Authorization', `Bearer ${adminToken}`)
    .set('Idempotency-Key', `phase4-setup-dep-${uuidv4()}`)
    .send({ account_id: h1Acc1Id, amount: 100000 });

  // Withdrawal 10,000 paise from H1-Acc1 (holder1)
  await request(app)
    .post('/withdrawals')
    .set('Authorization', `Bearer ${holder1Token}`)
    .set('Idempotency-Key', `phase4-setup-wd-${uuidv4()}`)
    .send({ account_id: h1Acc1Id, amount: 10000 });

  // Transfer 5,000 paise from H1-Acc1 to H1-Acc2 (holder1)
  await request(app)
    .post('/transfers')
    .set('Authorization', `Bearer ${holder1Token}`)
    .set('Idempotency-Key', `phase4-setup-tr-${uuidv4()}`)
    .send({ from_account_id: h1Acc1Id, to_account_id: h1Acc2Id, amount: 5000 });
}, 60000);

afterAll(async () => {
  await closeDb();
}, 30000);

// ---------------------------------------------------------------------------
// SECTION 1: GET /accounts/:id/statement — basic shape
// ---------------------------------------------------------------------------

describe('GET /accounts/:id/statement — basic shape', () => {
  it('admin can retrieve statement for any account', async () => {
    const res = await request(app)
      .get(`/accounts/${h1Acc1Id}/statement`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('account');
    expect(res.body).toHaveProperty('statement');
    expect(res.body).toHaveProperty('pagination');
    expect(Array.isArray(res.body.statement)).toBe(true);
    expect(res.body.statement.length).toBeGreaterThan(0);
  });

  it('statement entries have required fields', async () => {
    const res = await request(app)
      .get(`/accounts/${h1Acc1Id}/statement`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    const entry = res.body.statement[0];
    expect(entry).toHaveProperty('id');
    expect(entry).toHaveProperty('txn_id');
    expect(entry).toHaveProperty('kind');
    expect(entry).toHaveProperty('amount_paise');
    expect(entry).toHaveProperty('balance_after_paise');
    expect(entry).toHaveProperty('initiated_by');
    expect(entry.initiated_by).toHaveProperty('id');
    expect(entry.initiated_by).toHaveProperty('email');
    expect(entry).toHaveProperty('idempotency_key');
    expect(entry).toHaveProperty('is_replayed');
    expect(entry).toHaveProperty('hash');
    expect(entry).toHaveProperty('prev_hash');
    expect(entry).toHaveProperty('created_at');
  });

  it('statement entries include credit and debit kind rows', async () => {
    const res = await request(app)
      .get(`/accounts/${h1Acc1Id}/statement?order=ASC`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    const kinds = res.body.statement.map((e) => e.kind);
    // The seed deposits produce 'credit' rows; withdrawals produce 'debit' rows
    expect(kinds).toContain('credit');
    expect(kinds).toContain('debit');
  });

  it('auditor can read any account statement', async () => {
    const res = await request(app)
      .get(`/accounts/${h1Acc1Id}/statement`)
      .set('Authorization', `Bearer ${auditorToken}`);

    expect(res.status).toBe(200);
    expect(res.body.statement.length).toBeGreaterThan(0);
  });

  it('holder1 can read own account statement', async () => {
    const res = await request(app)
      .get(`/accounts/${h1Acc1Id}/statement`)
      .set('Authorization', `Bearer ${holder1Token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.statement)).toBe(true);
  });

  it('holder2 gets 403 trying to read holder1 account statement', async () => {
    const res = await request(app)
      .get(`/accounts/${h1Acc1Id}/statement`)
      .set('Authorization', `Bearer ${holder2Token}`);

    expect(res.status).toBe(403);
    expect(res.body.code).toBe('FORBIDDEN');
  });

  it('returns 404 for non-existent account id', async () => {
    const res = await request(app)
      .get('/accounts/999999/statement')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(404);
    expect(res.body.code).toBe('NOT_FOUND');
  });

  it('returns 400 for invalid account id', async () => {
    const res = await request(app)
      .get('/accounts/abc/statement')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('INVALID_ID');
  });

  it('requires authentication', async () => {
    const res = await request(app).get(`/accounts/${h1Acc1Id}/statement`);
    expect(res.status).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// SECTION 2: Statement pagination
// ---------------------------------------------------------------------------

describe('GET /accounts/:id/statement — pagination', () => {
  it('respects limit and offset query parameters', async () => {
    const all = await request(app)
      .get(`/accounts/${h1Acc1Id}/statement?limit=100&offset=0&order=ASC`)
      .set('Authorization', `Bearer ${adminToken}`);

    const total = all.body.pagination.total;

    if (total >= 2) {
      const page1 = await request(app)
        .get(`/accounts/${h1Acc1Id}/statement?limit=1&offset=0&order=ASC`)
        .set('Authorization', `Bearer ${adminToken}`);

      const page2 = await request(app)
        .get(`/accounts/${h1Acc1Id}/statement?limit=1&offset=1&order=ASC`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(page1.status).toBe(200);
      expect(page2.status).toBe(200);
      expect(page1.body.statement.length).toBe(1);
      expect(page2.body.statement.length).toBe(1);
      // Different rows
      expect(page1.body.statement[0].id).not.toBe(page2.body.statement[0].id);
      // Page 1 id < page 2 id (ASC order)
      expect(page1.body.statement[0].id).toBeLessThan(page2.body.statement[0].id);
    } else {
      // Not enough rows to paginate, just verify structure
      expect(total).toBeGreaterThan(0);
    }
  });

  it('pagination metadata is correct', async () => {
    const res = await request(app)
      .get(`/accounts/${h1Acc1Id}/statement?limit=5&offset=0`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.pagination).toHaveProperty('total');
    expect(res.body.pagination).toHaveProperty('limit');
    expect(res.body.pagination).toHaveProperty('offset');
    expect(res.body.pagination).toHaveProperty('pages');
    expect(res.body.pagination.limit).toBe(5);
    expect(res.body.pagination.offset).toBe(0);
    expect(res.body.pagination.total).toBeGreaterThan(0);
  });

  it('order=ASC returns entries in ascending id order', async () => {
    const res = await request(app)
      .get(`/accounts/${h1Acc1Id}/statement?order=ASC`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    const ids = res.body.statement.map((e) => e.id);
    for (let i = 1; i < ids.length; i++) {
      expect(ids[i]).toBeGreaterThan(ids[i - 1]);
    }
  });

  it('order=DESC returns entries in descending id order', async () => {
    const res = await request(app)
      .get(`/accounts/${h1Acc1Id}/statement?order=DESC`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    const ids = res.body.statement.map((e) => e.id);
    for (let i = 1; i < ids.length; i++) {
      expect(ids[i]).toBeLessThan(ids[i - 1]);
    }
  });
});

// ---------------------------------------------------------------------------
// SECTION 3: Refused rows in statement
// ---------------------------------------------------------------------------

describe('Statement — refused rows', () => {
  it('refused (overdraft) attempt appears in statement as kind=refused', async () => {
    // Trigger an overdraft refusal on H2 account (0 balance)
    const refuseKey = `phase4-refuse-${uuidv4()}`;
    const withdrawRes = await request(app)
      .post('/withdrawals')
      .set('Authorization', `Bearer ${holder2Token}`)
      .set('Idempotency-Key', refuseKey)
      .send({ account_id: h2Acc1Id, amount: 50000 });

    // Should be refused (insufficient funds) or 403/422
    expect([402, 403, 409, 422, 200]).toContain(withdrawRes.status);

    // Check if the account has a refused row in the statement
    const stmtRes = await request(app)
      .get(`/accounts/${h2Acc1Id}/statement`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(stmtRes.status).toBe(200);
    const refusedRows = stmtRes.body.statement.filter((e) => e.kind === 'refused');
    // A refused attempt on a zero-balance account should produce a refused ledger row
    expect(refusedRows.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// SECTION 4: Duplicate replay marker in statement
// ---------------------------------------------------------------------------

describe('Statement — is_replayed marker', () => {
  it('replayed deposit shows is_replayed=true in statement', async () => {
    const replayKey = `phase4-replay-stmt-${uuidv4()}`;

    // Send original request
    await request(app)
      .post('/deposits')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('Idempotency-Key', replayKey)
      .send({ account_id: h1Acc1Id, amount: 10000 });

    // Send exact replay
    const replay = await request(app)
      .post('/deposits')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('Idempotency-Key', replayKey)
      .send({ account_id: h1Acc1Id, amount: 10000 });

    expect(replay.headers['idempotent-replay']).toBe('true');

    // The original ledger row should now show is_replayed=true
    const stmtRes = await request(app)
      .get(`/accounts/${h1Acc1Id}/statement`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(stmtRes.status).toBe(200);
    const replayedRow = stmtRes.body.statement.find((e) => e.idempotency_key === replayKey);
    expect(replayedRow).toBeDefined();
    expect(replayedRow.is_replayed).toBe(true);
    expect(replayedRow.replay_count).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// SECTION 5: GET /audit/verify — normal (all PASSED)
// ---------------------------------------------------------------------------

describe('GET /audit/verify — normal state', () => {
  it('returns verified=true with all three checks PASSED', async () => {
    const res = await request(app)
      .get('/audit/verify')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.verified).toBe(true);
    expect(res.body.checks.global_conservation.status).toBe('PASSED');
    expect(res.body.checks.hash_chain.status).toBe('PASSED');
    expect(res.body.checks.balance_reconciliation.status).toBe('PASSED');
    expect(res.body.checks.global_conservation.global_sum_paise).toBe(0);
    expect(res.body.errors).toHaveLength(0);
  });

  it('response includes summary with counts', async () => {
    const res = await request(app)
      .get('/audit/verify')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.summary).toHaveProperty('accounts_checked');
    expect(res.body.summary).toHaveProperty('ledger_rows_verified');
    expect(res.body.summary.accounts_checked).toBeGreaterThan(0);
    expect(res.body.summary.ledger_rows_verified).toBeGreaterThan(0);
  });

  it('auditor can call GET /audit/verify', async () => {
    const res = await request(app)
      .get('/audit/verify')
      .set('Authorization', `Bearer ${auditorToken}`);

    expect(res.status).toBe(200);
    expect(res.body.verified).toBe(true);
  });

  it('holder gets 403 on GET /audit/verify', async () => {
    const res = await request(app)
      .get('/audit/verify')
      .set('Authorization', `Bearer ${holder1Token}`);

    expect(res.status).toBe(403);
  });

  it('requires authentication on GET /audit/verify', async () => {
    const res = await request(app).get('/audit/verify');
    expect(res.status).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// SECTION 6: Hash tamper detection (Hard Rule 6)
// ---------------------------------------------------------------------------

describe('GET /audit/verify — tamper detection', () => {
  it('detects when a ledger row hash is directly mutated (owner-role tamper)', async () => {
    /**
     * Hard Rule 6 states the runtime role (ledgerline_runtime) has only SELECT/INSERT
     * on the ledger table — no UPDATE/DELETE. The migration owner role (which
     * embedded-postgres uses by default) can bypass that restriction.
     *
     * We use a database client directly (which connects as the owner) to simulate an
     * attacker with DB-level access who cannot be stopped by role grants alone.
     * This is the exact threat that the hash chain exists to detect.
     *
     * We also disable the trigger temporarily (requires owner role) to allow
     * the row mutation through, then re-enable it.
     */
    const client = await getClient();

    try {
      // 1. Find the last ledger row for H1-Acc1
      const rowRes = await client.query(
        'SELECT id FROM ledger WHERE account_id = $1 ORDER BY id DESC LIMIT 1',
        [h1Acc1Id]
      );
      expect(rowRes.rowCount).toBeGreaterThan(0);
      const ledgerRowId = rowRes.rows[0].id;

      // 2. Disable the append-only trigger (owner role required)
      await client.query('ALTER TABLE ledger DISABLE TRIGGER trg_ledger_prevent_update');
      await client.query('ALTER TABLE ledger DISABLE TRIGGER trg_ledger_prevent_delete');

      // 3. Tamper: overwrite the hash with a fake value
      await client.query("UPDATE ledger SET hash = 'deadbeef00000000000000000000000000000000000000000000000000000000' WHERE id = $1", [
        ledgerRowId,
      ]);

      // 4. Re-enable triggers
      await client.query('ALTER TABLE ledger ENABLE TRIGGER trg_ledger_prevent_update');
      await client.query('ALTER TABLE ledger ENABLE TRIGGER trg_ledger_prevent_delete');
    } finally {
      client.release();
    }

    // 5. Verify should now detect a hash chain failure
    const verifyRes = await request(app)
      .get('/audit/verify')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.verified).toBe(false);
    expect(verifyRes.body.checks.hash_chain.status).toBe('FAILED');
    expect(verifyRes.body.checks.hash_chain.failures.length).toBeGreaterThan(0);

    // 6. Restore: recompute the correct hash and put it back
    //    This is done so subsequent tests in later phases still pass.
    const { computeLedgerHash, GENESIS_HASH } = await import('../src/hash.js');
    const restoreClient = await getClient();
    try {
      await restoreClient.query('ALTER TABLE ledger DISABLE TRIGGER trg_ledger_prevent_update');
      await restoreClient.query('ALTER TABLE ledger DISABLE TRIGGER trg_ledger_prevent_delete');

      // Re-read all rows for the account in order and recompute chain
      const allRows = await restoreClient.query(
        'SELECT * FROM ledger WHERE account_id = $1 ORDER BY id ASC',
        [h1Acc1Id]
      );

      let prevHash = GENESIS_HASH;
      for (const row of allRows.rows) {
        const correctHash = computeLedgerHash(prevHash, {
          txn_id: row.txn_id,
          account_id: row.account_id,
          kind: row.kind,
          amount_paise: row.amount_paise,
          balance_after_paise: row.balance_after_paise,
          initiated_by: row.initiated_by,
          idempotency_key: row.idempotency_key,
          reason: row.reason,
        });
        await restoreClient.query('UPDATE ledger SET prev_hash = $1, hash = $2 WHERE id = $3', [
          prevHash,
          correctHash,
          row.id,
        ]);
        prevHash = correctHash;
      }

      await restoreClient.query('ALTER TABLE ledger ENABLE TRIGGER trg_ledger_prevent_update');
      await restoreClient.query('ALTER TABLE ledger ENABLE TRIGGER trg_ledger_prevent_delete');
    } finally {
      restoreClient.release();
    }

    // 7. Verify should pass again after restoration
    const cleanRes = await request(app)
      .get('/audit/verify')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(cleanRes.status).toBe(200);
    expect(cleanRes.body.verified).toBe(true);
    expect(cleanRes.body.checks.hash_chain.status).toBe('PASSED');
  });
});

// ---------------------------------------------------------------------------
// SECTION 7: GET /audit/duplicates
// ---------------------------------------------------------------------------

describe('GET /audit/duplicates', () => {
  it('admin can list duplicate replays', async () => {
    // First create a replay if one does not already exist
    const replayKey = `phase4-dup-${uuidv4()}`;
    await request(app)
      .post('/deposits')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('Idempotency-Key', replayKey)
      .send({ account_id: h1Acc1Id, amount: 7777 });

    await request(app)
      .post('/deposits')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('Idempotency-Key', replayKey)
      .send({ account_id: h1Acc1Id, amount: 7777 });

    const res = await request(app)
      .get('/audit/duplicates')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('replays');
    expect(Array.isArray(res.body.replays)).toBe(true);
    expect(res.body.replays.length).toBeGreaterThan(0);
    expect(res.body).toHaveProperty('pagination');
  });

  it('replay entries have required fields', async () => {
    const res = await request(app)
      .get('/audit/duplicates')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    const entry = res.body.replays[0];
    expect(entry).toHaveProperty('id');
    expect(entry).toHaveProperty('user_id');
    expect(entry).toHaveProperty('idempotency_key');
    expect(entry).toHaveProperty('request_hash');
    expect(entry).toHaveProperty('replayed_at');
  });

  it('auditor can list duplicate replays', async () => {
    const res = await request(app)
      .get('/audit/duplicates')
      .set('Authorization', `Bearer ${auditorToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('replays');
  });

  it('holder gets 403 on GET /audit/duplicates', async () => {
    const res = await request(app)
      .get('/audit/duplicates')
      .set('Authorization', `Bearer ${holder1Token}`);

    expect(res.status).toBe(403);
  });

  it('requires authentication on GET /audit/duplicates', async () => {
    const res = await request(app).get('/audit/duplicates');
    expect(res.status).toBe(401);
  });

  it('pagination parameters are respected', async () => {
    const res = await request(app)
      .get('/audit/duplicates?limit=1&offset=0')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.pagination.limit).toBe(1);
    expect(res.body.replays.length).toBeLessThanOrEqual(1);
  });
});
