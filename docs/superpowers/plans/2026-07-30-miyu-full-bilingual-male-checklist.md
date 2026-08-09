# 미유 전체 해설 번역·남성 체크리스트 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 최종 해설의 모든 고객용 내용을 한국어와 선택 언어로 제공하고, 성별별 체크리스트 이미지와 공식 영문 연예인명을 포함한 단일 v17 HTML을 만든다.

**Architecture:** 기존 v16은 보관용 원본으로 유지한다. 전체 해설은 새 중앙 데이터 모듈에서 관리하고, v17 화면은 이 데이터를 이용해 한국어와 선택 언어를 함께 그린다. 여성 체크리스트 이미지는 현재 PDF 자산을 유지하고 남성 이미지는 별도 자산 세트로 연결하며, 빌드 단계에서 번역·이미지·연예인명·금지 문자열을 모두 검사한다.

**Tech Stack:** UMD JavaScript, Node.js ESM 빌드 스크립트, `node:test`, Playwright/Chrome, Sharp, HTML/CSS, ImageGen

## Global Constraints

- 보관용 `source/미유_무드분류_12type_v16.html`은 수정하지 않는다.
- 지원 언어는 정확히 `ja`, `zh-CN`, `zh-TW` 세 가지다.
- 한국어를 항상 표시하고 선택 언어를 같은 의미 단위 안에 함께 표시한다.
- 진단 문항·진행표·점수표·타입 선택 화면·메뉴·출력 버튼은 한국어를 유지한다.
- 성별은 체크리스트 이미지와 스타일 해설만 바꾸며 ABCD 점수와 타입 매핑은 바꾸지 않는다.
- 여성 B그룹은 `Feminine · 페미닌`, 남성 B그룹은 `Boyish · 보이시`다.
- `검토 메모`, 체크리스트 확대 버튼, 체크리스트 확대창은 생성되는 v17에 남기지 않는다.
- 여성 연예인명은 공식 영문 표기만 사용하고 남성 해설에는 연예인 영역을 표시하지 않는다.
- 태블릿 세로 834×1194를 1순위로 하고 가로 1194×834도 지원한다.
- 결과물은 외부 이미지 경로가 없는 단일 HTML이어야 한다.
- 사용자 별도 승인 전에는 GitHub Pages에 배포하지 않는다.
- 고객 데이터는 `sessionStorage`만 사용하고 서버나 영구 저장소에 보내지 않는다.
- 코드 변경은 실패하는 검사를 먼저 작성한 뒤 최소 구현으로 통과시킨다.
- 각 작업 커밋 메시지에는 `[code]`를 붙인다.

## File Responsibility Map

- `src/explanation-data.js`: 12타입의 한국어·일본어·중국어 간체·중국어 번체 해설 원문
- `src/explanation-content.js`: 해설 조회·성별 조합·완전성 검사 API
- `src/celebrity-names.js`: 기존 한글 연예인 라벨을 공식 영문 표기로 바꾸는 단일 매핑
- `src/diagnosis-core.js`: 문항, 답변 코드, 성별별 이미지 경로, 점수 계산
- `src/diagnosis-ui.js`: 체크리스트·결과·전체 이중언어 해설 렌더링
- `src/diagnosis.css`: 태블릿·출력 레이아웃과 비대화형 체크리스트 이미지
- `scripts/build-v17.mjs`: v16 보존, 금지 콘텐츠 제거, 자산 내장, 빌드 차단 검사
- `scripts/split-male-image-sheets.mjs`: AI 비교 시트를 남성 문항 이미지 34개로 분리
- `assets/diagnosis/questions/`: 현재 PDF 기반 여성 문항 이미지 34개
- `assets/diagnosis/questions/male/`: 신규 AI 남성 문항 이미지 34개
- `assets/diagnosis/male-image-manifest.json`: 시트 패널과 출력 이미지의 결정적 매핑
- `docs/miyu-celebrity-english-sources.md`: 공식 영문명 확인 근거
- `tests/*.js`, `tests/*.mjs`, `tests/test_pdf_assets.py`: 데이터·화면·빌드·자산 회귀검사

---

### Task 1: 전체 해설 중앙 데이터와 완전성 검사

**Files:**
- Create: `src/explanation-data.js`
- Modify: `src/explanation-content.js`
- Modify: `tests/explanation-content.test.js`
- Modify: `scripts/build-v17.mjs`
- Modify: `tests/build-v17.test.mjs`

**Interfaces:**
- Produces: `MiyuExplanationData.TYPE_CONTENT`
- Produces: `MiyuExplanationData.SECTION_LABELS`
- Produces: `MiyuExplanationData.GROUP_LABELS`
- Produces: `MiyuExplanationContent.getExplanation(typeCode, gender, language)`
- Produces: `MiyuExplanationContent.assertCompleteContent()`
- `getExplanation()` returns `{ typeCode, typeName, group, groupName, gender, language, sections, people, draft }`
- Every localized value has `{ ko, ja, 'zh-CN', 'zh-TW' }`

- [ ] **Step 1: Write the failing completeness tests**

Add tests that walk every localized value instead of checking only the current short summary.

```js
const LANGUAGES = ['ko', 'ja', 'zh-CN', 'zh-TW'];

test('12타입의 모든 고객용 해설 단위에 네 언어가 있다', () => {
  for (const localized of content.collectLocalizedValues(content.SECTION_LABELS)) {
    for (const language of LANGUAGES) {
      assert.ok(String(localized[language] || '').trim(), `section label missing ${language}`);
    }
  }
  for (const typeCode of TYPE_CODES) {
    const type = content.getRawTypeContent(typeCode);
    assert.ok(type);
    for (const localized of content.collectLocalizedValues(type)) {
      for (const language of LANGUAGES) {
        assert.ok(
          String(localized[language] || '').trim(),
          `${typeCode} missing ${language}`
        );
      }
    }
  }
  assert.equal(content.assertCompleteContent(), true);
});

test('최종 해설은 요약·정의·키워드·상세 특징을 모두 반환한다', () => {
  const result = content.getExplanation('C-3', 'male', 'ja');
  assert.ok(result.sections.overview.ko);
  assert.ok(result.localizedTypeName.ja);
  assert.ok(result.localizedGroupName.ja);
  assert.ok(result.sections.representativeSummary.items.length >= 1);
  assert.ok(result.sections.definition.ko);
  assert.ok(result.sections.moodKeywords.ko);
  assert.equal(result.sections.details.length, 10);
  assert.ok(result.sections.details.every(row => row.label.ja && row.text.ja));
  assert.deepEqual(Object.keys(result.sections.styling), [
    'hair', 'grooming', 'fashion', 'avoid'
  ]);
});
```

