# MIYU Full V1 파일명 전환 및 시작 화면 간소화 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 이름 입력 없이 진단을 시작하고, 공개 단일 HTML을 Full V1 이름으로 제공한다.

**Architecture:** 진단 프로필을 세 필드로 축소하고, 렌더링과 저장 복원에서 이름 필드를 제거한다. 빌드 스크립트는 정식 Full V1 파일을 생성하며, 루트와 기존 v17 파일은 해시를 보존해 새 파일로 이동하는 가벼운 호환 페이지가 된다.

**Tech Stack:** 단일 HTML JavaScript 빌드, Node 내장 테스트 러너, Playwright

## Global Constraints

- A–D 점수, 최대 2개 선택, 내부 저장 키 `miyuDiagnosisV17`은 변경하지 않는다.
- 기존 v17 공개 주소는 깨지지 않아야 한다.
- 정식 배포 파일은 `미유_무드진단_Full_V1.html` 한 개다.

---

### Task 1: 이름 없는 진단 프로필

**Files:**
- Modify: `src/diagnosis-core.js`
- Modify: `src/diagnosis-ui.js`
- Test: `tests/diagnosis-core.test.js`
- Test: `tests/diagnosis-ui.test.js`

- [x] **Step 1: Write failing tests**

```js
assert.deepEqual(core.createInitialState('2026-08-12').profile, {
  explanationLanguage: '', gender: '', diagnosisDate: '2026-08-12'
});
assert.doesNotMatch(ui.renderStartView(state), /name="customerName"/);
assert.doesNotMatch(ui.renderStartView(state), /10개의 항목을 차례로/);
```

- [x] **Step 2: Verify RED**

Run: `node --test tests/diagnosis-core.test.js tests/diagnosis-ui.test.js`

Expected: FAIL because the existing profile requires and renders both names.

- [x] **Step 3: Implement the profile reduction**

Remove name fields from start rendering, profile validation, controller start data, result header, explanation metadata, new-diagnosis detection, and restored profile output. Keep old stored name fields harmless by ignoring them during restoration.

- [x] **Step 4: Verify GREEN**

Run: `node --test tests/diagnosis-core.test.js tests/diagnosis-ui.test.js`

Expected: PASS.

### Task 2: Full V1 standalone output and v17 compatibility URL

**Files:**
- Modify: `scripts/build-v17.mjs`
- Modify: `dist/index.html`
- Modify: `dist/미유_무드진단_12type_v17.html`
- Create: `dist/미유_무드진단_Full_V1.html`
- Test: `tests/build-v17.test.mjs`
- Test: `tests/pages-entry.test.mjs`
- Test: `tests/diagnosis-legacy.test.js`

- [x] **Step 1: Write failing route tests**

```js
assert.equal(TARGET_FILE, '미유_무드진단_Full_V1.html');
await page.goto(new URL(LEGACY_FILE + '#/diagnosis/question/1', baseUrl).href);
await page.waitForURL(url => decodeURIComponent(url.pathname).endsWith('/' + TARGET_FILE));
```

- [x] **Step 2: Verify RED**

Run: `NODE_PATH="$NODE_MODULE_PATH" node --test tests/build-v17.test.mjs tests/pages-entry.test.mjs tests/diagnosis-legacy.test.js`

Expected: FAIL because the current output and root entry still target v17.

- [x] **Step 3: Implement the Full V1 output**

Export the two public filenames from the build script. In direct build mode, write Full V1 and two redirect pages that preserve location hashes. Update tests to treat Full V1 as the stored standalone file.

- [x] **Step 4: Verify GREEN and build**

Run: `node scripts/build-v17.mjs`

Run: `NODE_PATH="$NODE_MODULE_PATH" node --test tests/*.test.js tests/*.test.mjs`

Expected: PASS and Full V1 is byte-current.

- [x] **Step 5: Commit**

```bash
git add src scripts tests dist docs/superpowers
git commit -m "[code] Full V1 파일명과 시작 화면 간소화"
```
