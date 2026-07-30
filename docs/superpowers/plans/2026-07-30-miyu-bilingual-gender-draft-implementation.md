# 미유 다국어·성별 해설 초안 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 고객 정보 입력을 개편하고, 성별에 따른 그룹명·스타일링 방향과 한국어+선택 언어 해설 초안을 태블릿에서 함께 보여주는 v17 단일 HTML을 만든다.

**Architecture:** 기존 v16 원본과 진단 로직의 점수·타입 매핑은 그대로 둔다. 프로필 상태, 해설 콘텐츠 데이터, 화면 렌더링을 각각 분리하고 빌드 단계에서 단일 HTML에 포함한다. 해설 문구와 이미지는 중앙 데이터 모듈의 값만 교체하면 되도록 만들며, 이번 초안의 남성 이미지 영역은 고정 비율 슬롯으로 구현한다.

**Tech Stack:** HTML5, CSS, 브라우저 JavaScript UMD 모듈, Node.js 내장 `node:test`, Playwright + 설치된 Chrome, 브라우저 `sessionStorage`, 기존 해시 주소 라우터

## Global Constraints

- 기준 설계: `docs/superpowers/specs/2026-07-30-miyu-bilingual-gender-explanation-design.md`
- 기존 원본 `source/미유_무드분류_12type_v16.html`은 수정하지 않는다.
- 최종 산출물은 `dist/미유_무드진단_12type_v17.html` 단일 파일이다.
- 퍼스널컬러 입력은 제거한다.
- 고객명, 컨설턴트명, 해설 언어, 성별, 진단일은 필수다.
- 해설 언어는 `ja`, `zh-CN`, `zh-TW`만 지원한다.
- 한국어 해설은 항상 표시하고 선택 언어를 함께 표시한다.
- 여성 B그룹은 `Feminine · 페미닌`, 남성 B그룹은 `Boyish · 보이시`로 표시한다.
- 성별은 점수, 순위, 최종 타입 판정에 영향을 주지 않는다.
- 남성 화면에서 기존 여성 대표 인물과 여성 메이크업 사례를 대체 콘텐츠로 노출하지 않는다.
- 남성 이미지 영역은 이번 초안에서 고정 비율 플레이스홀더로 구현하고 이미지 경로를 받을 수 있는 인터페이스를 둔다.
- 10~13인치 세로 태블릿을 1순위로 하며 가로 태블릿도 지원한다.
- 주요 터치 영역은 최소 44×44 CSS 픽셀이다.
- 사용자 입력과 진단 상태는 현재 탭의 `sessionStorage`에만 저장한다.
- 모든 신규 고객 문구는 친근한 `~해요` 말투를 쓴다.
- 모든 커밋 메시지는 `[code]`로 시작한다.

## File Map

| 파일 | 책임 |
|---|---|
| `src/diagnosis-core.js` | 새 프로필 상태, 필수값 검증, 복구와 초기화 |
| `src/explanation-content.js` | 언어·성별·그룹 표시명, 12타입 한국어 초안, 선택 언어 초안과 이미지 슬롯 데이터 |
| `src/diagnosis-ui.js` | 입력 화면, 결과 화면, 성별별 그룹명, 해설 초안 패널, 기존 해설 DOM 장식 |
| `src/diagnosis.css` | 신규 입력 요소, 다국어 해설 카드, 남성 이미지 슬롯, 세로·가로 태블릿 배치 |
| `scripts/build-v17.mjs` | 해설 데이터 모듈을 단일 HTML에 포함하고 기존 카테고리 라우터에 장식 호출 추가 |
| `tests/diagnosis-core.test.js` | 새 프로필 구조, 필수값, 이전 세션 무효화 검증 |
| `tests/explanation-content.test.js` | 언어·성별별 콘텐츠 반환과 안전한 대체값 검증 |
| `tests/diagnosis-ui.test.js` | 입력 폼, 결과 그룹명, 해설 패널과 여성 콘텐츠 숨김 검증 |
| `tests/diagnosis-layout.test.js` | 태블릿 세로·가로 해설 배치와 이미지 슬롯 비율 검증 |
| `tests/build-v17.test.mjs` | 해설 데이터 포함, 라우터 연결, 원본 불변 검증 |
| `dist/미유_무드진단_12type_v17.html` | 로컬 검수용 초안 단일 파일 |

---

### Task 1: 새 고객 프로필 상태와 검증