- [ ] **Step 2: Run the focused tests and verify RED**

Run:

```bash
NODE_PATH=/Users/oeuvre/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules \
/Users/oeuvre/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node \
--test tests/explanation-content.test.js tests/build-v17.test.mjs
```

Expected: FAIL because `getRawTypeContent`, `collectLocalizedValues`, `assertCompleteContent`, and the full `sections` data do not exist.

- [ ] **Step 3: Create the central data schema**

Create `src/explanation-data.js` as a UMD module. Use this exact shape for every type.

```js
const SECTION_LABELS = {
  representativeSummary: {
    ko: '대표적인 특징 요약',
    ja: '主な特徴のまとめ',
    'zh-CN': '代表性特征摘要',
    'zh-TW': '代表性特徵摘要'
  },
  definition: {
    ko: '정의',
    ja: '定義',
    'zh-CN': '定义',
    'zh-TW': '定義'
  },
  moodKeywords: {
    ko: '무드 키워드',
    ja: 'ムードキーワード',
    'zh-CN': '氛围关键词',
    'zh-TW': '氛圍關鍵字'
  },
  details: {
    ko: '상세 특징',
    ja: '詳細な特徴',
    'zh-CN': '详细特征',
    'zh-TW': '詳細特徵'
  },
  hair: {
    ko: '헤어',
    ja: 'ヘア',
    'zh-CN': '发型',
    'zh-TW': '髮型'
  },
  makeup: {
    ko: '메이크업',
    ja: 'メイク',
    'zh-CN': '妆容',
    'zh-TW': '妝容'
  },
  grooming: {
    ko: '그루밍',
    ja: 'グルーミング',
    'zh-CN': '仪容整理',
    'zh-TW': '儀容整理'
  },
  fashion: {
    ko: '패션',
    ja: 'ファッション',
    'zh-CN': '穿搭',
    'zh-TW': '穿搭'
  },
  avoid: {
    ko: '피하면 좋은 방향',
    ja: '避けたい方向',
    'zh-CN': '建议避免',
    'zh-TW': '建議避免'
  },
  exampleCelebrities: {
    ko: '예시 연예인',
    ja: '参考セレブリティ',
    'zh-CN': '参考艺人',
    'zh-TW': '參考藝人'
  },
  averageFace: {
    ko: '평균 얼굴',
    ja: '平均的な顔',
    'zh-CN': '平均脸',
    'zh-TW': '平均臉'
  }
};

const GROUP_LABELS = {
  female: {
    A: { ko: 'Blossom · 블로썸', ja: 'Blossom · ブロッサム', 'zh-CN': 'Blossom · 绽放', 'zh-TW': 'Blossom · 綻放' },
    B: { ko: 'Feminine · 페미닌', ja: 'Feminine · フェミニン', 'zh-CN': 'Feminine · 柔美', 'zh-TW': 'Feminine · 柔美' },
    C: { ko: 'Mood · 무드', ja: 'Mood · ムード', 'zh-CN': 'Mood · 氛围', 'zh-TW': 'Mood · 氛圍' },
    D: { ko: 'Modern · 모던', ja: 'Modern · モダン', 'zh-CN': 'Modern · 摩登', 'zh-TW': 'Modern · 摩登' }
  },
  male: {
    A: { ko: 'Blossom · 블로썸', ja: 'Blossom · ブロッサム', 'zh-CN': 'Blossom · 绽放', 'zh-TW': 'Blossom · 綻放' },
    B: { ko: 'Boyish · 보이시', ja: 'Boyish · ボーイッシュ', 'zh-CN': 'Boyish · 清秀少年感', 'zh-TW': 'Boyish · 清秀少年感' },
    C: { ko: 'Mood · 무드', ja: 'Mood · ムード', 'zh-CN': 'Mood · 氛围', 'zh-TW': 'Mood · 氛圍' },
    D: { ko: 'Modern · 모던', ja: 'Modern · モダン', 'zh-CN': 'Modern · 摩登', 'zh-TW': 'Modern · 摩登' }
  }
};

const TYPE_CONTENT = {
  'A-1': {
    legacyCatId: '01',
    group: 'A',
    name: '판타지',
    localizedName: {
      ko: '판타지',
      ja: 'ファンタジー',
      'zh-CN': '幻想',
      'zh-TW': '幻想'
    },
    common: {
      representativeSummary: [
        {
          ko: '뾰족한 역삼각형',
          ja: '先の尖った逆三角形',
          'zh-CN': '尖锐的倒三角形脸',
          'zh-TW': '尖銳的倒三角形臉'
        }
      ],
      definition: {
        ko: '뾰족한 역삼각형 + 눈머리는 아래, 눈꼬리는 위로 끝이 뾰족한 눈 + 낮고 둥근 코 + 작은 입의 무드',
        ja: '先の尖った逆三角形の輪郭＋目頭が下がり、目尻が上がった先の尖った目＋低く丸い鼻＋小さな口がつくるムード',
        'zh-CN': '尖锐倒三角形轮廓＋内眼角向下、外眼角上扬的尖锐眼型＋低而圆的鼻子＋小巧嘴型所形成的氛围',
        'zh-TW': '尖銳倒三角形輪廓＋內眼角向下、外眼角上揚的尖銳眼型＋低而圓的鼻子＋小巧嘴型所形成的氛圍'
      },
      moodKeywords: {
        ko: '#신비 #요정 #엘프',
        ja: '#神秘的 #妖精 #エルフ',
        'zh-CN': '#神秘 #精灵感 #精灵',
        'zh-TW': '#神秘 #精靈感 #精靈'
      },
      details: [
        {
          key: 'faceShape',
          label: { ko: '얼굴형', ja: '顔型', 'zh-CN': '脸型', 'zh-TW': '臉型' },
          text: {
            ko: '이마 가로폭이 가장 넓고 광대에서 턱으로 내려갈수록 좁아지는 뾰족한 역삼각형이에요.',
            ja: '額の横幅が最も広く、頬骨から顎にかけて細くなる、先の尖った逆三角形です。',
            'zh-CN': '额头横向最宽，从颧骨向下至下巴逐渐收窄，呈尖锐的倒三角形。',
            'zh-TW': '額頭橫向最寬，從顴骨往下至下巴逐漸收窄，呈尖銳的倒三角形。'
          }
        }
      ]
    },
    gender: {
      female: {
        overview: {
          ko: '신비롭고 섬세한 인상이 돋보여요. 맑은 피부 표현과 가벼운 헤어로 분위기를 살려요.',
          ja: '神秘的で繊細な印象が際立ちます。透明感のある肌と軽やかなヘアで雰囲気を生かします。',
          'zh-CN': '神秘而细腻的印象很突出。通透的肤感和轻盈的发型能更好地展现这种氛围。',
          'zh-TW': '神秘而細膩的印象很突出。通透的膚感和輕盈的髮型能更好地展現這種氛圍。'
        },
        hair: {
          ko: '가벼운 레이어와 얼굴선을 따라 흐르는 잔머리로 섬세한 인상을 살려요.',
          ja: '軽いレイヤーと顔まわりに沿う後れ毛で、繊細な印象を生かします。',
          'zh-CN': '用轻盈层次和贴合脸部线条的碎发，突出细腻感。',
          'zh-TW': '用輕盈層次和貼合臉部線條的碎髮，凸顯細膩感。'
        },
        makeup: {
          ko: '맑은 피부 표현에 눈매 끝을 가볍게 올리고 작은 포인트를 더해요.',
          ja: '透明感のある肌に、目尻を軽く上げて小さなポイントを加えます。',
          'zh-CN': '保持通透肤感，轻轻上提眼尾，再加入小巧重点。',
          'zh-TW': '保持通透膚感，輕輕上提眼尾，再加入小巧重點。'
        },
        fashion: {
          ko: '얇고 흐르는 소재에 한 가지 독특한 디테일을 더해요.',
          ja: '薄く流れる素材に、個性的なディテールを一つ加えます。',
          'zh-CN': '在轻薄垂顺的材质上加入一个独特细节。',
          'zh-TW': '在輕薄垂順的材質上加入一個獨特細節。'
        },
        avoid: {
          ko: '무겁고 넓은 실루엣이나 탁한 색을 한꺼번에 사용하지 않아요.',
          ja: '重く広いシルエットや、くすんだ色を一度に重ねるのは避けます。',
          'zh-CN': '避免同时使用厚重宽大的轮廓和过多浑浊色。',
          'zh-TW': '避免同時使用厚重寬大的輪廓和過多混濁色。'
        }
      },
      male: {
        overview: {
          ko: '신비롭고 감각적인 인상이에요. 가벼운 헤어와 간결한 스타일에 독특한 포인트가 잘 맞아요.',
          ja: '神秘的で感覚的な印象です。軽やかなヘアと簡潔なスタイルに、個性的なポイントが似合います。',
          'zh-CN': '整体给人神秘而有感知力的印象。轻盈的发型、简洁的穿搭和独特点缀很适合。',
          'zh-TW': '整體給人神秘而有感知力的印象。輕盈的髮型、簡潔的穿搭和獨特點綴很適合。'
        },
        hair: {
          ko: '이마를 일부 드러내는 가벼운 레이어와 자연스러운 결을 살려요.',
          ja: '額を一部見せる軽いレイヤーと、自然な毛流れを生かします。',
          'zh-CN': '用露出部分额头的轻盈层次和自然发流突出优势。',
          'zh-TW': '用露出部分額頭的輕盈層次和自然髮流凸顯優勢。'
        },
        grooming: {
          ko: '피부는 얇고 깨끗하게 정돈하고 눈썹 끝선을 가볍게 살려요.',
          ja: '肌は薄く清潔に整え、眉尻のラインを軽く生かします。',
          'zh-CN': '肤感保持轻薄整洁，轻轻强调眉尾线条。',
          'zh-TW': '膚感保持輕薄整潔，輕輕強調眉尾線條。'
        },
        fashion: {
          ko: '간결한 실루엣에 소재나 액세서리 한 가지로 독특한 포인트를 더해요.',
          ja: '簡潔なシルエットに、素材やアクセサリーを一つだけ効かせます。',
          'zh-CN': '在简洁轮廓中，用一种材质或一件配饰加入独特点缀。',
          'zh-TW': '在簡潔輪廓中，用一種材質或一件配飾加入獨特點綴。'
        },
        avoid: {
          ko: '두껍고 무거운 헤어나 과도하게 넓은 실루엣은 피하는 편이 좋아요.',
          ja: '厚く重いヘアや、過度に広いシルエットは避けるのがおすすめです。',
          'zh-CN': '建议避开厚重发型和过度宽大的轮廓。',
          'zh-TW': '建議避開厚重髮型和過度寬大的輪廓。'
        }
      }
    }
  }
};
```

