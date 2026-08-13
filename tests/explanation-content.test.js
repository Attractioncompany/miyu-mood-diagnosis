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

test('해설은 평균 얼굴과 추천·피하면 좋은 방향의 세 장 예시를 반환한다', () => {
  const female = content.getExplanation('A-1', 'female', 'zh-TW');
  const male = content.getExplanation('A-1', 'male', 'ja');

  assert.match(female.averageFace.image, /^reference\/average\/female\/a-1\.jpg$/);
  assert.match(male.averageFace.image, /^reference\/average\/male\/a-1\.jpg$/);
  assert.equal(female.sections.makeup.examples.length, 3);
  assert.equal(female.sections.makeup.avoidExamples.length, 3);
  assert.equal(female.sections.hair.examples.length, 3);
  assert.equal(female.sections.hair.avoidExamples.length, 3);
  assert.equal(female.sections.accessoryFashion.idolExamples.length, 3);
  assert.equal(female.sections.accessoryFashion.dailyOutfits.length, 3);
  assert.deepEqual(female.sections.makeup.examples.map(example => example.image), [
    'reference/female/makeup/recommended/fantasy/1.jpg',
    'reference/female/makeup/recommended/fantasy/2.jpg',
    'reference/female/makeup/recommended/fantasy/3.jpg'
  ]);
  assert.deepEqual(female.sections.makeup.avoidExamples.map(example => example.image), [
    'reference/female/makeup/avoid/fantasy/1.jpg',
    'reference/female/makeup/avoid/fantasy/2.jpg',
    'reference/female/makeup/avoid/fantasy/3.jpg'
  ]);
  assert.deepEqual(female.sections.hair.examples.map(example => example.image), [
    'reference/female/hair/recommended/a/1.jpg',
    'reference/female/hair/recommended/a/2.jpg',
    'reference/female/hair/recommended/a/3.jpg'
  ]);
  assert.deepEqual(female.sections.hair.avoidExamples.map(example => example.image), [
    'reference/female/hair/avoid/a/1.jpg',
    'reference/female/hair/avoid/a/2.jpg',
    'reference/female/hair/avoid/a/3.jpg'
  ]);
  assert.deepEqual(female.sections.accessoryFashion.idolExamples.map(example => example.image), [
    'reference/female/fashion/fantasy/1.jpg',
    'reference/female/fashion/fantasy/2.jpg',
    'reference/female/fashion/fantasy/3.jpg'
  ]);
  assert.deepEqual(female.sections.accessoryFashion.dailyOutfits.map(example => example.image), [
    'reference/female/daily/a/1.jpg',
    'reference/female/daily/a/2.jpg',
    'reference/female/daily/a/3.jpg'
  ]);
  assert.equal(male.sections.makeup.examples.length, 3);
  assert.deepEqual(male.sections.makeup.examples.map(example => example.image), [
    'reference/male/grooming-detail/a-1/1.jpg',
    'reference/male/grooming-detail/a-1/2.jpg',
    'reference/male/grooming-detail/a-1/3.jpg'
  ]);
  assert.deepEqual(male.sections.makeup.avoidExamples.map(example => example.image), [
    'reference/male/grooming/avoid/a/1.jpg',
    'reference/male/grooming/avoid/a/2.jpg',
    'reference/male/grooming/avoid/a/3.jpg'
  ]);
  assert.equal(male.sections.hair.examples.length, 3);
  assert.deepEqual(male.sections.hair.examples.map(example => example.image), [
    'reference/male/hair/a/1.jpg',
    'reference/male/hair/a/2.jpg',
    'reference/male/hair/a/3.jpg'
  ]);
  assert.deepEqual(male.sections.hair.avoidExamples.map(example => example.image), [
    'reference/male/hair/avoid-ppt/a/1.jpg',
    'reference/male/hair/avoid-ppt/a/2.jpg',
    'reference/male/hair/avoid-ppt/a/3.jpg'
  ]);
  assert.ok(female.sections.makeup.copy['zh-TW'].trim());
  assert.ok(male.sections.hair.examples[0].caption.ja.trim());
});