**Files:**
- Modify: `src/diagnosis-core.js`
- Modify: `tests/diagnosis-core.test.js`

**Interfaces:**
- Produces: `SUPPORTED_LANGUAGES: ['ja', 'zh-CN', 'zh-TW']`
- Produces: `SUPPORTED_GENDERS: ['female', 'male']`
- Produces: `createInitialState(today: string) -> DiagnosisState`
- Produces: `validateProfile(profile: object) -> { valid: boolean, field: string|null, error: string|null }`
- Produces: `restoreState(serialized: string|null, today: string) -> DiagnosisState`

- [ ] **Step 1: 신규 프로필 계약의 실패 테스트 작성**

`tests/diagnosis-core.test.js`에 다음 검증을 추가한다.

```js
test('초기 상태는 새 고객 정보만 포함하고 퍼스널컬러를 제거한다', () => {
  const state = core.createInitialState('2026-07-30');
  assert.deepEqual(state.profile, {
    customerName: '',
    consultantName: '',
    explanationLanguage: '',
    gender: '',
    diagnosisDate: '2026-07-30'
  });
  assert.equal('personalColor' in state.profile, false);
});

test('고객 정보 다섯 항목을 모두 입력해야 유효하다', () => {
  const valid = core.validateProfile({
    customerName: '미유',
    consultantName: '컨설턴트',
    explanationLanguage: 'ja',
    gender: 'male',
    diagnosisDate: '2026-07-30'
  });
  assert.deepEqual(valid, { valid: true, field: null, error: null });
  assert.equal(core.validateProfile({}).field, 'customerName');
});

test('기존 퍼스널컬러 프로필 세션은 새 입력 화면으로 초기화한다', () => {
  const legacy = core.createInitialState('2026-07-30');
  legacy.profile = { name: '미유', date: '2026-07-27', personalColor: '여름 쿨' };
  const restored = core.restoreState(JSON.stringify(legacy), '2026-07-30');
  assert.equal(restored.profile.customerName, '');
  assert.deepEqual(restored.answers, Array.from({ length: 10 }, () => []));
});
```

- [ ] **Step 2: 테스트가 새 인터페이스 부재로 실패하는지 확인**

Run:

```bash
node --test tests/diagnosis-core.test.js
```

Expected: `validateProfile is not a function` 또는 기존 프로필 키 불일치로 FAIL.

- [ ] **Step 3: 최소 프로필 상태와 검증 구현**

`src/diagnosis-core.js`에 상수와 검증 함수를 추가한다.

```js
const SUPPORTED_LANGUAGES = ['ja', 'zh-CN', 'zh-TW'];
const SUPPORTED_GENDERS = ['female', 'male'];

function emptyProfile(today) {
  return {
    customerName: '',
    consultantName: '',
    explanationLanguage: '',
    gender: '',
    diagnosisDate: today
  };
}

function validateProfile(profile) {
  const checks = [
    ['customerName', '고객명을 입력해 주세요'],
    ['consultantName', '컨설턴트명을 입력해 주세요'],
    ['explanationLanguage', '해설 언어를 선택해 주세요'],
    ['gender', '성별을 선택해 주세요'],
    ['diagnosisDate', '진단일을 입력해 주세요']
  ];
  for (const [field, error] of checks) {
    if (!String(profile?.[field] || '').trim()) return { valid: false, field, error };
  }
  if (!SUPPORTED_LANGUAGES.includes(profile.explanationLanguage)) {
    return { valid: false, field: 'explanationLanguage', error: '해설 언어를 다시 선택해 주세요' };
  }
  if (!SUPPORTED_GENDERS.includes(profile.gender)) {
    return { valid: false, field: 'gender', error: '성별을 다시 선택해 주세요' };
  }
  return { valid: true, field: null, error: null };
}
```

`restoreState`는 새 프로필이 유효하지 않으면 이전 답변까지 포함해 새 상태로 초기화한다. 고객 정보가 불완전한 상태로 결과나 해설 주소에 진입하지 않게 한다.

- [ ] **Step 4: 코어 테스트 통과 확인**

Run:

```bash
node --test tests/diagnosis-core.test.js
```

Expected: 모든 테스트 PASS.

- [ ] **Step 5: 상태 변경 커밋**

```bash
git add src/diagnosis-core.js tests/diagnosis-core.test.js
git commit -m "[code] 고객 정보와 성별 언어 상태 개편"
```

---

