# 미유 GitHub Pages 공개 배포 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 완성된 미유 무드 진단을 태블릿에서 열 수 있는 공개 GitHub Pages 링크로 배포한다.

**Architecture:** `dist/index.html`이 짧은 루트 주소를 기존 단일 v17 HTML로 연결한다. GitHub Actions는 `main`이 바뀔 때마다 `dist`만 Pages 아티팩트로 배포하며, 실제 공개 주소에서 최종 동작을 확인한다.

**Tech Stack:** 정적 HTML, Node.js 내장 테스트 러너, Playwright, GitHub Actions, GitHub Pages

## Global Constraints

- 공개 저장소는 `Attractioncompany/miyu-mood-diagnosis`로 만든다.
- 배포 대상은 `dist` 폴더로 제한한다.
- 기존 `dist/미유_무드진단_12type_v17.html`의 내용과 해시는 변경하지 않는다.
- `main` 브랜치에서 자동 배포한다.
- 배포 성공과 공개 주소의 실제 동작을 확인하기 전에는 완료로 보고하지 않는다.

---

### Task 1: 루트 주소 연결

**Files:**
- Create: `tests/pages-entry.test.mjs`
- Create: `dist/index.html`

**Interfaces:**
- Consumes: `dist/미유_무드진단_12type_v17.html`
- Produces: 루트 `/` 요청을 v17 파일로 연결하는 정적 진입점

- [ ] **Step 1: 실제 브라우저에서 루트 연결을 검증하는 실패 테스트 작성**

`tests/pages-entry.test.mjs`에서 임시 정적 서버를 열고 Playwright로 `/`에 접속한다. 최종 주소의 경로가 `/미유_무드진단_12type_v17.html`로 끝나고 화면에 `미유 무드 진단` 제목이 나타나는지 확인한다.

```js
test('루트 주소가 v17 진단 화면을 연다', async () => {
  await page.goto(baseUrl);
  await page.waitForURL(url => decodeURIComponent(url.pathname).endsWith('/미유_무드진단_12type_v17.html'));
  assert.match(await page.textContent('body'), /미유 무드 진단/);
});
```

- [ ] **Step 2: 실패 이유 확인**

Run: `NODE_PATH="$NODE_MODULE_PATH" node --test tests/pages-entry.test.mjs`
Expected: FAIL because `dist/index.html` does not exist and the browser remains on a 404 page.

- [ ] **Step 3: 최소 진입점 구현**

`dist/index.html`은 UTF-8 문서로 만들고 자바스크립트 `location.replace()`와 자바스크립트 비활성화용 링크를 함께 제공한다. 현재 해시가 있으면 최종 주소에도 유지한다.

- [ ] **Step 4: 테스트 통과 확인**

Run: `NODE_PATH="$NODE_MODULE_PATH" node --test tests/pages-entry.test.mjs`
Expected: PASS, 1 test and 0 failures.

- [ ] **Step 5: v17 원본 보존 확인**

Run: `shasum -a 256 dist/미유_무드진단_12type_v17.html`
Expected: `479700da28963f98356f511ca221871ea2562271616c620fd7f54755ef5f9a56`

### Task 2: GitHub Pages 자동 배포

**Files:**
- Create: `.github/workflows/pages.yml`

**Interfaces:**
- Consumes: `main` 브랜치의 `dist`
- Produces: GitHub Pages 배포와 배포 URL

- [ ] **Step 1: 공식 Pages 워크플로 작성**

워크플로는 `push`의 `main`과 `workflow_dispatch`에서 실행한다. 권한은 `contents: read`, `pages: write`, `id-token: write`만 사용한다. 단계는 checkout, Pages 설정, `dist` 업로드, Pages 배포 순서로 구성한다.

- [ ] **Step 2: 로컬 전체 검증**

Run: 기존 Node/Chrome 테스트 전체, `tests/pages-entry.test.mjs`, PDF 자산 Python 테스트
Expected: 모든 테스트 통과, 경고나 실패 없음.

- [ ] **Step 3: 구현 파일 커밋**

```bash
git add .github/workflows/pages.yml dist/index.html tests/pages-entry.test.mjs docs/superpowers/plans/2026-07-27-miyu-github-pages-implementation.md
git commit -m "[code] GitHub Pages 공개 배포 구성 추가"
```

### Task 3: 공개 저장소와 Pages 생성

**Files:**
- External: `https://github.com/Attractioncompany/miyu-mood-diagnosis`

**Interfaces:**
- Consumes: 로컬 `main`
- Produces: 공개 GitHub 저장소와 Pages 사이트

- [ ] **Step 1: 같은 이름의 저장소 존재 여부 확인**

Run: `gh repo view Attractioncompany/miyu-mood-diagnosis`
Expected: 저장소가 없으면 생성 단계로 진행한다. 이미 있으면 내용을 덮어쓰지 않고 상태를 먼저 확인한다.

- [ ] **Step 2: 공개 저장소 생성과 푸시**

Run: `gh repo create Attractioncompany/miyu-mood-diagnosis --public --source=. --remote=origin --description "MIYU 무드 진단 프로그램"`
Run: `git push -u origin main`

- [ ] **Step 3: Pages를 Actions 방식으로 활성화**

Run: `gh api -X POST repos/Attractioncompany/miyu-mood-diagnosis/pages -f build_type=workflow`
Expected: Pages 사이트 생성 응답. 이미 생성된 경우 PUT으로 `build_type=workflow`를 적용한다.

- [ ] **Step 4: 필요 시 배포를 다시 실행**

첫 푸시가 Pages 활성화보다 먼저 실행되어 실패한 경우 `pages.yml`을 `main`에서 수동 실행한다.

### Task 4: 실제 배포 검증

**Files:**
- Verify: `https://attractioncompany.github.io/miyu-mood-diagnosis/`

**Interfaces:**
- Consumes: GitHub Pages 배포 결과
- Produces: 컨설턴트가 태블릿에서 열 수 있는 공개 링크

- [ ] **Step 1: Actions 완료 상태 확인**

Run: `gh run list --repo Attractioncompany/miyu-mood-diagnosis --workflow pages.yml --limit 5`
Expected: 최신 `main` 커밋의 결론이 `success`.

- [ ] **Step 2: 저장소와 로컬 커밋 일치 확인**

로컬 `HEAD`와 GitHub `main`의 SHA가 같은지 확인한다.

- [ ] **Step 3: 공개 주소 실제 접속**

브라우저에서 루트 주소를 열고 v17 진단 시작 화면으로 이동하는지 확인한다. 이름 입력 후 시작 버튼이 사용 가능한 상태가 되는지 확인해 정적 파일뿐 아니라 핵심 자바스크립트도 로드되었음을 검증한다.

- [ ] **Step 4: 최종 상태 확인**

`git status --short --branch`, 최근 커밋, 원격 주소, v17 SHA-256을 다시 확인하고 사용자에게 공개 링크와 61MB 첫 로딩 주의사항을 전달한다.
