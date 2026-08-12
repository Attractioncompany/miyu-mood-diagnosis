const { after, before, test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');


const ROOT = path.resolve(__dirname, '..');
const DIST_URL = pathToFileURL(
  path.join(ROOT, 'dist', '미유_무드진단_Full_V1.html')
).href;
let browser;


before(async () => {
  browser = await chromium.launch({
    headless: true,
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
  });
});


after(async () => {
  if (browser) await browser.close();
});


test('기존 인덱스의 D카드는 보이는 코드와 이미지 이름까지 PDF 순서다', async () => {
  const page = await browser.newPage({ viewport: { width: 1194, height: 834 } });
  await page.goto(`${DIST_URL}#/index`);

  const cards = await page.locator('.lv1-card[data-macro="D"] .lv1-thumb-item').evaluateAll(items =>
    items.map(item => ({
      href: item.getAttribute('href'),
      code: item.querySelector('.lv1-thumb-code')?.textContent.trim(),
      name: item.querySelector('.lv1-thumb-name')?.textContent.trim(),
      imageAlt: item.querySelector('img')?.alt
    }))
  );

  assert.deepEqual(cards, [
    { href: '#/cat/13', code: 'D-1', name: '카리스마', imageAlt: 'D-1' },
    { href: '#/cat/08', code: 'D-2', name: '클리어', imageAlt: 'D-2' },
    { href: '#/cat/17', code: 'D-3', name: '샤프', imageAlt: 'D-3' }
  ]);
  await page.close();
});


test('해설 직접 링크는 선택한 타입만 즉시 표시한다', async () => {
  const page = await browser.newPage({ viewport: { width: 1194, height: 834 } });
  await page.goto(`${DIST_URL}#/cat/18`);

  const visibleSections = page.locator('.category-section:not(.lv3-hidden)');
  assert.equal(await visibleSections.count(), 1);
  assert.equal(await visibleSections.first().getAttribute('data-cat-id'), '18');
  assert.match((await visibleSections.locator('.cat-name').textContent()).trim(), /딥시크/);
  await page.close();
});


test('기존 출력 버튼은 이미지 준비 뒤 인쇄 기능을 호출한다', async () => {
  const page = await browser.newPage({ viewport: { width: 1194, height: 834 } });
  await page.goto(`${DIST_URL}#/macro/A`);
  await page.evaluate(() => {
    window.print = () => {
      document.documentElement.dataset.printCalled = 'true';
    };
  });

  await page.locator('#navPrint').click();
  await page.waitForTimeout(350);

  assert.equal(
    await page.locator('html').getAttribute('data-print-called'),
    'true'
  );
  await page.close();
});
