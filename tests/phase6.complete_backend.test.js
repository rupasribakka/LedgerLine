import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { v4 as uuidv4 } from 'uuid';
import app from '../src/app.js';
import { runMigrations } from '../src/migrate.js';
import { seedDatabase } from '../src/seed.js';
import { closeDb, query, getClient } from '../src/db.js';

describe('Phase 6 - Complete Backend Specification & Security Suite', () => {
  let adminToken;
  let holder1Token;
  let holder2Token;
  let auditorToken;

  let adminUser;
  let holder1User;
  let holder2User;
  let auditorUser;

  let h1Acc1Id;
  let h1Acc2Id;
  let h2Acc1Id;
  let extAccId;

  beforeAll(async () => {
    await runMigrations();
    await seedDatabase();

    // Login users to obtain tokens
    const adminRes = await request(app).post('/api/auth/login').send({
      email: 'admin@ledgerline.local',
      password: 'AdminPassword123!',
    });
    adminToken = adminRes.body.token;
    adminUser = adminRes.body.user;

    const h1Res = await request(app).post('/api/auth/login').send({
      email: 'holder1@ledgerline.local',
      password: 'Holder1Password123!',
    });
    holder1Token = h1Res.body.token;
    holder1User = h1Res.body.user;

    const h2Res = await request(app).post('/api/auth/login').send({
      email: 'holder2@ledgerline.local',
      password: 'Holder2Password123!',
    });
    holder2Token = h2Res.body.token;
    holder2User = h2Res.body.user;

    const audRes = await request(app).post('/api/auth/login').send({
      email: 'auditor@ledgerline.local',
      password: 'AuditorPassword123!',
    });
    auditorToken = audRes.body.token;
    auditorUser = audRes.body.user;

    // Resolve initial accounts
    const accRes = await query('SELECT id, account_no FROM accounts ORDER BY id ASC');
    extAccId = accRes.rows.find((a) => a.account_no === 'ACC-EXTERNAL').id;
    h1Acc1Id = accRes.rows.find((a) => a.account_no === 'ACC-H1-01').id;
    h1Acc2Id = accRes.rows.find((a) => a.account_no === 'ACC-H1-02').id;
    h2Acc1Id = accRes.rows.find((a) => a.account_no === 'ACC-H2-01').id;
  }, 40000);

  afterAll(async () => {
    await closeDb();
  });

  // =========================================================================
  // 1. AUTHENTICATION & AUTHORIZATION (Section 6)
  // =========================================================================
  describe('1. Authentication & User Management (POST /api/auth/*)', () => {
    const testNewEmail = `newholder_${Date.now()}@ledgerline.local`;

    it('POST /api/auth/register: should successfully register a new account holder', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: testNewEmail,
          password: 'SecurePassword123!',
          name: 'Newly Registered Holder',
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('token');
      expect(res.body.user).toHaveProperty('id');
      expect(res.body.user.email).toBe(testNewEmail);
      expect(res.body.user.role).toBe('holder');
      expect(res.body.user).not.toHaveProperty('password_hash');
    });

    it('POST /api/auth/register: should reject duplicate email with 409 Conflict', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: testNewEmail,
          password: 'AnotherPassword123!',
          name: 'Duplicate Holder',
        });

      expect(res.status).toBe(409);
      expect(res.body.code).toBe('EMAIL_ALREADY_EXISTS');
    });

    it('POST /api/auth/register: should reject weak password (< 8 chars)', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: `weak_${Date.now()}@ledgerline.local`,
          password: 'short',
          name: 'Weak Password User',
        });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('WEAK_PASSWORD');
    });

    it('POST /api/auth/register: should reject unauthorized role escalation to admin by unauthenticated user', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: `fakeadmin_${Date.now()}@ledgerline.local`,
          password: 'SecurePassword123!',
          name: 'Fake Admin',
          role: 'admin',
        });

      expect(res.status).toBe(403);
      expect(res.body.code).toBe('UNAUTHORIZED_ROLE_ESCALATION');
    });

    it('POST /api/auth/register: should reject unauthorized role escalation to auditor by unauthenticated user', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: `fakeauditor_${Date.now()}@ledgerline.local`,
          password: 'SecurePassword123!',
          name: 'Fake Auditor',
          role: 'auditor',
        });

      expect(res.status).toBe(403);
      expect(res.body.code).toBe('UNAUTHORIZED_ROLE_ESCALATION');
    });

    it('POST /api/auth/register: should reject role escalation to auditor by authenticated holder', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .set('Authorization', `Bearer ${holder1Token}`)
        .send({
          email: `holder_escalate_${Date.now()}@ledgerline.local`,
          password: 'SecurePassword123!',
          name: 'Unauthorized Escalation',
          role: 'auditor',
        });

      expect(res.status).toBe(403);
      expect(res.body.code).toBe('UNAUTHORIZED_ROLE_ESCALATION');
    });

    it('POST /api/auth/register: should ALLOW authenticated admin with bearer token to create an auditor', async () => {
      const auditorEmail = `admin_created_auditor_${Date.now()}@ledgerline.local`;
      const res = await request(app)
        .post('/api/auth/register')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: auditorEmail,
          password: 'SecurePassword123!',
          name: 'Provisioned Auditor',
          role: 'auditor',
        });

      expect(res.status).toBe(201);
      expect(res.body.user).toHaveProperty('id');
      expect(res.body.user.email).toBe(auditorEmail);
      expect(res.body.user.role).toBe('auditor');
    });

    it('POST /api/auth/register: should ALLOW authenticated admin with bearer token to create another admin', async () => {
      const subAdminEmail = `admin_created_admin_${Date.now()}@ledgerline.local`;
      const res = await request(app)
        .post('/api/auth/register')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: subAdminEmail,
          password: 'SecurePassword123!',
          name: 'Co-Administrator',
          role: 'admin',
        });

      expect(res.status).toBe(201);
      expect(res.body.user).toHaveProperty('id');
      expect(res.body.user.email).toBe(subAdminEmail);
      expect(res.body.user.role).toBe('admin');
    });

    it('POST /api/auth/logout: should successfully acknowledge logout', async () => {
      const res = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${holder1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('logged out');
    });

    it('GET /api/auth/me: should return the authenticated user profile', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${holder1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.user.email).toBe('holder1@ledgerline.local');
      expect(res.body.user.role).toBe('holder');
    });
  });

  // =========================================================================
  // 2. ACCOUNT MANAGEMENT, STATUS LIFECYCLE & OPENING BALANCE (Section 7)
  // =========================================================================
  describe('2. Account Management & Status Lifecycle (Section 7)', () => {
    let newManagedAccountId;

    it('POST /api/accounts: creates account with properly recorded opening balance entry in ONE transaction', async () => {
      const initialDepositPaise = 50_000; // ₹500.00
      const res = await request(app)
        .post('/api/accounts')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Holder 1 Opening Balance Checking',
          owner_id: holder1User.id,
          initial_balance_paise: initialDepositPaise,
        });

      expect(res.status).toBe(201);
      expect(res.body.account).toHaveProperty('id');
      expect(res.body.account.balance_paise).toBe(initialDepositPaise);
      expect(res.body.account.status).toBe('ACTIVE');
      newManagedAccountId = res.body.account.id;

      // (1) The sum of all account balances is still 0
      const sumRes = await query('SELECT SUM(balance_paise) as total FROM accounts');
      expect(BigInt(sumRes.rows[0].total)).toBe(0n);

      // (2) The new account has a ledger credit row for the opening amount
      const creditRes = await query(
        'SELECT * FROM ledger WHERE account_id = $1 AND kind = $2',
        [newManagedAccountId, 'credit']
      );
      expect(creditRes.rowCount).toBe(1);
      expect(BigInt(creditRes.rows[0].amount_paise)).toBe(BigInt(initialDepositPaise));
      const openTxnId = creditRes.rows[0].txn_id;

      // (3) ACC-EXTERNAL has the matching debit row
      const debitRes = await query(
        'SELECT * FROM ledger WHERE txn_id = $1 AND account_id = $2 AND kind = $3',
        [openTxnId, extAccId, 'debit']
      );
      expect(debitRes.rowCount).toBe(1);
      expect(BigInt(debitRes.rows[0].amount_paise)).toBe(BigInt(initialDepositPaise));

      // (4) GET /audit/verify passes
      const auditRes = await request(app)
        .get('/audit/verify')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(auditRes.status).toBe(200);
      expect(auditRes.body.verified).toBe(true);
      expect(auditRes.body.checks.global_conservation.status).toBe('PASSED');
    });

    it('POST /accounts with invalid opening balance rolls back atomically: no account, no ledger rows', async () => {
      const excessiveDepositPaise = 15_000_000; // Above 10,000,000 paise MAX_AMOUNT_PAISE cap
      const uniqueAccountName = `Atomic Rollback Test ${Date.now()}`;

      const res = await request(app)
        .post('/accounts')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: uniqueAccountName,
          owner_id: holder1User.id,
          initial_balance_paise: excessiveDepositPaise,
        });

      // 1. Assert response is an error
      expect(res.status).toBeGreaterThanOrEqual(400);
      expect(res.body).toHaveProperty('error');

      // 2. Assert no account row was created in the database
      const accCheck = await query('SELECT * FROM accounts WHERE name = $1', [uniqueAccountName]);
      expect(accCheck.rowCount).toBe(0);

      // 3. Assert no ledger rows were written for this attempted account
      const ledgerCheck = await query(
        'SELECT * FROM ledger WHERE amount_paise = $1',
        [excessiveDepositPaise]
      );
      expect(ledgerCheck.rowCount).toBe(0);

      // 4. Assert sum of all account balances is still 0
      const sumRes = await query('SELECT SUM(balance_paise) as total FROM accounts');
      expect(BigInt(sumRes.rows[0].total)).toBe(0n);
    });

    it('GET /api/accounts/:id/balance: returns balance and status for account owner', async () => {
      const res = await request(app)
        .get(`/api/accounts/${newManagedAccountId}/balance`)
        .set('Authorization', `Bearer ${holder1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.account.id).toBe(newManagedAccountId);
      expect(res.body.account.balance_paise).toBe(50_000);
      expect(res.body.account.status).toBe('ACTIVE');
    });

    it('GET /api/accounts/:id/balance: rejects unauthorized access from different holder (IDOR guard)', async () => {
      const res = await request(app)
        .get(`/api/accounts/${newManagedAccountId}/balance`)
        .set('Authorization', `Bearer ${holder2Token}`);

      expect(res.status).toBe(403);
      expect(res.body.code).toBe('FORBIDDEN');
    });

    it('PATCH /api/accounts/:id/status: admin can freeze an active account', async () => {
      const res = await request(app)
        .patch(`/api/accounts/${newManagedAccountId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'FROZEN' });

      expect(res.status).toBe(200);
      expect(res.body.account.status).toBe('FROZEN');
    });

    it('Financial operations reject transactions on FROZEN accounts', async () => {
      const res = await request(app)
        .post('/api/transactions/withdraw')
        .set('Authorization', `Bearer ${holder1Token}`)
        .set('Idempotency-Key', uuidv4())
        .send({
          account_id: newManagedAccountId,
          amount: 10_000,
        });

      expect(res.status).toBe(403);
      expect(res.body.code).toBe('ACCOUNT_FROZEN');
      expect(res.body.error).toContain('FROZEN');
    });

    it('PATCH /api/accounts/:id/status: non-admin gets 403 Forbidden', async () => {
      const res = await request(app)
        .patch(`/api/accounts/${newManagedAccountId}/status`)
        .set('Authorization', `Bearer ${holder1Token}`)
        .send({ status: 'ACTIVE' });

      expect(res.status).toBe(403);
      expect(res.body.code).toBe('FORBIDDEN');
    });

    it('PATCH /api/accounts/:id/status: admin can unfreeze account back to ACTIVE', async () => {
      const res = await request(app)
        .patch(`/api/accounts/${newManagedAccountId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'ACTIVE' });

      expect(res.status).toBe(200);
      expect(res.body.account.status).toBe('ACTIVE');
    });

    it('PATCH /api/accounts/:id/status: admin can close an account and reject operations', async () => {
      // Create a temporary account to close
      const accRes = await request(app)
        .post('/api/accounts')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Account to Close', owner_id: holder2User.id });

      const closeAccId = accRes.body.account.id;

      // Close it
      const closeRes = await request(app)
        .patch(`/api/accounts/${closeAccId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'CLOSED' });

      expect(closeRes.status).toBe(200);
      expect(closeRes.body.account.status).toBe('CLOSED');

      // Attempt to transfer to the closed account
      const transferRes = await request(app)
        .post('/api/transactions/transfer')
        .set('Authorization', `Bearer ${holder1Token}`)
        .set('Idempotency-Key', uuidv4())
        .send({
          from_account_id: h1Acc1Id,
          to_account_id: closeAccId,
          amount: 5_000,
        });

      expect(transferRes.status).toBe(403);
      expect(transferRes.body.code).toBe('ACCOUNT_CLOSED');
    });
  });

  // =========================================================================
  // 3. CONCURRENCY & DOUBLE SPENDING PROTECTION (Section 11)
  // =========================================================================
  describe('3. Concurrency Protection & Double Spending Prevention (Section 11)', () => {
    it('simultaneous withdrawals: exactly ONE request succeeds, balance remains positive', async () => {
      // 1. Create a fresh account with exactly ₹1,000.00 (100,000 paise)
      const createAccRes = await request(app)
        .post('/api/accounts')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Concurrency Race Test Account',
          owner_id: holder1User.id,
          initial_balance_paise: 100_000,
        });

      const raceAccId = createAccRes.body.account.id;

      // 2. Fire TWO simultaneous withdrawal requests for ₹800.00 (80,000 paise) each
      // Total attempted: ₹1,600.00 against an available balance of ₹1,000.00
      const keyA = `concurrency-a-${uuidv4()}`;
      const keyB = `concurrency-b-${uuidv4()}`;

      const [resA, resB] = await Promise.all([
        request(app)
          .post('/api/transactions/withdraw')
          .set('Authorization', `Bearer ${holder1Token}`)
          .set('Idempotency-Key', keyA)
          .send({ account_id: raceAccId, amount: 80_000 }),
        request(app)
          .post('/api/transactions/withdraw')
          .set('Authorization', `Bearer ${holder1Token}`)
          .set('Idempotency-Key', keyB)
          .send({ account_id: raceAccId, amount: 80_000 }),
      ]);

      const statuses = [resA.status, resB.status].sort();

      // Exactly ONE request must succeed (200) and ONE must fail with insufficient funds (422)
      expect(statuses).toEqual([200, 422]);

      const successRes = resA.status === 200 ? resA : resB;
      const failedRes = resA.status === 422 ? resA : resB;

      expect(successRes.body.success).toBe(true);
      expect(failedRes.body.code).toBe('INSUFFICIENT_FUNDS');

      // 3. Final balance check: must be exactly 20,000 paise (₹200.00), NEVER negative
      const checkRes = await query('SELECT balance_paise FROM accounts WHERE id = $1', [raceAccId]);
      const finalBalance = Number(checkRes.rows[0].balance_paise);
      expect(finalBalance).toBe(20_000);

      // 4. Verify global zero conservation
      const sumRes = await query('SELECT SUM(balance_paise) as total FROM accounts');
      expect(BigInt(sumRes.rows[0].total)).toBe(0n);
    });

    it('high-concurrency race condition: multiple parallel requests and repeated rounds strictly prevent double spending', async () => {
      // Multiple repeated rounds of parallel concurrent withdrawals
      for (let round = 1; round <= 3; round++) {
        // Create an account with exactly ₹1,000.00 (100,000 paise)
        const accRes = await request(app)
          .post('/api/accounts')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            name: `Concurrency Stress Round ${round} ${Date.now()}`,
            owner_id: holder1User.id,
            initial_balance_paise: 100_000,
          });
        const stressAccId = accRes.body.account.id;

        // Fire 10 parallel withdrawal requests of 20,000 paise each
        // Total attempted: 200,000 paise against an available balance of 100,000 paise
        // Exactly 5 MUST succeed (5 * 20,000 = 100,000) and exactly 5 MUST fail (422)
        const requests = Array.from({ length: 10 }, (_, i) =>
          request(app)
            .post('/api/transactions/withdraw')
            .set('Authorization', `Bearer ${holder1Token}`)
            .set('Idempotency-Key', `stress-r${round}-${i}-${uuidv4()}`)
            .send({ account_id: stressAccId, amount: 20_000 })
        );

        const responses = await Promise.all(requests);
        const successes = responses.filter((r) => r.status === 200);
        const failures = responses.filter((r) => r.status === 422);

        expect(successes.length).toBe(5);
        expect(failures.length).toBe(5);

        for (const f of failures) {
          expect(f.body.code).toBe('INSUFFICIENT_FUNDS');
        }

        // Final balance must be exactly 0 paise, never negative
        const checkRes = await query('SELECT balance_paise FROM accounts WHERE id = $1', [stressAccId]);
        expect(Number(checkRes.rows[0].balance_paise)).toBe(0);

        // Global conservation verified
        const sumRes = await query('SELECT SUM(balance_paise) as total FROM accounts');
        expect(BigInt(sumRes.rows[0].total)).toBe(0n);
      }
    });

    it('simultaneous circular transfers: both complete without deadlocking', async () => {
      // Create fresh dedicated accounts with sufficient funds for both transfers in either order
      const acc1Res = await request(app)
        .post('/api/accounts')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Circular Transfer Account 1',
          owner_id: holder1User.id,
          initial_balance_paise: 50_000, // ₹500.00
        });
      const circularAcc1Id = acc1Res.body.account.id;

      const acc2Res = await request(app)
        .post('/api/accounts')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Circular Transfer Account 2',
          owner_id: holder2User.id,
          initial_balance_paise: 50_000, // ₹500.00
        });
      const circularAcc2Id = acc2Res.body.account.id;

      // Both accounts start with 50,000 paise (well above the 10,000 paise transfer amount).
      // This guarantees that whichever transfer acquires the lock first will find sufficient funds.
      const key1 = `circular-1-${uuidv4()}`;
      const key2 = `circular-2-${uuidv4()}`;

      const [res1, res2] = await Promise.all([
        request(app)
          .post('/api/transactions/transfer')
          .set('Authorization', `Bearer ${holder1Token}`)
          .set('Idempotency-Key', key1)
          .send({
            from_account_id: circularAcc1Id,
            to_account_id: circularAcc2Id,
            amount: 10_000,
          }),
        request(app)
          .post('/api/transactions/transfer')
          .set('Authorization', `Bearer ${holder2Token}`)
          .set('Idempotency-Key', key2)
          .send({
            from_account_id: circularAcc2Id,
            to_account_id: circularAcc1Id,
            amount: 10_000,
          }),
      ]);

      expect(res1.status).toBe(200);
      expect(res2.status).toBe(200);
      expect(res1.body.success).toBe(true);
      expect(res2.body.success).toBe(true);

      // Verify final balances of both accounts: 50,000 - 10,000 + 10,000 = 50,000 paise
      const b1Check = await query('SELECT balance_paise FROM accounts WHERE id = $1', [circularAcc1Id]);
      const b2Check = await query('SELECT balance_paise FROM accounts WHERE id = $1', [circularAcc2Id]);
      expect(Number(b1Check.rows[0].balance_paise)).toBe(50_000);
      expect(Number(b2Check.rows[0].balance_paise)).toBe(50_000);

      // Verify global sum is still 0
      const sumRes = await query('SELECT SUM(balance_paise) as total FROM accounts');
      expect(BigInt(sumRes.rows[0].total)).toBe(0n);
    });
  });

  // =========================================================================
  // 4. TRANSACTIONS & LEDGER API ENDPOINTS (Section 14)
  // =========================================================================
  describe('4. Transactions & Ledger API Endpoints (Section 14)', () => {
    let recordedTxnId;

    it('POST /api/transactions/transfer: records in transactions table and creates double-entry journal', async () => {
      const key = `api-transfer-${uuidv4()}`;
      const res = await request(app)
        .post('/api/transactions/transfer')
        .set('Authorization', `Bearer ${holder1Token}`)
        .set('Idempotency-Key', key)
        .send({
          from_account_id: h1Acc1Id,
          to_account_id: h2Acc1Id,
          amount: 15_000,
        });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('txn_id');
      recordedTxnId = res.body.txn_id;

      // Verify record exists in transactions table
      const dbTxn = await query('SELECT * FROM transactions WHERE id = $1', [recordedTxnId]);
      expect(dbTxn.rowCount).toBe(1);
      expect(dbTxn.rows[0].status).toBe('completed');
      expect(dbTxn.rows[0].type).toBe('transfer');
      expect(Number(dbTxn.rows[0].amount_paise)).toBe(15_000);
    });

    it('GET /api/transactions: lists transactions with role-based scoping', async () => {
      // Holder 1 sees transactions involving their account
      const h1Res = await request(app)
        .get('/api/transactions')
        .set('Authorization', `Bearer ${holder1Token}`);

      expect(h1Res.status).toBe(200);
      expect(h1Res.body).toHaveProperty('transactions');
      expect(h1Res.body.transactions.length).toBeGreaterThan(0);

      // Admin sees all transactions
      const adminRes = await request(app)
        .get('/api/transactions')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(adminRes.status).toBe(200);
      expect(adminRes.body.transactions.length).toBeGreaterThanOrEqual(h1Res.body.transactions.length);
    });

    it('GET /api/transactions/:id: retrieves transaction details and paired ledger entries', async () => {
      const res = await request(app)
        .get(`/api/transactions/${recordedTxnId}`)
        .set('Authorization', `Bearer ${holder1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.transaction.id).toBe(recordedTxnId);
      expect(res.body.transaction.status).toBe('completed');
      expect(res.body.entries).toHaveLength(2); // Paired debit & credit

      const kinds = res.body.entries.map((e) => e.kind).sort();
      expect(kinds).toEqual(['credit', 'debit']);
    });

    it('GET /api/ledger: retrieves paginated raw ledger journal entries', async () => {
      const res = await request(app)
        .get('/api/ledger')
        .set('Authorization', `Bearer ${auditorToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('entries');
      expect(Array.isArray(res.body.entries)).toBe(true);
      expect(res.body.entries[0]).toHaveProperty('hash');
      expect(res.body.entries[0]).toHaveProperty('prev_hash');
    });

    it('GET /api/ledger/:transactionId: retrieves entries for a single transaction', async () => {
      const res = await request(app)
        .get(`/api/ledger/${recordedTxnId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.txn_id).toBe(recordedTxnId);
      expect(res.body.entries).toHaveLength(2);
    });

    it('GET /api/ledger/verify: confirms system integrity and balance reconciliation', async () => {
      const res = await request(app)
        .get('/api/ledger/verify')
        .set('Authorization', `Bearer ${auditorToken}`);

      expect(res.status).toBe(200);
      expect(res.body.verified).toBe(true);
      expect(res.body.checks.global_conservation.status).toBe('PASSED');
      expect(res.body.checks.hash_chain.status).toBe('PASSED');
      expect(res.body.checks.balance_reconciliation.status).toBe('PASSED');
    });
  });

  // =========================================================================
  // 5. AUDIT LOGGING & ADMINISTRATIVE OVERVIEW (Section 13 & 14)
  // =========================================================================
  describe('5. Audit Logging & Administrative Controls', () => {
    it('GET /api/audit: lists structured immutable audit logs for auditor and admin', async () => {
      const res = await request(app)
        .get('/api/audit')
        .set('Authorization', `Bearer ${auditorToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('audit_logs');
      expect(res.body.audit_logs.length).toBeGreaterThan(0);

      const log = res.body.audit_logs[0];
      expect(log).toHaveProperty('id');
      expect(log).toHaveProperty('action');
      expect(log).toHaveProperty('resource');
      expect(log).toHaveProperty('outcome');
      expect(log).toHaveProperty('created_at');
    });

    it('GET /api/audit: rejects regular account holders with 403 Forbidden', async () => {
      const res = await request(app)
        .get('/api/audit')
        .set('Authorization', `Bearer ${holder1Token}`);

      expect(res.status).toBe(403);
      expect(res.body.code).toBe('FORBIDDEN');
    });

    it('GET /api/audit/:id: retrieves a specific audit log entry', async () => {
      const listRes = await request(app)
        .get('/api/audit?limit=1')
        .set('Authorization', `Bearer ${adminToken}`);

      const firstLogId = listRes.body.audit_logs[0].id;

      const singleRes = await request(app)
        .get(`/api/audit/${firstLogId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(singleRes.status).toBe(200);
      expect(singleRes.body.audit_log.id).toBe(firstLogId);
      // Ensure no raw passwords leaked into metadata
      if (singleRes.body.audit_log.metadata) {
        expect(JSON.stringify(singleRes.body.audit_log.metadata)).not.toContain('AdminPassword123!');
      }
    });

    it('GET /api/admin/users: lists registered users for admin', async () => {
      const res = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('users');
      expect(res.body.users.length).toBeGreaterThanOrEqual(4);
      expect(res.body.users[0]).not.toHaveProperty('password_hash');
    });

    it('GET /api/admin/users: rejects non-admin users with 403 Forbidden', async () => {
      const res = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${holder1Token}`);

      expect(res.status).toBe(403);
      expect(res.body.code).toBe('FORBIDDEN');
    });

    it('GET /api/admin/overview: returns comprehensive financial and operational statistics', async () => {
      const res = await request(app)
        .get('/api/admin/overview')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('overview');
      const overview = res.body.overview;
      expect(overview.users.total).toBeGreaterThanOrEqual(4);
      expect(overview.accounts.active).toBeGreaterThan(0);
      expect(overview.accounts.customer_deposits_paise).toBeGreaterThan(0);
      expect(overview.transactions.total).toBeGreaterThan(0);
      expect(overview.system_integrity.verified).toBe(true);
      expect(overview.system_integrity.global_conservation).toBe('PASSED');
    });
  });

  // =========================================================================
  // 6. DB IMMUTABILITY OF AUDIT LOGS (Section 13)
  // =========================================================================
  describe('6. Database Immutability of Audit Logs', () => {
    it('should reject UPDATE on audit_logs table via database trigger', async () => {
      const client = await getClient();
      let errorCaught = false;
      try {
        await client.query('UPDATE audit_logs SET outcome = $1 WHERE id = 1', ['TAMPERED']);
      } catch (err) {
        errorCaught = true;
        expect(err.message).toMatch(/Audit logs are immutable/i);
      } finally {
        client.release();
      }
      expect(errorCaught).toBe(true);
    });

    it('should reject DELETE on audit_logs table via database trigger', async () => {
      const client = await getClient();
      let errorCaught = false;
      try {
        await client.query('DELETE FROM audit_logs WHERE id = 1');
      } catch (err) {
        errorCaught = true;
        expect(err.message).toMatch(/Audit logs are immutable/i);
      } finally {
        client.release();
      }
      expect(errorCaught).toBe(true);
    });
  });
});
