# MIYU Tablet Paged Explanation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reduce unnecessary tablet scrolling and deliver one clear bilingual MIYU explanation section per page.

**Architecture:** Existing diagnosis scoring and final type selection remain unchanged. `getExplanation()` supplies a six-item page model; the UI renders only the active page and keeps one final group/type identity in its header. The existing embedded reference manifest grows to include 24 AI-generated average-face assets.

**Tech Stack:** Vanilla JavaScript, CSS media queries, Node built-in test runner, Python/Pillow/python-pptx, built-in image generation.

## Global Constraints

- Target tablet sizes are 834×1194 portrait and 1194×834 landscape.
- Intro, bridge, question and result screens have no nonessential portrait scroll.
- Korean and selected-language copy remain visible together.
- Explanation pages are summary, facial features, mood, makeup/grooming, hair, accessory/fashion.
- Every AI face is an adult East Asian front/near-front reference with full facial-feature framing; no celebrity likeness, text, watermark, half face or `object-fit: cover`.
- PPT is the source of truth for type-specific makeup/grooming, hair, accessories and fashion.
- The standalone HTML remains self-contained and below 95MiB.

### Task 1: Write paged-explanation and asset RED tests

**Files:** `tests/explanation-content.test.js`, `tests/diagnosis-ui.test.js`, `tests/diagnosis-layout.test.js`, `tests/build-v17.test.mjs`

- [ ] Add assertions that `getExplanation('A-1', 'female', 'ja').pages` has ids `summary`, `facial-features`, `mood`, `makeup`, `hair`, `accessory-fashion` and each page has Korean/Japanese text.
- [ ] Add assertions for `reference/average/female/a-1.jpg`, 24 average-face manifest assets, previous/next pager controls, one fixed group/type header and no `category-section` legacy output.
- [ ] Run the focused tests and confirm they fail because the page model, controls and assets are absent.
- [ ] Commit: `[code] 미유 페이지형 해설 계약 추가`.

### Task 2: Prepare complete PPT guidance and AI average-face assets

**Files:** `src/explanation-data.js`, `src/explanation-content.js`, `assets/diagnosis/reference/average/`, `assets/diagnosis/reference/manifest.json`, `scripts/optimize-miyu-reference-assets.py`

- [ ] Use the presentation workflow on the 12 individual PPT type slides to create a Korean source matrix for makeup/grooming, hair, accessory and fashion advice, then translate each item to Japanese, Simplified Chinese and Traditional Chinese.
- [ ] Generate, inspect and save 24 accepted images in `average/female/{a-1..d-3}.jpg` and `average/male/{a-1..d-3}.jpg`; each prompt uses that type’s facial-feature definition and requires a full centred face.
- [ ] Register the 24 assets in the optimizer and manifest; change `getExplanation()` to use the new `reference/average` images and the complete guidance arrays.
- [ ] Run the content and build tests; commit: `[code] 미유 PPT 전문과 AI 평균 얼굴 보완`.

### Task 3: Render compact tablet screens and section pager

**Files:** `src/diagnosis-ui.js`, `src/diagnosis.css`, `src/celebrity-names.js`

- [ ] Add `#/explanation/<typeCode>/<pageIndex>` routing and clamp invalid indices; previous at page 0 returns to results and final next is disabled.
- [ ] Render one page at a time with a fixed `Group · Type` identity header and remove the legacy category title/person output from this route.
- [ ] Use a contained average-face card only on the facial-feature page. Apply `Name (Group)`, `Name (Actor)` and `Name (Solo Artist)` to static and dynamic example-person labels.
- [ ] Tighten portrait-only padding, logo height, image frames and gaps so the non-explanation views fit without losing 16px body copy or 44px controls; intro faces use `contain`.
- [ ] Run focused UI/layout tests; commit: `[code] 미유 태블릿 페이지형 해설 적용`.

### Task 4: Build, visually inspect and publish

**Files:** `dist/미유_무드진단_12type_v17.html`, `docs/miyu-ipad-release-checklist.md`

- [ ] Build the standalone HTML and run all Node tests plus `python3 -m unittest tests/test_pdf_assets.py`.
- [ ] Inspect female/Japanese and male/Traditional-Chinese routes at both tablet sizes: no horizontal overflow, full faces, one type identity, correct six-page order, full PPT styling content.
- [ ] Update the shop iPad checklist, commit the built file, push, merge and verify the cache-busted GitHub Pages URL returns HTTP 200.
