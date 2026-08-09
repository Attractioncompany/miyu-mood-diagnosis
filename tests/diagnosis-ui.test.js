const test = require('node:test');
const assert = require('node:assert/strict');
const core = require('../src/diagnosis-core.js');
const content = require('../src/explanation-content.js');
const ui = require('../src/diagnosis-ui.js');


function validProfile(overrides = {}) {
  return {
    customerName: '미유',
    consultantName: '김컨설턴트',
    explanationLanguage: 'ja',
    gender: 'female',
    diagnosisDate: '2026-07-30',
    ...overrides
  };
}


function answeredState() {
  const state = core.createInitialState('2026-07-27');
  state.profile = validProfile({ diagnosisDate: '2026-07-27' });
  state.answers = [
    ['A'], ['A', 'B'], ['B'], ['C'], ['D'],
    ['A'], ['B'], ['C'], ['D'], ['A']
  ];
  state.scores = core.calculateScores(state.answers);
  return state;
}


function createMemoryStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem(key) {
      return values.has(key) ? values.get(key) : null;
    },
    setItem(key, value) {
      values.set(key, String(value));
    },
    removeItem(key) {
      values.delete(key);
    }
  };
}


test('시작 화면은 다섯 고객 정보와 로고를 표시하고 퍼스널컬러를 제거한다', () => {
  const html = ui.renderStartView(core.createInitialState('2026-07-27'));

  for (const name of [
    'customerName',
    'consultantName',
    'explanationLanguage',
    'gender',
    'diagnosisDate'
  ]) {
    assert.match(html, new RegExp(`name="${name}"`));
  }
  assert.match(html, /value="2026-07-27"/);
  assert.match(html, /일본어/);
  assert.match(html, /중국어 간체\(중국\)/);
  assert.match(html, /중국어 번체\(홍콩·대만\)/);
  assert.doesNotMatch(html, /personalColor|퍼스널컬러/);
  assert.match(html, /data-asset="logo"/);
});

test('사용자 입력은 HTML로 실행되지 않도록 이스케이프한다', () => {
  const state = core.createInitialState('2026-07-27');
  state.profile.customerName = '<img src=x onerror=alert(1)>';

  const html = ui.renderStartView(state);

  assert.doesNotMatch(html, /<img src=x onerror/);
  assert.match(html, /&lt;img src=x onerror=alert\(1\)&gt;/);
});

test('고객 정보 뒤에는 소개 3장과 브릿지를 거쳐 진단을 시작한다', () => {
  const storage = createMemoryStorage();
  const location = { hash: '#/' };
  const controller = ui.createController({
    storage,
    location,
    confirm: () => true,
    today: () => '2026-08-09'
  });

  assert.deepEqual(controller.start(validProfile()), { error: null, field: null });
  assert.equal(location.hash, '#/diagnosis/intro/1');
  assert.equal(controller.resolveRoute('#/diagnosis/intro/3').kind, 'intro');
  assert.equal(controller.resolveRoute('#/diagnosis/bridge').kind, 'bridge');
  controller.beginDiagnosis();
  assert.equal(location.hash, '#/diagnosis/question/1');
});

test('새 고객의 진단 시작은 이전 고객의 답안과 선택 타입을 초기화한다', () => {
  const previous = answeredState();
  previous.selectedType = 'A-1';
  const storage = createMemoryStorage({
    [ui.STORAGE_KEY]: JSON.stringify(previous)
  });
  const location = { hash: '#/' };
  const controller = ui.createController({
    storage,
    location,
    confirm: () => true,
    today: () => '2026-08-09'
  });

  controller.start(validProfile({ customerName: '새 고객', diagnosisDate: '2026-08-09' }));

  const state = controller.getState();
  assert.deepEqual(state.answers, Array.from({ length: 10 }, () => []));
  assert.deepEqual(state.scores, { A: 0, B: 0, C: 0, D: 0 });
  assert.equal(state.selectedType, null);
  assert.equal(location.hash, '#/diagnosis/intro/1');
});

