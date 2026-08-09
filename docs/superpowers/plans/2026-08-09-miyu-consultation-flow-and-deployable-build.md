# MIYU Consultation Flow and Deployable Build Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (- [ ]) syntax for tracking.

**Goal:** Add bilingual customer introduction, bridge, and five-part explanation screens to MIYU diagnosis, while making the self-contained HTML safe to publish from a clean Git history.

**Architecture:** Customer copy stays in the existing explanation data layer and renders as Korean plus the selected language. The eight question diagnosis remains consultant-only and Korean-only. The hash router gains introduction and bridge routes; a guard keeps male profiles out of women-only legacy pages. The builder embeds optimized assets, validates MIME and size, and the finished tree is copied into a fresh branch based on main so oversized historical blobs never reach GitHub.

**Tech Stack:** Node.js, browser-compatible CommonJS modules, Node test runner, Playwright/Chromium, Sharp, Python PDF tests, Git.

## Global Constraints

- Preserve source/미유_무드분류_12type_v16.html unchanged with SHA-256 46f24a73ab0e624e029f1f58fe44f6ec311bfdeba84c7e7833d82c8f0ee2fa81.
- Preserve score calculation, 12 type mapping, question order, and the maximum-two-answer rule.
- Profile remains session-only: customer name, consultant name, explanation language, gender, diagnosis date.
- Customer copy always has Korean plus the selected 日本語, 简体中文, or 繁體中文. The diagnostic screen and controls are Korean-only.
- Female B is Feminine · 페미닌; male B is Boyish · 보이시.
- Customer routes show English celebrity names only and never show 검토 메모, 해설 초안, 초안, image enlargement, or network image URLs.
- Original PNG source files remain untouched. Embed the logo as PNG and 80 photos as JPEG. Final HTML must be <= 95 * 1024 * 1024 bytes.
- Current feature branch remains a backup; never rewrite or force-push it. The later deployment branch starts at main, contains no blob >=100 MiB, and is not pushed by this plan.
- Optimize for 834×1194 portrait tablet; support 1194×834 landscape.
- Commit after each task using a [code] message only after the stated checks pass.

---

## File Structure

| File | Responsibility |
|---|---|
| src/explanation-data.js | Localized introduction, bridge, group hair, type makeup and accessory/fashion data |
| src/explanation-content.js | Full-content validation and customer view models |
| src/diagnosis-ui.js | Intro/bridge routes and five-part customer explanation markup |
| src/diagnosis.css | Tablet-first layout for the new pages |
| src/celebrity-names.js | English conversion of static and CAT_PERSONS names |
| scripts/optimize-standalone-assets.mjs | JPEG derivative and manifest generation |
| assets/diagnosis/standalone/manifest.json | Logical asset key, JPEG file, MIME, width, height |
| scripts/build-v17.mjs | Manifest build, MIME/size validation, route guard injection |
| tests | Content, routes, asset, legacy and browser regression coverage |
| docs/miyu-ipad-release-checklist.md | Manual physical-device release gate |

## PPT Source Map

- Intro: /Users/oeuvre/Desktop/미유/무드진단/★무드 해부 분류. 20260805.pptx slides 1–3.
- Group hair: female 6/35/64/92; male 12/41/69/97 for A/B/C/D.
- Individual makeup: female 15/22/28/45/51/56/73/79/85/100/106/112; male 18/24/30/47/53/59/75/81/87/102/108/114 in A-1 through D-3 order.
- Female accessory/fashion: 19/25/31/48/54/60/76/82/88/103/109/115.

### Task 1: Add complete localized consultation data and validation

**Files:**
- Modify: src/explanation-data.js
- Modify: src/explanation-content.js
- Test: tests/explanation-content.test.js

**Interfaces:**
- Export INTRO_PAGES, BRIDGE_COPY, GROUP_HAIR.
- Add TYPE_CONTENT[code].recommendations.makeup[gender] and accessoryFashion[gender].
- Export getIntroPage(pageNumber, gender, language), getBridgeCopy(language).
- getExplanation(code, gender, language).sections has facialFeatures, mood, makeup, hair, accessoryFashion in that order.