test('PPT 시각 자료는 앱 번호가 아니라 타입명으로 연결해 D그룹이 뒤바뀌지 않는다', () => {
  const charisma = content.getExplanation('D-1', 'female', 'ja');
  const clear = content.getExplanation('D-2', 'female', 'ja');
  const sharp = content.getExplanation('D-3', 'female', 'ja');

  assert.match(charisma.sections.makeup.examples[0].image, /makeup\/recommended\/charisma\/1\.jpg$/);
  assert.match(clear.sections.makeup.examples[0].image, /makeup\/recommended\/clear\/1\.jpg$/);
  assert.match(sharp.sections.makeup.examples[0].image, /makeup\/recommended\/sharp\/1\.jpg$/);
  assert.match(charisma.sections.accessoryFashion.idolExamples[0].image, /fashion\/charisma\/1\.jpg$/);
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

test('여성 메이크업은 PPT의 피부·색감·느낌·포인트와 추천·회피 목록을 분리한다', () => {
  const guide = content.getExplanation('B-1', 'female', 'ja').sections.makeup.guide;
  assert.equal(guide.skin.ko, '맑고 투명하게 빛나는 윤광 피부 표현');
  assert.equal(guide.color.ko, '사랑스럽고 여리여리한 핑크, 피치 계열');
  assert.match(guide.feeling.ko, /사랑스럽고 여린/);
  assert.match(guide.focus.ko, /립.*블러셔/);
  assert.deepEqual(guide.recommendedItems.ko, ['로즈핑크 메이크업', '물먹립', '은은한 음영', '볼터치가 살짝 강조된 사랑스럽고 여성스러운 느낌']);
  assert.deepEqual(guide.avoidItems.ko, ['시크한 메이크업', '무채색', '직선적인 쉐딩', '강한 눈매', '스모키']);
  assert.equal(guide.skin.ja, '透明感のあるツヤ肌');
});

test('모던 타입은 앱 코드가 아니라 타입명으로 PPT 세부 메이크업을 연결한다', () => {
  const charisma = content.getExplanation('D-1', 'female', 'ja').sections.makeup.guide;
  const clear = content.getExplanation('D-2', 'female', 'ja').sections.makeup.guide;
  const sharp = content.getExplanation('D-3', 'female', 'ja').sections.makeup.guide;
  assert.match(charisma.color.ko, /딥 브라운.*다크 브릭/);
  assert.match(clear.focus.ko, /아이라인.*립/);
  assert.match(sharp.focus.ko, /아이라인.*윤곽 쉐딩/);
});

test('남성 타입별 그루밍과 대분류 헤어는 PPT 스타일 목록을 반환한다', () => {
  const fantasy = content.getExplanation('A-1', 'male', 'zh-CN');
  const blossomHair = content.getExplanation('A-2', 'male', 'ja').sections.hair.guide;
  assert.match(fantasy.sections.makeup.guide.skin.ko, /깨끗하고 투명/);
  assert.match(fantasy.sections.makeup.guide.focus.ko, /음영 최소화.*애교살.*혈색/);
  assert.deepEqual(blossomHair.recommendedItems.ko, ['애즈펌', '시스루펌', '소프트 쉐도우펌', '댄디컷', '가벼운 리프컷', '내추럴 가르마펌']);
  assert.deepEqual(blossomHair.avoidItems.ko, ['슬릭백', '올백', '포마드', '강한 다운펌', '울프컷']);
});

test('해설은 패션 레퍼런스와 데일리 코디를 분리한 아홉 페이지를 제공한다', () => {
  const draft = content.getExplanation('A-1', 'female', 'ja');

  assert.deepEqual(draft.pages.map(page => page.id), [
    'identity', 'facial-details-1', 'facial-details-2',
    'makeup-recommended', 'makeup-avoid',
    'hair-recommended', 'hair-avoid', 'fashion-reference', 'daily-outfits'
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
