# MIYU PPT Visual Guidance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the MIYU consultation flow explain each result through the PPT's face, makeup, and hair references, while giving male customers equivalent AI visual references.

**Architecture:** Keep the single-file v17 build. Add a small, manifest-backed library of optimized PPT-derived reference images and AI male reference portraits, then expose the assets through `explanation-data.js` and render them in the existing localized introduction and explanation components. No external image URLs are introduced.

**Tech Stack:** Static HTML build, Node.js built-in test runner, `python-pptx`/Pillow for asset extraction and optimization, built-in image generation for male reference portraits.

## Global Constraints

- The saved output remains `dist/미유_무드진단_12type_v17.html` and is fully standalone: no network image requests.
- The output must remain below the build's 95 MiB hard limit.
- Portrait tablet (834×1194) is the primary layout; landscape remains supported without horizontal overflow.
- Customer-facing introduction and explanation display Korean plus the selected Japanese, Simplified Chinese, or Traditional Chinese language; diagnosis questions remain Korean only.
- The diagnosis bridge describes the consultant conducting the diagnosis, never asks the customer to select photos.
- Customer-facing wording uses a helpful direction such as “피하면 좋은 방향”, never a judgmental “안 어울림”.
- Use the user's PPT reference images for the shop-internal flow. Male visual gaps use non-celebrity AI reference portraits.

---

### Task 1: Add reference-asset contracts and failing behavior tests

**Files:**
- Modify: `tests/explanation-content.test.js`
- Modify: `tests/diagnosis-ui.test.js`
- Modify: `tests/build-v17.test.mjs`
- Modify: `tests/diagnosis-layout.test.js`

**Interfaces:**
- Consumes: `content.getIntroPage(page, gender, language)`, `content.getExplanation(typeCode, gender, language)`, `ui.renderBridgeView(state)`, `ui.renderExplanationPanel(draft, profile)`.
- Produces: test contracts for four intro group portraits, consultant-only bridge copy, top-most average-face block, localized makeup/hair image references, and standalone asset inclusion.

- [ ] **Step 1: Write the failing content tests**

```js
test('두 번째 소개 화면은 네 무드 그룹의 PPT 얼굴 참고 이미지를 제공한다', () => {
  const page = content.getIntroPage(2, 'female', 'ja');
  assert.deepEqual(page.groupVisuals.map(item => item.group), ['A', 'B', 'C', 'D']);
  assert.ok(page.groupVisuals.every(item => item.image.startsWith('assets/diagnosis/reference/intro/')));
});

test('해설은 평균 얼굴과 사진 참고가 있는 메이크업·헤어 안내를 반환한다', () => {
  const draft = content.getExplanation('A-1', 'female', 'zhTW');
  assert.match(draft.averageFace.image, /^assets\/diagnosis\/reference\//);
  assert.equal(draft.sections.makeup.examples.length, 1);
  assert.equal(draft.sections.hair.examples.length, 1);
});
```

- [ ] **Step 2: Run the focused test file to verify RED**

Run: `node --test tests/explanation-content.test.js`

Expected: FAIL because `groupVisuals`, `averageFace`, and `examples` are not yet returned.

- [ ] **Step 3: Write failing rendered-output and standalone tests**

```js
test('브릿지는 컨설턴트가 진단하고 결과를 설명한다는 안내만 표시한다', () => {
  const html = ui.renderBridgeView(validState);
  assert.match(html, /컨설턴트가.*진단/);
  assert.doesNotMatch(html, /사진을 보며.*골라/);
});

test('해설은 평균 얼굴을 이목구비 특징보다 먼저 렌더링한다', () => {
  const html = ui.renderExplanationPanel(femaleDraft, profile);
  assert.ok(html.indexOf('miyu-average-face') < html.indexOf('miyu-facial-features'));
});

test('v17에는 모든 PPT·AI 참고 이미지가 data URI로 포함된다', () => {
  const html = buildV17({ rootDir, outputPath });
  assert.equal((html.match(/data:image\/jpeg;base64/g) || []).length >= 100, true);
});
```

