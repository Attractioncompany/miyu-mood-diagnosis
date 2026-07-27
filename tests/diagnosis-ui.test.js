const test = require('node:test');
const assert = require('node:assert/strict');
const core = require('../src/diagnosis-core.js');
const ui = require('../src/diagnosis-ui.js');


function answeredState() {
  const state = core.createInitialState('2026-07-27');
  state.profile = { name: '미유', date: '2026-07-27', personalColor: '여름 쿨' };
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


test('시작 화면은 이름 필수, 날짜, 퍼스널컬러와 로고를 표시한다', () => {
  const html = ui.renderStartView(core.createInitialState('2026-07-27'));

  assert.match(html, /name="clientName"/);
  assert.match(html, /required/);
  assert.match(html, /value="2026-07-27"/);
  assert.match(html, /name="personalColor"/);
  assert.match(html, /data-asset="logo"/);
});

test('사용자 입력은 HTML로 실행되지 않도록 이스케이프한다', () => {
  const state = core.createInitialState('2026-07-27');
  state.profile.name = '<img src=x onerror=alert(1)>';

  const html = ui.renderStartView(state);

  assert.doesNotMatch(html, /<img src=x onerror/);
  assert.match(html, /&lt;img src=x onerror=alert\(1\)&gt;/);
});

test('문항 화면은 2×2 선택 카드, 진행표, 이전·다음 버튼을 표시한다', () => {
  const html = ui.renderQuestionView(core.createInitialState('2026-07-27'), 4);

  assert.equal((html.match(/class="miyu-answer-card/g) || []).length, 4);
  assert.match(html, /진행표 5\/10/);
  assert.match(html, /data-action="previous"/);
  assert.match(html, /data-action="next"/);
  assert.match(html, /q05-a\.png/);
});

test('이미지 확대 버튼은 선택 버튼 안에 중첩되지 않는다', () => {
  const html = ui.renderQuestionView(core.createInitialState('2026-07-27'), 4);
  const selectButtons = Array.from(
    html.matchAll(/<button[^>]*data-action="select-answer"[\s\S]*?<\/button>/g),
    match => match[0]
  );

  assert.equal(selectButtons.length, 4);
  selectButtons.forEach(button => assert.doesNotMatch(button, /data-action="open-image"/));
  assert.match(html, /data-action="open-image"/);
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

test('컨트롤러는 이름 없이는 시작하지 않고 유효한 정보는 탭 저장소에 보관한다', () => {
  const storage = createMemoryStorage();
  const location = { hash: '#/' };
  const controller = ui.createController({
    storage,
    location,
    confirm: () => true,
    today: () => '2026-07-27'
  });

  assert.equal(controller.start({ name: '   ', date: '2026-07-27', personalColor: '' }).error, '이름을 입력해 주세요');
  assert.equal(location.hash, '#/');

  const result = controller.start({ name: ' 미유 ', date: '2026-07-28', personalColor: '여름 쿨' });
  assert.equal(result.error, null);
  assert.equal(location.hash, '#/diagnosis/question/1');
  assert.equal(JSON.parse(storage.getItem(ui.STORAGE_KEY)).profile.name, '미유');
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
  first.start({ name: '미유', date: '2026-07-27', personalColor: '' });
  first.selectAnswer(0, 'A');

  const restored = ui.createController({
    storage,
    location,
    confirm: () => true,
    today: () => '2026-07-27'
  });

  assert.deepEqual(restored.getState().answers[0], ['A']);
});

test('결과 주소를 직접 열어도 미완료 문항으로 돌려보낸다', () => {
  const location = { hash: '#/diagnosis/result' };
  const controller = ui.createController({
    storage: createMemoryStorage(),
    location,
    confirm: () => true,
    today: () => '2026-07-27'
  });

  const view = controller.resolveRoute(location.hash);

  assert.equal(view.kind, 'redirect');
  assert.equal(location.hash, '#/diagnosis/question/1');
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
