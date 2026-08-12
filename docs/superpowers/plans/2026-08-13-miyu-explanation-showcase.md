# MIYU 해설 쇼케이스 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 진단 없이 열 수 있는 다국어 해설과 3카드형 스타일 참고·2단계 패션 가이드를 제공한다.

**Architecture:** 새 공개 해설 경로는 저장된 진단 상태와 분리해 URL의 성별·언어·타입으로 콘텐츠를 생성한다. 설명 데이터는 기존 해설 데이터에 복수 예시와 데일리 코디 세트를 더하고, 단일 HTML 빌드가 새 최적화 JPEG를 내장한다.

**Tech Stack:** Vanilla JavaScript, CSS, Node test runner, Playwright, Python/Pillow, single-file HTML build.

**Spec:** `docs/superpowers/specs/2026-08-13-miyu-explanation-showcase-design.md`

## Global Constraints

- 고객 화면은 한국어와 선택 언어를 함께 표시한다.
- 직접 해설 경로는 sessionStorage를 읽거나 바꾸지 않는다.
- 타입 코드는 앱의 D 순서와 PPT 이름 매핑을 혼동하지 않는다.
- 새 JPEG 포함 후 생성 HTML은 95MiB 이하를 유지한다.
- 태블릿 세로 834×1194와 가로 1194×834에서 가로 넘침이 없어야 한다.

### Task 1: 공개 해설 진입과 타입 전환

**Files:**
- Modify: `src/diagnosis-ui.js`
- Test: `tests/diagnosis-ui.test.js`, `tests/pages-entry.test.mjs`

- [ ] **Step 1: Write the failing tests**

```js
assert.equal(controller.resolveRoute('#/explanation/female/ja').kind, 'explanation-picker');
assert.equal(controller.resolveRoute('#/explanation/male/zh-TW/b-1/1').kind, 'public-explanation');
assert.match(ui.renderStartView(state), /data-action="open-explanation-picker"/);
```

- [ ] **Step 2: Run focused tests and verify they fail**

Run: `node --test tests/diagnosis-ui.test.js tests/pages-entry.test.mjs`

- [ ] **Step 3: Implement public route and picker**

```js
const publicMatch = hash.match(/^#\/explanation\/(female|male)\/(ja|zh-CN|zh-TW)(?:\/([a-d]-[1-3])\/(\d+))?$/i);
```

Render a gender/language-preserving type picker and public explanation view. Add a start-form `해설 바로보기` submit path that validates language/gender but does not require a diagnosis date.

- [ ] **Step 4: Run focused tests and verify they pass**

- [ ] **Step 5: Commit**

### Task 2: 복수 예시와 패션 2페이지 데이터

**Files:**
- Modify: `src/explanation-data.js`, `src/explanation-content.js`
- Test: `tests/explanation-content.test.js`

- [ ] **Step 1: Write failing content tests**

```js
const draft = content.getExplanation('B-1', 'female', 'ja');
assert.equal(draft.pages.at(-2).id, 'fashion-reference');
assert.equal(draft.pages.at(-1).id, 'daily-outfits');
assert.equal(draft.sections.accessoryFashion.dailyOutfits.length, 3);
assert.equal(draft.sections.makeup.examples.length, 3);
```

- [ ] **Step 2: Run focused test and verify it fails**

- [ ] **Step 3: Add localized cards and daily outfit metadata**

Keep the current type-name-to-PPT-key mapping. Add 3-caption references for care/hair and 3 structured daily outfit sets per type and gender.

- [ ] **Step 4: Run focused test and verify it passes**

- [ ] **Step 5: Commit**

### Task 3: 카드형 스크롤과 패션 렌더링

**Files:**
- Modify: `src/diagnosis-ui.js`, `src/diagnosis.css`
- Test: `tests/diagnosis-ui.test.js`, `tests/diagnosis-layout.test.js`

- [ ] **Step 1: Write failing UI/layout tests**

```js
assert.equal((html.match(/miyu-example-rail-card/g) || []).length, 3);
assert.match(html, /다른 타입 해설 보기/);
assert.equal(columns, 3);
assert.ok(visibleCards >= 2 && visibleCards <= 3);
```

- [ ] **Step 2: Run focused test and verify it fails**

- [ ] **Step 3: Implement renderer and CSS**

Render a horizontally scrollable 3-card rail with individual captions. Render `fashion-reference` and `daily-outfits` pages; daily cards include material, pattern/design, accessory and coordination guidance.

- [ ] **Step 4: Run focused test and verify it passes**

- [ ] **Step 5: Commit**

### Task 4: PPT 분할·생성 코디 자산과 빌드 등록

**Files:**
- Modify: `scripts/prepare-ppt-reference-assets.py`, `scripts/optimize-miyu-reference-assets.py`, `scripts/build-v17.mjs`
- Create: `assets/diagnosis/reference/**`
- Test: `tests/test_ppt_reference_assets.py`, `tests/build-v17.test.mjs`

- [ ] **Step 1: Write failing asset/build tests**

```js
assert.equal(expectedReferenceAssetKeys().filter(key => key.includes('/daily/')).length, 72);
assert.ok(html.includes('reference/female/daily/fantasy-1.jpg'));
```

- [ ] **Step 2: Run focused tests and verify they fail**

- [ ] **Step 3: Generate and optimize assets**

Split usable PPT photos into individual 3-card references. Generate compressed daily outfit cards for each type/gender, use 360px card output, register every asset in the manifest.

- [ ] **Step 4: Run focused tests and verify they pass**

- [ ] **Step 5: Commit**

### Task 5: Full build, tablet review and deployment

**Files:**
- Modify: `dist/미유_무드진단_Full_V1.html`

- [ ] **Step 1: Rebuild single HTML**

Run: `node scripts/build-v17.mjs`

- [ ] **Step 2: Run full verification**

Run: `node --test tests/*.test.js tests/*.test.mjs && python3 -m unittest discover -s tests -p 'test_*.py'`

- [ ] **Step 3: Review 834×1194 and 1194×834**

Check the public route, gender change, 3-card rail, both fashion pages, no horizontal overflow, and no console errors.

- [ ] **Step 4: Commit, push, merge and verify Pages deployment**