Populate all 12 types from the existing Korean legacy sections. Preserve the 10 detail keys in this order:

```js
[
  'faceShape', 'headShape', 'hairline', 'forehead', 'eyebrows',
  'eyes', 'nose', 'lips', 'ears', 'jaw'
]
```

For each Korean value, write Japanese, Simplified Chinese, and Traditional Chinese drafts. Translate anatomical descriptions directly; do not add styling claims to factual facial-feature rows. Preserve `—` as `—`. Use customer-facing `~해요` tone for Korean style explanations and natural polite language in translations.

Every female type must contain `overview`, `hair`, `makeup`, `fashion`, and `avoid`. Every male type must contain `overview`, `hair`, `grooming`, `fashion`, and `avoid`.

- [ ] **Step 4: Refactor the content API and keep existing callers compatible**

`src/explanation-content.js` must require `./explanation-data.js` in Node and use `root.MiyuExplanationData` in the browser. Implement:

```js
function getRawTypeContent(typeCode) {
  return data.TYPE_CONTENT[typeCode] || null;
}

function collectLocalizedValues(value, output = []) {
  if (!value || typeof value !== 'object') return output;
  const keys = Object.keys(value);
  if (['ko', 'ja', 'zh-CN', 'zh-TW'].every(key => keys.includes(key))) {
    output.push(value);
    return output;
  }
  for (const nested of Object.values(value)) collectLocalizedValues(nested, output);
  return output;
}

function assertCompleteContent() {
  for (const localized of collectLocalizedValues(data.SECTION_LABELS)) {
    for (const language of ['ko', 'ja', 'zh-CN', 'zh-TW']) {
      if (!String(localized[language] || '').trim()) {
        throw new Error(`Missing ${language} section label`);
      }
    }
  }
  for (const localized of collectLocalizedValues(data.GROUP_LABELS)) {
    for (const language of ['ko', 'ja', 'zh-CN', 'zh-TW']) {
      if (!String(localized[language] || '').trim()) {
        throw new Error(`Missing ${language} group label`);
      }
    }
  }
  for (const typeCode of Object.keys(TYPE_DRAFTS)) {
    const type = getRawTypeContent(typeCode);
    if (!type) throw new Error(`Missing explanation type: ${typeCode}`);
    for (const localized of collectLocalizedValues(type)) {
      for (const language of ['ko', 'ja', 'zh-CN', 'zh-TW']) {
        if (!String(localized[language] || '').trim()) {
          throw new Error(`Missing ${language} explanation: ${typeCode}`);
        }
      }
    }
  }
  return true;
}
```

