# MIYU 남성 시각 해설 보완 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 남성 고객에게 여성 이미지가 노출되지 않게 하고, 추천과 피하면 좋은 방향을 분리한 시각 해설을 제공한다.

**Architecture:** 모든 참고 자산은 성별·용도별 경로를 가진 JPEG 매니페스트에 등록한다. `explanation-content.js`는 성별별 인트로·결과·추천/피함 페이지 데이터를 반환하고, `diagnosis-ui.js`는 그 페이지를 한 장씩 렌더링한다.

**Tech Stack:** 단일 HTML 빌드, JavaScript, CSS, Pillow 자산 최적화, Node 테스트, AI 생성 JPEG.

## Global Constraints

- 한국어와 선택 언어를 고객 해설의 모든 페이지에 함께 표시한다.
- 남성 진단·인트로·결과·해설에서는 여성 전용 이미지를 참조하지 않는다.
- 추천과 피하면 좋은 방향은 별도 페이지로 표시하며, 부정적 판정 표현을 쓰지 않는다.
- 이미지는 `object-fit: contain`으로 전체가 보이게 한다.
- 단일 HTML은 95 MiB 이하로 유지한다.

---

### Task 1: 성별별 이미지 계약과 회귀 테스트

**Files:**
- Modify: `src/explanation-data.js`, `src/explanation-content.js`, `src/diagnosis-ui.js`
- Modify: `scripts/optimize-miyu-reference-assets.py`, `scripts/build-v17.mjs`
- Test: `tests/explanation-content.test.js`, `tests/diagnosis-ui.test.js`, `tests/build-v17.test.mjs`

- [ ] 추천/피함 헤어·그루밍 페이지와 남성 전용 인트로·결과 경로의 실패 테스트를 작성한다.
- [ ] 테스트가 현재 공유 여성 경로에서 실패함을 확인한다.
- [ ] 남성 경로, 페이지 데이터, 빌드 매니페스트를 추가한다.
- [ ] 단위·빌드 테스트를 통과시킨다.
- [ ] 커밋한다.

### Task 2: 남성 참고 이미지 생성과 등록

**Files:**
- Create: `assets/diagnosis/reference/intro/male/*.jpg`
- Create: `assets/diagnosis/reference/result/male/*.jpg`
- Create: `assets/diagnosis/reference/male/grooming/{recommended,avoid}/*.jpg`
- Create: `assets/diagnosis/reference/male/hair/{recommended,avoid}/*.jpg`
- Modify: `assets/diagnosis/reference/manifest.json`

- [ ] 남성 4무드, 12타입, 추천/피함 그루밍과 헤어 이미지를 생성한다.
- [ ] 눈·이마·입 등 문항별 핵심 부위가 바로 읽히는 남성 진단 이미지를 생성·교체한다.
- [ ] 900px 이하 JPEG로 최적화하고 매니페스트를 재생성한다.
- [ ] 자산 수·성별 경로·빌드 크기 검사를 통과시킨다.
- [ ] 커밋한다.

### Task 3: 태블릿 페이지 구성과 검수

**Files:**
- Modify: `src/diagnosis.css`, `src/diagnosis-ui.js`
- Test: `tests/diagnosis-layout.test.js`, `tests/pages-entry.test.mjs`

- [ ] 헤어 이미지는 더 크게, 그루밍 이미지는 설명과 한 화면 안에 보이도록 CSS를 조정한다.
- [ ] 추천/피함 페이지가 비슷한 정보 밀도를 갖도록 설명·이미지·여백을 조정한다.
- [ ] 834×1194 및 1194×834에서 남성 흐름을 검수한다.
- [ ] 전체 자동 검사, 단일 HTML 최신성, 공개 경로를 확인한다.
- [ ] 커밋하고 배포한다.