- [ ] **Step 1: Write failing tests**

    const intro = content.getIntroPage(1, 'female', 'ja');
    assert.equal(intro.title.ko, '미유 무드 진단이란?');
    assert.equal(intro.title.ja, 'MIYUムード診断とは？');
    assert.equal(content.getIntroPage(2, 'male', 'zh-TW').groups.B.ko, 'Boyish · 보이시');
    assert.equal(content.getBridgeCopy('zh-CN').title['zh-CN'], '现在开始进行诊断。');

    const draft = content.getExplanation('C-3', 'male', 'zh-TW');
    assert.deepEqual(Object.keys(draft.sections), [
      'facialFeatures', 'mood', 'makeup', 'hair', 'accessoryFashion'
    ]);
    assert.ok(draft.sections.makeup['zh-TW'].trim());
    assert.ok(draft.sections.hair['zh-TW'].trim());
    assert.ok(draft.sections.accessoryFashion['zh-TW'].trim());

Add a mutation test: delete TYPE_CONTENT['A-1'].recommendations.makeup.male['zh-CN']; assert assertCompleteContent throws a message containing Missing zh-CN; restore it in finally.

- [ ] **Step 2: Verify the test is red**

Run: node --test tests/explanation-content.test.js

Expected: FAIL because the helpers and five-key view model do not exist.

- [ ] **Step 3: Add PPT-derived data**

Use the existing localized(ko, ja, zhCN, zhTW) helper. Intro page 1 title and body use these exact translations:

    localized('미유 무드 진단이란?', 'MIYUムード診断とは？', '什么是MIYU氛围诊断？', '什麼是MIYU氛圍診斷？')
    localized('사람마다 얼굴형, 이목구비, 분위기, 전체 인상이 달라 잘 어울리는 스타일도 달라요.',
      '顔型、パーツ、雰囲気、全体の印象が違うため、似合うスタイルも人それぞれです。',
      '每个人的脸型、五官、氛围和整体印象不同，适合的风格也不同。',
      '每個人的臉型、五官、氛圍和整體印象不同，適合的風格也不同。')
    localized('미유는 예쁘다·잘생겼다를 판단하지 않고, 나만의 분위기를 더 매력적으로 표현하는 스타일을 찾습니다.',
      'MIYUは「きれい・かっこいい」を判定するのではなく、自分らしい雰囲気をより魅力的に見せるスタイルを探します。',
      'MIYU不评判好看与否，而是寻找能更有魅力地表达个人氛围的风格。',
      'MIYU不評判好看與否，而是尋找能更有魅力地表達個人氛圍的風格。')

Page 2 title is 4개의 무드 그룹 / 4つのムードグループ / 4个氛围组 / 4個氛圍組. Its labels come from GROUP_LABELS[gender], so B never drifts. Page 3 covers preserving original strengths, fewer style-selection failures, consistent image, and makeup/hair/clothes/accessories guidance. Bridge title is 지금부터 진단을 시작하겠습니다 / これから診断を始めます。 / 现在开始进行诊断。 / 現在開始進行診斷。

Transcribe each mapped PPT slide as one concise localized recommendation. Type slide supplies makeup, GROUP_HAIR supplies group-common hair, female style slide supplies accessory/fashion. Male accessory/fashion is customer-facing simple guidance: A light materials/one fresh accent; B soft texture/small simple accessory; C texture/one mood cue; D structured silhouette/clear metal or leather. Never label it a draft.

- [ ] **Step 4: Validate and expose the exact model**

    function getIntroPage(pageNumber, gender, language) {
      const page = data.INTRO_PAGES.find(item => item.id === Number(pageNumber));
      if (!page || !LOCALIZED_LANGUAGES.includes(language)) return null;
      return { ...page, groups: page.id === 2 ? data.GROUP_LABELS[normalizedGender(gender)] : null };
    }
    function getBridgeCopy(language) {
      return LOCALIZED_LANGUAGES.includes(language) ? data.BRIDGE_COPY : null;
    }