`getExplanation()` must return the new `sections`, `localizedTypeName`, and `localizedGroupName` objects while retaining `typeName`, `groupName`, `Korean.summary`, and `translated.summary` aliases until `diagnosis-ui.js` is migrated in Task 2.
Re-export `SECTION_LABELS`, `GROUP_LABELS`, `getRawTypeContent`, `collectLocalizedValues`, and `assertCompleteContent` from `MiyuExplanationContent`.

- [ ] **Step 5: Make the build reject incomplete content**

Use `createRequire` in `scripts/build-v17.mjs`:

```js
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const explanationApi = require('../src/explanation-content.js');
```

Call `explanationApi.assertCompleteContent()` before reading the v16 source or writing output. Add `src/explanation-data.js` before `src/explanation-content.js` in the embedded script order.

- [ ] **Step 6: Run focused tests and verify GREEN**

Run the Step 2 command.

Expected: all focused tests PASS and incomplete copied test data throws before an output file is written.

- [ ] **Step 7: Commit**

```bash
git add src/explanation-data.js src/explanation-content.js \
  tests/explanation-content.test.js scripts/build-v17.mjs tests/build-v17.test.mjs
git commit -m "[code] 전체 해설 다국어 데이터를 중앙화"
```

---

### Task 2: 전체 이중언어 해설 렌더링과 검토 메모 제거

**Files:**
- Modify: `src/diagnosis-ui.js`
- Modify: `src/diagnosis.css`
- Modify: `scripts/build-v17.mjs`
- Modify: `tests/diagnosis-ui.test.js`
- Modify: `tests/diagnosis-layout.test.js`
- Modify: `tests/build-v17.test.mjs`

**Interfaces:**
- Consumes: `getExplanation(typeCode, gender, language).sections`
- Produces: `renderLocalizedBlock(localized, language, options)`
- Produces: `renderDetailTable(details, language)`
- Produces: `stripLegacyReviewNotes(html)`

- [ ] **Step 1: Write failing rendering and removal tests**

```js
test('해설 패널은 모든 고객용 섹션을 한국어와 선택 언어로 표시한다', () => {
  const draft = content.getExplanation('C-3', 'female', 'ja');
  const html = ui.renderExplanationPanel(draft, validProfile());

  for (const marker of [
    'miyu-representative-summary',
    'miyu-definition',
    'miyu-mood-keywords',
    'miyu-detail-table',
    'miyu-styling'
  ]) assert.match(html, new RegExp(marker));

  assert.match(html, /lang="ko"/);
  assert.match(html, /lang="ja"/);
  assert.equal((html.match(/class="miyu-detail-row/g) || []).length, 10);
});

test('생성 HTML에는 검토 메모가 없다', () => {
  const { html } = buildToTemporaryFile();
  assert.doesNotMatch(html, /검토 메모/);
  assert.doesNotMatch(html, /class="match-note"/);
});
```

Add a layout test at 834×1194 asserting each `.miyu-detail-value` stacks two language blocks and does not exceed the viewport width.

- [ ] **Step 2: Run focused tests and verify RED**

Run:

```bash
NODE_PATH=/Users/oeuvre/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules \
/Users/oeuvre/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node \
--test tests/diagnosis-ui.test.js tests/diagnosis-layout.test.js tests/build-v17.test.mjs
```

Expected: FAIL because only the short overview is rendered and legacy review notes remain.

- [ ] **Step 3: Implement reusable bilingual renderers**

Add to `src/diagnosis-ui.js`:

```js
function renderLocalizedBlock(localized, language, className) {
  return `<div class="${className}">
    <div class="miyu-language-ko" lang="ko">${escapeHtml(localized.ko)}</div>
    <div class="miyu-language-translated" lang="${escapeHtml(content.LANGUAGES[language].htmlLang)}">
      ${escapeHtml(localized[language])}
    </div>
  </div>`;
}

function renderDetailTable(details, language) {
  return `<div class="miyu-detail-table" role="table">
    ${details.map(row => `<div class="miyu-detail-row" role="row">
      <div class="miyu-detail-label" role="rowheader">
        ${renderLocalizedBlock(row.label, language, 'miyu-localized-label')}
      </div>
      <div class="miyu-detail-value" role="cell">
        ${renderLocalizedBlock(row.text, language, 'miyu-localized-value')}
      </div>
    </div>`).join('')}
  </div>`;
}
```

Extend `renderExplanationPanel()` with localized type/group titles, overview, representative summary, definition, mood keywords, the 10-row detail table, hair, makeup or grooming, fashion, and avoid guidance. `decorateExplanation()` must hide the legacy `.cat-summary-block`, `.cat-definition`, `.meta-row-2`, and `.ten-table` for both genders after the new panel is inserted. Keep the female `.people-grid` and `.cat-avg-face`; keep them hidden for male.

Render every customer-facing section heading through `SECTION_LABELS` with the same Korean-plus-selected-language treatment. Do not leave headings such as `대표적인 특징 요약`, `정의`, `무드 키워드`, or `상세 특징` as Korean-only text.
For female results, replace the visible headings around `.people-grid` and `.cat-avg-face` with bilingual `exampleCelebrities` and `averageFace` labels. Celebrity names themselves remain English-only by design. Male results continue to hide both blocks.

- [ ] **Step 4: Add tablet and print styles**

At portrait widths, every localized unit stacks Korean above translation. At `min-width: 900px`, normal explanation cards may use two columns, but detail table cells remain stacked. Add print rules so `.miyu-detail-row` uses `break-inside: avoid` and both language blocks remain visible.

