const test = require('node:test');
const assert = require('node:assert/strict');
const content = require('../src/explanation-content.js');


const TYPE_CODES = [
  'A-1', 'A-2', 'A-3', 'B-1', 'B-2', 'B-3',
  'C-1', 'C-2', 'C-3', 'D-1', 'D-2', 'D-3'
];


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

test('잘못된 타입은 null, 잘못된 언어는 한국어와 안전한 안내를 반환한다', () => {
  assert.equal(content.getExplanation('X-9', 'male', 'ja'), null);

  const result = content.getExplanation('A-1', 'male', 'xx');
  assert.ok(result.Korean.summary);
  assert.equal(result.translated.language, 'ko');
  assert.match(result.translated.summary, /번역 준비 중/);
});