- [ ] **Step 4: Run focused files to verify RED**

Run: `node --test tests/diagnosis-ui.test.js tests/build-v17.test.mjs tests/diagnosis-layout.test.js`

Expected: FAIL only on the new consumer-visible visual contracts.

- [ ] **Step 5: Commit the red tests**

```bash
git add tests/explanation-content.test.js tests/diagnosis-ui.test.js tests/build-v17.test.mjs tests/diagnosis-layout.test.js
git commit -m "[code] 미유 PPT 시각 해설 계약 추가"
```

### Task 2: Prepare local PPT and AI reference assets

**Files:**
- Create: `assets/diagnosis/reference/manifest.json`
- Create: `assets/diagnosis/reference/intro/{a,b,c,d}.jpg`
- Create: `assets/diagnosis/reference/female/makeup/{a-1,...,d-3}.jpg`
- Create: `assets/diagnosis/reference/{female,male}/hair/{a,b,c,d}.jpg`
- Create: `assets/diagnosis/reference/male/face/{a-1,...,d-3}.jpg`
- Create: `scripts/prepare-ppt-reference-assets.mjs`
- Create: `scripts/optimize-miyu-reference-assets.mjs`
- Test: `tests/build-v17.test.mjs`

**Interfaces:**
- Consumes: `/Users/oeuvre/Desktop/미유/무드진단/★무드 세부 분류. 20260805.pptx` during one-time import only; final build reads only checked-in files below `assets/diagnosis/reference/`.
- Produces: `manifest.assets[logicalKey] = { file, mime: 'image/jpeg', width, height }` and the 32 visual reference files referenced by content data.

- [ ] **Step 1: Extract the PPT image sources into a temporary directory**

```js
// scripts/prepare-ppt-reference-assets.mjs
const GROUP_SLIDES = { A: 7, B: 38, C: 67, D: 95 };
const MALE_GROUP_SLIDES = { A: 13, B: 42, C: 70, D: 98 };
const MAKEUP_SLIDES = { 'A-1': 15, 'A-2': 22, 'A-3': 28, 'B-1': 45, 'B-2': 51, 'B-3': 56, 'C-1': 73, 'C-2': 79, 'C-3': 85, 'D-1': 100, 'D-2': 106, 'D-3': 112 };
```

Extract the four individual faces from slide 2, one best-look makeup photo per female type, and a text-free photo collage for each group/gender hair reference. Do not ship rendered slide screenshots containing Korean text.

- [ ] **Step 2: Generate twelve male face-and-grooming reference portraits**

For each type code, use one separate built-in image-generation call with this fixed structure:

```text
Use case: photorealistic-natural
Asset type: MIYU male mood consultation reference portrait
Primary request: East Asian adult male reference portrait for MIYU type <TYPE>, with <TYPE'S PPT MOOD AND GROOMING DIRECTION>.
Scene/backdrop: plain warm gray studio background
Style/medium: polished editorial beauty portrait, clearly synthetic reference model
Composition/framing: head and shoulders, front-facing three-quarter pose, full hair visible, generous crop, 4:5 portrait
Lighting/mood: soft professional beauty lighting
Constraints: no celebrity likeness, no recognizable real person, no logos, no text, no watermark
Avoid: extreme retouching, cropped hair, women's makeup styling
```

- [ ] **Step 3: Optimize and manifest all reference images**

```js
const MAX_EDGE = 720;
const JPEG_QUALITY = 78;
// Write a width/height-verified JPEG entry for every logical key.
```

Use conservative quality so the full build remains below 95 MiB. Fail the script if a declared asset is missing, wider than 720 pixels on its long edge, or not JPEG.

- [ ] **Step 4: Run focused reference build test to verify GREEN**

Run: `node --test tests/build-v17.test.mjs`

Expected: PASS; the resulting single HTML includes only local `data:image/jpeg` references and stays below 95 MiB.

- [ ] **Step 5: Commit the reference assets and tooling**