- [ ] **Step 5: Remove review notes from generated v17**

Add an asserted transformation to `scripts/build-v17.mjs`:

```js
function stripLegacyReviewNotes(html) {
  const pattern = /<div class="meta-mini">\s*<div class="meta-label">검토 메모<\/div>\s*<div class="match-note">[\s\S]*?<\/div>\s*<\/div>/g;
  const matches = html.match(pattern) || [];
  if (matches.length !== 12) {
    throw new Error(`review notes: expected 12, found ${matches.length}`);
  }
  return html.replace(pattern, '');
}
```

Apply it before embedding scripts. Assert after all transformations that the final HTML contains neither `검토 메모` nor `class="match-note"`.

- [ ] **Step 6: Run focused tests and verify GREEN**

Run the Step 2 command.

Expected: all focused tests PASS.

- [ ] **Step 7: Commit**

```bash
git add src/diagnosis-ui.js src/diagnosis.css scripts/build-v17.mjs \
  tests/diagnosis-ui.test.js tests/diagnosis-layout.test.js tests/build-v17.test.mjs
git commit -m "[code] 전체 해설을 이중언어 화면으로 전환"
```

---

### Task 3: 예시 연예인 공식 영문명

**Files:**
- Create: `src/celebrity-names.js`
- Create: `docs/miyu-celebrity-english-sources.md`
- Modify: `scripts/build-v17.mjs`
- Modify: `tests/build-v17.test.mjs`
- Modify: `tests/pages-entry.test.mjs`

**Interfaces:**
- Produces: `MiyuCelebrityNames.CELEBRITY_NAMES`
- Produces: `MiyuCelebrityNames.getEnglishLabel(koreanLabel)`
- Produces: `replaceCelebrityNames(html)`

- [ ] **Step 1: Write failing coverage tests**

Extract every legacy `.person-name` value from the source and require a mapping.

```js
test('모든 예시 연예인 이름은 공식 영문 매핑이 있다', () => {
  const source = fs.readFileSync(sourcePath, 'utf8');
  const labels = Array.from(
    source.matchAll(/<div class="person-name">([^<]+)<\/div>/g),
    match => match[1].trim()
  );
  assert.ok(labels.length > 0);
  for (const label of new Set(labels)) {
    const english = celebrityNames.getEnglishLabel(label);
    assert.ok(english, `missing celebrity mapping: ${label}`);
    assert.doesNotMatch(english, /[가-힣]/);
  }
});
```

Add a generated HTML test requiring every `.person-name` to be Hangul-free.

- [ ] **Step 2: Run focused tests and verify RED**

Run:

```bash
NODE_PATH=/Users/oeuvre/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules \
/Users/oeuvre/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node \
--test tests/build-v17.test.mjs tests/pages-entry.test.mjs
```

Expected: FAIL because `src/celebrity-names.js` and the mappings do not exist.

- [ ] **Step 3: Research and record official English spellings**

Use official agency, group, artist, athlete, or actor profile pages. Record sources in `docs/miyu-celebrity-english-sources.md`, grouped by organization so one official group page may support multiple members. Do not use fan wikis as the final authority.

Use these output formats:

```text
BLACKPINK · Jisoo
Kim Tae-ri · ACTOR
IU · SOLO ARTIST
Kim Yuna · FIGURE SKATER
```

Preserve official group capitalization and official person-name spelling. Do not create Japanese or Chinese transliterations.

- [ ] **Step 4: Implement the exact-key mapping**

Create a UMD/CommonJS-compatible `src/celebrity-names.js`:

```js
const CELEBRITY_NAMES = {
  '블랙핑크 지수': 'BLACKPINK · Jisoo',
  '배우 김태리': 'Kim Tae-ri · ACTOR',
  '가수 아이유': 'IU · SOLO ARTIST',
  '김연아': 'Kim Yuna · FIGURE SKATER'
};

function getEnglishLabel(koreanLabel) {
  return CELEBRITY_NAMES[String(koreanLabel || '').trim()] || '';
}
```

Populate every unique legacy label found by the test.

- [ ] **Step 5: Replace names during build**

Load the mapping through `createRequire` in `scripts/build-v17.mjs`. Replace each `.person-name` value and throw on an unmapped label:

```js
function replaceCelebrityNames(html) {
  return html.replace(
    /(<div class="person-name">)([^<]+)(<\/div>)/g,
    (_, open, korean, close) => {
      const english = celebrityNames.getEnglishLabel(korean);
      if (!english) throw new Error(`Missing celebrity English label: ${korean}`);
      return `${open}${english}${close}`;
    }
  );
}
```

- [ ] **Step 6: Run focused tests and verify GREEN**

Run the Step 2 command.

Expected: all focused tests PASS; a male result page still hides `.people-grid`.

- [ ] **Step 7: Commit**

```bash
git add src/celebrity-names.js docs/miyu-celebrity-english-sources.md \
  scripts/build-v17.mjs tests/build-v17.test.mjs tests/pages-entry.test.mjs
git commit -m "[code] 예시 연예인명을 공식 영문으로 통일"
```

---

### Task 4: 성별별 문항 이미지 모델과 확대 기능 제거

**Files:**
- Modify: `src/diagnosis-core.js`
- Modify: `src/diagnosis-ui.js`
- Modify: `src/diagnosis.css`
- Modify: `scripts/build-v17.mjs`
- Modify: `tests/diagnosis-core.test.js`
- Modify: `tests/diagnosis-ui.test.js`
- Modify: `tests/diagnosis-layout.test.js`
- Modify: `tests/build-v17.test.mjs`

**Interfaces:**
- Produces: `getOptionImages(option, gender): string[]`
- `option.images` becomes `{ female: string[], male: string[] }`
- Produces: non-interactive `.miyu-answer-figure`

- [ ] **Step 1: Write failing gender-image and no-zoom tests**

```js
test('문항 이미지는 성별에 맞는 경로를 반환한다', () => {
  const option = core.QUESTIONS[0].options[0];
  assert.deepEqual(core.getOptionImages(option, 'female'), [
    'questions/q01-a.png'
  ]);
  assert.deepEqual(core.getOptionImages(option, 'male'), [
    'questions/male/q01-a.png'
  ]);
});

test('체크리스트에는 확대 기능이 없다', () => {
  const state = core.createInitialState('2026-07-30');
  state.profile.gender = 'male';
  const html = ui.renderQuestionView(state, 0);
  assert.match(html, /questions\/male\/q01-a\.png/);
  assert.doesNotMatch(html, /open-image|close-image|miyu-image-zoom|확대/);
});
```