test('소개 화면은 성별별 B그룹과 선택 언어를 함께 표시한다', () => {
  const female = core.createInitialState('2026-08-09');
  female.profile = validProfile();
  const male = core.createInitialState('2026-08-09');
  male.profile = validProfile({ gender: 'male', explanationLanguage: 'zh-TW' });

  assert.match(ui.renderIntroView(female, 2), /Feminine · フェミニン/);
  assert.match(ui.renderIntroView(male, 2), /Boyish · 清秀少年感/);
  assert.match(ui.renderBridgeView(male), /現在開始進行診斷。/);
});

test('고객 정보 없이 소개와 브릿지 주소를 열면 시작 화면으로 돌아간다', () => {
  const location = { hash: '#/diagnosis/intro/1' };
  const controller = ui.createController({
    storage: createMemoryStorage(),
    location,
    confirm: () => true,
    today: () => '2026-08-09'
  });

  assert.equal(controller.resolveRoute(location.hash).kind, 'redirect');
  assert.equal(location.hash, '#/');
  location.hash = '#/diagnosis/bridge';
  assert.equal(controller.resolveRoute(location.hash).kind, 'redirect');
  assert.equal(location.hash, '#/');
});

test('남성은 여성 전용 레거시 메뉴로 이동하지 않고 해설 결과로 돌아간다', () => {
  const male = validProfile({ gender: 'male' });
  const female = validProfile({ gender: 'female' });
  const location = { hash: '#/macro/B' };

  assert.equal(ui.isMaleLegacyRoute('#/macro/B', male), true);
  assert.equal(ui.isMaleLegacyRoute('#/moodbook/A', male), true);
  assert.equal(ui.isMaleLegacyRoute('#/cat/18', male), false);
  assert.equal(ui.isMaleLegacyRoute('#/macro/B', female), false);
  assert.equal(ui.redirectMaleLegacyRoute('#/macro/B', male, location), true);
  assert.equal(location.hash, '#/diagnosis/result');
});