assertCompleteContent must visit every localization in intro, bridge, 4×2 GROUP_HAIR, and 12×2 makeup/accessoryFashion. Add localized labels facialFeatures, mood, accessoryFashion. getExplanation returns:

    sections: {
      facialFeatures: { label, items: representativeSummary, details },
      mood: { label, overview, definition, keywords },
      makeup: recommendations.makeup[safeGender],
      hair: GROUP_HAIR[group][safeGender],
      accessoryFashion: recommendations.accessoryFashion[safeGender]
    }

- [ ] **Step 5: Verify green**

Run: node --test tests/explanation-content.test.js tests/diagnosis-core.test.js

Expected: PASS.

- [ ] **Step 6: Commit**

    git add src/explanation-data.js src/explanation-content.js tests/explanation-content.test.js
    git commit -m "[code] 미유 상담 콘텐츠 데이터를 추가"

### Task 2: Add profile → intro 1/2/3 → bridge → diagnosis routes

**Files:**
- Modify: src/diagnosis-ui.js
- Modify: src/diagnosis.css
- Test: tests/diagnosis-ui.test.js
- Test: tests/diagnosis-layout.test.js

**Interfaces:**
- Uses Task 1 helpers.
- Exports renderIntroView(state, pageNumber), renderBridgeView(state).
- Controller adds previousIntro(pageNumber), nextIntro(pageNumber), previousBridge(), beginDiagnosis().
- Routes are #/diagnosis/intro/1, /2, /3, #/diagnosis/bridge, then #/diagnosis/question/1.

- [ ] **Step 1: Write failing route/markup tests**

    const controller = ui.createController(fakeAdapters);
    assert.deepEqual(controller.start(validProfile()), { error: null, field: null });
    assert.equal(location.hash, '#/diagnosis/intro/1');
    assert.equal(controller.resolveRoute('#/diagnosis/intro/3').kind, 'intro');
    assert.equal(controller.resolveRoute('#/diagnosis/bridge').kind, 'bridge');
    controller.beginDiagnosis();
    assert.equal(location.hash, '#/diagnosis/question/1');

    assert.match(ui.renderIntroView(femaleJapaneseState, 2), /Feminine · フェミニン/);
    assert.match(ui.renderIntroView(maleTraditionalChineseState, 2), /Boyish · 清秀少年感/);

Also test no-profile access to intro/bridge/question/result resets hash to #/, previousIntro(1) goes #/, and previousBridge goes intro 3.

- [ ] **Step 2: Verify red**

Run: node --test tests/diagnosis-ui.test.js tests/diagnosis-layout.test.js

Expected: FAIL because routes and renderers do not exist.

- [ ] **Step 3: Implement controller routes**

Valid start saves profile then always sets #/diagnosis/intro/1, even when answers exist.

    function previousIntro(pageNumber) {
      location.hash = pageNumber <= 1 ? '#/' : '#/diagnosis/intro/' + (pageNumber - 1);
    }
    function nextIntro(pageNumber) {
      location.hash = pageNumber >= 3 ? '#/diagnosis/bridge' : '#/diagnosis/intro/' + (pageNumber + 1);
    }
    function previousBridge() { location.hash = '#/diagnosis/intro/3'; }
    function beginDiagnosis() { location.hash = '#/diagnosis/question/1'; }

Match intro before question in resolveRoute and return kinds intro and bridge. Render both kinds in mount and renderRoute. Keep question completion guards unchanged.

- [ ] **Step 4: Implement bilingual markup/CSS**

Every customer sentence uses renderLocalizedBlock. Bridge control says 진단 시작 only. Diagnostic questions remain Korean.

    <section class="miyu-intro-step" data-intro-page="2">
      ... Korean plus selected-language copy ...
      <div class="miyu-intro-groups">... four bilingual group cards ...</div>
      ... Korean previous/next controls ...
    </section>