Add a build test asserting the generated HTML has no diagnosis modal markup or `data-action="open-image"`.

- [ ] **Step 2: Run focused tests and verify RED**

Run:

```bash
NODE_PATH=/Users/oeuvre/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules \
/Users/oeuvre/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node \
--test tests/diagnosis-core.test.js tests/diagnosis-ui.test.js \
tests/diagnosis-layout.test.js tests/build-v17.test.mjs
```

Expected: FAIL because questions have one image list and zoom markup still exists.

- [ ] **Step 3: Change question data to explicit gender paths**

For every option in questions 1–8:

```js
images: {
  female: ['questions/q01-a.png'],
  male: ['questions/male/q01-a.png']
}
```

For questions 9–10 use:

```js
images: { female: [], male: [] }
```

Implement:

```js
function getOptionImages(option, gender) {
  if (!SUPPORTED_GENDERS.includes(gender)) return [];
  return Array.isArray(option.images?.[gender]) ? option.images[gender] : [];
}
```

Change the approved labels:

```text
예쁜 이마 → 곡선이 자연스럽고 균형 잡힌 이마
여성스러운 코 (코가 강하게 부각되지 않음) → 부드럽고 강하게 부각되지 않는 코
```

- [ ] **Step 4: Replace zoom buttons with static figures**

Change `renderAssetImages()` to return:

```js
`<figure class="miyu-answer-figure">
  <img src="${asset(path)}" data-asset="${escapeHtml(path)}"
    alt="${escapeHtml(alt)}" loading="eager">
</figure>`
```

Use `getOptionImages(option, state.profile.gender)` in `renderQuestionView()`. Remove `open-image` and `close-image` click branches, modal functions, zoom CSS, and the modal injected by `build-v17.mjs`.

- [ ] **Step 5: Run focused tests and verify GREEN**

Run the Step 2 command.

Expected: all focused tests PASS. The existing female 34 images continue to build from `questions/q*.png`; the future male paths are rendered as markup but are not collected into the standalone HTML until Task 6.

- [ ] **Step 6: Commit**

```bash
git add src/diagnosis-core.js src/diagnosis-ui.js src/diagnosis.css \
  scripts/build-v17.mjs tests/diagnosis-core.test.js tests/diagnosis-ui.test.js \
  tests/diagnosis-layout.test.js tests/build-v17.test.mjs
git commit -m "[code] 문항 이미지를 성별로 분리하고 확대 기능 제거"
```

---

### Task 5: 남성 AI 비교 이미지 34개 제작

**Files:**
- Create: `assets/diagnosis/male-image-manifest.json`
- Create: `scripts/split-male-image-sheets.mjs`
- Create: `assets/diagnosis/questions/male/q01-a.png` through `q08-d.png` including `q01-c-1`, `q01-c-2`, `q06-c-1`, `q06-c-2`
- Create: `tests/male-image-assets.test.mjs`

**Interfaces:**
- Consumes: eight temporary comparison-sheet PNG files
- Produces: exactly 34 male PNG assets
- Produces: `splitSheets({ sourceDir, outputDir, manifestPath })`

- [ ] **Step 1: Write the failing manifest and asset tests**

```js
test('남성 이미지 매니페스트는 정확히 34개 출력을 정의한다', () => {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const outputs = manifest.sheets.flatMap(sheet => sheet.outputs);
  assert.equal(outputs.length, 34);
  assert.equal(new Set(outputs).size, 34);
});

test('남성 이미지 34개는 PNG이고 진단 카드용 크기다', async () => {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const outputs = manifest.sheets.flatMap(sheet => sheet.outputs);
  for (const output of outputs) {
    const filePath = path.join(maleDir, output);
    const metadata = await sharp(filePath).metadata();
    assert.equal(metadata.format, 'png');
    assert.ok(metadata.width >= 640);
    assert.ok(metadata.height >= 640);
  }
});
```

- [ ] **Step 2: Run the asset test and verify RED**

Run:

```bash
NODE_PATH=/Users/oeuvre/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules \
/Users/oeuvre/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node \
--test tests/male-image-assets.test.mjs
```

Expected: FAIL because the manifest and male assets do not exist.

- [ ] **Step 3: Create the deterministic sheet manifest**

Use 2×3 panels for questions 1 and 6; ignore the sixth panel. Use 2×2 panels for the other questions. The output order is:

```json
{
  "sheets": [
    {
      "input": "q01-sheet.png",
      "columns": 3,
      "rows": 2,
      "outputs": ["q01-a.png", "q01-b.png", "q01-c-1.png", "q01-c-2.png", "q01-d.png"]
    }
  ]
}
```

Add q02 through q08 with these output counts: `4, 4, 4, 4, 5, 4, 4`. The split script reads `manifest.sheets` in order and flattens each sheet's `outputs` array.

- [ ] **Step 4: Generate eight comparison sheets with ImageGen**

Before generating, read and follow the `imagegen` skill. Save the temporary sheets outside the repository in `/private/tmp/miyu-male-sheets/`.

Use this shared prompt:

```text
Photorealistic diagnostic reference contact sheet of East Asian adult men.
Neutral light-gray background, even soft frontal lighting, natural skin texture,
neutral expression unless a panel explicitly requires a soft smile, short dark
hair fully away from forehead and eyebrows, no facial hair, no glasses, no
accessories, no makeup, same age range and camera distance in every panel.
Each panel is isolated with clean white gutters. No text, letters, numbers,
watermarks, logos, or captions. The only meaningful difference between panels
is the requested facial feature. Clinical beauty-consultation reference,
realistic anatomy, front-facing unless a panel requests a slight side view.
```

Append these ordered panel requirements:

```text
Q1: inverted-triangle face; oval face; round face; long face; square face.
Q2: short chin with wide V; soft U jaw or mildly recessed chin; angular jaw with flat chin tip; developed mandibular angle with pointed V chin.
Q3: convex forehead; smooth balanced curved forehead; narrow forehead; pronounced brow ridge and projecting forehead bone.
Q4: thin light eyebrows; rounded semi-arched eyebrows; high strongly arched eyebrows; thick eyebrows with pronounced brow bone.
Q5: large round arc-shaped eyes; almond eyes with downturned outer corners; almond eyes with upturned outer corners; sharp angular upturned eyes.
Q6: flat cheekbones with soft smiling cheek fullness; low-projection tidy cheekbones; flat front cheekbones; slight side view showing developed lateral cheekbones; prominent front cheekbones.
Q7: rounded nose with visible alar width; soft balanced nose that does not dominate; thick straight nasal bridge; narrow long nasal bridge.
Q8: horizontally wide large mouth with defined cupid's bow; small lips with thinner upper lip; sharply defined cupid's bow and lip line; thick lips with soft indistinct lip line.
```

