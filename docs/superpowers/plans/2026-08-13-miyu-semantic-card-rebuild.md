# MIYU Semantic Card Rebuild Implementation Plan
> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild every customer-facing explanation card so its image, localized caption, layout, and styling guidance describe the same thing.

**Architecture:** A dedicated card-manifest module owns every visible reference card and daily outfit. `explanation-content.js` consumes the manifest instead of assigning captions by array position. The renderer reads card layout metadata so source images remain visible without crop or a fixed-ratio blank frame.

**Tech Stack:** Vanilla JavaScript, Node.js test runner, Playwright, Python/Pillow/python-pptx, Sharp standalone build.

**Spec:** `docs/superpowers/specs/2026-08-13-miyu-semantic-card-rebuild-design.md`

## Global Constraints

- Do not alter diagnosis questions, scoring, twelve-type labels, or result selection.
- Every displayed card has Korean, Japanese, Simplified Chinese, and Traditional Chinese text.
- Use a PPT image only if one visible subject matches the caption; replace ambiguous collages with a truthful generated reference.
- Generated images must not imitate a named celebrity or identifiable real person.
- No customer reference image can rely on `object-fit: cover`.
- Verify direct routes, diagnosis-result routes, 834×1194 tablet, desktop, standalone freshness, and the 95 MiB cap before deployment.

---

### Task 1: Regression tests for card meaning and complete images

**Files:**
- Create: `src/explanation-card-manifest.js`
- Modify: `tests/explanation-content.test.js`
- Modify: `tests/diagnosis-layout.test.js`

**Interfaces:**
- Produces `getReferenceCards({ typeCode, typeName, group, gender, section })`.
- Produces `getDailyOutfitCards({ typeCode, gender })`.

- [ ] **Step 1: Write the failing content-contract test**

```js
test('cards have their own localized caption, layout, and nonduplicated daily guidance', () => {
  for (const typeCode of TYPE_CODES) for (const gender of ['female', 'male']) {
    const result = content.getExplanation(typeCode, gender, 'ja');
    for (const cards of [result.sections.makeup.examples, result.sections.makeup.avoidExamples, result.sections.hair.examples, result.sections.hair.avoidExamples, result.sections.accessoryFashion.idolExamples]) {
      for (const card of cards) {
        assert.ok(['portrait', 'landscape', 'natural'].includes(card.layout));
        for (const language of ['ko', ...LANGUAGES]) assert.ok(card.caption[language].trim());
      }
    }
    const outfits = result.sections.accessoryFashion.dailyOutfits;
    assert.equal(new Set(outfits.map(card => JSON.stringify([card.material.ko, card.design.ko, card.accessory.ko, card.note.ko]))).size, 3);
  }
});
```

- [ ] **Step 2: Run the focused test and confirm RED**

Run: `node --test tests/explanation-content.test.js`

Expected: FAIL because the current reference cards lack `layout` and daily cards repeat fields.

- [ ] **Step 3: Write the failing render test**

```js
test('reference and daily images are never cover-cropped', async () => {
  const page = await browser.newPage({ viewport: { width: 834, height: 1194 } });
  await page.setContent(`<style>${css}</style>${explanationHtml(8)}`);
  const fits = await page.locator('.miyu-reference-image-frame img, .miyu-daily-outfit-card img').evaluateAll(images => images.map(image => getComputedStyle(image).objectFit));
  assert.ok(fits.every(value => value !== 'cover'));
  await page.close();
});
```

- [ ] **Step 4: Run the layout test and confirm RED**

Run: `node --test tests/diagnosis-layout.test.js`

Expected: FAIL because daily outfit images compute to `cover`.

- [ ] **Step 5: Commit the red tests**

Run:
```bash
git add tests/explanation-content.test.js tests/diagnosis-layout.test.js
git commit -m "[test] 해설 카드 의미 연결 검증 추가"
```

### Task 2: Replace positional captions with an explicit manifest

**Files:**
- Create: `src/explanation-card-manifest.js`
- Modify: `src/explanation-content.js`
- Modify: `tests/explanation-content.test.js`

**Interfaces:**
- `getReferenceCards()` returns `{image, source, layout, cropPosition, caption}`.
- `getDailyOutfitCards()` returns three `{image, source, layout, name, material, design, accessory, note}` values.

- [ ] **Step 1: Add a validated localized card constructor**

