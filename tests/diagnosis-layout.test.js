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
    explanationLanguage: 'ja',
    gender: 'male',
    diagnosisDate: '2026-07-27'
  };
  state.answers = Array.from({ length: 10 }, () => ['A']);
  state.scores = core.calculateScores(state.answers);
  return state;
}


function questionState(gender = 'female') {
  const state = core.createInitialState('2026-07-27');
  state.profile.gender = gender;
  return state;
}


function explanationHtml(pageIndex = 0) {
  return ui.renderExplanationPanel(
    content.getExplanation('B-1', 'male', 'ja'),
    completedState().profile,
    pageIndex
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
  await page.setContent(`<style>${css}</style><section id="miyu-diagnosis-app">${ui.renderQuestionView(questionState(), 4)}</section>`);

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
    <div id="disabled-primary">${ui.renderQuestionView(questionState(), 0)}</div>
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
  await page.setContent(`<style>${css}</style><section id="miyu-diagnosis-app">${ui.renderQuestionView(questionState(), 4)}</section>`);

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
      ${ui.renderQuestionView(questionState(), 4)}
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
  await page.setContent(`<style>${css}</style><section id="miyu-diagnosis-app" class="miyu-drawer-open">${ui.renderQuestionView(questionState(), 4)}</section>`);

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

  const translatedBelow = await page.locator('.miyu-summary-list .miyu-language-translated').first().evaluate(element =>
    element.getBoundingClientRect().top >= element.previousElementSibling.getBoundingClientRect().bottom
  );
  const visualRatio = await page.locator('.miyu-explanation-visual').evaluate(element =>
    getComputedStyle(element).aspectRatio
  );
  const visualWidth = await page.locator('.miyu-explanation-visual').evaluate(element =>
    element.getBoundingClientRect().width
  );
  const pageHeight = await page.evaluate(() => ({
    content: document.documentElement.scrollHeight,
    viewport: window.innerHeight
  }));

  assert.equal(translatedBelow, true);
  assert.equal(visualRatio, '4 / 5');
  assert.ok(visualWidth <= 380, `portrait visual width was ${visualWidth}`);
  assert.ok(pageHeight.content <= pageHeight.viewport, `portrait identity page height was ${pageHeight.content}`);
  await page.close();
});


test('세로 태블릿의 병합된 평균 얼굴과 스타일 참고 이미지는 카드 안에서 보인다', async () => {
  const css = fs.readFileSync(path.join(ROOT, 'src', 'diagnosis.css'), 'utf8');
  const page = await browser.newPage({ viewport: { width: 834, height: 1194 } });
  await page.setContent(`<style>${css}</style>${explanationHtml(0)}${explanationHtml(3)}${explanationHtml(4)}`);

  const figures = page.locator('.miyu-average-face-visual, .miyu-reference-gallery');
  assert.equal(await figures.count(), 3);
  assert.ok(await page.locator('.miyu-average-face-visual img').count() >= 1);
  assert.ok(await page.locator('.miyu-reference-gallery img').count() >= 2);
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
  await page.close();
});


test('해설 상단의 다른 타입 보기 버튼은 타입명과 겹치지 않는다', async () => {
  const css = fs.readFileSync(path.join(ROOT, 'src', 'diagnosis.css'), 'utf8');
  const page = await browser.newPage({ viewport: { width: 834, height: 1194 } });
  await page.setContent(`<style>${css}</style>${explanationHtml(3)}`);

  const boxes = await page.locator('.miyu-explanation-utility, .miyu-type-identity').evaluateAll(elements =>
    elements.map(element => {
      const box = element.getBoundingClientRect();
      return { left: box.left, right: box.right, top: box.top, bottom: box.bottom };
    })
  );
  const [utility, identity] = boxes;
  const overlaps = utility.left < identity.right
    && utility.right > identity.left
    && utility.top < identity.bottom
    && utility.bottom > identity.top;

  assert.equal(overlaps, false, `utility and identity overlap: ${JSON.stringify(boxes)}`);
  await page.close();
});


test('세로 태블릿에서 스타일 참고 보드는 넓게 쓰고 평균 얼굴만 세로 비율을 유지한다', async () => {
  const css = fs.readFileSync(path.join(ROOT, 'src', 'diagnosis.css'), 'utf8');
  const page = await browser.newPage({ viewport: { width: 834, height: 1194 } });
  await page.setContent(`<style>${css}</style>${explanationHtml(0)}${explanationHtml(3)}`);

  const averageRatio = await page.locator('.miyu-average-face-visual').evaluate(element =>
    getComputedStyle(element).aspectRatio
  );
  const gallery = page.locator('.miyu-makeup-examples');
  const galleryWidth = await gallery.evaluate(element => element.getBoundingClientRect().width);
  const galleryRatio = await gallery.locator('img').first().evaluate(element => getComputedStyle(element).aspectRatio);

  assert.equal(averageRatio, '4 / 5');
  assert.equal(galleryRatio, 'auto');
  assert.ok(galleryWidth >= 600, `style gallery width was ${galleryWidth}`);
  await page.close();
});