### Task 2: 교체 가능한 해설 콘텐츠 데이터 모듈

**Files:**
- Create: `src/explanation-content.js`
- Create: `tests/explanation-content.test.js`

**Interfaces:**
- Produces: `LANGUAGES`
- Produces: `GROUP_NAMES`
- Produces: `TYPE_DRAFTS`
- Produces: `getGroupName(group: string, gender: string) -> string`
- Produces: `getExplanation(typeCode: string, gender: string, language: string) -> ExplanationDraft`

`ExplanationDraft`의 반환 형태는 고정한다.

```js
{
  typeCode: 'B-1',
  groupName: 'Boyish · 보이시',
  Korean: {
    label: '한국어',
    summary: '감성적인 보이시. 부드러운 헤어와 니트·셔츠처럼 편안한 소재가 잘 맞아요.'
  },
  translated: {
    language: 'ja',
    label: '日本語',
    summary: '感性的なボーイッシュタイプ。やわらかなヘアと、ニットやシャツのような心地よい素材が似合います。'
  },
  image: null,
  draft: true
}
```

- [ ] **Step 1: 데이터 반환 계약의 실패 테스트 작성**

`tests/explanation-content.test.js`를 생성한다.

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const content = require('../src/explanation-content.js');

test('남성 B그룹은 보이시, 여성 B그룹은 페미닌이다', () => {
  assert.equal(content.getGroupName('B', 'male'), 'Boyish · 보이시');
  assert.equal(content.getGroupName('B', 'female'), 'Feminine · 페미닌');
});

test('12타입은 한국어와 선택 언어 초안을 함께 반환한다', () => {
  for (const type of ['A-1','A-2','A-3','B-1','B-2','B-3','C-1','C-2','C-3','D-1','D-2','D-3']) {
    const result = content.getExplanation(type, 'male', 'ja');
    assert.ok(result.Korean.summary);
    assert.ok(result.translated.summary);
    assert.equal(result.translated.language, 'ja');
  }
});

test('잘못된 언어는 한국어를 유지하고 번역 준비 문구로 안전하게 대체한다', () => {
  const result = content.getExplanation('A-1', 'male', 'xx');
  assert.ok(result.Korean.summary);
  assert.match(result.translated.summary, /번역 준비 중/);
});
```

- [ ] **Step 2: 테스트가 모듈 부재로 실패하는지 확인**

Run:

```bash
node --test tests/explanation-content.test.js
```

Expected: `Cannot find module '../src/explanation-content.js'`로 FAIL.

- [ ] **Step 3: UMD 데이터 모듈과 초안 문구 구현**

`src/explanation-content.js`는 브라우저에서는 `window.MiyuExplanationContent`, Node에서는 `module.exports`로 노출한다.

언어 메타데이터는 다음 값으로 고정한다.

```js
const LANGUAGES = {
  ja: { inputLabel: '일본어', displayLabel: '日本語' },
  'zh-CN': { inputLabel: '중국어 간체(중국)', displayLabel: '简体中文' },
  'zh-TW': { inputLabel: '중국어 번체(홍콩·대만)', displayLabel: '繁體中文' }
};
```

`TYPE_DRAFTS`에는 설계 문서 8장의 남성 12타입 한국어 초안을 `~해요` 말투로 넣는다. 여성 초안은 각 타입의 기존 공통 정의와 여성 해설을 연결하는 짧은 문장으로 둔다. 일본어·중국어 초안은 타입별 한 문장으로 넣고 `draft: true`를 유지한다. 최종 문구 교체 시 UI 코드를 바꾸지 않고 `TYPE_DRAFTS`만 수정할 수 있어야 한다.

이미지 필드는 전 타입 `image: null`로 둔다. 이후 AI 이미지가 승인되면 `types/male/a-1.png` 형태의 키를 넣을 수 있게 한다.

- [ ] **Step 4: 콘텐츠 테스트 통과 확인**

Run:

```bash
node --test tests/explanation-content.test.js
```

Expected: 모든 테스트 PASS.

- [ ] **Step 5: 콘텐츠 모듈 커밋**

```bash
git add src/explanation-content.js tests/explanation-content.test.js
git commit -m "[code] 다국어 성별 해설 초안 데이터 추가"
```

---

### Task 3: 입력 화면과 결과 화면 개편

**Files:**
- Modify: `src/diagnosis-ui.js`
- Modify: `src/diagnosis.css`
- Modify: `tests/diagnosis-ui.test.js`

**Interfaces:**
- Consumes: `core.validateProfile(profile)`
- Consumes: `content.LANGUAGES`
- Consumes: `content.getGroupName(group, gender)`
- Produces: `renderStartView(state) -> string`
- Produces: `renderResultView(state) -> string`
- Produces: `controller.start(profile) -> { error: string|null, field: string|null }`

- [ ] **Step 1: 신규 입력과 성별별 결과의 실패 테스트 작성**

기존 퍼스널컬러 테스트를 다음 계약으로 교체한다.

```js
test('시작 화면은 다섯 고객 정보와 로고를 표시하고 퍼스널컬러를 제거한다', () => {
  const html = ui.renderStartView(core.createInitialState('2026-07-30'));
  for (const name of ['customerName','consultantName','explanationLanguage','gender','diagnosisDate']) {
    assert.match(html, new RegExp(`name="${name}"`));
  }
  assert.doesNotMatch(html, /personalColor|퍼스널컬러/);
  assert.match(html, /일본어/);
  assert.match(html, /중국어 간체\(중국\)/);
  assert.match(html, /중국어 번체\(홍콩·대만\)/);
});