```js
const LANGUAGES = ['ko', 'ja', 'zh-CN', 'zh-TW'];
function card(image, source, layout, caption, cropPosition = 'center') {
  for (const language of LANGUAGES) if (!String(caption[language] || '').trim()) {
    throw new Error(`Missing ${language} card caption: ${image}`);
  }
  return { image, source, layout, cropPosition, caption };
}
```

- [ ] **Step 2: Add exact mappings for all type/gender/section combinations**

Use the PPT type **name**, not app D-number, for `clear`, `sharp`, and `charisma`. Hair remains group-level but uses semantically approved images. Makeup and fashion are detailed-type level.

- [ ] **Step 3: Change `getExplanation()` to consume the manifest**

```js
const context = { typeCode, typeName: type.name, group: type.group, gender: safeGender };
examples: cardManifest.getReferenceCards({ ...context, section: 'makeup-recommended' }),
avoidExamples: cardManifest.getReferenceCards({ ...context, section: 'makeup-avoid' }),
dailyOutfits: cardManifest.getDailyOutfitCards(context)
```

Remove `localizedReferenceExamples`, `fashionReferenceExamples`, and `dailyOutfits` only when no section depends on automatic array-order matching.

- [ ] **Step 4: Run the content contract and confirm GREEN**

Run: `node --test tests/explanation-content.test.js`

Expected: PASS.

- [ ] **Step 5: Commit the manifest consumer**

Run:
```bash
git add src/explanation-card-manifest.js src/explanation-content.js tests/explanation-content.test.js
git commit -m "[code] 해설 카드별 이미지와 설명 연결"
```

### Task 3: Curate semantic PPT assets and generate replacements

**Files:**
- Modify: `scripts/prepare-ppt-reference-assets.py`
- Create: `assets/diagnosis/reference/female/semantic/…`
- Create: `assets/diagnosis/reference/male/semantic/…`
- Modify: `src/explanation-card-manifest.js`
- Create: `tests/test_ppt_semantic_assets.py`

**Interfaces:**
- Every card asset path exists in `assets/diagnosis/reference` and records `source: 'ppt'` or `source: 'generated'`.

- [ ] **Step 1: Write the failing semantic asset test**

```python
def test_customer_card_assets_are_single_subject_or_explicitly_generated(self):
    for card in load_manifest_cards():
        self.assertTrue((ASSET_ROOT / card['image']).is_file())
        self.assertIn(card['source'], {'ppt', 'generated'})
        self.assertIn(card['layout'], {'portrait', 'landscape', 'natural'})
        self.assertNotIn('/avoid/b/1.jpg', card['image'])
```

- [ ] **Step 2: Run the asset test and confirm RED**

Run: `python3 -m unittest tests.test_ppt_semantic_assets`

Expected: FAIL until ambiguous legacy collage files are removed from the visible mapping.

- [ ] **Step 3: Export only named, single-subject PPT shapes**

Replace customer-facing `card_images()` sampling with an explicit source table keyed by type name/group, gender, section, and card slug. Preserve slide number in the manifest’s internal source metadata.

- [ ] **Step 4: Generate all missing semantic references**

For each replacement, produce a full-frame editorial image that visibly demonstrates the named hair, makeup, fashion, or accessory concept. Inspect output, keep the person fully visible, avoid text/logos/celebrity resemblance, optimize it, and mark the entry `source: 'generated'`.

- [ ] **Step 5: Run semantic asset test and confirm GREEN**

Run: `python3 -m unittest tests.test_ppt_semantic_assets`

Expected: PASS.

- [ ] **Step 6: Commit curated assets**

Run:
```bash
git add scripts/prepare-ppt-reference-assets.py tests/test_ppt_semantic_assets.py assets/diagnosis/reference src/explanation-card-manifest.js
git commit -m "[assets] 해설 예시 이미지 의미별 정리"
```

### Task 4: Add 12-type, gender-specific daily outfits

**Files:**
- Modify: `src/explanation-card-manifest.js`
- Create: `assets/diagnosis/reference/female/daily/semantic/…`
- Create: `assets/diagnosis/reference/male/daily/semantic/…`
- Modify: `tests/explanation-content.test.js`

**Interfaces:**
- `getDailyOutfitCards({ typeCode, gender })` returns exactly three complete cards for each of 24 paths.

- [ ] **Step 1: Write the failing detailed-type test**

```js
test('daily guidance changes with detailed type, not only group', () => {
  const fantasy = content.getExplanation('A-1', 'female', 'ja').sections.accessoryFashion.dailyOutfits;
  const fruity = content.getExplanation('A-2', 'female', 'ja').sections.accessoryFashion.dailyOutfits;
  assert.notDeepEqual(fantasy.map(card => card.design.ko), fruity.map(card => card.design.ko));
});
```

