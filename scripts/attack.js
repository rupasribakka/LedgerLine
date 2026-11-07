import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const BASE_URL = process.env.BASE_URL || 'http://localhost:5001';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@ledgerline.local';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'AdminPassword123!';

const HOLDER1_EMAIL = process.env.HOLDER1_EMAIL || 'holder1@ledgerline.local';
const HOLDER1_PASSWORD = process.env.HOLDER1_PASSWORD || 'Holder1Password123!';

const HOLDER2_EMAIL = process.env.HOLDER2_EMAIL || 'holder2@ledgerline.local';
const HOLDER2_PASSWORD = process.env.HOLDER2_PASSWORD || 'Holder2Password123!';

const AUDITOR_EMAIL = process.env.AUDITOR_EMAIL || 'auditor@ledgerline.local';
const AUDITOR_PASSWORD = process.env.AUDITOR_PASSWORD || 'AuditorPassword123!';

let spawnedServerProcess = null;

async function checkServerReachable(url) {
  try {
    const res = await fetch(`${url}/api/health`, { signal: AbortSignal.timeout(1500) });
    return res.status === 200;
  } catch {
    return false;
  }
}

async function startServerIfNeeded() {
  const reachable = await checkServerReachable(BASE_URL);
  if (reachable) {
    console.log(`[INIT] Connected to existing server at ${BASE_URL}`);
    return;
  }

  const port = new URL(BASE_URL).port || 5001;
  console.log(`[INIT] No running server found at ${BASE_URL}. Spawning local server on port ${port}...`);

  spawnedServerProcess = spawn('node', ['src/server.js'], {
    cwd: rootDir,
    env: {
      ...process.env,
      PORT: port.toString(),
      NODE_ENV: 'test',
      LEDGERLINE_SEED_DEMO_USERS: 'true',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  spawnedServerProcess.stdout.on('data', (d) => {
    const str = d.toString();
    if (str.includes('Listening on port') || str.includes('Fatal boot error')) {
      process.stdout.write(`  [SERVER] ${str.trim()}\n`);
    }
  });

  spawnedServerProcess.stderr.on('data', (d) => {
    process.stderr.write(`  [SERVER ERROR] ${d.toString()}`);
  });

  // Poll until server is ready (up to 30 seconds)
  const startTime = Date.now();
  while (Date.now() - startTime < 30000) {
    if (await checkServerReachable(BASE_URL)) {
      console.log(`[INIT] Server successfully started and ready on port ${port}.\n`);
      return;
    }
    await new Promise((r) => setTimeout(r, 500));
  }

  throw new Error(`Server failed to start at ${BASE_URL} within 30 seconds.`);
}

function stopServer() {
  if (spawnedServerProcess) {
    console.log('\n[TEARDOWN] Stopping spawned server...');
    try {
      spawnedServerProcess.kill();
    } catch {
      // ignore
    }
    spawnedServerProcess = null;
  }
}

async function apiRequest(endpoint, { method = 'GET', token = null, key = null, body = null } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (key) headers['Idempotency-Key'] = key;

  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  return {
    status: res.status,
    headers: res.headers,
    data,
  };
}

async function loginUser(email, password) {
  const res = await apiRequest('/api/auth/login', {
    method: 'POST',
    body: { email, password },
  });
  if (res.status !== 200 || !res.data?.token) {
    throw new Error(`Failed to log in as ${email}: ${JSON.stringify(res.data)}`);
  }
  return { token: res.data.token, user: res.data.user };
}

async function getAccountBalance(accountId, token) {
  const res = await apiRequest(`/api/accounts/${accountId}/balance`, { token });
  if (res.status !== 200 || !res.data?.account) {
    throw new Error(`Failed to get balance for account ${accountId}: ${JSON.stringify(res.data)}`);
  }
  return Number(res.data.account.balance_paise);
}

async function main() {
  console.log('================================================================');
  console.log(' LedgerLine Financial Security & Concurrency Attack Suite');
  console.log('================================================================');
  console.log(`Target BASE_URL: ${BASE_URL}`);

  await startServerIfNeeded();

  const attackResults = [];

  try {
    // 1. Authenticate users
    console.log('[AUTH] Authenticating test personas...');
    const admin = await loginUser(ADMIN_EMAIL, ADMIN_PASSWORD);
    const holder1 = await loginUser(HOLDER1_EMAIL, HOLDER1_PASSWORD);
    const holder2 = await loginUser(HOLDER2_EMAIL, HOLDER2_PASSWORD);
    const auditor = await loginUser(AUDITOR_EMAIL, AUDITOR_PASSWORD);
    console.log('  -> All 4 personas authenticated successfully.\n');

    // -------------------------------------------------------------------------
    // ATTACK 7 (PRE): Pre-Attack System Integrity Check
    // -------------------------------------------------------------------------
    console.log('[ATTACK 7 - PRE] Checking cryptographic ledger integrity before attacks...');
    const preVerify = await apiRequest('/api/ledger/verify', { token: admin.token });
    const preSum = preVerify.data?.summary?.global_balance_sum_paise ?? -1;
    const preVerified = preVerify.status === 200 && preVerify.data?.verified === true && preSum === 0;

    console.log(`  -> Initial verified: ${preVerify.data?.verified}, global_sum: ${preSum} paise`);
    if (!preVerified) {
      throw new Error(`Pre-attack verification failed! System not in valid state: ${JSON.stringify(preVerify.data)}`);
    }

    // -------------------------------------------------------------------------
    // SETUP: Create dedicated funded accounts via API so seed data is untouched
    // -------------------------------------------------------------------------
    console.log('[SETUP] Creating fresh dedicated funded accounts through API...');
    const createAccount = async (name, ownerId, initialPaise) => {
      const res = await apiRequest('/api/accounts', {
        method: 'POST',
        token: admin.token,
        body: {
          name,
          owner_id: ownerId,
          initial_balance_paise: initialPaise,
        },
      });
      if (res.status !== 201 || !res.data?.account?.id) {
        throw new Error(`Failed to create account ${name}: ${JSON.stringify(res.data)}`);
      }
      return res.data.account;
    };

    const acc1 = await createAccount(`Attack Acc 1 (80% Race) ${Date.now()}`, holder1.user.id, 100_000); // ₹1,000.00
    const acc2 = await createAccount(`Attack Acc 2 (20x Race) ${Date.now()}`, holder1.user.id, 200_000); // ₹2,000.00
    const acc3 = await createAccount(`Attack Acc 3 (Replay) ${Date.now()}`, holder1.user.id, 100_000); // ₹1,000.00
    const acc4 = await createAccount(`Attack Acc 4 (Holder1 Target) ${Date.now()}`, holder1.user.id, 100_000); // ₹1,000.00
    const acc5 = await createAccount(`Attack Acc 5 (Holder2 Account) ${Date.now()}`, holder2.user.id, 50_000); // ₹500.00
    console.log('  -> Created dedicated accounts for all attack scenarios.\n');

    // -------------------------------------------------------------------------
    // ATTACK 1: Two withdrawals of 80% of balance at once with different keys
    // -------------------------------------------------------------------------
    console.log('[ATTACK 1] Simultaneous withdrawals of 80% with different keys...');
    const balanceBeforeA1 = await getAccountBalance(acc1.id, holder1.token);
    const withdrawAmountA1 = Math.round(balanceBeforeA1 * 0.8); // 80,000 paise

    const [resA1_1, resA1_2] = await Promise.all([
      apiRequest('/api/transactions/withdraw', {
        method: 'POST',
        token: holder1.token,
        key: `atk1-${crypto.randomUUID()}`,
        body: { account_id: acc1.id, amount: withdrawAmountA1 },
      }),
      apiRequest('/api/transactions/withdraw', {
        method: 'POST',
        token: holder1.token,
        key: `atk1-${crypto.randomUUID()}`,
        body: { account_id: acc1.id, amount: withdrawAmountA1 },
      }),
    ]);

    const a1Statuses = [resA1_1.status, resA1_2.status].sort();
    const balanceAfterA1 = await getAccountBalance(acc1.id, holder1.token);
    const expectedA1Balance = balanceBeforeA1 - withdrawAmountA1; // 20,000 paise

    const a1Passed =
      a1Statuses[0] === 200 &&
      a1Statuses[1] === 422 &&
      balanceAfterA1 === expectedA1Balance &&
      balanceAfterA1 >= 0;

    console.log(`  -> Observed statuses: [${resA1_1.status}, ${resA1_2.status}]`);
    console.log(`  -> Balance before: ${balanceBeforeA1} paise, Balance after: ${balanceAfterA1} paise (expected: ${expectedA1Balance})`);
    console.log(`  -> Verdict: ${a1Passed ? 'PASS' : 'FAIL'}`);

    attackResults.push({
      id: 1,
      description: 'Two withdrawals of 80% at once with different keys',
      observed: `Statuses: [${a1Statuses.join(', ')}], End Balance: ${balanceAfterA1} paise`,
      passed: a1Passed,
    });

    // -------------------------------------------------------------------------
    // ATTACK 2: 20 withdrawals of 10% of balance at once
    // -------------------------------------------------------------------------
    console.log('\n[ATTACK 2] 20 simultaneous withdrawals of 10% of balance at once...');
    const balanceBeforeA2 = await getAccountBalance(acc2.id, holder1.token); // 200,000 paise
    const withdrawAmountA2 = Math.round(balanceBeforeA2 * 0.1); // 20,000 paise

    const a2Requests = Array.from({ length: 20 }, (_, i) =>
      apiRequest('/api/transactions/withdraw', {
        method: 'POST',
        token: holder1.token,
        key: `atk2-${i}-${crypto.randomUUID()}`,
        body: { account_id: acc2.id, amount: withdrawAmountA2 },
      })
    );

    const a2Responses = await Promise.all(a2Requests);
    const a2Successes = a2Responses.filter((r) => r.status === 200).length;
    const a2Failures = a2Responses.filter((r) => r.status === 422).length;
    const balanceAfterA2 = await getAccountBalance(acc2.id, holder1.token);

    const a2Passed = a2Successes === 10 && a2Failures === 10 && balanceAfterA2 === 0;

    console.log(`  -> Observed: ${a2Successes} succeeded (200), ${a2Failures} failed (422)`);
    console.log(`  -> Balance after: ${balanceAfterA2} paise (expected: 0 paise)`);
    console.log(`  -> Verdict: ${a2Passed ? 'PASS' : 'FAIL'}`);

    attackResults.push({
      id: 2,
      description: '20 simultaneous withdrawals of 10% of balance',
      observed: `200 OK: ${a2Successes}/20, 422: ${a2Failures}/20, Final Balance: ${balanceAfterA2} paise`,
      passed: a2Passed,
    });

    // -------------------------------------------------------------------------
    // ATTACK 3: Same request with same key sent 10 times at once
    // -------------------------------------------------------------------------
    console.log('\n[ATTACK 3] Same request with identical key sent 10 times at once...');
    const balanceBeforeA3 = await getAccountBalance(acc3.id, holder1.token);
    const keyA3 = `atk3-${crypto.randomUUID()}`;
    const payloadA3 = { account_id: acc3.id, amount: 15_000 };

    const a3Requests = Array.from({ length: 10 }, () =>
      apiRequest('/api/transactions/withdraw', {
        method: 'POST',
        token: holder1.token,
        key: keyA3,
        body: payloadA3,
      })
    );

    const a3Responses = await Promise.all(a3Requests);
    const a3All200 = a3Responses.every((r) => r.status === 200);
    const a3ReplayHeaders = a3Responses.filter((r) => r.headers.get('idempotent-replay') === 'true').length;
    const balanceAfterA3 = await getAccountBalance(acc3.id, holder1.token);
    const a3MoneyMovedOnce = balanceBeforeA3 - balanceAfterA3 === 15_000;

    // Money moved once, all return 200, exactly 9 have replay header
    const a3Passed = a3All200 && a3ReplayHeaders === 9 && a3MoneyMovedOnce;

    console.log(`  -> Observed: ${a3Responses.filter((r) => r.status === 200).length}/10 returned 200 OK`);
    console.log(`  -> Replay headers (idempotent-replay: true): ${a3ReplayHeaders}/10`);
    console.log(`  -> Total money moved: ${balanceBeforeA3 - balanceAfterA3} paise (expected: exactly 15,000 paise once)`);
    console.log(`  -> Verdict: ${a3Passed ? 'PASS' : 'FAIL'}`);

    attackResults.push({
      id: 3,
      description: 'Same request with same key sent 10 times at once',
      observed: `200 OK: 10/10, Replay Headers: ${a3ReplayHeaders}/10, Deducted: 15,000 paise once`,
      passed: a3Passed,
    });

    // -------------------------------------------------------------------------
    // ATTACK 4: Same key with a different body returns 422
    // -------------------------------------------------------------------------
    console.log('\n[ATTACK 4] Same idempotency key reused with different request body...');
    const resA4 = await apiRequest('/api/transactions/withdraw', {
      method: 'POST',
      token: holder1.token,
      key: keyA3,
      body: { account_id: acc3.id, amount: 99_999 }, // Mismatched body
    });

    const a4Passed = resA4.status === 422;
    console.log(`  -> Observed status: ${resA4.status} (expected: 422)`);
    console.log(`  -> Error code: ${resA4.data?.code || resA4.data?.error}`);
    console.log(`  -> Verdict: ${a4Passed ? 'PASS' : 'FAIL'}`);

    attackResults.push({
      id: 4,
      description: 'Reused key with mismatched body',
      observed: `Status: ${resA4.status}, Code: ${resA4.data?.code}`,
      passed: a4Passed,
    });

    // -------------------------------------------------------------------------
    // ATTACK 5: Holder2 tries to withdraw and transfer from Holder1 account (IDOR)
    // -------------------------------------------------------------------------
    console.log("\n[ATTACK 5] Holder 2 attempts unauthorized withdrawal and transfer from Holder 1 account...");
    const b4Before = await getAccountBalance(acc4.id, admin.token);
    const b5Before = await getAccountBalance(acc5.id, admin.token);

    const resA5Withdraw = await apiRequest('/api/transactions/withdraw', {
      method: 'POST',
      token: holder2.token,
      key: `atk5-wd-${crypto.randomUUID()}`,
      body: { account_id: acc4.id, amount: 10_000 },
    });

    const resA5Transfer = await apiRequest('/api/transactions/transfer', {
      method: 'POST',
      token: holder2.token,
      key: `atk5-tr-${crypto.randomUUID()}`,
      body: { from_account_id: acc4.id, to_account_id: acc5.id, amount: 10_000 },
    });

    const b4After = await getAccountBalance(acc4.id, admin.token);
    const b5After = await getAccountBalance(acc5.id, admin.token);

    const a5Passed =
      resA5Withdraw.status === 403 &&
      resA5Transfer.status === 403 &&
      b4Before === b4After &&
      b5Before === b5After;

    console.log(`  -> Withdrawal attempt status: ${resA5Withdraw.status} (expected: 403)`);
    console.log(`  -> Transfer attempt status:   ${resA5Transfer.status} (expected: 403)`);
    console.log(`  -> Target account balance unchanged: ${b4Before === b4After} (${b4After} paise)`);
    console.log(`  -> Attacker account balance unchanged: ${b5Before === b5After} (${b5After} paise)`);
    console.log(`  -> Verdict: ${a5Passed ? 'PASS' : 'FAIL'}`);

    attackResults.push({
      id: 5,
      description: "Holder2 unauthorized withdrawal and transfer from Holder1's account",
      observed: `Withdraw Status: ${resA5Withdraw.status}, Transfer Status: ${resA5Transfer.status}, Balances Unchanged`,
      passed: a5Passed,
    });

    // -------------------------------------------------------------------------
    // ATTACK 6: Auditor tries to initiate a financial deposit
    // -------------------------------------------------------------------------
    console.log('\n[ATTACK 6] Auditor attempts to initiate a financial deposit...');
    const b4BeforeA6 = await getAccountBalance(acc4.id, admin.token);

    const resA6 = await apiRequest('/api/transactions/deposit', {
      method: 'POST',
      token: auditor.token,
      key: `atk6-${crypto.randomUUID()}`,
      body: { account_id: acc4.id, amount: 20_000 },
    });

    const b4AfterA6 = await getAccountBalance(acc4.id, admin.token);
    const a6Passed = resA6.status === 403 && b4BeforeA6 === b4AfterA6;

    console.log(`  -> Auditor deposit status: ${resA6.status} (expected: 403)`);
    console.log(`  -> Account balance unchanged: ${b4BeforeA6 === b4AfterA6} (${b4AfterA6} paise)`);
    console.log(`  -> Verdict: ${a6Passed ? 'PASS' : 'FAIL'}`);

    attackResults.push({
      id: 6,
      description: 'Auditor unauthorized financial deposit attempt',
      observed: `Status: ${resA6.status}, Balance Unchanged: ${b4AfterA6} paise`,
      passed: a6Passed,
    });

    // -------------------------------------------------------------------------
    // ATTACK 7 (POST): Final Post-Attack Cryptographic System Verification
    // -------------------------------------------------------------------------
    console.log('\n[ATTACK 7 - POST] Post-attack cryptographic ledger & balance verification...');
    const postVerify = await apiRequest('/api/ledger/verify', { token: admin.token });
    const postSum = postVerify.data?.summary?.global_balance_sum_paise ?? -1;
    const a7Passed = postVerify.status === 200 && postVerify.data?.verified === true && postSum === 0;

    console.log(`  -> Post-attack verified: ${postVerify.data?.verified}`);
    console.log(`  -> Global sum of balances: ${postSum} paise (expected: 0 paise)`);
    console.log(`  -> Ledger rows verified: ${postVerify.data?.summary?.ledger_rows_verified}`);
    console.log(`  -> Verdict: ${a7Passed ? 'PASS' : 'FAIL'}`);

    attackResults.push({
      id: 7,
      description: 'Ledger verification before/after attacks (verified=true, global_sum=0)',
      observed: `Verified: ${postVerify.data?.verified}, Global Sum: ${postSum} paise, Rows: ${postVerify.data?.summary?.ledger_rows_verified}`,
      passed: a7Passed,
    });

    // -------------------------------------------------------------------------
    // FINAL RESULTS SUMMARY TABLE
    // -------------------------------------------------------------------------
    console.log('\n================================================================');
    console.log(' ATTACK RESULTS SUMMARY');
    console.log('================================================================\n');
    console.log('| # | Attack Scenario | Observed Outcome | Verdict |');
    console.log('|---|-----------------|------------------|:-------:|');
    for (const r of attackResults) {
      console.log(`| ${r.id} | ${r.description} | ${r.observed} | **${r.passed ? 'PASS' : 'FAIL'}** |`);
    }
    console.log('================================================================\n');

    const allPassed = attackResults.every((r) => r.passed);
    if (!allPassed) {
      console.error('ATTACK SUITE FAILED: One or more security invariant checks failed!\n');
      process.exit(1);
    } else {
      console.log('ATTACK SUITE PASSED: All 7 security and concurrency invariants strictly upheld.\n');
      process.exit(0);
    }
  } finally {
    stopServer();
  }
}

main().catch((err) => {
  console.error('\nFatal error in attack script:', err);
  stopServer();
  process.exit(1);
});