```bash
git add assets/diagnosis/reference scripts/prepare-ppt-reference-assets.mjs scripts/optimize-miyu-reference-assets.mjs tests/build-v17.test.mjs
git commit -m "[code] 미유 PPT와 남성 참고 이미지를 추가"
```

### Task 3: Connect localized content to the visual references

**Files:**
- Modify: `src/explanation-data.js`
- Modify: `src/explanation-content.js`
- Modify: `tests/explanation-content.test.js`

**Interfaces:**
- Consumes: `REFERENCE_ASSETS` logical paths and existing `localized(ko, ja, zhCN, zhTW)` helper.
- Produces: `page.groupVisuals`, `draft.averageFace`, and `sections.makeup/hair = { copy, examples }` without changing the accepted type-code or language API.

- [ ] **Step 1: Extend the typed content shape minimally**

```js
const makeReference = (image, caption) => ({ image, caption });

const GROUP_VISUALS = {
  A: makeReference('assets/diagnosis/reference/intro/a.jpg', localized('화사하고 사랑스러운', '華やかで愛らしい', '明媚又甜美', '明媚又甜美')),
  // B, C, D
};
```

- [ ] **Step 2: Replace the bridge copy in all four languages**

```js
body: localized(
  '이제부터 컨설턴트가 고객님의 얼굴 특징을 바탕으로 진단을 진행할게요. 진단이 끝나면 결과와 어울리는 스타일을 자세히 설명해 드려요.',
  'これからコンサルタントがお顔の特徴をもとに診断を進めます。診断後に結果と似合うスタイルを詳しくご説明します。',
  '接下来顾问会根据您的面部特征进行诊断。诊断结束后，会详细说明结果和适合您的风格。',
  '接下來顧問會根據您的臉部特徵進行診斷。診斷結束後，會詳細說明結果和適合您的風格。'
)
```

- [ ] **Step 3: Add per-type female makeup and per-group hair examples**

```js
recommendations: {
  makeup: { female: { copy: female.makeup, examples: [makeReference('assets/diagnosis/reference/female/makeup/a-1.jpg', makeupCaption)] }, male: { copy: male.grooming, examples: [makeReference('assets/diagnosis/reference/male/face/a-1.jpg', groomingCaption)] } },
  hair: { female: { copy: FEMALE_STYLE.A.hair, examples: [makeReference('assets/diagnosis/reference/female/hair/a.jpg', hairCaption)] }, male: { copy: MALE_STYLE.A.hair, examples: [makeReference('assets/diagnosis/reference/male/hair/a.jpg', hairCaption)] } }
}
```

- [ ] **Step 4: Run content test to verify GREEN**

Run: `node --test tests/explanation-content.test.js`

Expected: PASS; every type and gender returns Korean plus all required translations and valid local image paths.

- [ ] **Step 5: Commit content data**

```bash
git add src/explanation-data.js src/explanation-content.js tests/explanation-content.test.js
git commit -m "[code] 미유 시각 해설 콘텐츠를 연결"
```

### Task 4: Render the revised introduction and five-step explanation

**Files:**
- Modify: `src/diagnosis-ui.js`
- Modify: `src/diagnosis.css`
- Modify: `tests/diagnosis-ui.test.js`
- Modify: `tests/diagnosis-layout.test.js`

**Interfaces:**
- Consumes: `intro.groupVisuals`, `draft.averageFace`, and section `copy`/`examples` objects.
- Produces: intro 2×2 portrait cards, average-face-first explanation layout, bilingual visual captions, and responsive photo examples.

- [ ] **Step 1: Add average face before the first explanation section**

```js
<section class="miyu-average-face miyu-reference-section">
  ${renderSectionHeading(content.SECTION_LABELS.averageFace, language)}
  ${renderReferenceImage(draft.averageFace, language, 'miyu-average-face-image')}
</section>
```

Remove the lower legacy average-face block from the customer-visible order so the same reference is not shown twice.

- [ ] **Step 2: Render examples inside makeup/grooming and hair sections**