Generate Q1 and Q6 as 2×3 sheets with the last cell blank. Generate Q2, Q3, Q4, Q5, Q7, and Q8 as 2×2 sheets.

- [ ] **Step 5: Split and normalize the panels**

Implement `scripts/split-male-image-sheets.mjs` with Sharp:

```js
const panelWidth = Math.floor(metadata.width / sheet.columns);
const panelHeight = Math.floor(metadata.height / sheet.rows);

await sharp(inputPath)
  .extract({
    left: column * panelWidth,
    top: row * panelHeight,
    width: panelWidth,
    height: panelHeight
  })
  .resize(800, 1000, {
    fit: 'contain',
    background: { r: 255, g: 255, b: 255, alpha: 1 }
  })
  .png({ compressionLevel: 9 })
  .toFile(outputPath);
```

Run:

```bash
NODE_PATH=/Users/oeuvre/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules \
/Users/oeuvre/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node \
scripts/split-male-image-sheets.mjs \
/private/tmp/miyu-male-sheets assets/diagnosis/questions/male
```

- [ ] **Step 6: Visually review all 34 outputs**

Create a temporary contact sheet for review. Check each output against its exact question label. Reject and regenerate a sheet when:

- the intended feature is not visibly different,
- hair covers the forehead or eyebrows,
- pose or expression changes more than the target feature,
- anatomy is distorted,
- a panel contains text or watermark,
- the crop removes the target feature.

Do not replace a failed male image with a female image or a blank placeholder.

- [ ] **Step 7: Run the asset tests and verify GREEN**

Run the Step 2 command.

Expected: 34/34 male assets pass format, uniqueness, and minimum-size checks.

- [ ] **Step 8: Commit**

```bash
git add assets/diagnosis/male-image-manifest.json \
  assets/diagnosis/questions/male scripts/split-male-image-sheets.mjs \
  tests/male-image-assets.test.mjs
git commit -m "[code] 남성 체크리스트 AI 이미지 세트 추가"
```

---

### Task 6: 단일 HTML 자산 내장과 빌드 차단 조건

**Files:**
- Modify: `scripts/build-v17.mjs`
- Modify: `tests/build-v17.test.mjs`
- Modify: `tests/pages-entry.test.mjs`
- Modify: `dist/미유_무드진단_12type_v17.html`

**Interfaces:**
- Consumes: 34 female + 34 male + 12 type + 1 logo assets
- Produces: exactly 81 embedded assets
- Produces: standalone v17 HTML

- [ ] **Step 1: Write failing build validation tests**

```js
test('로고와 진단 이미지 80개를 단일 HTML에 내장한다', () => {
  const { html } = buildToTemporaryFile();
  const assets = extractDiagnosisAssets(html);
  assert.equal(Object.keys(assets).length, 81);
  assert.ok(Object.keys(assets).some(key => /^questions\/q\d/.test(key)));
  assert.ok(Object.keys(assets).some(key => key.startsWith('questions/male/')));
  assert.ok(Object.values(assets).every(value => value.startsWith('data:image/png;base64,')));
});

test('불완전한 번역이나 남성 이미지에서는 출력 파일을 쓰지 않는다', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'miyu-v17-missing-'));
  for (const directory of ['source', 'src', 'assets']) {
    fs.cpSync(path.join(root, directory), path.join(tempRoot, directory), {
      recursive: true
    });
  }
  fs.rmSync(
    path.join(tempRoot, 'assets', 'diagnosis', 'questions', 'male', 'q08-d.png')
  );
  const outputPath = path.join(tempRoot, 'dist', 'v17.html');

  assert.throws(
    () => buildV17({ rootDir: tempRoot, outputPath }),
    /Missing diagnosis asset/
  );
  assert.equal(fs.existsSync(outputPath), false);
});
```

Implement the fixture with `fs.cpSync(root, tempRoot, { recursive: true })`, remove `q08-d.png`, and require `/Missing diagnosis asset/`.

- [ ] **Step 2: Run build tests and verify RED**

Run:

```bash
NODE_PATH=/Users/oeuvre/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules \
/Users/oeuvre/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node \
--test tests/build-v17.test.mjs tests/pages-entry.test.mjs
```

Expected: FAIL because asset collection is not recursive and still expects 47 assets.

- [ ] **Step 3: Make asset collection recursive and exact**

Collect:

```text
logo
questions/q*.png = 34
questions/male/*.png = 34
types/*.png = 12
```

Throw before reading or writing the output when counts differ. Do not use a broad “all PNG files” count that could accept accidental files; validate the exact expected relative paths derived from `core.QUESTIONS` plus `core.TYPES`.

- [ ] **Step 4: Add final string assertions**

Immediately before writing output:

```js
for (const forbidden of [
  '검토 메모',
  'class="match-note"',
  'data-action="open-image"',
  'miyu-image-modal'
]) {
  if (html.includes(forbidden)) {
    throw new Error(`Forbidden generated content: ${forbidden}`);
  }
}
```

Also call `assertCompleteContent()` and validate every legacy celebrity label before `fs.mkdirSync()` or `fs.writeFileSync()`.

- [ ] **Step 5: Generate the dist artifact**

Run:

```bash
NODE_PATH=/Users/oeuvre/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules \
/Users/oeuvre/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node \
scripts/build-v17.mjs
```

- [ ] **Step 6: Run build tests and verify GREEN**

Run the Step 2 command.

Expected: all build and entry tests PASS; the generated HTML has 81 embedded assets and no forbidden content.

- [ ] **Step 7: Commit**

```bash
git add scripts/build-v17.mjs tests/build-v17.test.mjs \
  tests/pages-entry.test.mjs dist/미유_무드진단_12type_v17.html
git commit -m "[code] 전체 번역과 성별 이미지를 단일 HTML에 통합"
```

---

### Task 7: 태블릿·출력·전체 회귀 검증

