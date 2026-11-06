import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { v4 as uuidv4 } from 'uuid';
import app from '../src/app.js';
import { runMigrations } from '../src/migrate.js';
import { seedDatabase } from '../src/seed.js';
import { closeDb, query } from '../src/db.js';
import { verifyLedgerRow, GENESIS_HASH } from '../src/hash.js';

describe('Phase 3 - Money Movement Core & Endpoints', () => {
  let adminToken;
  let holder1Token;
  let holder2Token;
  let auditorToken;

  let h1Acc1Id;
  let h1Acc2Id;
  let h2Acc1Id;
  let extAccId;

  beforeAll(async () => {
    await runMigrations();
    await seedDatabase();

    // Login users to get tokens
    const adminRes = await request(app).post('/auth/login').send({
      email: 'admin@ledgerline.local',
      password: 'AdminPassword123!',
    });
    adminToken = adminRes.body.token;

    const h1Res = await request(app).post('/auth/login').send({
      email: 'holder1@ledgerline.local',
      password: 'Holder1Password123!',
    });
    holder1Token = h1Res.body.token;

    const h2Res = await request(app).post('/auth/login').send({
      email: 'holder2@ledgerline.local',
      password: 'Holder2Password123!',
    });
    holder2Token = h2Res.body.token;

    const audRes = await request(app).post('/auth/login').send({
      email: 'auditor@ledgerline.local',
      password: 'AuditorPassword123!',
    });
    auditorToken = audRes.body.token;

    // Accounts
    const accRes = await query('SELECT id, account_no FROM accounts ORDER BY id ASC');
    extAccId = accRes.rows.find((a) => a.account_no === 'ACC-EXTERNAL').id;
    h1Acc1Id = accRes.rows.find((a) => a.account_no === 'ACC-H1-01').id;
    h1Acc2Id = accRes.rows.find((a) => a.account_no === 'ACC-H1-02').id;
    h2Acc1Id = accRes.rows.find((a) => a.account_no === 'ACC-H2-01').id;
  });

  afterAll(async () => {
    await closeDb();
  });

  describe('HARD RULE 1: Amount and Input Validations', () => {
    it('should reject missing Idempotency-Key header', async () => {
      const res = await request(app)
        .post('/deposits')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ account_id: h1Acc1Id, amount: 1000 });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('MISSING_IDEMPOTENCY_KEY');
    });

    it('should reject non-integer / floating-point amounts', async () => {
      const res = await request(app)
        .post('/deposits')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('Idempotency-Key', uuidv4())
        .send({ account_id: h1Acc1Id, amount: 50.75 });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Floats are prohibited');
      expect(res.body.code).toBe('INVALID_AMOUNT');
    });

    it('should reject negative and zero amounts', async () => {
      const r1 = await request(app)
        .post('/deposits')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('Idempotency-Key', uuidv4())
        .send({ account_id: h1Acc1Id, amount: -500 });
      expect(r1.status).toBe(400);
      expect(r1.body.code).toBe('INVALID_AMOUNT');

      const r2 = await request(app)
        .post('/deposits')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('Idempotency-Key', uuidv4())
        .send({ account_id: h1Acc1Id, amount: 0 });
      expect(r2.status).toBe(400);
      expect(r2.body.code).toBe('INVALID_AMOUNT');
    });

    it('should reject string amounts', async () => {
      const res = await request(app)
        .post('/deposits')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('Idempotency-Key', uuidv4())
        .send({ account_id: h1Acc1Id, amount: '10000' });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('INVALID_AMOUNT');
    });

    it('should reject amounts exceeding maximum cap (10,000,000 paise)', async () => {
      const res = await request(app)
        .post('/deposits')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('Idempotency-Key', uuidv4())
        .send({ account_id: h1Acc1Id, amount: 10_000_001 });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('AMOUNT_EXCEEDS_CAP');
    });

    it('should reject transfer when from_account == to_account', async () => {
      const res = await request(app)
        .post('/transfers')
        .set('Authorization', `Bearer ${holder1Token}`)
        .set('Idempotency-Key', uuidv4())
        .send({ from_account_id: h1Acc1Id, to_account_id: h1Acc1Id, amount: 500 });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('SAME_ACCOUNT_TRANSFER');
    });
  });

  describe('HARD RULE 2 & 4: Deposits, Withdrawals, Transfers & Double-Entry Conservation', () => {
    it('POST /deposits: admin should deposit funds (debit EXTERNAL, credit account)', async () => {
      const accBefore = await query('SELECT balance_paise FROM accounts WHERE id = $1', [h2Acc1Id]);
      const initialBal = Number(accBefore.rows[0].balance_paise);

      const key = uuidv4();
      const res = await request(app)
        .post('/deposits')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('Idempotency-Key', key)
        .send({ account_id: h2Acc1Id, amount: 100_000 }); // ₹1,000.00

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.amount_paise).toBe(100_000);
      expect(res.body.to_account.balance_after_paise).toBe(initialBal + 100_000);

      // Verify global sum is still 0
      const sumRes = await query('SELECT SUM(balance_paise) as total FROM accounts');
      expect(BigInt(sumRes.rows[0].total)).toBe(0n);
    });

    it('POST /transfers: holder1 transfers funds to holder2 (debit H1, credit H2)', async () => {
      const key = uuidv4();
      const res = await request(app)
        .post('/transfers')
        .set('Authorization', `Bearer ${holder1Token}`)
        .set('Idempotency-Key', key)
        .send({
          from_account_id: h1Acc1Id,
          to_account_id: h2Acc1Id,
          amount: 50_000, // ₹500.00
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.from_account.id).toBe(h1Acc1Id);
      expect(res.body.to_account.id).toBe(h2Acc1Id);

      // Verify global sum is still 0
      const sumRes = await query('SELECT SUM(balance_paise) as total FROM accounts');
      expect(BigInt(sumRes.rows[0].total)).toBe(0n);
    });

    it('POST /withdrawals: holder1 withdraws funds (debit H1, credit EXTERNAL)', async () => {
      const key = uuidv4();
      const res = await request(app)
        .post('/withdrawals')
        .set('Authorization', `Bearer ${holder1Token}`)
        .set('Idempotency-Key', key)
        .send({
          account_id: h1Acc1Id,
          amount: 25_000, // ₹250.00
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.to_account.id).toBe(extAccId);

      // Verify global sum is still 0
      const sumRes = await query('SELECT SUM(balance_paise) as total FROM accounts');
      expect(BigInt(sumRes.rows[0].total)).toBe(0n);
    });
  });

  describe('HARD RULE 3 & 7: Overdraft Protection & Refused Ledger Entries', () => {
    it('should refuse withdrawal exceeding available balance and write kind=refused to ledger', async () => {
      const accRes = await query('SELECT balance_paise FROM accounts WHERE id = $1', [h2Acc1Id]);
      const currentBalance = BigInt(accRes.rows[0].balance_paise);
      const excessiveAmount = Number(currentBalance + 500_000n);

      const key = uuidv4();
      const res = await request(app)
        .post('/withdrawals')
        .set('Authorization', `Bearer ${holder2Token}`)
        .set('Idempotency-Key', key)
        .send({
          account_id: h2Acc1Id,
          amount: excessiveAmount,
        });

      expect(res.status).toBe(422);
      expect(res.body.code).toBe('INSUFFICIENT_FUNDS');
      expect(res.body).toHaveProperty('txn_id');

      // Hard Rule 7: Check that refused attempt was COMMITTED to ledger
      const ledgerRes = await query('SELECT * FROM ledger WHERE txn_id = $1', [res.body.txn_id]);
      expect(ledgerRes.rowCount).toBe(1);
      const row = ledgerRes.rows[0];
      expect(row.kind).toBe('refused');
      expect(row.account_id).toBe(h2Acc1Id);
      expect(row.reason).toContain('Insufficient funds');
      expect(BigInt(row.balance_after_paise)).toBe(currentBalance); // Balance unchanged

      // Check account balance did not change
      const afterRes = await query('SELECT balance_paise FROM accounts WHERE id = $1', [h2Acc1Id]);
      expect(BigInt(afterRes.rows[0].balance_paise)).toBe(currentBalance);
    });
  });

  describe('HARD RULE 5: Idempotency Protection, Replays & Payload Mismatch', () => {
    it('should return identical response with Idempotent-Replay header when repeating same key + body', async () => {
      const key = uuidv4();
      const payload = {
        from_account_id: h1Acc1Id,
        to_account_id: h2Acc1Id,
        amount: 10_000,
      };

      // 1. Initial request
      const firstRes = await request(app)
        .post('/transfers')
        .set('Authorization', `Bearer ${holder1Token}`)
        .set('Idempotency-Key', key)
        .send(payload);

      expect(firstRes.status).toBe(200);
      expect(firstRes.headers['idempotent-replay']).toBeUndefined();
      const initialFromBalance = firstRes.body.from_account.balance_after_paise;

      // 2. Duplicate request with same key and body
      const secondRes = await request(app)
        .post('/transfers')
        .set('Authorization', `Bearer ${holder1Token}`)
        .set('Idempotency-Key', key)
        .send(payload);

      expect(secondRes.status).toBe(200);
      expect(secondRes.headers['idempotent-replay']).toBe('true');
      expect(secondRes.body.txn_id).toBe(firstRes.body.txn_id);

      // Verify money did NOT move again
      const accCheck = await query('SELECT balance_paise FROM accounts WHERE id = $1', [h1Acc1Id]);
      expect(Number(accCheck.rows[0].balance_paise)).toBe(initialFromBalance);

      // Verify replay was logged in idempotency_replays
      const replayLog = await query('SELECT * FROM idempotency_replays WHERE idempotency_key = $1', [key]);
      expect(replayLog.rowCount).toBe(1);
    });

    it('should reject with HTTP 422 if same key is reused with a DIFFERENT body', async () => {
      const key = uuidv4();

      // 1. First request
      await request(app)
        .post('/transfers')
        .set('Authorization', `Bearer ${holder1Token}`)
        .set('Idempotency-Key', key)
        .send({ from_account_id: h1Acc1Id, to_account_id: h2Acc1Id, amount: 5_000 });

      // 2. Second request with different amount
      const mismatchRes = await request(app)
        .post('/transfers')
        .set('Authorization', `Bearer ${holder1Token}`)
        .set('Idempotency-Key', key)
        .send({ from_account_id: h1Acc1Id, to_account_id: h2Acc1Id, amount: 99_999 });

      expect(mismatchRes.status).toBe(422);
      expect(mismatchRes.body.code).toBe('IDEMPOTENCY_KEY_REUSE_PAYLOAD_MISMATCH');
    });

    it('should return stored refusal response when replaying a refused request', async () => {
      const key = uuidv4();
      const payload = { account_id: h2Acc1Id, amount: 9_999_999 };

      // 1. Initial refused request
      const firstRes = await request(app)
        .post('/withdrawals')
        .set('Authorization', `Bearer ${holder2Token}`)
        .set('Idempotency-Key', key)
        .send(payload);

      expect(firstRes.status).toBe(422);
      expect(firstRes.body.code).toBe('INSUFFICIENT_FUNDS');

      // 2. Replay
      const secondRes = await request(app)
        .post('/withdrawals')
        .set('Authorization', `Bearer ${holder2Token}`)
        .set('Idempotency-Key', key)
        .send(payload);

      expect(secondRes.status).toBe(422);
      expect(secondRes.headers['idempotent-replay']).toBe('true');
      expect(secondRes.body.txn_id).toBe(firstRes.body.txn_id);
    });
  });

  describe('HARD RULE 9 & 10: Authorization Restrictions on Money Movements', () => {
    it('holder2 should receive 403 when attempting to transfer from holder1 account', async () => {
      const key = uuidv4();
      const res = await request(app)
        .post('/transfers')
        .set('Authorization', `Bearer ${holder2Token}`)
        .set('Idempotency-Key', key)
        .send({
          from_account_id: h1Acc1Id, // Belongs to Holder 1
          to_account_id: h2Acc1Id,
          amount: 10_000,
        });

      expect(res.status).toBe(403);
      expect(res.body.code).toBe('FORBIDDEN');

      // Verify refused entry was committed in ledger
      const ledgerCheck = await query('SELECT * FROM ledger WHERE idempotency_key = $1', [key]);
      expect(ledgerCheck.rowCount).toBe(1);
      expect(ledgerCheck.rows[0].kind).toBe('refused');
    });

    it('holder should receive 403 when attempting to deposit directly', async () => {
      const key = uuidv4();
      const res = await request(app)
        .post('/deposits')
        .set('Authorization', `Bearer ${holder1Token}`)
        .set('Idempotency-Key', key)
        .send({
          account_id: h1Acc1Id,
          amount: 50_000,
        });

      expect(res.status).toBe(403);
      expect(res.body.code).toBe('FORBIDDEN');
    });

    it('auditor should receive 403 on transfers, withdrawals, and deposits', async () => {
      const key = uuidv4();
      const res = await request(app)
        .post('/transfers')
        .set('Authorization', `Bearer ${auditorToken}`)
        .set('Idempotency-Key', key)
        .send({
          from_account_id: h1Acc1Id,
          to_account_id: h2Acc1Id,
          amount: 10_000,
        });

      expect(res.status).toBe(403);
      expect(res.body.code).toBe('FORBIDDEN');
    });
  });

  describe('HARD RULE 8: Hash Chain Verification Across All Ledger Entries', () => {
    it('should verify that all ledger entries adhere to sha256 hash chaining', async () => {
      const accRes = await query('SELECT DISTINCT account_id FROM ledger');
      const accountIds = accRes.rows.map((r) => r.account_id);

      for (const accId of accountIds) {
        const rowsRes = await query('SELECT * FROM ledger WHERE account_id = $1 ORDER BY id ASC', [accId]);
        let expectedPrev = GENESIS_HASH;

        for (const row of rowsRes.rows) {
          const verification = verifyLedgerRow(row, expectedPrev);
          expect(verification.valid).toBe(true);
          expectedPrev = row.hash;
        }
      }
    });
  });
});