CSS: one portrait column, 44px minimum touch targets, groups one column below 600px/two columns from 600px. At 1194×834 no horizontal overflow.

- [ ] **Step 5: Verify green**

Run: node --test tests/diagnosis-ui.test.js tests/diagnosis-layout.test.js

Expected: PASS.

- [ ] **Step 6: Commit**

    git add src/diagnosis-ui.js src/diagnosis.css tests/diagnosis-ui.test.js tests/diagnosis-layout.test.js
    git commit -m "[code] 미유 소개와 진단 브릿지 흐름을 추가"

### Task 3: Render the five ordered bilingual explanation sections

**Files:**
- Modify: src/diagnosis-ui.js
- Modify: src/diagnosis.css
- Test: tests/diagnosis-ui.test.js
- Test: tests/diagnosis-layout.test.js
- Test: tests/pages-entry.test.mjs

**Interfaces:**
- Uses Task 1 sections.
- Produces exactly ordered CSS classes miyu-facial-features, miyu-mood, miyu-makeup, miyu-hair, miyu-accessory-fashion.

- [ ] **Step 1: Write failing rendering tests**

    const html = ui.renderExplanationPanel(content.getExplanation('B-2', 'female', 'ja'), japaneseProfile);
    const classes = ['miyu-facial-features', 'miyu-mood', 'miyu-makeup', 'miyu-hair', 'miyu-accessory-fashion'];
    assert.deepEqual(classes.map(name => html.indexOf(name)),
      classes.map(name => html.indexOf(name)).slice().sort((a, b) => a - b));
    assert.match(html, /メイク/);
    assert.doesNotMatch(html, /해설 초안|miyu-draft-badge|검토 메모|초안/);
    assert.doesNotMatch(html, /data-action="open-image"|miyu-image-modal/);

Add male zh-TW tests for five headings and browser assertions that all body blocks contain Korean plus lang="zh-Hant".

- [ ] **Step 2: Verify red**

Run: node --test tests/diagnosis-ui.test.js tests/diagnosis-layout.test.js tests/pages-entry.test.mjs

Expected: FAIL because old styling markup and draft badge remain.

- [ ] **Step 3: Replace renderer**

Keep metadata and visual but remove draft badge. Render after visual:

    <section class="miyu-explanation-section miyu-facial-features">summary + ten detail rows</section>
    <section class="miyu-explanation-section miyu-mood">overview + definition + keywords</section>
    <section class="miyu-explanation-section miyu-makeup">type-specific makeup/grooming</section>
    <section class="miyu-explanation-section miyu-hair">group-common hair</section>
    <section class="miyu-explanation-section miyu-accessory-fashion">type-specific accessory/fashion</section>

All copy calls renderLocalizedBlock. Female celebrity labels remain official English; male celebrity blocks stay hidden.

- [ ] **Step 4: Make paired-language layout tablet-readable**

Portrait stacks languages after visual. At min-width 960px, use two language columns only if each is >=300px. Keep object-fit contain and prevent body overflow.

- [ ] **Step 5: Verify green**

Run: node --test tests/diagnosis-ui.test.js tests/diagnosis-layout.test.js tests/pages-entry.test.mjs
Expected: PASS.

Run: node scripts/build-v17.mjs && node --test tests/pages-entry.test.mjs
Expected: PASS with no review/draft/modal output.

- [ ] **Step 6: Commit**

    git add src/diagnosis-ui.js src/diagnosis.css tests/diagnosis-ui.test.js tests/diagnosis-layout.test.js tests/pages-entry.test.mjs
    git commit -m "[code] 미유 해설을 다섯 단계로 재구성"

### Task 4: Fix dynamic English celebrity names and male legacy navigation

