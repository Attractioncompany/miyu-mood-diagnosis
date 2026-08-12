# 컨설턴트 진단 문항 안내 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 컨설턴트 진단 10문항에 명확한 관찰 기준과 선택지 설명을 제공한다.

**Architecture:** `src/diagnosis-core.js`의 각 문항 데이터에 판단 안내와 선택지 보조 설명을 둔다. `src/diagnosis-ui.js`는 이 데이터를 한국어 진단 화면의 카드와 안내 박스로 렌더링한다.

**Tech Stack:** 단일 HTML 빌드용 JavaScript, Node 내장 테스트 러너, CSS

## Global Constraints

- A–D 점수와 최대 2개 선택 규칙은 변경하지 않는다.
- 안내는 컨설턴트 전용 진단 화면에서만 한국어로 노출한다.
- 기존 태블릿 2×2 카드와 이미지 배치는 유지한다.

---

### Task 1: 문항 안내 데이터와 화면 렌더링

**Files:**
- Modify: `src/diagnosis-core.js`
- Modify: `src/diagnosis-ui.js`
- Modify: `src/diagnosis.css`
- Test: `tests/diagnosis-ui.test.js`

- [x] **Step 1: Write the failing test**

```js
test('문항 화면은 공통 안내와 문항별 판단 기준 및 선택지 설명을 표시한다', () => {
  const html = ui.renderQuestionView(state, 7);
  assert.match(html, /정면·무표정 기준/);
  assert.match(html, /입꼬리보다 가로 폭/);
  assert.match(html, /무표정에서는 작아 보여도/);
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `node --test tests/diagnosis-ui.test.js`

Expected: FAIL because the current question renderer has no guidance markup.

- [x] **Step 3: Write minimal implementation**

Add `guide`, `hint`, and `detail` values to the current question data. Render the common rule and guidance block before the answer grid, and render each detail beneath its option label. Add compact CSS styles that preserve the 2×2 card layout.

- [x] **Step 4: Run test to verify it passes**

Run: `node --test tests/diagnosis-ui.test.js`

Expected: PASS.

- [x] **Step 5: Commit**

```bash
git add src/diagnosis-core.js src/diagnosis-ui.js src/diagnosis.css tests/diagnosis-ui.test.js docs/superpowers
git commit -m "[code] 컨설턴트 진단 문항 안내 보완"
```

### Task 2: 단일 HTML 재빌드와 회귀 검증

**Files:**
- Modify: `dist/미유_무드진단_12type_v17.html`
- Test: `tests/build-v17.test.mjs`
- Test: `tests/diagnosis-layout.test.js`

- [x] **Step 1: Build the standalone HTML**

Run: `node scripts/build-v17.mjs`

- [x] **Step 2: Run full verification**

Run: `node --test tests/*.test.js tests/*.test.mjs`

Expected: all tests pass and the checked-in standalone HTML is current.

- [x] **Step 3: Commit built artifact**

```bash
git add dist/미유_무드진단_12type_v17.html
git commit -m "[code] 진단 안내 반영 빌드"
```
