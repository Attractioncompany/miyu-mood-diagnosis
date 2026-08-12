# MIYU PPT 스타일링 원문 반영 및 해설 병합 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** PPT 기준의 대분류 헤어·세부 타입 메이크업을 고객 해설에 반영하고, 반복된 해설 1·2·5페이지를 한 장으로 합친다.

**Architecture:** `explanation-data.js`에 PPT 원문 핵심을 이름 기준의 세부 메이크업 가이드와 대분류 헤어 가이드로 보강한다. `explanation-content.js`는 8개 페이지 배열과 이름 기반 스타일링 연결을 만들고, `diagnosis-ui.js`는 병합된 정체성 페이지와 레거시 직접 해설 연결을 렌더한다. D그룹은 앱의 표시 코드가 아닌 타입 이름으로 PPT 내용을 연결한다.

**Tech Stack:** 단일 HTML JavaScript 빌드, Node 내장 테스트 러너, Playwright, GitHub Pages 빌드 스크립트

## Global Constraints

- 헤어는 A/B/C/D 대분류 공통이며, 메이크업·그루밍은 12개 세부 타입별 PPT 기준으로 제공한다.
- 고객에게 보이는 모든 해설은 한국어와 선택 언어를 함께 제공한다.
- 해설 주소 형식 `#/diagnosis/explanation/{type}/{page}`과 기존 v17 공개 링크를 유지한다.
- 코드 순서가 다른 D그룹은 타입명으로 PPT 콘텐츠를 연결한다.
- 정식 파일은 `dist/미유_무드진단_Full_V1.html`이며, 빌드 뒤 최신 생성물이어야 한다.

---

### Task 1: PPT 기준 스타일링 데이터와 D그룹 연결

**Files:**
- Modify: `src/explanation-data.js`
- Modify: `src/explanation-content.js`
- Test: `tests/explanation-content.test.js`

**Interfaces:**
- Consumes: `TYPE_CONTENT`, `GROUP_HAIR`, `GROUP_HAIR_AVOID`, `type.name`
- Produces: `getExplanation(typeCode, gender, language).sections.makeup` 및 `.sections.hair`

- [x] **Step 1: Write failing tests**

```js
assert.match(content.getExplanation('A-1', 'female', 'ja').sections.hair.copy.ko, /윤기|볼륨|레이어/);
assert.match(content.getExplanation('D-1', 'female', 'ja').sections.makeup.copy.ko, /레드립|강렬한 음영/);
assert.match(content.getExplanation('D-2', 'female', 'ja').sections.makeup.copy.ko, /정갈|누드|브릭/);
assert.match(content.getExplanation('D-3', 'female', 'ja').sections.makeup.copy.ko, /직선적인 아이라인|또렷한 눈매/);
```

- [x] **Step 2: Run test to verify it fails**

Run: `node --test tests/explanation-content.test.js`

Expected: FAIL because D그룹의 PPT 코드 순서가 앱 코드에 그대로 붙어 있다.

- [x] **Step 3: Write minimal implementation**

```js
const TYPE_MAKEUP_GUIDES_BY_NAME = {
  '카리스마': { female: localized(/* PPT 111·112 핵심 */), male: localized(/* PPT 114 핵심 */) },
  '클리어': { female: localized(/* PPT 100·101 핵심 */), male: localized(/* PPT 102 핵심 */) },
  '샤프': { female: localized(/* PPT 105·106 핵심 */), male: localized(/* PPT 108 핵심 */) }
};

const makeupCopy = getMakeupGuide(type.name, safeGender);
```

PPT 6/10, 35/36, 64/65, 92/93 및 남성 공통 헤어 슬라이드의 추천·피하면 좋은 방향을 `GROUP_HAIR`와 `GROUP_HAIR_AVOID`에 확장한다.

- [x] **Step 4: Run test to verify it passes**

Run: `node --test tests/explanation-content.test.js`

Expected: PASS with 12개 타입의 이름 기반 메이크업과 4개 그룹 헤어 연결.

- [x] **Step 5: Commit**

```bash
git add src/explanation-data.js src/explanation-content.js tests/explanation-content.test.js
git commit -m "[code] PPT 스타일링 원문을 타입별 해설에 반영"
```

### Task 2: 반복 해설 병합과 직접 해설 연결

