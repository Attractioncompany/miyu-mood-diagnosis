# MIYU PPT 세부 가이드 완전 반영 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** PPT의 타입별 메이크업·그루밍과 대분류별 헤어 원문을 고객 해설에서 읽기 쉬운 이중언어 가이드와 참고 이미지로 제공한다.

**Architecture:** `explanation-data.js`에 타입명 기반 구조화 가이드를 두고, `explanation-content.js`가 성별·타입·대분류에 맞는 가이드를 선택한다. `diagnosis-ui.js`는 단일 문단 대신 설명 카드와 목록을 렌더하고, AI 참고 이미지는 로컬 자산으로만 참조한다.

**Tech Stack:** 단일 HTML JavaScript 빌드, Node 내장 테스트 러너, Playwright, Python `python-pptx`, ImageGen, GitHub Pages

## Global Constraints

- 여성 메이크업은 PPT 상세 슬라이드의 피부·색감·느낌·포인트와 추천·회피 항목을 12개 타입별로 모두 제공한다.
- 헤어는 세부 타입이 아닌 성별×A/B/C/D 대분류별로 제공한다.
- D그룹의 콘텐츠는 앱 코드가 아닌 타입명(카리스마·클리어·샤프)으로 PPT에 연결한다.
- 고객용 텍스트는 한국어와 일본어·중국어 간체·중국어 번체를 함께 제공하며, 번역은 현지 고객이 이해하기 쉬운 뷰티 용어를 사용한다.
- 새 이미지는 설명 이해에 필요한 경우에만 사용하고, 실제 인물·연예인 닮은꼴 없이 생성한다.
- 생성물 `dist/미유_무드진단_Full_V1.html`은 95 MiB 미만이어야 한다.
- 세로 834×1194 및 가로 1194×834 태블릿에서 가로 넘침이 없어야 한다.

---

### Task 1: 여성 12타입 메이크업 구조화 데이터

**Files:**
- Modify: `src/explanation-data.js`
- Modify: `src/explanation-content.js`
- Test: `tests/explanation-content.test.js`

**Interfaces:**
- Consumes: `type.name`, `PPT_TYPE_CODE_BY_NAME`, `localized(ko, ja, zhCN, zhTW)`
- Produces: `getExplanation(typeCode, 'female', language).sections.makeup.guide`

- [ ] **Step 1: Write the failing test**

```js
test('여성 타입별 메이크업은 PPT의 네 설명 축과 추천·회피 목록을 모두 반환한다', () => {
  const guide = content.getExplanation('B-1', 'female', 'ja').sections.makeup.guide;
  assert.equal(guide.skin.ko, '맑고 투명하게 빛나는 윤광 피부 표현');
  assert.equal(guide.color.ko, '사랑스럽고 여리여리한 핑크, 피치 계열');
  assert.match(guide.focus.ko, /립.*블러셔/);
  assert.deepEqual(guide.recommendedItems.ko, ['로즈핑크 메이크업', '물먹립', '은은한 음영', '볼터치가 살짝 강조된 사랑스럽고 여성스러운 느낌']);
  assert.deepEqual(guide.avoidItems.ko, ['시크한 메이크업', '무채색', '직선적인 쉐딩', '강한 눈매', '스모키']);
});

test('모던 타입은 앱 코드가 아니라 타입명으로 PPT 메이크업을 연결한다', () => {
  assert.match(content.getExplanation('D-1', 'female', 'ja').sections.makeup.guide.color.ko, /딥 브라운.*다크 브릭/);
  assert.match(content.getExplanation('D-2', 'female', 'ja').sections.makeup.guide.focus.ko, /아이라인.*립/);
  assert.match(content.getExplanation('D-3', 'female', 'ja').sections.makeup.guide.focus.ko, /아이라인.*윤곽 쉐딩/);
});
```

- [ ] **Step 2: Run test to verify red**

Run: `node --test tests/explanation-content.test.js`

Expected: FAIL because `sections.makeup.guide` does not exist.

- [ ] **Step 3: Implement named detail guides**

```js
const TYPE_MAKEUP_DETAIL_GUIDES_BY_NAME = Object.freeze({
  '로맨틱': Object.freeze({
    skin: localized('맑고 투명하게 빛나는 윤광 피부 표현', '透明感のあるツヤ肌', '清透发光的水润底妆', '清透發光的水潤底妝'),
    color: localized('사랑스럽고 여리여리한 핑크, 피치 계열', 'やわらかなピンク・ピーチ系', '柔和的粉色、蜜桃色系', '柔和的粉色、蜜桃色系'),
    feeling: localized('사랑스럽고 여린 분위기의 메이크업', '愛らしく繊細な雰囲気のメイク', '甜美柔和的妆感', '甜美柔和的妝感'),
    focus: localized('립 & 블러셔 — 도톰한 입술과 처진 둥근 눈매에 생기를 더해요.', 'リップ&チーク — ふっくらした唇と下がり気味の丸い目元に血色を足します。', '重点放在唇和腮红，提亮饱满唇形与微垂圆眼。', '重點放在唇和腮紅，提亮飽滿唇形與微垂圓眼。')
  })
});
```

