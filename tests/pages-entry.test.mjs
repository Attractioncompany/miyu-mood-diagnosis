import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { copyFileSync, createReadStream, mkdtempSync, rmSync } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';


const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let dist;
const TARGET_FILE = '미유_무드진단_12type_v17.html';

let browser;
let server;
let baseUrl;


function completedState(overrides = {}) {
  return {
    version: 17,
    profile: {
      customerName: '미유',
      consultantName: '김컨설턴트',
      explanationLanguage: overrides.explanationLanguage || 'ja',
      gender: overrides.gender || 'male',
      diagnosisDate: '2026-07-30'
    },
    answers: Array.from({ length: 10 }, () => ['B']),
    currentQuestion: 9,
    scores: { A: 0, B: 10, C: 0, D: 0 },
    selectedType: overrides.selectedType || 'B-1'
  };
}


function safeDistPath(requestUrl) {
  const pathname = decodeURIComponent(new URL(requestUrl, 'http://127.0.0.1').pathname);
  const relativePath = pathname === '/' ? 'index.html' : pathname.slice(1);
  const fullPath = path.resolve(dist, relativePath);
  return fullPath.startsWith(`${dist}${path.sep}`) ? fullPath : null;
}


before(async () => {
  dist = mkdtempSync(path.join(os.tmpdir(), 'miyu-pages-entry-'));
  copyFileSync(path.join(ROOT, 'dist', 'index.html'), path.join(dist, 'index.html'));
  copyFileSync(path.join(ROOT, 'dist', TARGET_FILE), path.join(dist, TARGET_FILE));

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
  if (dist) rmSync(dist, { recursive: true, force: true });
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


test('고객 정보 뒤에는 소개 3장과 브릿지를 거쳐 한국어 진단을 연다', async () => {
  const page = await browser.newPage({ viewport: { width: 834, height: 1194 } });
  const url = new URL(TARGET_FILE, baseUrl);
  await page.goto(url.href);

  await page.locator('input[name="customerName"]').fill('Miyu');
  await page.locator('input[name="consultantName"]').fill('Consultant');
  await page.locator('select[name="explanationLanguage"]').selectOption('ja');
  await page.locator('select[name="gender"]').selectOption('female');
  await page.locator('input[name="diagnosisDate"]').fill('2026-08-09');
  await page.locator('button[type="submit"]').click();

  assert.equal(await page.locator('.miyu-intro-step').getAttribute('data-intro-page'), '1');
  assert.match(await page.locator('.miyu-intro-step').textContent(), /MIYUムード診断とは？/);
  await page.locator('[data-action="next-intro"]').click();
  assert.equal(await page.locator('.miyu-intro-step').getAttribute('data-intro-page'), '2');
  await page.locator('[data-action="next-intro"]').click();
  assert.equal(await page.locator('.miyu-intro-step').getAttribute('data-intro-page'), '3');
  await page.locator('[data-action="next-intro"]').click();
  await page.locator('.miyu-bridge-step').waitFor({ state: 'visible' });
  assert.match(await page.locator('.miyu-bridge-step').textContent(), /これから診断を始めます。/);
  await page.locator('[data-action="begin-diagnosis"]').click();
  await page.locator('.miyu-question-shell').waitFor({ state: 'visible' });
  assert.match(await page.locator('.miyu-question-shell').textContent(), /얼굴형/);
  assert.equal(await page.locator('.miyu-question-shell [lang="ja"]').count(), 0);
  await page.close();
});


test('남성 일본어 진단은 남성 문항 이미지와 전체 이중언어 해설을 표시한다', async () => {
  const page = await browser.newPage({ viewport: { width: 834, height: 1194 } });
  await page.addInitScript(savedState => {
    sessionStorage.setItem('miyuDiagnosisV17', JSON.stringify(savedState));
  }, completedState({ gender: 'male', explanationLanguage: 'ja', selectedType: 'B-1' }));

  const questionUrl = new URL(TARGET_FILE, baseUrl);
  questionUrl.hash = '#/diagnosis/question/1';
  await page.goto(questionUrl.href);
  assert.match(
    await page.locator('.miyu-answer-figure img').first().getAttribute('data-asset'),
    /^questions\/male\//
  );
  assert.equal(await page.locator('[data-action="open-image"]').count(), 0);

  const catUrl = new URL(TARGET_FILE, baseUrl);
  catUrl.hash = '#/cat/05';
  await page.goto(catUrl.href);

  const panel = page.locator('.miyu-explanation-panel');
  await panel.waitFor({ state: 'visible' });
  assert.match(await panel.textContent(), /Boyish · 보이시/);
  assert.equal(await panel.locator('.miyu-detail-row').count(), 10);
  assert.ok(await panel.locator('[lang="ko"]').count() > 0);
  assert.ok(await panel.locator('[lang="ja"]').count() > 0);
  assert.equal(
    await page.locator('#topNav').evaluate(element => getComputedStyle(element).display),
    'none',
    'male explanation must not expose legacy female navigation'
  );
  const section = page.locator('.category-section[data-cat-id="05"]');
  const femaleCelebritySections = {
    representative: '.cat-representative',
    averageFace: '.cat-avg-face',
    peopleGrid: '.people-grid'
  };
  for (const [name, selector] of Object.entries(femaleCelebritySections)) {
    const surfaces = section.locator(selector);
    assert.ok(await surfaces.count() > 0, `${name} must exist in the legacy explanation`);
    const states = await surfaces.evaluateAll(elements => elements.map(element => ({
      display: getComputedStyle(element).display,
      visible: element.getClientRects().length > 0
    })));
    assert.ok(
      states.every(state => state.display === 'none' && state.visible === false),
      `${name} must not be visible for male explanations: ${JSON.stringify(states)}`
    );
  }
  for (const [name, selector] of Object.entries({
    representativeLabel: '.cat-representative .miyu-legacy-representative-label',
    representativeName: '.cat-representative .miyu-legacy-person-name'
  })) {
    const surfaces = section.locator(selector);
    assert.ok(await surfaces.count() > 0, `${name} must exist in the legacy explanation`);
    assert.ok(
      (await surfaces.evaluateAll(elements => elements.map(element =>
        element.getClientRects().length > 0
      ))).every(visible => visible === false),
      `${name} must not be visible for male explanations`
    );
  }
  assert.equal(
    await section.locator('.miyu-legacy-section-heading, .cat-avg-face .miyu-localized-heading').count(),
    0
  );
  await page.close();
});


test('여성 중국어 번체 해설은 여성 이미지와 영문 연예인명을 표시한다', async () => {
  const page = await browser.newPage({ viewport: { width: 834, height: 1194 } });
  await page.addInitScript(savedState => {
    sessionStorage.setItem('miyuDiagnosisV17', JSON.stringify(savedState));
  }, completedState({ gender: 'female', explanationLanguage: 'zh-TW', selectedType: 'C-3' }));

  const questionUrl = new URL(TARGET_FILE, baseUrl);
  questionUrl.hash = '#/diagnosis/question/1';
  await page.goto(questionUrl.href);
  assert.match(
    await page.locator('.miyu-answer-figure img').first().getAttribute('data-asset'),
    /^questions\/q\d{2}-[a-d]\.png$/
  );

  const catUrl = new URL(TARGET_FILE, baseUrl);
  catUrl.hash = '#/cat/18';
  await page.goto(catUrl.href);

  const section = page.locator('.category-section[data-cat-id="18"]');
  await section.locator('.miyu-explanation-panel').waitFor({ state: 'visible' });
  assert.ok(await section.locator('[lang="zh-Hant"]').count() > 0);
  const visibleNames = await section.locator('.person-name').allTextContents();
  assert.ok(visibleNames.length > 0);
  for (const name of visibleNames) assert.doesNotMatch(name, /[가-힣]/, name);
  await page.close();
});


test('여성 대분류의 동적 연예인 카드도 영문 이름과 이미지를 연결한다', async () => {
  const page = await browser.newPage({ viewport: { width: 1194, height: 834 } });
  const url = new URL(TARGET_FILE, baseUrl);
  url.hash = '#/macro/A';
  await page.goto(url.href);

  const cards = page.locator('.lv2-person-card');
  assert.ok(await cards.count() > 0);
  assert.equal(await page.locator('.lv2-person-photo-empty').count(), 0);
  for (const name of await page.locator('.lv2-person-name').allTextContents()) {
    assert.doesNotMatch(name, /[가-힣]/, name);
  }
  await page.close();
});


test('남성 고객은 여성 전용 대분류와 무드북 대신 진단 결과로 돌아간다', async () => {
  const page = await browser.newPage({ viewport: { width: 834, height: 1194 } });
  await page.addInitScript(savedState => {
    sessionStorage.setItem('miyuDiagnosisV17', JSON.stringify(savedState));
  }, completedState({ gender: 'male', explanationLanguage: 'zh-TW', selectedType: 'B-1' }));

  for (const blockedHash of ['#/macro/B', '#/moodbook']) {
    const url = new URL(TARGET_FILE, baseUrl);
    url.hash = blockedHash;
    await page.goto(url.href);

    await page.waitForFunction(() => location.hash === '#/diagnosis/result');
    const resultText = await page.locator('.miyu-result-shell').textContent();
    assert.match(resultText, /Boyish · 보이시/);
    assert.doesNotMatch(resultText, /Feminine · 페미닌/);
  }
  await page.close();
});