**Files:**
- Modify: `src/explanation-content.js`
- Modify: `src/diagnosis-ui.js`
- Test: `tests/explanation-content.test.js`
- Test: `tests/diagnosis-ui.test.js`

**Interfaces:**
- Consumes: 8개 `draft.pages`, `draft.sections`, `renderExplanationPanel()`
- Produces: `identity` 병합 페이지와 `#/diagnosis/explanation/{type}/1` 직접 진입

- [x] **Step 1: Write failing tests**

```js
assert.deepEqual(draft.pages.map(page => page.id), [
  'identity', 'facial-details-1', 'facial-details-2',
  'makeup-recommended', 'makeup-avoid',
  'hair-recommended', 'hair-avoid', 'accessory-fashion'
]);
assert.match(ui.renderExplanationPanel(draft, profile, 0), /miyu-average-face/);
assert.match(ui.renderExplanationPanel(draft, profile, 0), /miyu-mood/);
assert.equal(controller.resolveRoute('#/diagnosis/explanation/c-2/999').pageIndex, 7);
```

- [x] **Step 2: Run test to verify it fails**

Run: `node --test tests/explanation-content.test.js tests/diagnosis-ui.test.js`

Expected: FAIL because current pages are 10개이고 `summary`, `facial-features`, `mood`로 나뉘어 있다.

- [x] **Step 3: Write minimal implementation**

```js
{
  id: 'identity',
  title: data.SECTION_LABELS.mood,
  content: joinedLocalized([
    sections.mood.overview,
    ...type.common.representativeSummary,
    sections.mood.definition,
    sections.mood.keywords
  ], language)
}
```

Render `identity` with the average face, representative features, overview, definition, and keywords in one section. The diagnosis result flow continues to open `#/diagnosis/explanation/{type}/1`; the existing `#/cat/{id}` browse route is left unchanged to avoid breaking the legacy browsing screen.

- [x] **Step 4: Run test to verify it passes**

Run: `node --test tests/explanation-content.test.js tests/diagnosis-ui.test.js`

Expected: PASS with 8-page flow, no duplicated overview, and page clamp 7.

- [x] **Step 5: Commit**

```bash
git add src/explanation-content.js src/diagnosis-ui.js tests/explanation-content.test.js tests/diagnosis-ui.test.js
git commit -m "[code] 해설 정체성 페이지 병합"
```

### Task 3: 태블릿 검증, Full V1 생성, 최종 커밋

**Files:**
- Modify: `src/diagnosis.css` (병합 페이지가 태블릿에서 과밀하거나 가로 넘침이 발생할 때만)
- Modify: `tests/diagnosis-layout.test.js`
- Modify: `tests/pages-entry.test.mjs` (직접 해설 경로 검증이 필요할 때만)
- Modify: `dist/index.html`
- Modify: `dist/미유_무드진단_Full_V1.html`
- Modify: `dist/미유_무드진단_12type_v17.html`

**Interfaces:**
- Consumes: `renderExplanationPanel()`의 `identity` 페이지
- Produces: 태블릿 안전한 Full V1 단일 HTML

- [x] **Step 1: Write failing layout test**

```js
const html = explanationHtml(0);
assert.ok(await page.locator('.miyu-average-face-visual').count());
assert.ok(await page.locator('.miyu-summary-list').count());
assert.ok(await page.locator('.miyu-mood').count());
assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
```

- [x] **Step 2: Run test to verify it fails**

Run: `NODE_PATH="$NODE_MODULE_PATH" node --test tests/diagnosis-layout.test.js`

Expected: FAIL because page 0 currently lacks average-face and mood content.

- [x] **Step 3: Add only necessary responsive CSS**

Keep portrait order as average face → core features → mood; retain landscape two-column layout. Do not reduce text below existing readable sizes.

- [x] **Step 4: Run full verification and build**

Run:

```bash
node scripts/build-v17.mjs
NODE_PATH="$NODE_MODULE_PATH" node --test tests/*.test.js tests/*.test.mjs
python3 -m unittest tests/test_pdf_assets.py
git diff --check
```

Expected: all Node/PDF tests pass; Full V1 build is byte-current; no whitespace errors.

- [x] **Step 5: Commit**

```bash
git add src/diagnosis.css tests/diagnosis-layout.test.js tests/pages-entry.test.mjs dist
git commit -m "[code] Full V1 해설 병합과 PPT 스타일링 반영"
```