```js
${renderLocalizedBlock(sections.makeup.copy, language, 'miyu-localized-copy')}
${renderReferenceGallery(sections.makeup.examples, language, 'miyu-makeup-examples')}
```

Use the same `renderReferenceGallery` for hair. Every caption displays Korean and the selected second language.

- [ ] **Step 3: Render the four image group cards on intro page 2**

```js
<div class="miyu-intro-groups miyu-intro-groups-with-faces">
  ${page.groupVisuals.map(item => `<article><img src="${asset(item.image)}" alt=""><h3>${renderLocalizedBlock(item.label, language)}</h3>${renderLocalizedBlock(item.caption, language)}</article>`).join('')}
</div>
```

- [ ] **Step 4: Add tablet-first CSS constraints**

```css
.miyu-reference-gallery { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
.miyu-reference-gallery img { width: 100%; aspect-ratio: 4 / 5; object-fit: cover; }
@media (max-width: 640px) { .miyu-reference-gallery { grid-template-columns: 1fr; } }
```

At 834×1194 keep four intro cards in two columns, and place reference galleries below their copy. At 1194×834 preserve `scrollWidth <= viewport width`.

- [ ] **Step 5: Run UI and layout tests to verify GREEN**

Run: `node --test tests/diagnosis-ui.test.js tests/diagnosis-layout.test.js`

Expected: PASS; average face is top-first, bilingual captions are present, and tablet constraints are preserved.

- [ ] **Step 6: Commit rendering and style work**

```bash
git add src/diagnosis-ui.js src/diagnosis.css tests/diagnosis-ui.test.js tests/diagnosis-layout.test.js
git commit -m "[code] 미유 해설에 평균 얼굴과 스타일 예시를 표시"
```

### Task 5: Rebuild, visually inspect, and document internal shop use

**Files:**
- Modify: `docs/miyu-ipad-release-checklist.md`
- Modify: `dist/미유_무드진단_12type_v17.html`
- Test: all test files above and `tests/test_pdf_assets.py`

**Interfaces:**
- Consumes: the build command and final standalone HTML.
- Produces: a checked, rebuildable internal-shop consultation page.

- [ ] **Step 1: Rebuild the saved standalone HTML**

Run: `node scripts/build-v17.mjs`

Expected: build exits 0 and reports a size below 95 MiB.

- [ ] **Step 2: Run the complete automated suite**

Run: `node --test tests/build-v17.test.mjs tests/diagnosis-core.test.js tests/diagnosis-layout.test.js tests/diagnosis-ui.test.js tests/explanation-content.test.js tests/male-image-assets.test.mjs tests/pages-entry.test.mjs && python -m unittest tests/test_pdf_assets.py`

Expected: all tests pass.

- [ ] **Step 3: Perform actual browser checks at both tablet orientations**

Check female Japanese and male Traditional Chinese paths:

1. Intro page 2 shows four face cards with both languages.
2. Bridge does not ask the customer to select photos.
3. Explanation leads with one average-face reference.
4. Makeup/grooming and hair each show a relevant photo reference and bilingual caption.
5. Portrait 834×1194 and landscape 1194×834 have no horizontal overflow.

- [ ] **Step 4: Update the iPad checklist**

Add the five checks above and label the PPT reference images as “샵 내부 상담용”.

- [ ] **Step 5: Commit final build and documentation**

```bash
git add dist/미유_무드진단_12type_v17.html docs/miyu-ipad-release-checklist.md
git commit -m "[code] 미유 PPT 시각 해설 빌드를 검증"
```

## Self-review

- Intro page 2's four actual PPT group-face references are covered by Tasks 2–4.
- The consultant-only bridge and all four translations are covered by Task 3 and its content tests.
- Average-face-first order is covered by Tasks 1 and 4.
- Female type-specific makeup examples and gender-specific group hair references are covered by Tasks 2–4.
- Male visual gaps are covered by Task 2's twelve non-celebrity AI portraits and rendered in Tasks 3–4.
- Standalone build size, offline assets, automated behavior, and tablet visual checks are covered by Task 5.