test('태블릿 해설 예시 이미지는 한 줄에서 세 장씩 보이고 가로로 넘긴다', async () => {
  const css = fs.readFileSync(path.join(ROOT, 'src', 'diagnosis.css'), 'utf8');
  const page = await browser.newPage({ viewport: { width: 834, height: 1194 } });
  await page.setContent(`<style>${css}</style>${explanationHtml(3)}`);

  const rail = page.locator('.miyu-example-rail').first();
  const geometry = await rail.evaluate(element => ({
    width: element.getBoundingClientRect().width,
    cardWidth: element.firstElementChild.getBoundingClientRect().width,
    cardBasis: getComputedStyle(element.firstElementChild).flexBasis
  }));

  assert.match(geometry.cardBasis, /max/);
  assert.ok(geometry.cardWidth * 3 <= geometry.width + 4, JSON.stringify(geometry));
  await page.close();
});

test('넓은 PC에서도 추천 메이크업은 세 장만 보이고 나머지는 옆으로 넘긴다', async () => {
  const css = fs.readFileSync(path.join(ROOT, 'src', 'diagnosis.css'), 'utf8');
  const femaleDraft = content.getExplanation('A-1', 'female', 'ja');
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  await page.setContent(`<style>${css}</style>${ui.renderExplanationPanel(femaleDraft, {
    gender: 'female', explanationLanguage: 'ja', diagnosisDate: '2026-08-13'
  }, 3)}`);

  const geometry = await page.locator('.miyu-makeup-examples .miyu-example-rail').evaluate(element => {
    const firstCard = element.firstElementChild.getBoundingClientRect().width;
    const gap = Number.parseFloat(getComputedStyle(element).gap);
    return { width: element.clientWidth, scrollWidth: element.scrollWidth, firstCard, gap };
  });

  assert.ok(geometry.firstCard * 3 + geometry.gap * 2 <= geometry.width + 4, JSON.stringify(geometry));
  assert.ok(geometry.firstCard * 4 + geometry.gap * 3 > geometry.width, JSON.stringify(geometry));
  assert.ok(geometry.scrollWidth > geometry.width, JSON.stringify(geometry));
  await page.close();
});

test('여성 메이크업 예시가 세 장을 넘으면 좌우 이동 버튼을 표시한다', async () => {
  const css = fs.readFileSync(path.join(ROOT, 'src', 'diagnosis.css'), 'utf8');
  const femaleDraft = content.getExplanation('A-1', 'female', 'ja');
  const page = await browser.newPage({ viewport: { width: 834, height: 1194 } });
  await page.setContent(`<style>${css}</style>${ui.renderExplanationPanel(femaleDraft, {
    gender: 'female', explanationLanguage: 'ja', diagnosisDate: '2026-08-13'
  }, 3)}`);

  assert.equal(await page.locator('[data-action="gallery-previous"]').count(), 1);
  assert.equal(await page.locator('[data-action="gallery-next"]').count(), 1);
  await page.close();
});

test('해설 예시 이미지는 카드 안에서 잘리지 않고 전체가 보인다', async () => {
  const css = fs.readFileSync(path.join(ROOT, 'src', 'diagnosis.css'), 'utf8');
  const femaleDraft = content.getExplanation('A-1', 'female', 'ja');
  const page = await browser.newPage({ viewport: { width: 834, height: 1194 } });
  await page.setContent(`<style>${css}</style>${ui.renderExplanationPanel(femaleDraft, {
    gender: 'female', explanationLanguage: 'ja', diagnosisDate: '2026-08-13'
  }, 3)}`);

  assert.equal(
    await page.locator('.miyu-makeup-examples img').first().evaluate(element => getComputedStyle(element).objectFit),
    'contain'
  );
  await page.close();
});


test('세로 태블릿의 소개 얼굴 카드는 사진과 설명을 나란히 배치해 빈 여백을 줄인다', async () => {
  const css = fs.readFileSync(path.join(ROOT, 'src', 'diagnosis.css'), 'utf8');
  const state = core.createInitialState('2026-08-13');
  state.profile = { explanationLanguage: 'ja', gender: 'female', diagnosisDate: '2026-08-13' };
  const page = await browser.newPage({ viewport: { width: 834, height: 1194 } });
  await page.setContent(`<style>${css}</style><section id="miyu-diagnosis-app">${ui.renderIntroView(state, 2)}</section>`);

  const firstCard = page.locator('.miyu-intro-group-face').first();
  const columns = await firstCard.evaluate(element =>
    getComputedStyle(element).gridTemplateColumns.split(' ').filter(Boolean).length
  );
  const frame = firstCard.locator('.miyu-intro-face-frame');
  const frameWidth = await frame.evaluate(element => element.getBoundingClientRect().width);
  const cardHeight = await firstCard.evaluate(element => element.getBoundingClientRect().height);

  assert.equal(columns, 2);
  assert.ok(frameWidth >= 120, `intro face width was ${frameWidth}`);
  assert.ok(cardHeight < 260, `intro card height was ${cardHeight}`);
  await page.close();
});