test('남성 결과 화면은 B그룹을 보이시로 표시한다', () => {
  const state = answeredState();
  state.profile.gender = 'male';
  const html = ui.renderResultView(state);
  assert.match(html, /Boyish · 보이시/);
  assert.doesNotMatch(html, /Feminine · 페미닌/);
});
```

컨트롤러 테스트는 다섯 항목 중 하나라도 없으면 `field`와 오류를 반환하고, 정상 입력은 `sessionStorage`에 저장하는지 검증한다.

- [ ] **Step 2: UI 테스트가 기존 폼과 고정 그룹명 때문에 실패하는지 확인**

Run:

```bash
node --test tests/diagnosis-ui.test.js
```

Expected: 신규 입력명과 `Boyish · 보이시`가 없어 FAIL.

- [ ] **Step 3: 폼·결과·이벤트 최소 구현**

`diagnosis-ui.js` 팩터리는 `factory(core, content, root)` 형태로 바꾸고 Node에서는 `require('./explanation-content.js')`를 사용한다.

시작 폼은 다음 순서로 렌더링한다.

1. 고객명
2. 컨설턴트명
3. 해설 언어 선택
4. 성별 선택
5. 진단일
6. 진단 시작

`controller.start`는 `core.validateProfile` 결과를 그대로 사용하고, 제출 이벤트는 `[data-profile-error="<field>"]`에 오류를 표시한다.

결과 화면은 고객명, 컨설턴트명, 진단일, 선택 언어를 표시한다. 점수 카드와 타입 그룹의 이름은 `content.getGroupName(group, state.profile.gender)`로 렌더링한다.

- [ ] **Step 4: 신규 입력 요소 스타일 구현**

`diagnosis.css`에 `select`, 성별 선택 컨트롤, 항목별 오류 스타일을 추가한다. 모든 입력·선택 영역은 최소 높이 50px로 유지한다. 세로 태블릿에서는 1열, 가로 태블릿에서는 고객명·컨설턴트명과 언어·성별을 각각 2열로 배치할 수 있으나 DOM 순서는 유지한다.

- [ ] **Step 5: UI 테스트 통과 확인**

Run:

```bash
node --test tests/diagnosis-ui.test.js
```

Expected: 모든 테스트 PASS.

- [ ] **Step 6: 입력·결과 UI 커밋**

```bash
git add src/diagnosis-ui.js src/diagnosis.css tests/diagnosis-ui.test.js
git commit -m "[code] 고객 입력과 보이시 결과 화면 구현"
```

---

### Task 4: 기존 타입 해설에 다국어·성별 초안 패널 연결

**Files:**
- Modify: `src/diagnosis-ui.js`
- Modify: `src/diagnosis.css`
- Modify: `scripts/build-v17.mjs`
- Modify: `tests/diagnosis-ui.test.js`
- Modify: `tests/build-v17.test.mjs`

**Interfaces:**
- Consumes: `content.getExplanation(typeCode, gender, language)`
- Produces: `renderExplanationPanel(draft, profile) -> string`
- Produces: `decorateExplanation(catId: string) -> void`

- [ ] **Step 1: 해설 패널과 라우터 연결의 실패 테스트 작성**

`tests/diagnosis-ui.test.js`에 한국어와 선택 언어, 고객·컨설턴트명, 이미지 슬롯이 함께 렌더링되는지 검증한다.

```js
test('해설 초안 패널은 한국어와 선택 언어를 함께 표시한다', () => {
  const draft = content.getExplanation('B-1', 'male', 'ja');
  const html = ui.renderExplanationPanel(draft, {
    customerName: '미유',
    consultantName: '김컨설턴트',
    diagnosisDate: '2026-07-30'
  });
  assert.match(html, /한국어/);
  assert.match(html, /日本語/);
  assert.match(html, /김컨설턴트/);
  assert.match(html, /miyu-explanation-visual/);
});
```

`tests/build-v17.test.mjs`에는 결과 HTML이 다음 문자열을 포함하는지 검증한다.

```js
assert.match(html, /window\.MiyuExplanationContent/);
assert.match(html, /MiyuDiagnosisUI\.decorateExplanation\(catId\)/);
```

- [ ] **Step 2: 테스트가 렌더러와 빌드 연결 부재로 실패하는지 확인**

Run:

```bash
node --test tests/diagnosis-ui.test.js tests/build-v17.test.mjs
```

Expected: `renderExplanationPanel is not a function`과 빌드 문자열 누락으로 FAIL.

- [ ] **Step 3: 해설 패널 렌더러 구현**

해설 패널 구조는 다음 클래스를 고정해 사용한다.

```html
<section class="miyu-explanation-panel" data-gender="male" data-draft="true">
  <header class="miyu-explanation-meta">...</header>
  <div class="miyu-explanation-layout">
    <div class="miyu-explanation-visual" data-has-image="false">AI 이미지 영역</div>
    <div class="miyu-explanation-copy">
      <article lang="ko">...</article>
      <article lang="ja">...</article>
    </div>
  </div>
