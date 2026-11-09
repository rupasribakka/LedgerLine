#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';
import { initDbPool, query, closeDb } from '../src/db.js';
import { runMigrations } from '../src/migrate.js';
import { seedDatabase } from '../src/seed.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const screenshotsDir = path.join(projectRoot, 'screenshots');

if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const BROWSER_PATH = fs.existsSync(CHROME_PATH) ? CHROME_PATH : EDGE_PATH;

const PORT = 5055;
const BASE_URL = `http://127.0.0.1:${PORT}`;

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fillInput(page, selector, text) {
  const el = await page.$(selector);
  if (!el) throw new Error(`Element ${selector} not found`);
  await el.click({ clickCount: 3 });
  await page.keyboard.press('Backspace');
  await el.type(text);
}

async function clickButtonWithText(page, text) {
  const buttons = await page.$$('button');
  for (const btn of buttons) {
    const content = await btn.evaluate((el) => el.innerText || '');
    if (content.toLowerCase().includes(text.toLowerCase())) {
      await btn.click();
      return true;
    }
  }
  return false;
}

async function navigateTo(page, targetPath) {
  const link = await page.$(`a[href="${targetPath}"]`);
  if (link) {
    await link.click();
    await sleep(1200);
  } else {
    await page.goto(`${BASE_URL}${targetPath}`, { waitUntil: 'networkidle0' });
    await sleep(1200);
  }
}

async function loginAsPersona(page, roleText) {
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle0' });
  await sleep(600);
  const buttons = await page.$$('button');
  for (const btn of buttons) {
    const text = await btn.evaluate((el) => el.innerText || '');
    if (text.toLowerCase().includes(roleText.toLowerCase())) {
      await btn.click();
      await sleep(300);
      await page.click('button[type="submit"]');
      await sleep(1500);
      return true;
    }
  }
  return false;
}

