import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { fileURLToPath } from 'node:url';
import { getClient, withTransaction, closeDb } from './db.js';
import { GENESIS_HASH, computeLedgerHash } from './hash.js';

export const SEED_CREDENTIALS = [
  {
    role: 'admin',
    email: 'admin@ledgerline.local',
    password: 'AdminPassword123!',
    name: 'System Administrator',
  },
  {
    role: 'holder',
    email: 'holder1@ledgerline.local',
    password: 'Holder1Password123!',
    name: 'Holder One',
  },
  {
    role: 'holder',
    email: 'holder2@ledgerline.local',
    password: 'Holder2Password123!',
    name: 'Holder Two',
  },
  {
    role: 'auditor',
    email: 'auditor@ledgerline.local',
    password: 'AuditorPassword123!',
    name: 'Independent Auditor',
  },
];

/**
 * Executes double-entry deposit through the ledger strictly following Hard Rules 1-8:
 * - Locks involved accounts with SELECT ... FOR UPDATE ORDER BY id ASC
 * - Checks invariant conditions
 * - Updates balances
 * - Appends cryptographic hash-chained ledger rows (debit EXTERNAL, credit recipient)
 */
async function postSeededDeposit(client, { fromAccountId, toAccountId, amountPaise, adminUserId, description }) {
  const [firstId, secondId] = [fromAccountId, toAccountId].sort((a, b) => a - b);

  // 1. Pessimistic row locking in deterministic order (deadlock-free)
  const lockedRes = await client.query(
    'SELECT id, account_no, balance_paise, is_external FROM accounts WHERE id IN ($1, $2) ORDER BY id ASC FOR UPDATE',
    [firstId, secondId]
  );

  const lockedAccounts = new Map(lockedRes.rows.map((acc) => [acc.id, acc]));
  const fromAcc = lockedAccounts.get(fromAccountId);
  const toAcc = lockedAccounts.get(toAccountId);

  if (!fromAcc || !toAcc) {
    throw new Error(`Seeded deposit failed: accounts ${fromAccountId} or ${toAccountId} not found.`);
  }

  const fromCurrent = BigInt(fromAcc.balance_paise);
  const toCurrent = BigInt(toAcc.balance_paise);
  const moveAmount = BigInt(amountPaise);

  const fromAfter = fromCurrent - moveAmount;
  const toAfter = toCurrent + moveAmount;

  // 2. Fetch latest hash for each account's chain
  const prevFromRes = await client.query(
    'SELECT hash FROM ledger WHERE account_id = $1 ORDER BY id DESC LIMIT 1',
    [fromAccountId]
  );
  const prevToRes = await client.query(
    'SELECT hash FROM ledger WHERE account_id = $1 ORDER BY id DESC LIMIT 1',
    [toAccountId]
  );

  const prevFromHash = prevFromRes.rowCount > 0 ? prevFromRes.rows[0].hash : GENESIS_HASH;
  const prevToHash = prevToRes.rowCount > 0 ? prevToRes.rows[0].hash : GENESIS_HASH;

  const txnId = uuidv4();
  const idempotencyKey = `seed-deposit-${txnId}`;

  // 3. Compute cryptographic hashes
  const debitHash = computeLedgerHash(prevFromHash, {
    txn_id: txnId,
    account_id: fromAccountId,
    kind: 'debit',
    amount_paise: moveAmount,
    balance_after_paise: fromAfter,
    initiated_by: adminUserId,
    idempotency_key: idempotencyKey,
    reason: description,
  });

  const creditHash = computeLedgerHash(prevToHash, {
    txn_id: txnId,
    account_id: toAccountId,
    kind: 'credit',
    amount_paise: moveAmount,
    balance_after_paise: toAfter,
    initiated_by: adminUserId,
    idempotency_key: idempotencyKey,
    reason: description,
  });

  // 4. Update balances inside transaction
  await client.query('UPDATE accounts SET balance_paise = $1 WHERE id = $2', [fromAfter, fromAccountId]);
  await client.query('UPDATE accounts SET balance_paise = $1 WHERE id = $2', [toAfter, toAccountId]);

  // 5. Append-only ledger rows
  await client.query(
    `INSERT INTO ledger (
      txn_id, account_id, kind, amount_paise, balance_after_paise,
      initiated_by, idempotency_key, reason, prev_hash, hash
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
    [
      txnId,
      fromAccountId,
      'debit',
      moveAmount,
      fromAfter,
      adminUserId,
      idempotencyKey,
      description,
      prevFromHash,
      debitHash,
    ]
  );

  await client.query(
    `INSERT INTO ledger (
      txn_id, account_id, kind, amount_paise, balance_after_paise,
      initiated_by, idempotency_key, reason, prev_hash, hash
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
    [
      txnId,
      toAccountId,
      'credit',
      moveAmount,
      toAfter,
      adminUserId,
      idempotencyKey,
      description,
      prevToHash,
      creditHash,
    ]
  );

  return { txnId, amountPaise };
}

export async function seedDatabase() {
  const client = await getClient();
  try {
    console.log('[SEED] Starting database seed...');

    // 1. Create or retrieve users
    const userMap = new Map();
    for (const cred of SEED_CREDENTIALS) {
      const existing = await client.query('SELECT id, role, email FROM users WHERE email = $1', [cred.email]);
      if (existing.rowCount > 0) {
        userMap.set(cred.role + (cred.email.includes('2') ? '2' : '1'), existing.rows[0]);
      } else {
        const hash = bcrypt.hashSync(cred.password, 10);
        const ins = await client.query(
          'INSERT INTO users (email, password_hash, role) VALUES ($1, $2, $3) RETURNING id, role, email',
          [cred.email, hash, cred.role]
        );
        userMap.set(cred.role + (cred.email.includes('2') ? '2' : '1'), ins.rows[0]);
      }
    }

    const adminUser = userMap.get('admin1');
    const holder1User = userMap.get('holder1');
    const holder2User = userMap.get('holder2');
    const auditorUser = userMap.get('auditor1');

    // 2. Create EXTERNAL account (owner_id = NULL, is_external = TRUE)
    let extAccRes = await client.query("SELECT id, balance_paise FROM accounts WHERE account_no = 'ACC-EXTERNAL'");
    let extAccId;
    if (extAccRes.rowCount === 0) {
      const ins = await client.query(
        `INSERT INTO accounts (account_no, owner_id, name, balance_paise, is_external)
         VALUES ('ACC-EXTERNAL', NULL, 'External World Clearing Account', 0, TRUE)
         RETURNING id`
      );
      extAccId = ins.rows[0].id;
    } else {
      extAccId = extAccRes.rows[0].id;
    }

    // 3. Create Holder 1 Accounts
    let h1Acc1Res = await client.query("SELECT id FROM accounts WHERE account_no = 'ACC-H1-01'");
    let h1Acc1Id;
    if (h1Acc1Res.rowCount === 0) {
      const ins = await client.query(
        `INSERT INTO accounts (account_no, owner_id, name, balance_paise, is_external)
         VALUES ('ACC-H1-01', $1, 'Holder 1 Primary Checking', 0, FALSE)
         RETURNING id`,
        [holder1User.id]
      );
      h1Acc1Id = ins.rows[0].id;
    } else {
      h1Acc1Id = h1Acc1Res.rows[0].id;
    }

    let h1Acc2Res = await client.query("SELECT id FROM accounts WHERE account_no = 'ACC-H1-02'");
    let h1Acc2Id;
    if (h1Acc2Res.rowCount === 0) {
      const ins = await client.query(
        `INSERT INTO accounts (account_no, owner_id, name, balance_paise, is_external)
         VALUES ('ACC-H1-02', $1, 'Holder 1 High-Yield Savings', 0, FALSE)
         RETURNING id`,
        [holder1User.id]
      );
      h1Acc2Id = ins.rows[0].id;
    } else {
      h1Acc2Id = h1Acc2Res.rows[0].id;
    }

    // 4. Create Holder 2 Account
    let h2Acc1Res = await client.query("SELECT id FROM accounts WHERE account_no = 'ACC-H2-01'");
    let h2Acc1Id;
    if (h2Acc1Res.rowCount === 0) {
      const ins = await client.query(
        `INSERT INTO accounts (account_no, owner_id, name, balance_paise, is_external)
         VALUES ('ACC-H2-01', $1, 'Holder 2 Primary Checking', 0, FALSE)
         RETURNING id`,
        [holder2User.id]
      );
      h2Acc1Id = ins.rows[0].id;
    } else {
      h2Acc1Id = h2Acc1Res.rows[0].id;
    }

    // 5. Seed Funds via real double-entry ledger transactions (NOT direct balance updates)
    const ledgerCount = await client.query('SELECT COUNT(*) FROM ledger WHERE initiated_by = $1', [adminUser.id]);
    if (parseInt(ledgerCount.rows[0].count, 10) === 0) {
      console.log('[SEED] Funding Holder 1 accounts via double-entry ledger transactions...');

      await withTransaction(async (txClient) => {
        // Deposit 1: INR 5,000.00 (500,000 paise) to Holder 1 Account 1
        await postSeededDeposit(txClient, {
          fromAccountId: extAccId,
          toAccountId: h1Acc1Id,
          amountPaise: 500000,
          adminUserId: adminUser.id,
          description: 'Initial Seed Deposit: INR 5,000.00 into Holder 1 Primary',
        });

        // Deposit 2: INR 2,500.00 (250,000 paise) to Holder 1 Account 2
        await postSeededDeposit(txClient, {
          fromAccountId: extAccId,
          toAccountId: h1Acc2Id,
          amountPaise: 250000,
          adminUserId: adminUser.id,
          description: 'Initial Seed Deposit: INR 2,500.00 into Holder 1 Savings',
        });
      });

      console.log('[SEED] Seed deposits successfully posted through double-entry ledger.');
    } else {
      console.log('[SEED] Ledger already contains seed transactions.');
    }

    // 6. Verify Global Double-Entry Balance Invariant (Sum of all accounts == 0)
    const sumRes = await client.query('SELECT SUM(balance_paise) as global_sum FROM accounts');
    const globalSum = BigInt(sumRes.rows[0].global_sum || 0);

    if (globalSum !== 0n) {
      throw new Error(`CRITICAL INVARIANT VIOLATION: Global sum of balances is ${globalSum}, expected 0.`);
    }

    console.log('[SEED] Global balance invariant verified: SUM(balances) === 0 paise.');

    // Print Credentials Table
    printCredentials();
  } catch (error) {
    console.error('[SEED] Seed failed:', error.message);
    throw error;
  } finally {
    client.release();
  }
}

export function printCredentials() {
  console.log('\n================================================================');
  console.log('              LEDGERLINE SEED CREDENTIALS                       ');
  console.log('================================================================');
  console.table(
    SEED_CREDENTIALS.map((c) => ({
      Role: c.role.toUpperCase(),
      Email: c.email,
      Password: c.password,
    }))
  );
  console.log('Accounts:');
  console.log('  ACC-EXTERNAL (External Clearing): allowed negative');
  console.log('  ACC-H1-01    (Holder 1 Primary) : 500,000 paise (INR 5,000.00)');
  console.log('  ACC-H1-02    (Holder 1 Savings) : 250,000 paise (INR 2,500.00)');
  console.log('  ACC-H2-01    (Holder 2 Primary) : 0 paise');
  console.log('================================================================\n');
}

// If executed directly from CLI: node src/seed.js
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  seedDatabase()
    .then(async () => {
      await closeDb();
      process.exit(0);
    })
    .catch(async (err) => {
      console.error(err);
      await closeDb();
      process.exit(1);
    });
}