- [ ] **Step 2: Run the test and confirm RED**

Run: `node --test tests/explanation-content.test.js`

Expected: FAIL because current daily guidance uses group-level content.

- [ ] **Step 3: Author 72 distinct localized cards and matching images**

Write 12 types × 2 genders × 3 outfits. Every card has its own material, silhouette/pattern, accessory size/form/color, and caution. Reuse an image only when it exactly depicts the card; otherwise generate a fully visible head-to-foot outfit image and declare `layout: 'portrait'`.

- [ ] **Step 4: Run content tests and confirm GREEN**

Run: `node --test tests/explanation-content.test.js`

Expected: PASS; every type/gender returns three unique, complete cards.

- [ ] **Step 5: Commit daily outfit data and assets**

Run:
```bash
git add src/explanation-card-manifest.js assets/diagnosis/reference tests/explanation-content.test.js
git commit -m "[content] 타입별 데일리 코디 완성"
```

### Task 5: Render each declared layout without crop or fake blank space

**Files:**
- Modify: `src/diagnosis-ui.js`
- Modify: `src/diagnosis.css`
- Modify: `tests/diagnosis-layout.test.js`

**Interfaces:**
- `renderReferenceImage()` and `renderDailyOutfitCard()` render `data-layout` from the manifest.
- Gallery stays a horizontal rail with visible scrollbar, controls, scroll-snap, and touch panning.

- [ ] **Step 1: Add explicit layout to reference and outfit image frames**

```js
<div class="miyu-reference-image-frame" data-layout="${escapeHtml(reference.layout)}" data-crop="${escapeHtml(reference.cropPosition || 'center')}">
```

- [ ] **Step 2: Remove the daily `cover` rule and add layout rules**

```css
.miyu-reference-image-frame[data-layout="portrait"] { aspect-ratio: 4 / 5; }
.miyu-reference-image-frame[data-layout="landscape"],
.miyu-reference-image-frame[data-layout="natural"] { aspect-ratio: auto; background: transparent; }
.miyu-reference-image-frame[data-layout="landscape"] img,
.miyu-reference-image-frame[data-layout="natural"] img,
.miyu-daily-outfit-card img { width: 100%; height: auto; object-fit: contain; }
```

- [ ] **Step 3: Run layout tests and confirm GREEN**

Run: `node --test tests/diagnosis-layout.test.js`

Expected: PASS; no image computes to `cover`, no 834px horizontal overflow, and PC retains three-card visibility.

- [ ] **Step 4: Commit UI rendering change**

Run:
```bash
git add src/diagnosis-ui.js src/diagnosis.css tests/diagnosis-layout.test.js
git commit -m "[ui] 해설 카드 원본 비율과 탐색성 개선"
```

### Task 6: Build, displayed-card audit, and deployment

**Files:**
- Modify: `dist/미유_무드진단_Full_V1.html`
- Modify: `tests/build-v17.test.mjs` only if explicit asset manifest changes a checked count.

- [ ] **Step 1: Run the complete automated suite**

Run: `node --test tests/*.test.js tests/*.test.mjs && python3 -m unittest discover -s tests -p 'test_*.py'`

Expected: PASS.

- [ ] **Step 2: Rebuild and verify standalone freshness and size**

Run: `node scripts/build-v17.mjs && node --test tests/build-v17.test.mjs`

Expected: PASS and `dist/미유_무드진단_Full_V1.html` is at most 95 MiB.

- [ ] **Step 3: Run browser regression checks**

Run: `node --test tests/diagnosis-layout.test.js tests/pages-entry.test.mjs`

Expected: PASS at 834×1194 and 1194×834.

- [ ] **Step 4: Inspect representative live card routes**

Open female A-1/B-1/C-1/D-1 and male A-1/B-1/C-1/D-1 in Japanese and Traditional Chinese. Confirm matching captions, full images, unique daily guidance, working scrollbar/buttons/swipe, and direct/diagnosis route navigation.

- [ ] **Step 5: Commit, merge, and publish only after all checks**

Run:
```bash
git add dist/미유_무드진단_Full_V1.html tests/build-v17.test.mjs
git commit -m "[build] 의미 연결 해설 배포본 갱신"
git push -u origin codex/miyu-explanation-showcase
```

Open a pull request for `main`, merge after checks, wait for the GitHub Pages workflow to succeed, then share the deployed Full V1 link.
