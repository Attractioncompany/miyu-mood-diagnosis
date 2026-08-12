const test = require('node:test');
const assert = require('node:assert/strict');
const core = require('../src/diagnosis-core.js');


function validProfile(overrides = {}) {
  return {
    explanationLanguage: 'ja',
    gender: 'male',
    diagnosisDate: '2026-07-30',
    ...overrides
  };
}


test('초기 상태는 이름 없이 진단 설정만 포함하고 퍼스널컬러를 제거한다', () => {
  const state = core.createInitialState('2026-07-30');

  assert.deepEqual(state.profile, {
    explanationLanguage: '',
    gender: '',
    diagnosisDate: '2026-07-30'
  });
  assert.equal('personalColor' in state.profile, false);
  assert.equal('customerName' in state.profile, false);
  assert.equal('consultantName' in state.profile, false);
});

test('해설 언어·성별·진단일 세 항목을 입력해야 유효하다', () => {
  assert.deepEqual(
    core.validateProfile(validProfile()),
    { valid: true, field: null, error: null }
  );
  assert.equal(core.validateProfile({}).field, 'explanationLanguage');
  assert.equal(
    core.validateProfile(validProfile({ explanationLanguage: 'xx' })).field,
    'explanationLanguage'
  );
  assert.equal(core.validateProfile(validProfile({ gender: 'other' })).field, 'gender');
});

test('기존 퍼스널컬러 프로필 세션은 새 입력 화면으로 초기화한다', () => {
  const legacy = core.createInitialState('2026-07-30');
  legacy.profile = { name: '미유', date: '2026-07-27', personalColor: '여름 쿨' };
  legacy.answers[0] = ['A'];

  const restored = core.restoreState(JSON.stringify(legacy), '2026-07-30');

  assert.deepEqual(restored.profile, core.createInitialState('2026-07-30').profile);
  assert.deepEqual(restored.answers, Array.from({ length: 10 }, () => []));
});

test('이전 이름 필드가 있어도 현재 진단 설정과 답안을 복원한다', () => {
  const saved = core.createInitialState('2026-07-30');
  saved.profile = {
    customerName: '이전 고객',
    consultantName: '이전 컨설턴트',
    explanationLanguage: 'ja',
    gender: 'female',
    diagnosisDate: '2026-07-30'
  };
  saved.answers[0] = ['A'];

  const restored = core.restoreState(JSON.stringify(saved), '2026-08-12');

  assert.deepEqual(restored.profile, {
    explanationLanguage: 'ja',
    gender: 'female',
    diagnosisDate: '2026-07-30'
  });
  assert.deepEqual(restored.answers[0], ['A']);
});


test('PDF 순서의 10문항과 교정 문구를 제공한다', () => {
  assert.equal(core.QUESTIONS.length, 10);
  assert.equal(core.QUESTIONS[0].title, '얼굴형');
  assert.equal(core.QUESTIONS[9].title, '이목구비 강도');
  assert.match(core.QUESTIONS[4].options[3].label, /상향형/);
  assert.doesNotMatch(core.QUESTIONS[4].options[3].label, /샹향형/);
  assert.match(core.QUESTIONS[2].options[2].label, /좁은 이마/);
  assert.equal(core.QUESTIONS[2].options[1].label, '곡선이 자연스럽고 균형 잡힌 이마');
  assert.equal(core.QUESTIONS[6].options[1].label, '부드럽고 강하게 부각되지 않는 코');
  assert.match(core.QUESTIONS[8].options[0].label, /웃상/);
});

test('문항 이미지는 성별에 맞는 경로를 반환한다', () => {
  const option = core.QUESTIONS[0].options[0];

  assert.deepEqual(core.getOptionImages(option, 'female'), [
    'questions/q01-a.png'
  ]);
  assert.deepEqual(core.getOptionImages(option, 'male'), [
    'questions/male/q01-a.png'
  ]);
  assert.deepEqual(core.getOptionImages(option, 'other'), []);
});

test('1~8번은 성별 이미지 배열을 갖고 9~10번은 양쪽 모두 비어 있다', () => {
  const imageOptions = core.QUESTIONS.slice(0, 8).flatMap(question => question.options);
  const textOptions = core.QUESTIONS.slice(8).flatMap(question => question.options);

  for (const option of imageOptions) {
    assert.ok(Array.isArray(option.images.female));
    assert.ok(Array.isArray(option.images.male));
    assert.ok(option.images.female.length > 0);
    assert.equal(option.images.male.length, option.images.female.length);
  }
  for (const option of textOptions) {
    assert.deepEqual(option.images, { female: [], male: [] });
  }

  assert.equal(imageOptions.flatMap(option => option.images.female).length, 34);
});