동일 구조로 나머지 11개 타입을 PPT 15/22/28/45/51/56/73/79/85/100/106/112쪽의 네 축과 추천·회피 항목으로 채운다. D-1 카리스마는 PPT D-3, D-2 클리어는 PPT D-1, D-3 샤프는 PPT D-2의 내용을 사용한다.

- [ ] **Step 4: Connect and validate**

```js
const makeupGuide = data.TYPE_MAKEUP_DETAIL_GUIDES_BY_NAME[type.name];
if (!makeupGuide) throw new Error(`Missing makeup detail guide: ${type.name}`);
sections.makeup.guide = makeupGuide;
```

`assertCompleteContent()`에서 12개 타입마다 `skin`, `color`, `feeling`, `focus`, `recommendedItems`, `avoidItems`의 네 언어값과 빈 배열이 아닌 목록을 검사한다.

- [ ] **Step 5: Run test to verify green**

Run: `node --test tests/explanation-content.test.js`

Expected: PASS with all 12 female guides and D-name mapping.

- [ ] **Step 6: Commit**

```bash
git add src/explanation-data.js src/explanation-content.js tests/explanation-content.test.js
git commit -m "[code] 여성 PPT 메이크업 세부 가이드 반영"
```

### Task 2: 남성 타입별 그루밍과 대분류 헤어 목록

**Files:**
- Modify: `src/explanation-data.js`
- Modify: `src/explanation-content.js`
- Test: `tests/explanation-content.test.js`

**Interfaces:**
- Consumes: `type.name`, 성별, PPT 남성 타입·대분류 헤어 슬라이드
- Produces: `sections.makeup.guide`, `sections.hair.guide`

- [ ] **Step 1: Write failing tests**

```js
test('남성 타입별 그루밍은 PPT의 피부와 포인트를 반환한다', () => {
  const guide = content.getExplanation('A-1', 'male', 'zh-CN').sections.makeup.guide;
  assert.match(guide.skin.ko, /깨끗하고 투명/);
  assert.match(guide.focus.ko, /음영 최소화.*애교살.*혈색/);
});
test('남성 헤어는 대분류별 PPT 스타일과 회피 목록을 반환한다', () => {
  const guide = content.getExplanation('A-2', 'male', 'ja').sections.hair.guide;
  assert.deepEqual(guide.recommendedItems.ko, ['애즈펌', '시스루펌', '소프트 쉐도우펌', '댄디컷', '가벼운 리프컷', '내추럴 가르마펌']);
  assert.deepEqual(guide.avoidItems.ko, ['슬릭백', '올백', '포마드', '강한 다운펌', '울프컷']);
});
```

- [ ] **Step 2: Run tests to verify red**

Run: `node --test tests/explanation-content.test.js`

Expected: FAIL because the current male guide only exposes a group summary sentence.

- [ ] **Step 3: Implement male and hair guide data**

Create `TYPE_MALE_GROOMING_GUIDES_BY_NAME` for 12 types from the male type slides, then `GROUP_HAIR_DETAIL_GUIDES` for female/male A/B/C/D. Each guide includes localized `skin`, `color`, `feeling`, `focus`, `recommendedItems`, and `avoidItems`. Include every style name from PPT 6/10, 12/14, 35/36, 41/43, 64/65, 69/71, 92/93, and 97/99.

- [ ] **Step 4: Run tests to verify green**

Run: `node --test tests/explanation-content.test.js`

Expected: PASS with 12 male grooming guides and 8 group hair guides.

- [ ] **Step 5: Commit**

```bash
git add src/explanation-data.js src/explanation-content.js tests/explanation-content.test.js
git commit -m "[code] 남성 그루밍과 PPT 헤어 목록 반영"
```

### Task 3: 구조화된 해설 렌더링과 태블릿 레이아웃

**Files:**
- Modify: `src/diagnosis-ui.js`
- Modify: `src/diagnosis.css`
- Test: `tests/diagnosis-ui.test.js`
- Test: `tests/diagnosis-layout.test.js`

**Interfaces:**
- Consumes: `sections.makeup.guide`, `sections.hair.guide`, `renderLocalizedBlock()`
- Produces: 카드·목록형 추천/회피 메이크업·그루밍·헤어 페이지

- [ ] **Step 1: Write failing tests**

