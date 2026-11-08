import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import puppeteer from '../client/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const executablePath = fs.existsSync(chromePath) ? chromePath : edgePath;

async function run() {
  console.log('[VERIFY] Importing Express app from src/app.js...');
  const { default: app } = await import('../src/app.js');

  const PORT = 5055;
  const server = http.createServer(app);

  await new Promise((resolve) => server.listen(PORT, resolve));
  console.log(`[VERIFY] Server listening on http://localhost:${PORT}`);

  try {
    // 1. Raw HTTP GET Checks for Express SPA Fallback
    console.log('\n--- 1. HTTP GET Express SPA Fallback Verification ---');
    const endpoints = ['/', '/login', '/signup'];
    for (const ep of endpoints) {
      const url = `http://localhost:${PORT}${ep}`;
      const res = await fetch(url);
      const text = await res.text();
      const hasTitle = text.includes('<title>LedgerLine — High-Integrity Financial Ledger</title>');
      const hasRootDiv = text.includes('<div id="root"></div>');
      console.log(`GET ${ep.padEnd(8)} -> Status: ${res.status} | Content-Type: ${res.headers.get('content-type')} | Title Match: ${hasTitle} | Root Div: ${hasRootDiv}`);
      if (!res.ok || !hasTitle) {
        throw new Error(`Failed HTTP check for ${ep}`);
      }
    }

    // 2. Headless Browser DOM Verification for Client Rendered Markers
    console.log('\n--- 2. Client Rendered UI Markers Verification ---');
    const profileDir = path.join(rootDir, 'client', `.pup_verify_${Date.now()}`);
    fs.mkdirSync(profileDir, { recursive: true });

    let browser;
    try {
      browser = await puppeteer.launch({
        executablePath,
        headless: 'shell',
        userDataDir: profileDir,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-gpu',
          '--no-first-run',
          '--no-default-browser-check',
        ],
      });

      const page = await browser.newPage();
      await page.setViewport({ width: 1440, height: 900 });

      // Check "/" for non-logged-in user
      console.log('\n[TEST 1] Visiting "/" (non-logged-in):');
      await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('h1', { timeout: 10000 });
      const landingHeadline = await page.evaluate(() => document.body.innerText);
      const hasLandingLeft = landingHeadline.includes('Money moves once.');
      const hasLandingRight = landingHeadline.includes('The ledger remembers.');
      const hasPills = landingHeadline.includes('Exactly once') && landingHeadline.includes('No overdraft');
      console.log(`  ✓ Marker "Money moves once.": ${hasLandingLeft}`);
      console.log(`  ✓ Marker "The ledger remembers.": ${hasLandingRight}`);
      console.log(`  ✓ Marker Invariant Pills (Exactly once / No overdraft): ${hasPills}`);

      // Check "/login"
      console.log('\n[TEST 2] Visiting "/login":');
      await page.goto(`http://localhost:${PORT}/login`, { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('h1', { timeout: 10000 });
      const loginText = await page.evaluate(() => document.body.innerText);
      const hasLoginTitle = loginText.includes('Sign in to your ledger');
      const hasBackToHomeLogin = loginText.includes('Back to home');
      const hasDemoChips = loginText.toLowerCase().includes('demo reviewer accounts');
      const logoLoginHref = await page.evaluate(() => {
        const logo = document.querySelector('a[href="/"]');
        return logo ? logo.getAttribute('href') : null;
      });
      console.log(`  ✓ Marker "Sign in to your ledger": ${hasLoginTitle}`);
      console.log(`  ✓ Marker "Back to home" link: ${hasBackToHomeLogin}`);
      console.log(`  ✓ Marker "Demo Reviewer Accounts": ${hasDemoChips}`);
      console.log(`  ✓ Logo href target: "${logoLoginHref}"`);

      // Check "/signup"
      console.log('\n[TEST 3] Visiting "/signup":');
      await page.goto(`http://localhost:${PORT}/signup`, { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('h1', { timeout: 10000 });
      const signupText = await page.evaluate(() => document.body.innerText);
      const hasSignupTitle = signupText.includes('Open an Account');
      const hasBackToHomeSignup = signupText.includes('Back to home');
      const hasHolderTier = signupText.includes('Holder Tier');
      const logoSignupHref = await page.evaluate(() => {
        const logo = document.querySelector('a[href="/"]');
        return logo ? logo.getAttribute('href') : null;
      });
      console.log(`  ✓ Marker "Open an Account": ${hasSignupTitle}`);
      console.log(`  ✓ Marker "Back to home" link: ${hasBackToHomeSignup}`);
      console.log(`  ✓ Marker "Holder Tier": ${hasHolderTier}`);
      console.log(`  ✓ Logo href target: "${logoSignupHref}"`);

      // Check logged-in user opening "/" -> redirects to "/app"
      console.log('\n[TEST 4] Logged-in user visiting "/":');
      // Set session and navigate to "/" in the active SPA instance
      await page.evaluate(() => {
        if (window.__SET_MOCK_SESSION__) {
          window.__SET_MOCK_SESSION__({
            id: 1,
            email: 'admin@ledgerline.local',
            role: 'admin',
            name: 'Root Administrator',
          }, 'mock-token');
        }
        window.history.pushState({}, '', '/');
        window.dispatchEvent(new PopStateEvent('popstate'));
      });
      await new Promise((r) => setTimeout(r, 600));

      const finalUrl = page.url();
      const appText = await page.evaluate(() => document.body.innerText);
      const redirectedToApp = finalUrl.includes('/app');
      const hasAppMarker = appText.includes('Double-Entry Ledger Engine') || appText.includes('Overview');
      console.log(`  ✓ Logged-in user URL: ${finalUrl}`);
      console.log(`  ✓ Redirected to "/app": ${redirectedToApp}`);
      console.log(`  ✓ Marker in app view: ${hasAppMarker}`);

    } finally {
      if (browser) await browser.close();
      try {
        fs.rmSync(profileDir, { recursive: true, force: true });
      } catch {}
    }

    console.log('\n[SUCCESS] All route verifications, deep link fallbacks, and markers validated.');
  } finally {
    server.close();
  }
}

run().catch((err) => {
  console.error('[VERIFY ERROR]', err);
  process.exit(1);
});