test('한 문항에서 1개 또는 2개만 선택하고 세 번째는 거절한다', () => {
  const initial = core.createInitialState('2026-07-27');
  const one = core.toggleAnswer(initial, 0, 'A');
  const two = core.toggleAnswer(one.state, 0, 'B');
  const three = core.toggleAnswer(two.state, 0, 'C');

  assert.deepEqual(two.state.answers[0], ['A', 'B']);
  assert.equal(three.error, '최대 2개까지 선택할 수 있어요');
  assert.deepEqual(three.state.answers[0], ['A', 'B']);
});

test('선택한 답을 다시 누르면 해제한다', () => {
  const initial = core.createInitialState('2026-07-27');
  const selected = core.toggleAnswer(initial, 0, 'A');
  const deselected = core.toggleAnswer(selected.state, 0, 'A');

  assert.deepEqual(deselected.state.answers[0], []);
});

test('허용되지 않은 답 코드는 상태에 넣지 않는다', () => {
  const initial = core.createInitialState('2026-07-27');
  const result = core.toggleAnswer(initial, 0, 'E');

  assert.equal(result.error, '선택할 수 없는 답이에요');
  assert.deepEqual(result.state.answers[0], []);
});

test('A와 B를 함께 선택하면 양쪽에 각각 1점을 더한다', () => {
  const answers = [['A', 'B'], ['A'], ['C'], ['D'], [], [], [], [], [], []];

  assert.deepEqual(core.calculateScores(answers), { A: 2, B: 1, C: 1, D: 1 });
});

test('동점 그룹은 공동순위이고 다음 서로 다른 점수가 2위다', () => {
  assert.deepEqual(
    core.calculateDenseRanks({ A: 8, B: 8, C: 6, D: 3 }),
    { A: 1, B: 1, C: 2, D: 3 }
  );
});

test('완료 문항과 현재 도달 문항만 진행표로 이동할 수 있다', () => {
  const answers = [['A'], ['B'], [], [], [], [], [], [], [], []];

  assert.equal(core.firstIncompleteQuestion(answers), 2);
  assert.equal(core.canVisitQuestion(answers, 0), true);
  assert.equal(core.canVisitQuestion(answers, 2), true);
  assert.equal(core.canVisitQuestion(answers, 3), false);
});

test('깨진 저장 데이터는 오늘 날짜의 초기 상태로 복구한다', () => {
  const restored = core.restoreState('{broken', '2026-07-27');

  assert.equal(restored.profile.diagnosisDate, '2026-07-27');
  assert.equal(restored.answers.length, 10);
  assert.equal(restored.selectedType, null);
});

test('저장 상태를 복원할 때 점수는 답변에서 다시 계산한다', () => {
  const saved = core.createInitialState('2026-07-27');
  saved.profile = validProfile({ diagnosisDate: '2026-07-27' });
  saved.answers[0] = ['A', 'B'];
  saved.scores = { A: 99, B: 99, C: 99, D: 99 };

  const restored = core.restoreState(JSON.stringify(saved), '2026-07-28');

  assert.deepEqual(restored.profile, validProfile({ diagnosisDate: '2026-07-27' }));
  assert.deepEqual(restored.scores, { A: 1, B: 1, C: 0, D: 0 });
});

test('12타입 순서와 기존 해설 주소가 PDF 기준으로 일치한다', () => {
  assert.deepEqual(core.TYPES.map(type => type.code), [
    'A-1', 'A-2', 'A-3', 'B-1', 'B-2', 'B-3',
    'C-1', 'C-2', 'C-3', 'D-1', 'D-2', 'D-3'
  ]);
  assert.equal(core.explanationHash('D-1'), '#/cat/13');
  assert.equal(core.explanationHash('D-2'), '#/cat/08');
  assert.equal(core.explanationHash('D-3'), '#/cat/17');
  assert.equal(core.explanationHash('X-9'), '#/index');
});

test('모든 그룹 점수가 같으면 모두 공동 1위이고 2위 그룹은 없다', () => {
  assert.deepEqual(
    core.calculateDenseRanks({ A: 5, B: 5, C: 5, D: 5 }),
    { A: 1, B: 1, C: 1, D: 1 }
  );
});

test('문항별 최대 점수는 10점을 넘지 않는다', () => {
  const answers = Array.from({ length: 10 }, () => ['A', 'B']);

  assert.deepEqual(core.calculateScores(answers), { A: 10, B: 10, C: 0, D: 0 });
});

test('저장 데이터에 세 번째 선택지가 있으면 안전한 초기 상태로 되돌린다', () => {
  const invalid = core.createInitialState('2026-07-27');
  invalid.answers[0] = ['A', 'B', 'C'];

  const restored = core.restoreState(JSON.stringify(invalid), '2026-07-27');

  assert.deepEqual(restored.answers[0], []);
});
