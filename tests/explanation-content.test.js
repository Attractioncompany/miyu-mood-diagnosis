const test = require('node:test');
const assert = require('node:assert/strict');
const content = require('../src/explanation-content.js');


const TYPE_CODES = [
  'A-1', 'A-2', 'A-3', 'B-1', 'B-2', 'B-3',
  'C-1', 'C-2', 'C-3', 'D-1', 'D-2', 'D-3'
];
const LANGUAGES = ['ko', 'ja', 'zh-CN', 'zh-TW'];


test('남성 B그룹은 보이시, 여성 B그룹은 페미닌이다', () => {
  assert.equal(content.getGroupName('B', 'male'), 'Boyish · 보이시');
  assert.equal(content.getGroupName('B', 'female'), 'Feminine · 페미닌');
  assert.equal(content.getGroupName('A', 'male'), 'Blossom · 블로썸');
});

test('지원 언어의 화면용 이름을 제공한다', () => {
  assert.deepEqual(Object.keys(content.LANGUAGES), ['ja', 'zh-CN', 'zh-TW']);
  assert.equal(content.LANGUAGES.ja.inputLabel, '일본어');
  assert.equal(content.LANGUAGES['zh-CN'].displayLabel, '简体中文');
  assert.equal(content.LANGUAGES['zh-TW'].displayLabel, '繁體中文');
});

test('소개·브릿지와 다섯 단계 해설 데이터를 고객 언어로 제공한다', () => {
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
});

test('두 번째 소개 화면은 네 무드 그룹의 얼굴 참고 이미지를 제공한다', () => {
  const female = content.getIntroPage(2, 'female', 'ja');
  const male = content.getIntroPage(2, 'male', 'zh-TW');

  assert.deepEqual(female.groupVisuals.map(item => item.group), ['A', 'B', 'C', 'D']);
  assert.ok(
    female.groupVisuals.every(item => item.image.startsWith('reference/intro/'))
  );
  assert.equal(male.groupVisuals[1].label['zh-TW'], 'Boyish · 清秀少年感');
});

test('해설은 평균 얼굴과 추천·피하면 좋은 방향 사진 참고를 반환한다', () => {
  const female = content.getExplanation('A-1', 'female', 'zh-TW');
  const male = content.getExplanation('A-1', 'male', 'ja');

  assert.match(female.averageFace.image, /^reference\/average\/female\/a-1\.jpg$/);
  assert.match(male.averageFace.image, /^reference\/average\/male\/a-1\.jpg$/);
  assert.equal(female.sections.makeup.examples.length, 1);
  assert.equal(female.sections.makeup.avoidExamples.length, 1);
  assert.equal(female.sections.hair.examples.length, 1);
  assert.equal(female.sections.hair.avoidExamples.length, 1);
  assert.equal(male.sections.makeup.examples.length, 1);
  assert.match(male.sections.makeup.examples[0].image, /^reference\/male\/grooming\/recommended\/a\.jpg$/);
  assert.match(male.sections.makeup.avoidExamples[0].image, /^reference\/male\/grooming\/avoid\/a\.jpg$/);
  assert.equal(male.sections.hair.examples.length, 1);
  assert.match(male.sections.hair.examples[0].image, /^reference\/male\/hair\/recommended\/a\.jpg$/);
  assert.match(male.sections.hair.avoidExamples[0].image, /^reference\/male\/hair\/avoid\/a\.jpg$/);
  assert.ok(female.sections.makeup.copy['zh-TW'].trim());
  assert.ok(male.sections.hair.examples[0].caption.ja.trim());
});

test('PPT 기준으로 헤어는 대분류, 여성 메이크업은 타입명 기준으로 연결한다', () => {
  const blossom = content.getExplanation('A-1', 'female', 'ja');
  const charisma = content.getExplanation('D-1', 'female', 'ja');
  const clear = content.getExplanation('D-2', 'female', 'ja');
  const sharp = content.getExplanation('D-3', 'female', 'ja');

  assert.match(blossom.sections.hair.copy.ko, /윤기.*볼륨.*레이어/);
  assert.match(blossom.sections.hair.avoid.ko, /무거운 일자.*강한 블랙.*슬릭백/);
  assert.match(charisma.sections.makeup.copy.ko, /레드립.*강렬한 음영/);
  assert.match(charisma.sections.makeup.avoid.ko, /청순.*포인트 없는/);
  assert.match(clear.sections.makeup.copy.ko, /정갈.*누드.*브릭/);
  assert.match(sharp.sections.makeup.copy.ko, /직선적인 아이라인.*윤곽 음영/);
  assert.match(sharp.sections.makeup.avoid.ko, /동글고 귀여운 치크.*과한 애굣살/);
  assert.doesNotMatch(sharp.sections.makeup.copy.ko, /피하면 좋아요/);
  assert.doesNotMatch(sharp.sections.makeup.copy.ja, /控えめにします/);
});