test('해설 가이드에서 한국어는 번역문보다 크게 강조된다', async () => {
  const css = fs.readFileSync(path.join(ROOT, 'src', 'diagnosis.css'), 'utf8');
  const page = await browser.newPage({ viewport: { width: 834, height: 1194 } });
  await page.setContent(`<style>${css}</style>${explanationHtml(3)}`);

  const typography = await page.locator('.miyu-guide-detail-card').first().evaluate(element => {
    const ko = element.querySelector('.miyu-localized-copy .miyu-language-ko');
    const translated = element.querySelector('.miyu-localized-copy .miyu-language-translated');
    const koStyle = getComputedStyle(ko);
    const translatedStyle = getComputedStyle(translated);
    return {
      koSize: Number.parseFloat(koStyle.fontSize),
      translatedSize: Number.parseFloat(translatedStyle.fontSize),
      koWeight: Number.parseFloat(koStyle.fontWeight),
      translatedWeight: Number.parseFloat(translatedStyle.fontWeight)
    };
  });

  assert.ok(typography.koSize > typography.translatedSize, JSON.stringify(typography));
  assert.ok(typography.koWeight > typography.translatedWeight, JSON.stringify(typography));
  await page.close();
});


test('세로 태블릿의 상세 특징은 5행씩 나뉘고 셀 안에서 두 언어를 쌓는다', async () => {
  const css = fs.readFileSync(path.join(ROOT, 'src', 'diagnosis.css'), 'utf8');
  const page = await browser.newPage({ viewport: { width: 834, height: 1194 } });
  await page.setContent(`<style>${css}</style>${explanationHtml(1)}${explanationHtml(2)}`);

  const rows = page.locator('.miyu-detail-row');
  assert.equal(await rows.count(), 10);
  const values = await page.locator('.miyu-detail-value').evaluateAll(elements =>
    elements.map(element => {
      const korean = element.querySelector('.miyu-language-ko');
      const translated = element.querySelector('.miyu-language-translated');
      const cellRect = element.getBoundingClientRect();
      const koreanRect = korean.getBoundingClientRect();
      const translatedRect = translated.getBoundingClientRect();
      return {
        koreanLang: korean.lang,
        translatedLang: translated.lang,
        translatedBelow: translatedRect.top >= koreanRect.bottom,
        withinViewport: cellRect.left >= 0 && cellRect.right <= window.innerWidth
      };
    })
  );

  assert.ok(values.every(value => value.koreanLang === 'ko'));
  assert.ok(values.every(value => value.translatedLang === 'ja'));
  assert.ok(values.every(value => value.translatedBelow));
  assert.ok(values.every(value => value.withinViewport));
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
  await page.close();
});


test('출력 화면은 한국어와 선택 언어를 모두 유지한다', async () => {
  const css = fs.readFileSync(path.join(ROOT, 'src', 'diagnosis.css'), 'utf8');
  const page = await browser.newPage({ viewport: { width: 834, height: 1194 } });
  await page.setContent(`<style>${css}</style>${explanationHtml(1)}`);
  await page.emulateMedia({ media: 'print' });

  assert.equal(await page.locator('.miyu-language-ko').first().isVisible(), true);
  assert.equal(await page.locator('.miyu-language-translated').first().isVisible(), true);
  const breakInside = await page.locator('.miyu-detail-row').first().evaluate(element =>
    getComputedStyle(element).breakInside
  );
  assert.ok(['avoid', 'avoid-page'].includes(breakInside));
  await page.close();
});


test('가로 태블릿은 이미지 옆에 한국어와 선택 언어를 2열로 표시한다', async () => {
  const css = fs.readFileSync(path.join(ROOT, 'src', 'diagnosis.css'), 'utf8');
  const page = await browser.newPage({ viewport: { width: 1194, height: 834 } });
  await page.setContent(`<style>${css}</style>${explanationHtml(0)}`);

  const layoutColumns = await page.locator('.miyu-explanation-layout').evaluate(element =>
    getComputedStyle(element).gridTemplateColumns.split(' ').filter(Boolean).length
  );
  const hasBilingualSummary = await page.locator('.miyu-summary-list [lang="ko"]').count()
    && await page.locator('.miyu-summary-list [lang="ja"]').count();

  assert.equal(layoutColumns, 2);
  assert.ok(hasBilingualSummary);
  await page.close();
});