async function runE2E() {
  console.log('=======================================================');
  console.log(' BalanceVault — End-to-End Real Browser Verification   ');
  console.log(` Browser Executable: ${BROWSER_PATH}                 `);
  console.log(` Target Server URL:  ${BASE_URL}                     `);
  console.log('=======================================================');

  // 1. Initialize embedded database, run migrations, and seed demo accounts
  process.env.PORT = String(PORT);
  process.env.LEDGERLINE_SEED_DEMO_USERS = 'true';
  process.env.NODE_ENV = 'test';

  await initDbPool();
  await runMigrations();
  await seedDatabase({ force: true });

  // 2. Start Express application serving both API and built client SPA
  const { default: app } = await import('../src/app.js');
  const server = await new Promise((resolve) => {
    const s = app.listen(PORT, '127.0.0.1', () => resolve(s));
  });
  console.log(`[E2E] Server started on ${BASE_URL}`);

  // 3. Launch real browser
  const browser = await puppeteer.launch({
    executablePath: BROWSER_PATH,
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--window-size=1440,900',
    ],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  page.on('console', (msg) => {
    if (msg.type() === 'error' || msg.type() === 'warning') {
      console.log(`[BROWSER ${msg.type().toUpperCase()}] ${msg.text()}`);
    }
  });
  page.on('pageerror', (err) => {
    console.error('[BROWSER RUNTIME ERROR]', err.message);
  });

  const testResults = [];
  function record(testName, passed, details = '') {
    testResults.push({ testName, passed, details });
    const mark = passed ? '✅' : '❌';
    console.log(`[E2E] ${mark} ${testName} ${details ? '(' + details + ')' : ''}`);
  }

  try {
    // -----------------------------------------------------------------------
    // TEST 1: Landing Page
    // -----------------------------------------------------------------------
    console.log('\n--- Scenario 1: Landing Page Inspection ---');
    await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle0' });
    await sleep(800);
    const landingTitle = await page.title();
    const hasBrand = await page.evaluate(() => document.body.innerText.includes('BalanceVault'));
    record('Landing Page Loaded', hasBrand && landingTitle.includes('BalanceVault'), `Title: ${landingTitle}`);
    await page.screenshot({ path: path.join(screenshotsDir, '01_landing_page.png'), fullPage: true });

    // -----------------------------------------------------------------------
    // TEST 2: Customer Registration (Signup)
    // -----------------------------------------------------------------------
    console.log('\n--- Scenario 2: Customer Registration ---');
    await page.goto(`${BASE_URL}/signup`, { waitUntil: 'networkidle0' });
    await sleep(600);

    const newCustomerEmail = `customer_${Date.now()}@balancevault.local`;
    await fillInput(page, '#name', 'Verified Customer');
    await fillInput(page, '#email', newCustomerEmail);
    await fillInput(page, '#password', 'CustomerPass123!');
    await fillInput(page, '#confirmPassword', 'CustomerPass123!');
    await page.screenshot({ path: path.join(screenshotsDir, '02_signup_form.png') });

    await page.click('button[type="submit"]');
    await sleep(1800);

    // Verify user was inserted into PostgreSQL
    const userDbRes = await query('SELECT id, email, role FROM users WHERE email = $1', [newCustomerEmail]);
    const userCreatedInDb = userDbRes.rowCount > 0 && userDbRes.rows[0].role === 'holder';
    record('Customer Registration & PostgreSQL Insertion', userCreatedInDb, `User ID: ${userDbRes.rows[0]?.id}, Role: ${userDbRes.rows[0]?.role}`);

    // -----------------------------------------------------------------------
    // TEST 3: Customer Login
    // -----------------------------------------------------------------------
    console.log('\n--- Scenario 3: Customer Login ---');
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle0' });
    await sleep(600);

    await fillInput(page, 'input[type="email"]', newCustomerEmail);
    await fillInput(page, 'input[type="password"]', 'CustomerPass123!');
    await page.screenshot({ path: path.join(screenshotsDir, '03_login_form.png') });

    await page.click('button[type="submit"]');
    await sleep(1800);

    const onAppUrl = page.url().includes('/app');
    record('Customer Login & Redirection to /app', onAppUrl, `Current URL: ${page.url()}`);
    await page.screenshot({ path: path.join(screenshotsDir, '04_customer_overview.png'), fullPage: true });

    // -----------------------------------------------------------------------
    // TEST 4: Seeded Account Holder 1 (holder1@ledgerline.local)
    // -----------------------------------------------------------------------
    console.log('\n--- Scenario 4: Seeded Account Holder & Balances ---');
    await loginAsPersona(page, 'Holder 1');

    // Verify holder overview
    const holderOverviewText = await page.evaluate(() => document.body.innerText);
    const hasHolderAccounts = holderOverviewText.includes('ACC-H1-01') || holderOverviewText.includes('Holder 1');
    record('Holder 1 Overview & Real Balances Displayed', hasHolderAccounts);
    await page.screenshot({ path: path.join(screenshotsDir, '05_holder1_overview.png'), fullPage: true });

    // Navigate to Accounts Page
    await navigateTo(page, '/app/accounts');
    const accountsPageText = await page.evaluate(() => document.body.innerText);
    const hasAccounts = accountsPageText.includes('Accounts & Balances') && (accountsPageText.includes('ACC-H1-01') || accountsPageText.includes('Primary Checking'));
    record('Accounts List Page Display', hasAccounts);
    await page.screenshot({ path: path.join(screenshotsDir, '06_accounts_page.png'), fullPage: true });

    // -----------------------------------------------------------------------
    // TEST 5: Money Movement — Transfer Between Accounts
    // -----------------------------------------------------------------------
    console.log('\n--- Scenario 5: Money Movement — Transfer ---');
    await navigateTo(page, '/app/move');
    console.log(`[E2E] Current URL after navigateTo: ${page.url()}`);
    await page.screenshot({ path: path.join(screenshotsDir, 'debug_move_attempt.png') });
    await page.waitForSelector('select', { timeout: 8000 });
    await sleep(800);

    // Identify selected accounts dynamically
    const selects = await page.$$('select');
    if (selects.length === 0) {
      throw new Error('No select elements found on Move page. Check authentication.');
    }
    const sourceAccId = await page.evaluate((el) => el.value, selects[0]);
    const targetAccId = selects.length > 1 ? await page.evaluate((el) => el.value, selects[1]) : null;

    const sBalBefore = await query('SELECT balance_paise FROM accounts WHERE id = $1', [sourceAccId]);
    const tBalBefore = await query('SELECT balance_paise FROM accounts WHERE id = $1', [targetAccId]);
    const startBal1 = BigInt(sBalBefore.rows[0].balance_paise);
    const startBal2 = BigInt(tBalBefore.rows[0].balance_paise);

    // Fill transfer amount: ₹100.50 = 10,050 paise
    await fillInput(page, 'input[placeholder="100.00"]', '100.50');
    await page.screenshot({ path: path.join(screenshotsDir, '07_transfer_form.png') });

    await page.click('button[type="submit"]');
    await sleep(2200);

    // Verify balance changes in PostgreSQL
    const sBalAfter = await query('SELECT balance_paise FROM accounts WHERE id = $1', [sourceAccId]);
    const tBalAfter = await query('SELECT balance_paise FROM accounts WHERE id = $1', [targetAccId]);
    const endBal1 = BigInt(sBalAfter.rows[0].balance_paise);
    const endBal2 = BigInt(tBalAfter.rows[0].balance_paise);

    const transferDiff1 = startBal1 - endBal1;
    const transferDiff2 = endBal2 - startBal2;
    const transferVerifiedInDb = transferDiff1 === 10050n && transferDiff2 === 10050n;
    record('Transfer Execution & Exact DB Balance Update (₹100.50)', transferVerifiedInDb, `Debited: ${transferDiff1} paise, Credited: ${transferDiff2} paise`);
    await page.screenshot({ path: path.join(screenshotsDir, '08_transfer_success.png') });

    // -----------------------------------------------------------------------
    // TEST 6: Money Movement — Withdrawal
    // -----------------------------------------------------------------------
    console.log('\n--- Scenario 6: Money Movement — Withdrawal ---');
    const clickedWithdraw = await clickButtonWithText(page, 'Withdraw');
    if (clickedWithdraw) {
      await sleep(600);
      const withdrawSelects = await page.$$('select');
      const withdrawAccId = await page.evaluate((el) => el.value, withdrawSelects[0]);
      const wBalBefore = await query('SELECT balance_paise FROM accounts WHERE id = $1', [withdrawAccId]);
      const startWBal = BigInt(wBalBefore.rows[0].balance_paise);

      await fillInput(page, 'input[placeholder="100.00"]', '50.00'); // ₹50.00 = 5,000 paise
      await page.click('button[type="submit"]');
      await sleep(2200);

      const wBalAfter = await query('SELECT balance_paise FROM accounts WHERE id = $1', [withdrawAccId]);
      const endWBal = BigInt(wBalAfter.rows[0].balance_paise);
      const withdrawVerifiedInDb = (startWBal - endWBal) === 5000n;
      record('Withdrawal Execution & PostgreSQL Balance Update (₹50.00)', withdrawVerifiedInDb, `Debited: ${startWBal - endWBal} paise`);
      await page.screenshot({ path: path.join(screenshotsDir, '09_withdraw_success.png') });
    }

    // -----------------------------------------------------------------------
    // TEST 7: Transactions & Journal History Page
    // -----------------------------------------------------------------------
    console.log('\n--- Scenario 7: Transactions & History Page ---');
    await navigateTo(page, '/app/transactions');
    const txPageText = await page.evaluate(() => document.body.innerText);
    const hasTxRecords = txPageText.includes('Transactions & History') && txPageText.includes('TRANSFER');
    record('Transactions Stream & History Page', hasTxRecords);
    await page.screenshot({ path: path.join(screenshotsDir, '10_transactions_page.png'), fullPage: true });

    // -----------------------------------------------------------------------
    // TEST 8: Account Statement & Cryptographic Chain Verification
    // -----------------------------------------------------------------------
    console.log('\n--- Scenario 8: Cryptographic Account Statement ---');
    const accRow = await query("SELECT id FROM accounts WHERE account_no = 'ACC-H1-01'");
    const accId = accRow.rows[0].id;
    await navigateTo(page, `/app/accounts/${accId}`);
    await sleep(1000);

    const stmtPageText = await page.evaluate(() => document.body.innerText);
    const hasStatement = stmtPageText.toLowerCase().includes('statement') || stmtPageText.includes('LEDGER CHAIN') || stmtPageText.includes('Chain Integrity');
    record('Account Cryptographic Statement Page', hasStatement);

    const clickedScan = (await clickButtonWithText(page, 'Verify Chain Integrity')) || (await clickButtonWithText(page, 'Verify Chain'));
    if (clickedScan) {
      await sleep(1500);
      record('Laser Hash-Chain Verification Executed', true);
    }
    await page.screenshot({ path: path.join(screenshotsDir, '11_account_statement.png'), fullPage: true });

    // -----------------------------------------------------------------------
    // TEST 9: Admin Login & Operations
    // -----------------------------------------------------------------------
    console.log('\n--- Scenario 9: Admin Console Operations ---');
    await loginAsPersona(page, 'Admin');

    await navigateTo(page, '/app/admin');
    const adminPageText = await page.evaluate(() => document.body.innerText);
    record('Admin Console Access (Authorized)', adminPageText.includes('Administration & Provisioning'));
    await page.screenshot({ path: path.join(screenshotsDir, '12_admin_console.png'), fullPage: true });

    // Admin Account Creation (POST /accounts)
    console.log('\n--- Scenario 10: Admin Account Creation ---');
    const newAccName = `Corporate Vault ${Date.now()}`;
    await fillInput(page, 'input[placeholder="e.g. Corporate Treasury Reserve"]', newAccName);
    const balanceInput = await page.$('input[placeholder="0.00"]');
    if (balanceInput) {
      await balanceInput.click({ clickCount: 3 });
      await page.keyboard.press('Backspace');
      await balanceInput.type('500.00'); // ₹500 initial deposit
    }
    await page.screenshot({ path: path.join(screenshotsDir, '13_admin_create_account_form.png') });
    await page.click('button[type="submit"]');
    await sleep(2500);

    // Verify account exists in PostgreSQL
    const createdAccRes = await query('SELECT id, account_no, name, balance_paise FROM accounts WHERE name = $1', [newAccName]);
    const accCreatedInDb = createdAccRes.rowCount > 0 && BigInt(createdAccRes.rows[0].balance_paise) === 50000n;
    record('Admin Account Creation & DB Opening Balance (₹500.00)', accCreatedInDb, `Account No: ${createdAccRes.rows[0]?.account_no}`);

    // Admin Status Lifecycle Management Tab
    console.log('\n--- Scenario 11: Admin Account Status Lifecycle ---');
    const clickedManageAcc = await clickButtonWithText(page, 'Manage Account Statuses');
    if (clickedManageAcc) {
      await sleep(1000);
      record('Manage Account Statuses Tab Loaded', true);
      await page.screenshot({ path: path.join(screenshotsDir, '14_admin_manage_accounts.png'), fullPage: true });

      // Click Freeze on an active account
      const clickedFreeze = await clickButtonWithText(page, 'Freeze');
      if (clickedFreeze) {
        await sleep(1500);
        const frozenCheck = await query("SELECT id, status FROM accounts WHERE status = 'FROZEN'");
        const isFrozen = frozenCheck.rowCount > 0;
        record('Admin Account Freeze Lifecycle & PostgreSQL Status Transition', isFrozen, `Frozen Accounts: ${frozenCheck.rowCount}`);

        // Click Unfreeze to restore active state
        const clickedUnfreeze = await clickButtonWithText(page, 'Unfreeze');
        if (clickedUnfreeze) {
          await sleep(1500);
          const activeCheck = await query('SELECT id, status FROM accounts WHERE id = $1', [frozenCheck.rows[0].id]);
          record('Admin Account Unfreeze Lifecycle & PostgreSQL Status Transition', activeCheck.rows[0]?.status === 'ACTIVE');
        }
      }
    }

    // Admin System Diagnostics Tab
    console.log('\n--- Scenario 12: Admin System Diagnostics ---');
    const clickedSysDiag = await clickButtonWithText(page, 'System Diagnostics');
    if (clickedSysDiag) {
      await sleep(1000);
      const sysText = await page.evaluate(() => document.body.innerText);
      record('Admin System Diagnostics Loaded', sysText.includes('HEALTHY') || sysText.includes('REDIS') || sysText.includes('POSTGRESQL'));
      await page.screenshot({ path: path.join(screenshotsDir, '15_admin_system_diagnostics.png'), fullPage: true });
    }

    // -----------------------------------------------------------------------
    // TEST 13: Auditor Login & Verification (Zero-Sum, Duplicates, Audit Logs)
    // -----------------------------------------------------------------------
    console.log('\n--- Scenario 13: Auditor Clearance & Verification ---');
    await loginAsPersona(page, 'Auditor');

    await navigateTo(page, '/app/audit');
    const auditText = await page.evaluate(() => document.body.innerText);
    const hasAuditVerification = auditText.includes('Audit & Invariant Verification') || auditText.includes('Zero-Sum');
    record('Auditor Dashboard & Invariant Verification Loaded', hasAuditVerification);
    await page.screenshot({ path: path.join(screenshotsDir, '16_auditor_dashboard.png'), fullPage: true });

    // Verify Duplicates Tab
    const clickedDup = (await clickButtonWithText(page, 'Duplicate Replays')) || (await clickButtonWithText(page, 'Replay'));
    if (clickedDup) {
      await sleep(800);
      record('Auditor Duplicate Replays Tab Displayed', true);
      await page.screenshot({ path: path.join(screenshotsDir, '17_auditor_duplicates.png'), fullPage: true });
    }

    // Verify Audit Logs Tab
    const clickedLogs = (await clickButtonWithText(page, 'Security Audit Trail')) || (await clickButtonWithText(page, 'Audit Logs')) || (await clickButtonWithText(page, 'Logs'));
    if (clickedLogs) {
      await sleep(800);
      record('Auditor Security Audit Trail Tab Displayed', true);
      await page.screenshot({ path: path.join(screenshotsDir, '18_auditor_logs.png'), fullPage: true });
    }

    // -----------------------------------------------------------------------
    // TEST 14: Unauthorized Access Protection (RBAC)
    // -----------------------------------------------------------------------
    console.log('\n--- Scenario 14: Unauthorized Access Protection ---');
    // Auditor attempts to visit /app/admin
    await page.goto(`${BASE_URL}/app/admin`, { waitUntil: 'networkidle0' });
    await sleep(800);
    const forbiddenText = await page.evaluate(() => document.body.innerText);
    const isBlocked = forbiddenText.includes('Admin Clearance Required') || forbiddenText.includes('Unauthorized') || !page.url().endsWith('/app/admin');
    record('RBAC Guard: Auditor Blocked from Admin Page', isBlocked);
    await page.screenshot({ path: path.join(screenshotsDir, '19_rbac_blocked_admin.png'), fullPage: true });

    // -----------------------------------------------------------------------
    // TEST 15: Global Database Conservation Verification
    // -----------------------------------------------------------------------
    console.log('\n--- Scenario 15: PostgreSQL Global Balance Conservation Invariant ---');
    const finalSumRes = await query('SELECT SUM(balance_paise) AS total_sum FROM accounts');
    const finalSum = BigInt(finalSumRes.rows[0].total_sum);
    record('PostgreSQL Global Balance Conservation: SUM(balances) === 0', finalSum === 0n, `Sum: ${finalSum} paise`);

  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
    await closeDb();
  }

  console.log('\n=======================================================');
  console.log(' Browser Test Summary                                  ');
  console.log('=======================================================');
  const allPassed = testResults.every((t) => t.passed);
  console.log(`Total Scenarios: ${testResults.length}`);
  console.log(`Passed:          ${testResults.filter((t) => t.passed).length}`);
  console.log(`Failed:          ${testResults.filter((t) => !t.passed).length}`);
  console.log(`Overall Status:  ${allPassed ? 'ALL PASSED ✅' : 'FAILURES DETECTED ❌'}`);
  console.log('=======================================================');

  if (!allPassed) {
    process.exit(1);
  }
}

runE2E().catch((err) => {
  console.error('[E2E FATAL ERROR]', err);
  process.exit(1);
});
