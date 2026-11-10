import puppeteer from '../client/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js';
import fs from 'fs';
import path from 'path';
import http from 'http';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'client', 'dist');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const executablePath = fs.existsSync(chromePath) ? chromePath : edgePath;

const targetPath = process.argv[2] || '/';
const outputFileName = process.argv[3] || 'screenshot.png';

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

function createStaticServer(port = 5173) {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const urlPath = req.url.split('?')[0];
      let filePath = path.join(distDir, urlPath);

      if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
        filePath = path.join(distDir, 'index.html');
      }

      const ext = path.extname(filePath);
      const mime = MIME_TYPES[ext] || 'application/octet-stream';

      try {
        const content = fs.readFileSync(filePath);
        res.writeHead(200, { 'Content-Type': mime });
        res.end(content);
      } catch {
        const indexContent = fs.readFileSync(path.join(distDir, 'index.html'));
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(indexContent);
      }
    });

    server.listen(port, () => resolve(server));
  });
}

async function run() {
  const screenshotsDir = path.join(rootDir, 'screenshots');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  const baseName = path.basename(outputFileName);
  const outputPath = path.join(screenshotsDir, baseName);

  const server = await createStaticServer(5173);
  const fullUrl = `http://localhost:5173${targetPath.startsWith('/') ? targetPath : '/' + targetPath}`;

  console.log(`[SCREENSHOT] Capturing ${fullUrl} -> ${outputPath}`);

  const profileDir = path.join(rootDir, 'client', `.pup_shot_${Date.now()}`);
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
        '--disable-extensions',
        '--disable-dev-shm-usage',
      ],
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });

    // Preset user session if target is protected /app
    const isProtected = targetPath.startsWith('/app');
    if (isProtected) {
      const roleToMock = process.env.MOCK_ROLE || 'admin';
      await page.goto('http://localhost:5173/login', { waitUntil: 'domcontentloaded' });
      await page.evaluate((r) => {
        if (window.__SET_MOCK_SESSION__) {
          window.__SET_MOCK_SESSION__({
            id: 1,
            email: `${r}@ledgerline.local`,
            role: r,
            name: `${r.toUpperCase()} User`,
          }, 'dev-mock-token');
        }
      }, roleToMock);
    }

    await page.goto(fullUrl, { waitUntil: 'networkidle0', timeout: 15000 }).catch(async () => {
      await page.goto(fullUrl, { waitUntil: 'domcontentloaded' });
    });

    await new Promise((r) => setTimeout(r, 1200));

    if (process.env.OPEN_PALETTE === 'true') {
      try {
        const cmdBtn = await page.$('button[title*="Command Palette"]');
        if (cmdBtn) {
          await cmdBtn.click();
          await new Promise((r) => setTimeout(r, 800));
        }
      } catch {}
    }

    await page.screenshot({ path: outputPath, fullPage: process.env.FULL_PAGE === 'true' });
    console.log(`[SCREENSHOT] Successfully saved to: ${outputPath}`);
  } finally {
    if (browser) await browser.close();
    server.close();
    try {
      fs.rmSync(profileDir, { recursive: true, force: true });
    } catch {}
  }
}

run().catch((err) => {
  console.error('[SCREENSHOT ERROR]', err);
  process.exit(1);
});
