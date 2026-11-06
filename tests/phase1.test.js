import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import bcrypt from 'bcryptjs';
import { getClient, closeDb } from '../src/db.js';
import { runMigrations } from '../src/migrate.js';
import { seedDatabase, SEED_CREDENTIALS } from '../src/seed.js';
import { GENESIS_HASH, verifyLedgerRow, computeLedgerHash } from '../src/hash.js';

describe('Phase 1 - Schema, Constraints, Triggers, Seed & Hash Chain', () => {
  let client;

  beforeAll(async () => {
    // Run migrations and seed
    await runMigrations();
    await seedDatabase();
    client = await getClient();
  });

  afterAll(async () => {
    if (client) client.release();
    await closeDb();
  });

  describe('Database Tables & Schema Validation', () => {
    it('should have all required tables created', async () => {
      const res = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
          AND table_name IN ('users', 'accounts', 'ledger', 'idempotency_keys', 'idempotency_replays', 'audit_flags')
      `);

      const tables = res.rows.map((r) => r.table_name);
      expect(tables).toContain('users');
      expect(tables).toContain('accounts');
      expect(tables).toContain('ledger');
      expect(tables).toContain('idempotency_keys');
      expect(tables).toContain('idempotency_replays');
      expect(tables).toContain('audit_flags');
    });

    it('should have the proper check constraint for overdraft prevention', async () => {
      const res = await client.query(`
        SELECT conname, pg_get_constraintdef(oid) as def
        FROM pg_constraint
        WHERE conrelid = 'accounts'::regclass AND conname = 'chk_no_overdraft'
      `);

      expect(res.rowCount).toBe(1);
      expect(res.rows[0].def).toContain('is_external OR (balance_paise >= 0)');
    });
  });

  describe('Seed Data Verification', () => {
    it('should have seeded all 4 users with valid bcrypt passwords', async () => {
      for (const cred of SEED_CREDENTIALS) {
        const res = await client.query('SELECT * FROM users WHERE email = $1', [cred.email]);
        expect(res.rowCount).toBe(1);
        const user = res.rows[0];
        expect(user.role).toBe(cred.role);
        const validPw = bcrypt.compareSync(cred.password, user.password_hash);
        expect(validPw).toBe(true);
      }
    });

    it('should have created EXTERNAL account and user accounts properly', async () => {
      const extRes = await client.query("SELECT * FROM accounts WHERE account_no = 'ACC-EXTERNAL'");
      expect(extRes.rowCount).toBe(1);
      const ext = extRes.rows[0];
      expect(ext.is_external).toBe(true);
      expect(ext.owner_id).toBeNull();
      // External balance is negative equal to total deposits
      expect(BigInt(ext.balance_paise)).toBe(-750000n);

      const h1Res = await client.query("SELECT * FROM accounts WHERE account_no LIKE 'ACC-H1%' ORDER BY account_no");
      expect(h1Res.rowCount).toBe(2);
      expect(BigInt(h1Res.rows[0].balance_paise)).toBe(500000n);
      expect(BigInt(h1Res.rows[1].balance_paise)).toBe(250000n);

      const h2Res = await client.query("SELECT * FROM accounts WHERE account_no = 'ACC-H2-01'");
      expect(h2Res.rowCount).toBe(1);
      expect(BigInt(h2Res.rows[0].balance_paise)).toBe(0n);
    });

    it('HARD RULE 2: Sum of all account balances including EXTERNAL must be exactly 0', async () => {
      const sumRes = await client.query('SELECT SUM(balance_paise) as total FROM accounts');
      const total = BigInt(sumRes.rows[0].total);
      expect(total).toBe(0n);
    });

    it('should have funded seed accounts via real double-entry ledger entries', async () => {
      const ledgerRes = await client.query('SELECT * FROM ledger ORDER BY id ASC');
      expect(ledgerRes.rowCount).toBe(4);

      // 2 debits on EXTERNAL
      const debits = ledgerRes.rows.filter((r) => r.kind === 'debit');
      expect(debits.length).toBe(2);
      expect(BigInt(debits[0].amount_paise)).toBe(500000n);
      expect(BigInt(debits[1].amount_paise)).toBe(250000n);

      // 2 credits on Holder 1 accounts
      const credits = ledgerRes.rows.filter((r) => r.kind === 'credit');
      expect(credits.length).toBe(2);
      expect(BigInt(credits[0].amount_paise)).toBe(500000n);
      expect(BigInt(credits[1].amount_paise)).toBe(250000n);

      // Total debited == total credited
      const totalDebited = debits.reduce((acc, r) => acc + BigInt(r.amount_paise), 0n);
      const totalCredited = credits.reduce((acc, r) => acc + BigInt(r.amount_paise), 0n);
      expect(totalDebited).toBe(totalCredited);
      expect(totalDebited).toBe(750000n);
    });
  });

  describe('HARD RULE 3: DB Overdraft Constraint Enforcement', () => {
    it('should reject a negative balance on a non-external account at the DB level', async () => {
      let errorOccurred = false;
      try {
        await client.query("UPDATE accounts SET balance_paise = -100 WHERE account_no = 'ACC-H2-01'");
      } catch (err) {
        errorOccurred = true;
        expect(err.message).toMatch(/chk_no_overdraft/i);
      }
      expect(errorOccurred).toBe(true);
    });

    it('should allow negative balance on the EXTERNAL account', async () => {
      const extRes = await client.query("SELECT balance_paise FROM accounts WHERE account_no = 'ACC-EXTERNAL'");
      expect(BigInt(extRes.rows[0].balance_paise)).toBeLessThan(0n);
    });
  });

  describe('HARD RULE 6: Immutability Triggers (Append-Only Enforcement)', () => {
    it('should block UPDATE on ledger table via row trigger', async () => {
      let errorOccurred = false;
      try {
        await client.query('UPDATE ledger SET amount_paise = 999999 WHERE id = 1');
      } catch (err) {
        errorOccurred = true;
        expect(err.message).toMatch(/Ledger entries are immutable/i);
      }
      expect(errorOccurred).toBe(true);
    });

    it('should block DELETE on ledger table via row trigger', async () => {
      let errorOccurred = false;
      try {
        await client.query('DELETE FROM ledger WHERE id = 1');
      } catch (err) {
        errorOccurred = true;
        expect(err.message).toMatch(/Ledger entries are immutable/i);
      }
      expect(errorOccurred).toBe(true);
    });

    it('should block TRUNCATE on ledger table via statement trigger', async () => {
      let errorOccurred = false;
      try {
        await client.query('TRUNCATE ledger');
      } catch (err) {
        errorOccurred = true;
        expect(err.message).toMatch(/Ledger is append-only/i);
      }
      expect(errorOccurred).toBe(true);
    });
  });

  describe('HARD RULE 8: Cryptographic Hash Chain Verification', () => {
    it('should verify the cryptographic hash chain for all accounts in the ledger', async () => {
      const accountsRes = await client.query('SELECT DISTINCT account_id FROM ledger');
      const accountIds = accountsRes.rows.map((r) => r.account_id);

      for (const accId of accountIds) {
        const rowsRes = await client.query(
          'SELECT * FROM ledger WHERE account_id = $1 ORDER BY id ASC',
          [accId]
        );

        let expectedPrev = GENESIS_HASH;
        for (const row of rowsRes.rows) {
          const verification = verifyLedgerRow(row, expectedPrev);
          expect(verification.valid).toBe(true);
          expectedPrev = row.hash;
        }
      }
    });

    it('should detect if a row prev_hash or hash does not match computed sha256', () => {
      const fakeRow = {
        txn_id: '00000000-0000-0000-0000-000000000000',
        account_id: 1,
        kind: 'debit',
        amount_paise: 1000n,
        balance_after_paise: -1000n,
        initiated_by: 1,
        idempotency_key: 'test',
        reason: 'tamper test',
        prev_hash: GENESIS_HASH,
        hash: 'badhash0000000000000000000000000000000000000000000000000000000000',
      };

      const result = verifyLedgerRow(fakeRow, GENESIS_HASH);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Row hash mismatch');
    });
  });
});