**Files:**
- Modify: `tests/diagnosis-layout.test.js`
- Modify: `tests/pages-entry.test.mjs`
- Modify: `tests/diagnosis-legacy.test.js`
- Modify: `dist/미유_무드진단_12type_v17.html`

**Interfaces:**
- Consumes: completed v17 artifact
- Produces: verified portrait, landscape, print, and direct-link behavior

- [ ] **Step 1: Add final end-to-end assertions**

Add page tests for:

```js
test('남성 일본어 진단은 남성 문항 이미지와 전체 이중언어 해설을 표시한다', async () => {
  const page = await browser.newPage({ viewport: { width: 834, height: 1194 } });
  await page.addInitScript(savedState => {
    sessionStorage.setItem('miyuDiagnosisV17', JSON.stringify(savedState));
  }, completedState({ gender: 'male', explanationLanguage: 'ja', selectedType: 'B-1' }));

  const questionUrl = new URL(TARGET_FILE, baseUrl);
  questionUrl.hash = '#/diagnosis/question/1';
  await page.goto(questionUrl.href);
  assert.match(
    await page.locator('.miyu-answer-figure img').first().getAttribute('data-asset'),
    /^questions\/male\//
  );
  assert.equal(await page.locator('[data-action="open-image"]').count(), 0);

  const catUrl = new URL(TARGET_FILE, baseUrl);
  catUrl.hash = '#/cat/05';
  await page.goto(catUrl.href);
  await page.locator('.miyu-explanation-panel').waitFor({ state: 'visible' });
  assert.equal(await page.locator('.miyu-detail-row').count(), 10);
  assert.ok(await page.locator('[lang="ko"]').count() > 0);
  assert.ok(await page.locator('[lang="ja"]').count() > 0);
  assert.equal(
    await page.locator('.category-section[data-cat-id="05"] .people-grid')
      .evaluate(element => getComputedStyle(element).display),
    'none'
  );
  await page.close();
});

test('여성 중국어 번체 해설은 여성 이미지와 영문 연예인명을 표시한다', async () => {
  const page = await browser.newPage({ viewport: { width: 834, height: 1194 } });
  await page.addInitScript(savedState => {
    sessionStorage.setItem('miyuDiagnosisV17', JSON.stringify(savedState));
  }, completedState({ gender: 'female', explanationLanguage: 'zh-TW', selectedType: 'C-3' }));

  const questionUrl = new URL(TARGET_FILE, baseUrl);
  questionUrl.hash = '#/diagnosis/question/1';
  await page.goto(questionUrl.href);
  assert.match(
    await page.locator('.miyu-answer-figure img').first().getAttribute('data-asset'),
    /^questions\/female\//
  );

  const catUrl = new URL(TARGET_FILE, baseUrl);
  catUrl.hash = '#/cat/18';
  await page.goto(catUrl.href);
  await page.locator('.miyu-explanation-panel').waitFor({ state: 'visible' });
  assert.ok(await page.locator('[lang="zh-Hant"]').count() > 0);
  const names = await page.locator(
    '.category-section[data-cat-id="18"] .person-name'
  ).allTextContents();
  assert.ok(names.length > 0);
  assert.ok(names.every(name => !/[가-힣]/.test(name)));
  await page.close();
});
```

Define the state helper above these tests:

```js
function completedState(overrides = {}) {
  return {
    version: 17,
    profile: {
      customerName: '미유',
      consultantName: '김컨설턴트',
      explanationLanguage: overrides.explanationLanguage || 'ja',
      gender: overrides.gender || 'male',
      diagnosisDate: '2026-07-30'
    },
    answers: Array.from({ length: 10 }, () => ['B']),
    currentQuestion: 9,
    scores: { A: 0, B: 10, C: 0, D: 0 },
    selectedType: overrides.selectedType || 'B-1'
  };
}
```

Add this print-media test:

```js
test('출력 화면은 한국어와 선택 언어를 모두 유지한다', async () => {
  const css = fs.readFileSync(path.join(ROOT, 'src', 'diagnosis.css'), 'utf8');
  const page = await browser.newPage({ viewport: { width: 834, height: 1194 } });
  await page.setContent(`<style>${css}</style>${explanationHtml()}`);
  await page.emulateMedia({ media: 'print' });

  assert.equal(await page.locator('.miyu-language-ko').first().isVisible(), true);
  assert.equal(
    await page.locator('.miyu-language-translated').first().isVisible(),
    true
  );
  const breakInside = await page.locator('.miyu-detail-row').first().evaluate(element =>
    getComputedStyle(element).breakInside
  );
  assert.equal(breakInside, 'avoid');
  await page.close();
});
```

- [ ] **Step 2: Run the complete suite**

Run:

```bash
NODE_PATH=/Users/oeuvre/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules \
/Users/oeuvre/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node \
--test tests/*.js tests/*.mjs
```

Then:

```bash
/Users/oeuvre/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 \
-m unittest tests/test_pdf_assets.py -v
```

Expected: zero failures.

- [ ] **Step 3: Run static artifact checks**

```bash
git diff --check
shasum -a 256 dist/미유_무드진단_12type_v17.html
rg -n '검토 메모|data-action="open-image"|miyu-image-modal' \
  dist/미유_무드진단_12type_v17.html
```

Expected: `git diff --check` succeeds; SHA-256 is printed; `rg` returns no matches.

- [ ] **Step 4: Perform real-browser visual QA**

Serve `dist/` locally and use the in-app browser.

Verify:

- 834×1194 portrait start, question, result, and full explanation
- 1194×834 landscape full explanation
- female/zh-TW and male/ja paths
- all 34 male images fit without cropping
- bilingual detail rows remain readable
- print preview includes both languages
- no console errors

Keep this local. Do not push or deploy.

- [ ] **Step 5: Rebuild after any visual fix and rerun the complete suite**

Any visual correction must first add or update a failing layout/page test. Regenerate the dist artifact and repeat Steps 2–4.

- [ ] **Step 6: Commit the verified artifact**

```bash
git add tests dist/미유_무드진단_12type_v17.html
git commit -m "[code] 다국어 남성 진단 초안 회귀 검증 완료"
```

- [ ] **Step 7: Hand off the local draft**

Report:

- local HTML absolute path,
- commit hash,
- total test count,
- translation and male images are drafts awaiting one combined content review,
- GitHub Pages remains unchanged.

Do not deploy until the user separately requests deployment.
