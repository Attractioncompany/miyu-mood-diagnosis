# MIYU Gallery Readability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** PPT 이미지 보드의 빈칸을 없애고 태블릿 해설의 사진·글자 가독성을 높인다.

**Architecture:** `prepare-ppt-reference-assets.py`가 균형 행과 자리표시 이미지 제외 규칙으로 사진 보드를 만든다. `diagnosis.css`는 평균 얼굴과 스타일 참고 보드의 비율·폭 규칙을 분리하고, 해설 카드의 한국어·번역문 위계를 정한다.

**Tech Stack:** Python(Pillow, python-pptx), HTML/CSS, Node.js test runner, Playwright.

## Global Constraints

- 고객용 해설은 한국어와 선택 언어를 함께 표시한다.
- 평균 얼굴은 4:5 비율을 유지하고, 스타일 참고 보드는 원본 비율을 유지한다.
- 세로 태블릿 기준 화면 폭은 834px, 가로 태블릿 기준은 1194px이다.
- 단일 Full V1 파일은 95MiB 미만이어야 한다.

---

### Task 1: PPT 사진 보드 밀도 개선

**Files:**
- Modify: `scripts/prepare-ppt-reference-assets.py`
- Test: `tests/test_ppt_reference_assets.py`

- [x] 균형 행 검사 작성 후 RED 확인: 10개 사진은 `[4, 3, 3]` 행으로 분리한다.
- [x] 순백색 PPT 자리표시 이미지 검사 작성 후 RED 확인.
- [x] `balanced_row_counts()`와 `is_blank_placeholder()`로 사진 보드 생성 규칙 구현.
- [x] PPT 원본 추출·최적화·Full V1 재생성.

### Task 2: 태블릿 스타일 보드와 글자 위계

**Files:**
- Modify: `src/diagnosis.css`
- Test: `tests/diagnosis-layout.test.js`

- [x] 스타일 보드의 넓은 폭·원본 비율, 평균 얼굴의 4:5 유지 검사를 작성 후 RED 확인.
- [x] 한국어가 번역문보다 크고 굵은지 검사 작성 후 RED 확인.
- [x] 세로 태블릿 2열 가이드·680px 스타일 보드·한국어 우선 글자 규칙 구현.
- [x] 좁은 휴대폰에서는 가이드 1열로 전환.

### Task 3: 전체 검증

**Files:**
- Modify: `assets/diagnosis/reference/**/*.jpg`
- Modify: `assets/diagnosis/reference/manifest.json`
- Modify: `dist/미유_무드진단_Full_V1.html`

- [x] 전체 Node·Python 검사 실행.
- [x] 커밋 전 생성본 해시·용량·작업 트리 확인.