test('문항 화면은 2×2 선택 카드, 진행표, 이전·다음 버튼을 표시한다', () => {
  const state = core.createInitialState('2026-07-27');
  state.profile.gender = 'female';
  const html = ui.renderQuestionView(state, 4);

  assert.equal((html.match(/class="miyu-answer-card/g) || []).length, 4);
  assert.match(html, /진행표 5\/10/);
  assert.match(html, /data-action="previous"/);
  assert.match(html, /data-action="next"/);
  assert.match(html, /q05-a\.png/);
});

test('체크리스트에는 확대 기능이 없다', () => {
  const state = core.createInitialState('2026-07-30');
  state.profile.gender = 'male';

  const html = ui.renderQuestionView(state, 0);

  assert.match(html, /questions\/male\/q01-a\.png/);
  assert.match(html, /<figure class="miyu-answer-figure">/);
  assert.doesNotMatch(html, /open-image|close-image|miyu-image-zoom|확대/);
});

test('진행표는 완료·현재·남은 문항을 구분하고 미래 문항을 비활성화한다', () => {
  const state = core.createInitialState('2026-07-27');
  state.answers[0] = ['A'];
  const html = ui.renderProgressDrawer(state, 1);

  assert.match(html, /data-status="complete"/);
  assert.match(html, /data-status="current"/);
  assert.match(html, /data-status="remaining"[^>]*disabled/);
});

test('완료 문항으로 돌아간 경우 그 문항을 현재로 표시한다', () => {
  const state = core.createInitialState('2026-07-27');
  state.answers[0] = ['A'];
  state.answers[1] = ['B'];
  const html = ui.renderProgressDrawer(state, 0);
  const firstItem = html.match(/<button class="miyu-progress-item"[\s\S]*?<\/button>/)[0];

  assert.match(firstItem, /data-status="current"/);
});

test('결과는 네 점수와 PDF 순서의 12타입을 모두 표시한다', () => {
  const state = answeredState();
  const html = ui.renderResultView(state);

  assert.equal((html.match(/class="miyu-type-card/g) || []).length, 12);
  assert.ok(html.indexOf('D-1') < html.indexOf('D-2'));
  assert.ok(html.indexOf('D-2') < html.indexOf('D-3'));
  assert.match(html, /카리스마/);
  assert.match(html, /클리어/);
  assert.match(html, /샤프/);
});

test('남성 결과 화면은 B그룹을 보이시로 표시한다', () => {
  const state = answeredState();
  state.profile.gender = 'male';

  const html = ui.renderResultView(state);

  assert.match(html, /Boyish · 보이시/);
  assert.doesNotMatch(html, /Feminine · 페미닌/);
  assert.match(html, /김컨설턴트/);
  assert.match(html, /일본어/);
});

test('고객 해설은 승인한 다섯 섹션 순서로만 표시하고 초안 표기를 숨긴다', () => {
  const html = ui.renderExplanationPanel(
    content.getExplanation('B-2', 'female', 'ja'),
    validProfile()
  );
  const classes = [
    'miyu-facial-features', 'miyu-mood', 'miyu-makeup',
    'miyu-hair', 'miyu-accessory-fashion'
  ];
  const positions = classes.map(name => html.indexOf(name));

  assert.ok(positions.every(position => position >= 0));
  assert.deepEqual(positions, positions.slice().sort((left, right) => left - right));
  assert.match(html, /メイク/);
  assert.doesNotMatch(html, /해설 초안|miyu-draft-badge|검토 메모|>초안</);
  assert.doesNotMatch(html, /data-action="open-image"|miyu-image-modal/);
});

test('해설 패널은 한국어와 선택 언어 및 이미지 슬롯을 함께 표시한다', () => {
  const draft = content.getExplanation('B-1', 'male', 'ja');
  const html = ui.renderExplanationPanel(draft, validProfile({
    gender: 'male',
    diagnosisDate: '2026-07-30'
  }));

  assert.match(html, /한국어/);
  assert.match(html, /日本語/);
  assert.match(html, /김컨설턴트/);
  assert.match(html, /miyu-explanation-visual/);
  assert.match(html, /data-gender="male"/);
  assert.doesNotMatch(html, /해설 초안|miyu-draft-badge/);
});

test('해설 패널은 모든 고객용 섹션을 한국어와 선택 언어로 표시한다', () => {
  const draft = content.getExplanation('C-3', 'female', 'ja');
  const html = ui.renderExplanationPanel(draft, validProfile());

  for (const marker of [
    'miyu-facial-features',
    'miyu-mood',
    'miyu-makeup',
    'miyu-hair',
    'miyu-accessory-fashion',
    'miyu-detail-table',
  ]) assert.match(html, new RegExp(marker));

  for (const label of [
    '이목구비 특징', '顔立ちの特徴',
    '이 무드의 분위기', 'このムードの雰囲気',
    '액세서리 및 패션', 'アクセサリーとファッション',
    '헤어', 'ヘア',
    '메이크업', 'メイク',
  ]) assert.match(html, new RegExp(label));

  assert.match(html, /lang="ko"/);
  assert.match(html, /lang="ja"/);
  assert.equal((html.match(/class="miyu-detail-row/g) || []).length, 10);
  assert.match(html, /ディープシック/);
  assert.match(html, /深く強い雰囲気/);
  assert.match(html, /アーモンド形/);
});

test('남성 해설은 메이크업 대신 그루밍을 두 언어로 표시한다', () => {
  const draft = content.getExplanation('B-1', 'male', 'zh-TW');
  const html = ui.renderExplanationPanel(draft, validProfile({
    explanationLanguage: 'zh-TW',
    gender: 'male'
  }));

  assert.match(html, /그루밍/);
  assert.match(html, /儀容整理/);
  assert.match(html, /lang="zh-Hant"/);
  assert.doesNotMatch(html, />메이크업</);
});

test('1위와 2위 라벨은 카드 상단용 요소로 점수 숫자와 분리한다', () => {
  const state = answeredState();
  const html = ui.renderResultView(state);

  assert.match(html, /miyu-rank-badge/);
  assert.match(html, /data-rank="1"/);
  assert.match(html, /data-rank="2"/);
});

test('타입을 고르기 전 확정 버튼은 비활성화한다', () => {
  const html = ui.renderResultView(answeredState());

  assert.match(html, /data-action="confirm-type"[^>]*disabled/);
});

test('선택한 타입의 확정 버튼은 조사 오류 없이 해설 이동을 안내한다', () => {
  const state = answeredState();
  state.selectedType = 'D-1';
  const html = ui.renderResultView(state);

  assert.match(html, />D-1 카리스마 확정 · 해설 보기<\/button>/);
  assert.doesNotMatch(html, /카리스마으로/);
});

test('컨트롤러는 필수 고객 정보가 없으면 시작하지 않고 유효한 정보는 탭 저장소에 보관한다', () => {
  const storage = createMemoryStorage();
  const location = { hash: '#/' };
  const controller = ui.createController({
    storage,
    location,
    confirm: () => true,
    today: () => '2026-07-27'
  });

  assert.deepEqual(
    controller.start(validProfile({ customerName: '   ' })),
    { error: '고객명을 입력해 주세요', field: 'customerName' }
  );
  assert.equal(location.hash, '#/');

  const result = controller.start(validProfile({
    customerName: ' 미유 ',
    diagnosisDate: '2026-07-28'
  }));
  assert.equal(result.error, null);
  assert.equal(location.hash, '#/diagnosis/intro/1');
  const saved = JSON.parse(storage.getItem(ui.STORAGE_KEY)).profile;
  assert.equal(saved.customerName, '미유');
  assert.equal(saved.consultantName, '김컨설턴트');
  assert.equal(saved.explanationLanguage, 'ja');
  assert.equal(saved.gender, 'female');
});

test('컨트롤러는 새로 만들어도 같은 탭의 답변을 복원한다', () => {
  const storage = createMemoryStorage();
  const location = { hash: '#/' };
  const first = ui.createController({
    storage,
    location,
    confirm: () => true,
    today: () => '2026-07-27'
  });
  first.start(validProfile({ diagnosisDate: '2026-07-27' }));
  first.selectAnswer(0, 'A');

  const restored = ui.createController({
    storage,
    location,
    confirm: () => true,
    today: () => '2026-07-27'
  });

  assert.deepEqual(restored.getState().answers[0], ['A']);
});

test('고객 정보 없이 결과 주소를 직접 열면 시작 화면으로 돌려보낸다', () => {
  const location = { hash: '#/diagnosis/result' };
  const controller = ui.createController({
    storage: createMemoryStorage(),
    location,
    confirm: () => true,
    today: () => '2026-07-27'
  });

  const view = controller.resolveRoute(location.hash);

  assert.equal(view.kind, 'redirect');
  assert.equal(location.hash, '#/');
});

test('최종 타입 확정은 선택만으로 이동하지 않고 별도 확정 때 해설로 이동한다', () => {
  const state = answeredState();
  state.selectedType = null;
  const storage = createMemoryStorage({
    [ui.STORAGE_KEY]: JSON.stringify(state)
  });
  const location = { hash: '#/diagnosis/result' };
  const controller = ui.createController({
    storage,
    location,
    confirm: () => true,
    today: () => '2026-07-27'
  });

  controller.selectType('D-1');
  assert.equal(location.hash, '#/diagnosis/result');

  controller.confirmType();
  assert.equal(location.hash, '#/cat/13');
});