test('해설은 정체성 페이지와 추천·피하면 좋은 방향을 나눈 여덟 페이지로 제공한다', () => {
  const draft = content.getExplanation('A-1', 'female', 'ja');

  assert.deepEqual(draft.pages.map(page => page.id), [
    'identity', 'facial-details-1', 'facial-details-2',
    'makeup-recommended', 'makeup-avoid',
    'hair-recommended', 'hair-avoid', 'accessory-fashion'
  ]);
  assert.equal(draft.pages[1].details.length, 5);
  assert.equal(draft.pages[2].details.length, 5);
  assert.match(draft.pages[0].content.ko, /신비|화사|생기|사랑스러움/);
  assert.ok(draft.pages.every(page => page.title.ko.trim() && page.title.ja.trim()));
  assert.ok(draft.pages.every(page => page.content.ko.trim() && page.content.ja.trim()));
});

test('추천 문구의 언어가 빠지면 완전성 검사가 실패한다', () => {
  const localized = content.getRawTypeContent('A-1').recommendations.makeup.male;
  const original = localized['zh-CN'];
  delete localized['zh-CN'];
  try {
    assert.throws(() => content.assertCompleteContent(), /Missing zh-CN/);
  } finally {
    localized['zh-CN'] = original;
  }
});

test('12타입은 성별과 언어별 한국어·번역 초안을 함께 반환한다', () => {
  for (const typeCode of TYPE_CODES) {
    for (const gender of ['female', 'male']) {
      for (const language of ['ja', 'zh-CN', 'zh-TW']) {
        const result = content.getExplanation(typeCode, gender, language);
        assert.equal(result.typeCode, typeCode);
        assert.ok(result.Korean.summary, `${typeCode} ${gender} Korean`);
        assert.ok(result.translated.summary, `${typeCode} ${gender} ${language}`);
        assert.equal(result.translated.language, language);
        assert.equal(result.draft, true);
        assert.equal(result.image, null);
      }
    }
  }
});

test('잘못된 타입이나 지원하지 않는 언어는 해설을 반환하지 않는다', () => {
  assert.equal(content.getExplanation('X-9', 'male', 'ja'), null);
  assert.equal(content.getExplanation('A-1', 'male', 'xx'), null);
  assert.doesNotMatch(
    JSON.stringify(content.TYPE_CONTENT),
    /번역 준비 중|TBD|TODO/
  );
});

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

test('필수 언어 키를 삭제하면 완전성 검사가 실패한다', () => {
  const cases = [
    [content.SECTION_LABELS.details, 'zh-TW'],
    [content.getRawTypeContent('A-1').common.definition, 'zh-TW'],
    [content.GROUP_LABELS.male.B, 'ja']
  ];

  for (const [localized, language] of cases) {
    const original = localized[language];
    delete localized[language];
    try {
      assert.throws(
        () => content.assertCompleteContent(),
        new RegExp(`Missing ${language}`)
      );
    } finally {
      localized[language] = original;
    }
  }
});

test('번체 해설은 명시적인 번체 문장이고 의미가 다른 글자를 구분한다', () => {
  const definition = content.getRawTypeContent('B-2').common.definition['zh-TW'];

  assert.equal(
    definition,
    '橢圓形臉＋1:1:1比例＋眉眼間距近＋外眼角略下垂的杏仁眼＋細高鼻樑＋薄唇的氛圍／下頜角發達的長臉＋濃眉＋內眼角向下深入的杏仁眼＋粗鼻樑＋厚唇＋圓潤前突下巴的氛圍'
  );
  assert.match(definition, /發達/);
  assert.doesNotMatch(definition, /髮達|椭|围/);
});

test('남성 B·C 여섯 타입의 PPT 헤어 설명은 번체에서 髮流로 표기한다', () => {
  for (const typeCode of ['B-1', 'B-2', 'B-3', 'C-1', 'C-2', 'C-3']) {
    const hair = content.getExplanation(typeCode, 'male', 'zh-TW')
      .sections.hair['zh-TW'];
    assert.match(hair, /髮流/);
    assert.doesNotMatch(hair, /發流/);
  }
});

test('최종 해설은 이목구비·무드·메이크업·헤어·액세서리 패션을 모두 반환한다', () => {
  const result = content.getExplanation('C-3', 'male', 'ja');
  assert.ok(result.localizedTypeName.ja);
  assert.ok(result.localizedGroupName.ja);
  assert.ok(result.sections.facialFeatures.items.length >= 1);
  assert.equal(result.sections.facialFeatures.details.length, 10);
  assert.ok(result.sections.facialFeatures.details.every(row => row.label.ja && row.text.ja));
  assert.ok(result.sections.mood.overview.ko);
  assert.ok(result.sections.mood.definition.ko);
  assert.ok(result.sections.mood.keywords.ko);
  assert.deepEqual(Object.keys(result.sections), [
    'facialFeatures', 'mood', 'makeup', 'hair', 'accessoryFashion'
  ]);
});