</section>
```

이미지가 없을 때 타입 코드·타입명·`AI 이미지 적용 예정`을 표시한다. 이미지 키가 있으면 `asset(draft.image)`를 사용하고 `object-fit: contain`으로 전체 이미지를 보여준다.

- [ ] **Step 4: 기존 카테고리 DOM 장식 구현**

`decorateExplanation(catId)`는 다음 순서로 동작한다.

1. 현재 컨트롤러 상태와 `core.TYPES`에서 타입을 찾는다.
2. 프로필이 유효하지 않으면 장식하지 않고 기존 해설을 유지한다.
3. 기존 `.miyu-explanation-panel`을 제거해 중복을 막는다.
4. 현재 `.category-section[data-cat-id]`의 `.cat-header` 다음에 패널을 삽입한다.
5. 남성이면 섹션에 `.miyu-explanation-male`을 추가하고 여성 대표 인물·사진 영역을 CSS로 숨긴다.
6. 여성이면 남성 클래스를 제거하고 기존 여성 콘텐츠를 복원한다.
7. B그룹의 `.macro-en`, `.macro-kr` 텍스트를 성별에 맞게 갱신하고 다른 성별로 다시 열 때 복원한다.

- [ ] **Step 5: 빌드에 콘텐츠 모듈과 라우터 훅 추가**

`scripts/build-v17.mjs`에서 `explanation-content.js`를 `diagnosis-core.js`보다 먼저 읽어 단일 스크립트에 포함한다.

기존 카테고리 라우터의 다음 블록 바로 뒤에 한 번만 호출을 삽입한다.

```js
document.querySelectorAll('.category-section').forEach(s => {
  const sid = s.getAttribute('data-cat-id');
  if (sid === catId) s.classList.remove('lv3-hidden');
});
MiyuDiagnosisUI.decorateExplanation(catId);
```

- [ ] **Step 6: 해설·빌드 테스트 통과 확인**

Run:

```bash
node --test tests/diagnosis-ui.test.js tests/build-v17.test.mjs
```

Expected: 모든 테스트 PASS.

- [ ] **Step 7: 해설 연결 커밋**

```bash
git add src/diagnosis-ui.js src/diagnosis.css scripts/build-v17.mjs tests/diagnosis-ui.test.js tests/build-v17.test.mjs
git commit -m "[code] 다국어 성별 해설 패널 연결"
```

---

### Task 5: 태블릿 레이아웃과 전체 회귀 검증

**Files:**
- Modify: `src/diagnosis.css`
- Modify: `tests/diagnosis-layout.test.js`
- Modify: `dist/미유_무드진단_12type_v17.html`

**Interfaces:**
- Consumes: `renderExplanationPanel`
- Produces: 세로형 1열 언어쌍, 가로형 2열 언어쌍, 4:5 이미지 슬롯

- [ ] **Step 1: 세로·가로 해설 레이아웃의 실패 테스트 작성**

`tests/diagnosis-layout.test.js`에 834×1194와 1194×834 뷰포트 테스트를 추가한다.

```js
test('세로 태블릿은 이미지와 두 언어를 위아래로 표시한다', async () => {
  const page = await browser.newPage({ viewport: { width: 834, height: 1194 } });
  const html = ui.renderExplanationPanel(
    content.getExplanation('B-1', 'male', 'ja'),
    { customerName: '미유', consultantName: '김컨설턴트', diagnosisDate: '2026-07-30' }
  );
  await page.setContent(`<style>${css}</style><div id="miyu-diagnosis-app">${html}</div>`);
  const columns = await page.locator('.miyu-explanation-copy').evaluate(el =>
    getComputedStyle(el).gridTemplateColumns.split(' ').filter(Boolean).length
  );
  assert.equal(columns, 1);
});
```

가로 테스트는 `.miyu-explanation-copy`가 2열이고 `.miyu-explanation-visual`이 패널 밖으로 넘치지 않는지 검증한다. 이미지 슬롯의 `aspect-ratio`는 `4 / 5`로 고정한다.

- [ ] **Step 2: 레이아웃 테스트가 신규 CSS 부재로 실패하는지 확인**

Run:

```bash
node --test tests/diagnosis-layout.test.js
```

Expected: 언어 카드 열 수 또는 이미지 비율 검증으로 FAIL.

- [ ] **Step 3: 반응형 CSS 완성**

- 834px 세로: 이미지 슬롯 위, 한국어 카드와 선택 언어 카드 아래 1열
- 1024px 이상 또는 가로 방향: 이미지 슬롯 왼쪽, 언어 카드는 오른쪽 2열
- 텍스트는 `word-break: keep-all`
- 이미지 슬롯은 `aspect-ratio: 4 / 5`, `overflow: hidden`
- 남성 모드에서 `.cat-representative`, `.people-grid`, `.cat-avg-face` 숨김
- 패널 안 모든 버튼과 선택 컨트롤 최소 높이 44px

- [ ] **Step 4: 전체 자동 테스트 실행**

Run:

```bash
node --test tests/*.js tests/*.mjs
```

Expected: Node·Chrome 테스트 전체 PASS.

Run:

```bash
python3 -m unittest tests/test_pdf_assets.py -v
```

Expected: PDF 자산 테스트 3개 PASS.

- [ ] **Step 5: 단일 HTML 재생성**

Run:

```bash
node scripts/build-v17.mjs
```

Expected: `dist/미유_무드진단_12type_v17.html` 생성, 용량과 SHA-256 출력.

- [ ] **Step 6: 생성 파일 회귀 테스트 재실행**

Run:

```bash
node --test tests/*.js tests/*.mjs
```

Expected: 생성 파일을 포함한 전체 테스트 PASS.

- [ ] **Step 7: 로컬 태블릿 수동 검수**

세로 834×1194와 가로 1194×834에서 다음을 확인한다.

- 신규 고객 정보 다섯 항목
- 10문항 이동과 답변 복원
- 1위·2위 표시와 자유로운 최종 타입 선택
- 남성 B그룹 `Boyish · 보이시`
- 한국어+선택 언어 해설 패널
- 남성 화면의 여성 인물 숨김
- 이미지 슬롯과 얼굴 이미지가 잘리지 않음

- [ ] **Step 8: 초안 산출물 커밋**

```bash
git add src tests scripts dist/미유_무드진단_12type_v17.html
git commit -m "[code] 다국어 성별 해설 초안 완성"
```

## 완료 조건

- 설계 문서의 포함 범위가 모두 구현된다.
- 기존 점수·순위·타입 순서 테스트가 모두 유지된다.
- 퍼스널컬러 문자열이 신규 입력·결과 화면에 남지 않는다.
- 남성 해설에서 여성 인물과 여성 메이크업 사례가 보이지 않는다.
- 한국어와 선택 언어가 같은 해설 패널에 함께 보인다.
- 이미지가 없어도 4:5 슬롯으로 레이아웃이 완성된다.
- 이후 문구와 AI 이미지 교체가 `src/explanation-content.js`와 이미지 자산 변경만으로 가능하다.