**Files:**
- Modify: src/celebrity-names.js
- Modify: src/diagnosis-ui.js
- Modify: scripts/build-v17.mjs
- Test: tests/build-v17.test.mjs
- Test: tests/diagnosis-legacy.test.js
- Test: tests/pages-entry.test.mjs

**Interfaces:**
- Export replaceDynamicCelebrityNames(html) and make replaceCelebrityNames call it before static conversion.
- Export isMaleLegacyRoute(hash, profile), redirectMaleLegacyRoute(hash, profile, location), getMountedProfile().

- [ ] **Step 1: Write failing regressions**

    const transformed = celebrityNames.replaceDynamicCelebrityNames(sourceHtml);
    assert.equal((transformed.match(/name:\s*'[^']*[가-힣][^']*'/g) || []).length, 0);
    assert.match(transformed, /name:\s*'TWICE · Momo'/);

    assert.equal(ui.isMaleLegacyRoute('#/macro/B', maleProfile), true);
    assert.equal(ui.isMaleLegacyRoute('#/moodbook/A', maleProfile), true);
    assert.equal(ui.isMaleLegacyRoute('#/cat/18', maleProfile), false);
    assert.equal(ui.isMaleLegacyRoute('#/macro/B', femaleProfile), false);

Browser tests: female macro has loaded representative image and English .person-name; male macro/moodbook ends at #/diagnosis/result with no visible Feminine · 페미닌.

- [ ] **Step 2: Verify red**

Run: node --test tests/build-v17.test.mjs tests/diagnosis-legacy.test.js tests/pages-entry.test.mjs

Expected: FAIL because CAT_PERSONS has Korean names and no guard exists.

- [ ] **Step 3: Implement narrow CAT_PERSONS conversion**

    function replaceDynamicCelebrityNames(html) {
      return String(html).replace(/(const CAT_PERSONS\s*=\s*\{[\s\S]*?\};)/, block =>
        block.replace(/(name:\s*')([^']+)(')/g, (_, prefix, label, suffix) => {
          const english = getEnglishLabel(label);
          if (!english) throw new Error('Missing celebrity English label: ' + label);
          return prefix + english + suffix;
        })
      );
    }

Require exactly 97 replacements and do not translate Korean text outside CAT_PERSONS. Then apply static-card replacement.

- [ ] **Step 4: Implement pre-render male redirect**

    function isMaleLegacyRoute(hash, profile) {
      return profile && profile.gender === 'male'
        && /^#\/(index|macro(?:\/|$)|moodbook(?:\/|$))/.test(hash);
    }
    function redirectMaleLegacyRoute(hash, profile, location) {
      if (!isMaleLegacyRoute(hash, profile)) return false;
      location.hash = '#/diagnosis/result';
      return true;
    }

Injected legacy router calls redirect before showing topNav or executing legacy screen. Cat routes stay available for new male explanation; female behavior does not change.

- [ ] **Step 5: Verify green**

Run: node --test tests/build-v17.test.mjs tests/diagnosis-legacy.test.js tests/pages-entry.test.mjs

Expected: PASS.

- [ ] **Step 6: Commit**

    git add src/celebrity-names.js src/diagnosis-ui.js scripts/build-v17.mjs tests/build-v17.test.mjs tests/diagnosis-legacy.test.js tests/pages-entry.test.mjs
    git commit -m "[code] 미유 인물명과 남성 레거시 경로를 보완"

### Task 5: Generate reproducible JPEG assets and enforce standalone limits

