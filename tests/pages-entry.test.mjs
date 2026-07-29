import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';


const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const TARGET_FILE = '미유_무드진단_12type_v17.html';

let browser;
let server;
let baseUrl;


function safeDistPath(requestUrl) {
  const pathname = decodeURIComponent(new URL(requestUrl, 'http://127.0.0.1').pathname);
  const relativePath = pathname === '/' ? 'index.html' : pathname.slice(1);
  const fullPath = path.resolve(DIST, relativePath);
  return fullPath.startsWith(`${DIST}${path.sep}`) ? fullPath : null;
}


before(async () => {
  server = createServer(async (request, response) => {
    const filePath = safeDistPath(request.url);
    if (!filePath) {
      response.writeHead(400).end('Bad request');
      return;
    }

    try {
      const fileStats = await stat(filePath);
      if (!fileStats.isFile()) throw new Error('Not a file');
      response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      createReadStream(filePath).pipe(response);
    } catch {
      response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      response.end('Not found');
    }
  });

  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  baseUrl = `http://127.0.0.1:${address.port}/`;
  browser = await chromium.launch({
    headless: true,
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
  });
});


after(async () => {
  if (browser) await browser.close();
  if (server) await new Promise(resolve => server.close(resolve));
});


test('루트 주소가 v17 진단 화면을 연다', async () => {
  const page = await browser.newPage({ viewport: { width: 834, height: 1194 } });
  await page.goto(baseUrl);
  await page.waitForURL(
    url => decodeURIComponent(url.pathname).endsWith(`/${TARGET_FILE}`),
    { timeout: 5000 }
  );

  assert.equal(await page.locator('h1').first().textContent(), '무드 진단');
  await page.close();
});