```js
test('추천 메이크업 페이지는 네 설명 축과 추천 목록을 각각 표시한다', () => {
  const html = ui.renderExplanationPanel(content.getExplanation('B-1', 'female', 'ja'), profile, 3);
  for (const label of ['피부 표현', '색감', '전체 느낌', '살릴 포인트']) assert.match(html, new RegExp(label));
  assert.match(html, /로즈핑크 메이크업/);
  assert.match(html, /ローズピンク/);
});
test('피하면 좋은 헤어 페이지는 PPT 회피 스타일을 목록으로 표시한다', () => {
  const html = ui.renderExplanationPanel(content.getExplanation('A-1', 'female', 'ja'), profile, 6);
  assert.match(html, /슬릭백/);
  assert.match(html, /올백/);
});
```

- [ ] **Step 2: Run tests to verify red**

Run: `node --test tests/diagnosis-ui.test.js`

Expected: FAIL because the pages currently render one prose block only.

- [ ] **Step 3: Implement focused renderer helpers**

```js
function renderGuideDetail(label, value, language) {
  return `<article class="miyu-guide-detail-card">${renderSectionHeading(label, language)}${renderLocalizedBlock(value, language, 'miyu-localized-copy')}</article>`;
}
function renderGuideList(items, language) {
  return `<ul class="miyu-guide-list">${items.map(item => `<li>${renderLocalizedBlock(item, language, 'miyu-localized-copy')}</li>`).join('')}</ul>`;
}
```

추천 페이지에는 `skin/color/feeling/focus` 카드와 추천 목록을, 회피 페이지에는 `avoidItems` 목록을 렌더한다. 헤어도 질감·볼륨·실루엣 카드와 스타일 목록을 같은 방식으로 렌더한다.

- [ ] **Step 4: Add tablet CSS and verify green**

```css
.miyu-guide-details { display: grid; gap: 10px; }
.miyu-guide-detail-card { padding: 14px; border: 1px solid #e2e2df; }
.miyu-guide-list { display: grid; gap: 8px; padding-left: 20px; }
@media (orientation: landscape) and (min-width: 900px) { .miyu-guide-details { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
```

Run: `env NODE_PATH=/Users/oeuvre/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules /Users/oeuvre/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node --test tests/diagnosis-ui.test.js tests/diagnosis-layout.test.js`

Expected: PASS; 834×1194 및 1194×834에서 가로 넘침 없음.

- [ ] **Step 5: Commit**

```bash
git add src/diagnosis-ui.js src/diagnosis.css tests/diagnosis-ui.test.js tests/diagnosis-layout.test.js
git commit -m "[code] PPT 세부 가이드 해설 화면 추가"
```

### Task 4: 설명용 AI 참고 이미지와 Full V1 생성

**Files:**
- Create: `reference/female/makeup-detail/{a-1..d-3}.jpg`
- Create: `reference/male/grooming-detail/{a-1..d-3}.jpg`
- Create: `reference/{female,male}/hair-detail/{a,b,c,d}-{recommended,avoid}.jpg`
- Modify: `src/explanation-data.js`
- Modify: `scripts/build-v17.mjs`
- Modify: `tests/build-v17.test.mjs`
- Modify: `dist/미유_무드진단_Full_V1.html`

**Interfaces:**
- Consumes: guide `visual` paths and ImageGen output
- Produces: locally embedded reference assets

- [ ] **Step 1: Write failing asset test**

```js
test('세부 가이드의 AI 이미지는 로컬 자산으로 존재하고 Full V1에 포함된다', () => {
  const html = fs.readFileSync(OUTPUT, 'utf8');
  for (const asset of ['reference/female/makeup-detail/a-1.jpg', 'reference/male/grooming-detail/d-3.jpg', 'reference/female/hair-detail/a-recommended.jpg']) {
    assert.match(html, new RegExp(`data-asset="${asset}"`));
  }
});
```

- [ ] **Step 2: Run test to verify red**

Run: `node --test tests/build-v17.test.mjs`

Expected: FAIL because the assets do not exist.

- [ ] **Step 3: Generate and connect visual assets**

Generate 12 female makeup close-ups, 12 male grooming portraits, and 16 hair silhouette references. Each prompt identifies a relevant feature and bans real-person or celebrity resemblance. Compress every asset to JPEG and connect it through `guide.visual` only once per page.

- [ ] **Step 4: Build and verify green**

Run:

```bash
node scripts/build-v17.mjs
env NODE_PATH=/Users/oeuvre/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules /Users/oeuvre/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node --test tests/*.test.js tests/*.test.mjs
/Users/oeuvre/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -m unittest tests/test_pdf_assets.py
git diff --check
```

Expected: all tests pass, no external image URLs, and Full V1 stays below 95 MiB.

- [ ] **Step 5: Commit**

```bash
git add reference src scripts tests dist
git commit -m "[code] PPT 세부 가이드와 설명 이미지 반영"
```

