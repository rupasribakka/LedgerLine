import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { runMigrations } from '../src/migrate.js';
import { seedDatabase } from '../src/seed.js';
import { closeDb, query } from '../src/db.js';
import { canMoveFrom, signToken, loginLimiter } from '../src/auth.js';

describe('Phase 2 - Authentication, Authorization, Role Enforcement & Accounts', () => {
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

    // Retrieve users from DB
    const usersRes = await query('SELECT id, email, role FROM users ORDER BY id ASC');
    const users = usersRes.rows;
    adminUser = users.find((u) => u.role === 'admin');
    holder1User = users.find((u) => u.email === 'holder1@ledgerline.local');
    holder2User = users.find((u) => u.email === 'holder2@ledgerline.local');
    auditorUser = users.find((u) => u.role === 'auditor');

    // Retrieve accounts from DB
    const accRes = await query('SELECT id, account_no FROM accounts ORDER BY id ASC');
    extAccId = accRes.rows.find((a) => a.account_no === 'ACC-EXTERNAL').id;
    h1Acc1Id = accRes.rows.find((a) => a.account_no === 'ACC-H1-01').id;
    h1Acc2Id = accRes.rows.find((a) => a.account_no === 'ACC-H1-02').id;
    h2Acc1Id = accRes.rows.find((a) => a.account_no === 'ACC-H2-01').id;
  });

  afterAll(async () => {
    await closeDb();
  });

  describe('Login & Rate Limiting (POST /auth/login)', () => {
    it('should authenticate admin and return token + user details', async () => {
      const res = await request(app).post('/auth/login').send({
        email: 'admin@ledgerline.local',
        password: 'AdminPassword123!',
      });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('token');
      expect(res.body.user.role).toBe('admin');
      adminToken = res.body.token;
    });

    it('should authenticate holder1, holder2, and auditor', async () => {
      const r1 = await request(app).post('/auth/login').send({
        email: 'holder1@ledgerline.local',
        password: 'Holder1Password123!',
      });
      expect(r1.status).toBe(200);
      holder1Token = r1.body.token;

      const r2 = await request(app).post('/auth/login').send({
        email: 'holder2@ledgerline.local',
        password: 'Holder2Password123!',
      });
      expect(r2.status).toBe(200);
      holder2Token = r2.body.token;

      const r3 = await request(app).post('/auth/login').send({
        email: 'auditor@ledgerline.local',
        password: 'AuditorPassword123!',
      });
      expect(r3.status).toBe(200);
      auditorToken = r3.body.token;
    });

    it('should reject invalid password with 401 and not leak details', async () => {
      const res = await request(app).post('/auth/login').send({
        email: 'admin@ledgerline.local',
        password: 'WrongPassword!',
      });

      expect(res.status).toBe(401);
      expect(res.body).toEqual({
        error: 'Invalid email or password.',
        code: 'INVALID_CREDENTIALS',
      });
    });

    it('should reject non-existent user with 401', async () => {
      const res = await request(app).post('/auth/login').send({
        email: 'ghost@ledgerline.local',
        password: 'SomePassword123!',
      });

      expect(res.status).toBe(401);
      expect(res.body.code).toBe('INVALID_CREDENTIALS');
    });

    it('should rate limit after repeated failed login attempts', async () => {
      const targetEmail = 'bruteforce_target@ledgerline.local';
      loginLimiter.reset(`127.0.0.1:${targetEmail}`);

      // Perform 5 failed attempts
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post('/auth/login')
          .send({ email: targetEmail, password: 'bad' });
      }

      // 6th attempt must trigger rate limit
      const rateLimitedRes = await request(app)
        .post('/auth/login')
        .send({ email: targetEmail, password: 'bad' });

      expect(rateLimitedRes.status).toBe(429);
      expect(rateLimitedRes.body.code).toBe('RATE_LIMITED');

      // Reset limiter cleanup
      loginLimiter.reset(`127.0.0.1:${targetEmail}`);
    });
  });

  describe('JWT Verification & Server-Side Authorization (Hard Rule 9)', () => {
    it('should reject requests without authorization header', async () => {
      const res = await request(app).get('/accounts');
      expect(res.status).toBe(401);
      expect(res.body.code).toBe('UNAUTHORIZED');
    });

    it('should reject requests with invalid/tampered token', async () => {
      const res = await request(app)
        .get('/accounts')
        .set('Authorization', 'Bearer invalid.tampered.token');
      expect(res.status).toBe(401);
      expect(res.body.code).toBe('INVALID_TOKEN');
    });

    it('should re-read role and user data fresh from database (Rule 9)', async () => {
      // Create token with claims
      const token = signToken({ id: holder1User.id, role: 'holder' });

      const res = await request(app)
        .get('/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.user.id).toBe(holder1User.id);
      expect(res.body.user.role).toBe('holder');
    });
  });

  describe('Server-Side canMoveFrom Authorization Helper (Hard Rule 9 & 10)', () => {
    it('admin should be permitted to move from any non-external account', async () => {
      const res = await canMoveFrom(adminUser, h1Acc1Id);
      expect(res.allowed).toBe(true);
    });

    it('holder1 should be permitted to move from own account ACC-H1-01', async () => {
      const res = await canMoveFrom(holder1User, h1Acc1Id);
      expect(res.allowed).toBe(true);
    });

    it('holder1 should NOT be permitted to move from holder2 account ACC-H2-01', async () => {
      const res = await canMoveFrom(holder1User, h2Acc1Id);
      expect(res.allowed).toBe(false);
      expect(res.reason).toContain('Holder does not own this account');
    });

    it('holder1 should NOT be permitted to move from EXTERNAL clearing account', async () => {
      const res = await canMoveFrom(holder1User, extAccId);
      expect(res.allowed).toBe(false);
      expect(res.reason).toContain('Holders cannot move funds from external');
    });

    it('auditor must be denied on every write/movement (Rule 10)', async () => {
      const res = await canMoveFrom(auditorUser, h1Acc1Id);
      expect(res.allowed).toBe(false);
      expect(res.reason).toContain('Auditor role is strictly read-only');
    });
  });

  describe('Accounts API Endpoints (GET /accounts, POST /accounts, GET /accounts/:id)', () => {
    it('GET /accounts: admin should see all accounts', async () => {
      const res = await request(app)
        .get('/accounts')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.accounts.length).toBeGreaterThanOrEqual(4);
      const accNos = res.body.accounts.map((a) => a.account_no);
      expect(accNos).toContain('ACC-EXTERNAL');
      expect(accNos).toContain('ACC-H1-01');
      expect(accNos).toContain('ACC-H2-01');
    });

    it('GET /accounts: auditor should see all accounts (read-only)', async () => {
      const res = await request(app)
        .get('/accounts')
        .set('Authorization', `Bearer ${auditorToken}`);

      expect(res.status).toBe(200);
      expect(res.body.accounts.length).toBeGreaterThanOrEqual(4);
    });

    it('GET /accounts: holder1 should ONLY see their own accounts', async () => {
      const res = await request(app)
        .get('/accounts')
        .set('Authorization', `Bearer ${holder1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.accounts.length).toBe(2);
      res.body.accounts.forEach((acc) => {
        expect(acc.owner_id).toBe(holder1User.id);
      });
      const accNos = res.body.accounts.map((a) => a.account_no);
      expect(accNos).toContain('ACC-H1-01');
      expect(accNos).toContain('ACC-H1-02');
      expect(accNos).not.toContain('ACC-H2-01');
      expect(accNos).not.toContain('ACC-EXTERNAL');
    });

    it('POST /accounts: admin should be able to create a new account for holder2', async () => {
      const res = await request(app)
        .post('/accounts')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Holder 2 Secondary Account',
          owner_id: holder2User.id,
        });

      expect(res.status).toBe(201);
      expect(res.body.account).toHaveProperty('account_no');
      expect(res.body.account.name).toBe('Holder 2 Secondary Account');
      expect(res.body.account.owner_id).toBe(holder2User.id);
      expect(res.body.account.balance_paise).toBe(0);
      expect(res.body.account.is_external).toBe(false);
    });

    it('POST /accounts: holder should receive 403 Forbidden', async () => {
      const res = await request(app)
        .post('/accounts')
        .set('Authorization', `Bearer ${holder1Token}`)
        .send({
          name: 'Unauthorized Account',
          owner_id: holder1User.id,
        });

      expect(res.status).toBe(403);
      expect(res.body.code).toBe('FORBIDDEN');
    });

    it('POST /accounts: auditor should receive 403 Forbidden', async () => {
      const res = await request(app)
        .post('/accounts')
        .set('Authorization', `Bearer ${auditorToken}`)
        .send({
          name: 'Auditor Cannot Create',
          owner_id: holder1User.id,
        });

      expect(res.status).toBe(403);
      expect(res.body.code).toBe('FORBIDDEN');
    });

    it('GET /accounts/:id: holder1 can view own account ACC-H1-01', async () => {
      const res = await request(app)
        .get(`/accounts/${h1Acc1Id}`)
        .set('Authorization', `Bearer ${holder1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.account.id).toBe(h1Acc1Id);
      expect(res.body.account.account_no).toBe('ACC-H1-01');
    });

    it('GET /accounts/:id: holder1 CANNOT view holder2 account ACC-H2-01 (403 Forbidden)', async () => {
      const res = await request(app)
        .get(`/accounts/${h2Acc1Id}`)
        .set('Authorization', `Bearer ${holder1Token}`);

      expect(res.status).toBe(403);
      expect(res.body).toEqual({
        error: 'Access denied: you do not own this account.',
        code: 'FORBIDDEN',
      });
    });

    it('GET /accounts/:id: admin can view any account', async () => {
      const res = await request(app)
        .get(`/accounts/${h2Acc1Id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.account.id).toBe(h2Acc1Id);
    });

    it('GET /accounts/:id: auditor can view any account (read-only)', async () => {
      const res = await request(app)
        .get(`/accounts/${h2Acc1Id}`)
        .set('Authorization', `Bearer ${auditorToken}`);

      expect(res.status).toBe(200);
      expect(res.body.account.id).toBe(h2Acc1Id);
    });

    it('GET /accounts/:id: returns 404 for non-existent account', async () => {
      const res = await request(app)
        .get('/accounts/999999')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
      expect(res.body.code).toBe('NOT_FOUND');
    });
  });
});
