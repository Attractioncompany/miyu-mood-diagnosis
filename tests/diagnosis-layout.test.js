const { after, before, test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const core = require('../src/diagnosis-core.js');
const content = require('../src/explanation-content.js');
const ui = require('../src/diagnosis-ui.js');


const ROOT = path.resolve(__dirname, '..');
let browser;


function completedState() {
  const state = core.createInitialState('2026-07-27');
  state.profile = {
    customerName: '미유',
    consultantName: '김컨설턴트',
    explanationLanguage: 'ja',
    gender: 'male',
    diagnosisDate: '2026-07-27'
  };
  state.answers = Array.from({ length: 10 }, () => ['A']);
  state.scores = core.calculateScores(state.answers);
  return state;
}


function explanationHtml() {
  return ui.renderExplanationPanel(
    content.getExplanation('B-1', 'male', 'ja'),
    completedState().profile
  );
}


before(async () => {
  browser = await chromium.launch({
    headless: true,
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
  });
});


after(async () => {
  if (browser) await browser.close();
});


test('세로 태블릿에서 답변은 2열이고 주요 버튼은 44px 이상이다', async () => {
  const css = fs.readFileSync(path.join(ROOT, 'src', 'diagnosis.css'), 'utf8');
  const page = await browser.newPage({ viewport: { width: 834, height: 1194 } });
  await page.setContent(`<style>${css}</style><section id="miyu-diagnosis-app">${ui.renderQuestionView(core.createInitialState('2026-07-27'), 4)}</section>`);

  const gridColumns = await page.locator('.miyu-answer-grid').evaluate(element =>
    getComputedStyle(element).gridTemplateColumns.split(' ').filter(Boolean).length
  );
  const selectHeight = await page.locator('.miyu-answer-select').first().evaluate(element =>
    element.getBoundingClientRect().height
  );
  const footerButtonHeight = await page.locator('.miyu-question-footer .miyu-button').first().evaluate(element =>
    element.getBoundingClientRect().height
  );

  assert.equal(gridColumns, 2);
  assert.ok(selectHeight >= 44, `answer select height was ${selectHeight}`);
  assert.ok(footerButtonHeight >= 44, `footer button height was ${footerButtonHeight}`);
  await page.close();
});


test('검은 주요 버튼의 흰 글자가 선명하게 보인다', async () => {
  const css = fs.readFileSync(path.join(ROOT, 'src', 'diagnosis.css'), 'utf8');
  const page = await browser.newPage({ viewport: { width: 834, height: 1194 } });
  await page.setContent(`<style>${css}</style><section id="miyu-diagnosis-app">
    <div id="enabled-primary">${ui.renderStartView(core.createInitialState('2026-07-27'))}</div>
    <div id="disabled-primary">${ui.renderQuestionView(core.createInitialState('2026-07-27'), 0)}</div>
  </section>`);

  const colors = await page.locator('#enabled-primary .miyu-button.miyu-primary').evaluate(element => {
    const style = getComputedStyle(element);
    return { background: style.backgroundColor, foreground: style.color };
  });
  const disabledColors = await page.locator('#disabled-primary .miyu-button.miyu-primary').evaluate(element => {
    const style = getComputedStyle(element);
    return { background: style.backgroundColor, foreground: style.color };
  });

  assert.equal(colors.background, 'rgb(21, 21, 21)');
  assert.equal(colors.foreground, 'rgb(255, 255, 255)');
  assert.equal(disabledColors.background, 'rgb(233, 233, 230)');
  assert.equal(disabledColors.foreground, 'rgb(154, 154, 150)');
  await page.close();
});


test('진행표는 세로 태블릿의 왼쪽에서 약 78% 너비로 열린다', async () => {
  const css = fs.readFileSync(path.join(ROOT, 'src', 'diagnosis.css'), 'utf8');
  const page = await browser.newPage({ viewport: { width: 834, height: 1194 } });
  await page.setContent(`<style>${css}</style><section id="miyu-diagnosis-app">${ui.renderQuestionView(core.createInitialState('2026-07-27'), 4)}</section>`);

  const closedX = await page.locator('.miyu-progress-drawer').evaluate(element =>
    element.getBoundingClientRect().x
  );
  await page.locator('#miyu-diagnosis-app').evaluate(element =>
    element.classList.add('miyu-drawer-open')
  );
  await page.waitForTimeout(260);
  const opened = await page.locator('.miyu-progress-drawer').evaluate(element => {
    const rect = element.getBoundingClientRect();
    return { x: rect.x, width: rect.width };
  });

  assert.ok(closedX < -100, `closed drawer x was ${closedX}`);
  assert.ok(Math.abs(opened.x) < 1, `opened drawer x was ${opened.x}`);
  assert.ok(opened.width >= 620 && opened.width <= 655, `drawer width was ${opened.width}`);
  await page.close();
});


test('질문 이미지와 결과 얼굴은 자르지 않고 contain으로 표시한다', async () => {
  const css = fs.readFileSync(path.join(ROOT, 'src', 'diagnosis.css'), 'utf8');
  const page = await browser.newPage({ viewport: { width: 834, height: 1194 } });
  await page.setContent(`<style>${css}</style>
    <section id="miyu-diagnosis-app">
      ${ui.renderQuestionView(core.createInitialState('2026-07-27'), 4)}
      ${ui.renderResultView(completedState())}
    </section>`);

  const questionFit = await page.locator('.miyu-answer-image img').first().evaluate(element =>
    getComputedStyle(element).objectFit
  );
  const typeFit = await page.locator('.miyu-type-photo img').first().evaluate(element =>
    getComputedStyle(element).objectFit
  );

  assert.equal(questionFit, 'contain');
  assert.equal(typeFit, 'contain');
  await page.close();
});


test('가로 태블릿에서도 답변 2열을 유지하고 진행표는 460px을 넘지 않는다', async () => {
  const css = fs.readFileSync(path.join(ROOT, 'src', 'diagnosis.css'), 'utf8');
  const page = await browser.newPage({ viewport: { width: 1194, height: 834 } });
  await page.setContent(`<style>${css}</style><section id="miyu-diagnosis-app" class="miyu-drawer-open">${ui.renderQuestionView(core.createInitialState('2026-07-27'), 4)}</section>`);

  const gridColumns = await page.locator('.miyu-answer-grid').evaluate(element =>
    getComputedStyle(element).gridTemplateColumns.split(' ').filter(Boolean).length
  );
  const drawerWidth = await page.locator('.miyu-progress-drawer').evaluate(element =>
    element.getBoundingClientRect().width
  );

  assert.equal(gridColumns, 2);
  assert.ok(drawerWidth <= 460, `landscape drawer width was ${drawerWidth}`);
  await page.close();
});


test('세로 태블릿은 해설 이미지와 두 언어를 위아래로 표시한다', async () => {
  const css = fs.readFileSync(path.join(ROOT, 'src', 'diagnosis.css'), 'utf8');
  const page = await browser.newPage({ viewport: { width: 834, height: 1194 } });
  await page.setContent(`<style>${css}</style>${explanationHtml()}`);

  const copyColumns = await page.locator('.miyu-explanation-copy').evaluate(element =>
    getComputedStyle(element).gridTemplateColumns.split(' ').filter(Boolean).length
  );
  const visualRatio = await page.locator('.miyu-explanation-visual').evaluate(element =>
    getComputedStyle(element).aspectRatio
  );
  const visualWidth = await page.locator('.miyu-explanation-visual').evaluate(element =>
    element.getBoundingClientRect().width
  );

  assert.equal(copyColumns, 1);
  assert.equal(visualRatio, '4 / 5');
  assert.ok(visualWidth <= 380, `portrait visual width was ${visualWidth}`);
  await page.close();
});


test('가로 태블릿은 이미지 옆에 한국어와 선택 언어를 2열로 표시한다', async () => {
  const css = fs.readFileSync(path.join(ROOT, 'src', 'diagnosis.css'), 'utf8');
  const page = await browser.newPage({ viewport: { width: 1194, height: 834 } });
  await page.setContent(`<style>${css}</style>${explanationHtml()}`);

  const layoutColumns = await page.locator('.miyu-explanation-layout').evaluate(element =>
    getComputedStyle(element).gridTemplateColumns.split(' ').filter(Boolean).length
  );
  const copyColumns = await page.locator('.miyu-explanation-copy').evaluate(element =>
    getComputedStyle(element).gridTemplateColumns.split(' ').filter(Boolean).length
  );

  assert.equal(layoutColumns, 2);
  assert.equal(copyColumns, 2);
  await page.close();
});