**Files:**
- Create: scripts/optimize-standalone-assets.mjs
- Create: assets/diagnosis/standalone/manifest.json
- Create: assets/diagnosis/standalone/questions/female/*.jpg (34)
- Create: assets/diagnosis/standalone/questions/male/*.jpg (34)
- Create: assets/diagnosis/standalone/types/*.jpg (12)
- Modify: scripts/build-v17.mjs
- Test: tests/build-v17.test.mjs
- Test: tests/male-image-assets.test.mjs

**Interfaces:**
- Manifest has version:1 and 80 logical entries of file, mime:image/jpeg, width, height.
- Builder exports MAX_DIST_BYTES equal to 95 * 1024 * 1024 and dataUri(filePath, mime).

- [ ] **Step 1: Write failing asset/build tests**

    assert.equal(build.MAX_DIST_BYTES, 95 * 1024 * 1024);
    assert.equal(Object.keys(manifest.assets).length, 80);
    assert.ok(Object.values(manifest.assets).every(item => item.mime === 'image/jpeg'));
    assert.equal((html.match(/data:image\/jpeg;base64/g) || []).length, 80);
    assert.match(html, /data:image\/png;base64/);
    assert.ok(Buffer.byteLength(html, 'utf8') <= build.MAX_DIST_BYTES);
    assert.doesNotMatch(html, /https?:\/\/|file:\/\//);

Mutation: set max to 1 in a temporary builder copy, expect Generated standalone exceeds 95 MiB limit, verify requested output file is absent.

- [ ] **Step 2: Verify red**

Run: node --test tests/build-v17.test.mjs tests/male-image-assets.test.mjs

Expected: FAIL because JPEG manifest and cap do not exist.

- [ ] **Step 3: Implement converter without overwriting source**

For 80 existing image keys retain pixel size and write JPEG:

    await sharp(sourcePath)
      .rotate()
      .jpeg({ quality: 82, chromaSubsampling: '4:4:4', mozjpeg: true })
      .toFile(destinationPath);

Stable manifest uses POSIX relative paths and measured dimensions. Script rejects any count other than female 34, male 34, type 12 and writes only assets/diagnosis/standalone.

- [ ] **Step 4: Make builder MIME/size aware**

    export const MAX_DIST_BYTES = 95 * 1024 * 1024;
    export function dataUri(filePath, mime) {
      return 'data:' + mime + ';base64,' + fs.readFileSync(filePath).toString('base64');
    }

Read manifest, require all 80 keys and JPEG MIME, use image/png only for logo. Assemble in memory, then check UTF-8 length after forbidden-content checks and before mkdir/write.

- [ ] **Step 5: Generate and verify**

Run: node scripts/optimize-standalone-assets.mjs
Expected: 80 optimized assets plus manifest.

Run: node --test tests/build-v17.test.mjs tests/male-image-assets.test.mjs
Expected: PASS, generated standalone <=95 MiB.

- [ ] **Step 6: Commit**

    git add scripts/optimize-standalone-assets.mjs assets/diagnosis/standalone scripts/build-v17.mjs tests/build-v17.test.mjs tests/male-image-assets.test.mjs
    git commit -m "[code] 미유 단일파일 이미지를 최적화"

### Task 6: Rebuild, automate and record the real-iPad release gate

**Files:**
- Modify: dist/미유_무드진단_12type_v17.html
- Create: docs/miyu-ipad-release-checklist.md
- Test: tests/pages-entry.test.mjs
- Test: tests/diagnosis-layout.test.js

**Interfaces:**
- Consumes Tasks 1–5.
- Produces rebuilt v17 and manual device checklist, never a false physical-iPad pass.

- [ ] **Step 1: Add browser flow/image tests**

Add two flows:
female Japanese and male Traditional Chinese, each profile → intro1 → intro2 → intro3 → bridge → Q1 → all questions → result → C-3 explanation.

Each question image asserts complete, naturalWidth > 0, objectFit contain, image bounds inside card. At 834×1194 and 1194×834 assert scrollWidth <= viewportWidth. Male asserts Boyish, five bilingual sections, no celebrity block/women-only header.

- [ ] **Step 2: Run focused coverage**

Run: node --test tests/pages-entry.test.mjs tests/diagnosis-layout.test.js
Expected: PASS after Tasks 1–5.

- [ ] **Step 3: Build and create manual checklist**

Run: node scripts/build-v17.mjs

Create docs/miyu-ipad-release-checklist.md with unchecked physical tests: complete portrait flow; female Japanese five sections/uncropped image; male Traditional Chinese/no celebrity; rotate landscape; print/share; airplane-mode image/logo load after opening. No desktop test can check these boxes.

- [ ] **Step 4: Run all automation**

Run: node --test tests/*.test.js tests/*.test.mjs
Expected: all Node tests PASS.

Run: python3 -m unittest tests/test_pdf_assets.py
Expected: 3 tests PASS.

Run twice: node scripts/build-v17.mjs && shasum -a 256 dist/미유_무드진단_12type_v17.html
Expected: identical hashes, output <=95 MiB.

- [ ] **Step 5: Browser visual QA**

Use Browser control against a temporary local HTTP server, never file URL. At 834×1194 capture intro 1–3, bridge, Q1, result, explanation for female Japanese and male Traditional Chinese; repeat result/explanation at 1194×834. Console and failed network requests must both be zero; trigger print. This validates desktop browser only.

- [ ] **Step 6: Commit**

    git add dist/미유_무드진단_12type_v17.html docs/miyu-ipad-release-checklist.md tests/pages-entry.test.mjs tests/diagnosis-layout.test.js
    git commit -m "[code] 미유 상담 흐름 단일파일을 검증"

### Task 7: Create a clean local deployment branch

**Files:**
- No product code changes; create a clean worktree/branch from final tree.

**Interfaces:**
- Consumes final feature-tree diff from main.
- Produces local codex/miyu-v17-deployable based directly on main with no blob >=100 MiB.

- [ ] **Step 1: Confirm clean feature branch**

Run:

    git status --short --branch
    git diff --exit-code
    git rev-parse main
    git rev-parse codex/miyu-full-bilingual-male

Expected: clean branch and printed commit IDs.

- [ ] **Step 2: Create deployment worktree**

Run:

    git worktree add /private/tmp/miyu-v17-deployable -b codex/miyu-v17-deployable main
    git diff --binary main..codex/miyu-full-bilingual-male | git -C /private/tmp/miyu-v17-deployable apply --index

Expected: one staged final tree; no intermediate history copied.

- [ ] **Step 3: Test clean tree**

In /private/tmp/miyu-v17-deployable run:

    node --test tests/*.test.js tests/*.test.mjs
    python3 -m unittest tests/test_pdf_assets.py
    node scripts/build-v17.mjs

Expected: all PASS.

- [ ] **Step 4: Commit clean tree**

    git -C /private/tmp/miyu-v17-deployable commit -m "[code] 배포용 미유 무드진단 단일파일"

Expected: one commit above main; original feature branch stays untouched.

- [ ] **Step 5: Prove GitHub size safety without push**

    git -C /private/tmp/miyu-v17-deployable rev-list --objects main..HEAD |
      git -C /private/tmp/miyu-v17-deployable cat-file --batch-check='%(objecttype) %(objectsize) %(objectname) %(rest)' |
      awk '$1 == "blob" && $2 >= 104857600 { print; exit 1 }'

Expected: no output, exit 0, then clean status. Do not push or deploy because physical iPad checklist needs human completion and publication needs separate user approval.

---

## Plan Self-Review

### Spec coverage

Profile-first, three PPT intro pages, bilingual bridge and Korean-only diagnosis are Task 2. The five ordered explanation sections, type makeup, group hair, female PPT fashion and concise male equivalent are Tasks 1 and 3. Dynamic English names and male legacy safety are Task 4. Under-limit asset build and clean Git history are Tasks 5 and 7. Tablet QA plus the honest real-iPad gate are Task 6.

### Placeholder scan

No customer-facing text is incomplete: every mapped PPT slide is required in all language/gender fields and validation blocks omissions. The physical iPad checklist is deliberately manual because browser automation cannot claim a real device result.

### Interface consistency

Task 1 exports the helpers/section keys used by Tasks 2–3. Task 4 exports guard functions consumed by injected legacy routing. Task 5 exports size/MIME utilities used by its builder tests. Task 6 produces the artifact Task 7 copies into a clean history.

