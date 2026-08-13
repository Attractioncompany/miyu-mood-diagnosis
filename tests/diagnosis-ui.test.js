const test = require('node:test');
const assert = require('node:assert/strict');
const core = require('../src/diagnosis-core.js');
const content = require('../src/explanation-content.js');
const ui = require('../src/diagnosis-ui.js');


function validProfile(overrides = {}) {
  return {
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


test('시작 화면은 이름 없이 세 진단 설정과 로고를 표시한다', () => {
  const html = ui.renderStartView(core.createInitialState('2026-07-27'));

  for (const name of [
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
  assert.doesNotMatch(html, /name="customerName"|name="consultantName"/);
  assert.doesNotMatch(html, /10개의 항목을 차례로 확인해 주세요/);
  assert.match(html, /data-asset="logo"/);
  assert.match(html, /class="miyu-start-utility"[\s\S]*data-action="open-explanation-picker"/);
  assert.ok(
    html.indexOf('miyu-start-utility') < html.indexOf('<form class="miyu-profile-form"'),
    '해설 바로보기는 진단 시작 폼과 분리된 보조 영역에 있어야 한다'
  );
});

test('진단 없이 여는 해설은 URL의 성별·언어·타입으로 선택 화면과 해설을 표시한다', () => {
  const location = { hash: '#/explanation/female/ja' };
  const controller = ui.createController({
    storage: createMemoryStorage(),
    location,
    confirm: () => true,
    today: () => '2026-08-13'
  });

  const picker = controller.resolveRoute(location.hash);
  assert.equal(picker.kind, 'explanation-picker');
  assert.equal(picker.profile.gender, 'female');
  assert.equal(picker.profile.explanationLanguage, 'ja');

  const explanation = controller.resolveRoute('#/explanation/male/zh-TW/b-1/1');
  assert.equal(explanation.kind, 'public-explanation');
  assert.equal(explanation.profile.gender, 'male');
  assert.equal(explanation.typeCode, 'B-1');
});

test('사용자 입력은 HTML로 실행되지 않도록 이스케이프한다', () => {
  const state = core.createInitialState('2026-07-27');
  state.profile.diagnosisDate = '<img src=x onerror=alert(1)>';

  const html = ui.renderStartView(state);

  assert.doesNotMatch(html, /<img src=x onerror/);
  assert.match(html, /&lt;img src=x onerror=alert\(1\)&gt;/);
});

test('진단 설정 뒤에는 소개 3장과 브릿지를 거쳐 진단을 시작한다', () => {
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

  controller.start(validProfile({ diagnosisDate: '2026-08-09' }));

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

test('소개 2페이지는 네 개의 얼굴 카드와 두 언어를 표시한다', () => {
  const state = core.createInitialState('2026-08-09');
  state.profile = validProfile({ explanationLanguage: 'ja' });

  const html = ui.renderIntroView(state, 2);

  assert.equal((html.match(/miyu-intro-group-face/g) || []).length, 4);
  assert.equal((html.match(/miyu-intro-face-frame/g) || []).length, 4);
  assert.match(html, /reference\/intro\/a\.jpg/);
  assert.match(html, /화사하고 사랑스러운/);
  assert.match(html, /華やかで愛らしい/);
});

test('남성 소개와 결과 타입 카드는 여성 전용 이미지를 참조하지 않는다', () => {
  const state = answeredState();
  state.profile.gender = 'male';

  const intro = ui.renderIntroView(state, 2);
  const result = ui.renderResultView(state);

  assert.match(intro, /reference\/average\/male\/a-2\.jpg/);
  assert.doesNotMatch(intro, /reference\/intro\/a\.jpg/);
  assert.match(result, /reference\/average\/male\/a-1\.jpg/);
  assert.doesNotMatch(result, /types\/a-1\.png/);
});

test('브릿지는 컨설턴트가 진단하고 결과를 설명한다고 안내한다', () => {
  const state = core.createInitialState('2026-08-09');
  state.profile = validProfile({ explanationLanguage: 'ja' });

  const html = ui.renderBridgeView(state);

  assert.match(html, /컨설턴트가 고객님의 얼굴 특징을 바탕으로 진단/);
  assert.match(html, /コンサルタント.*診断/);
  assert.doesNotMatch(html, /사진을 보며.*골라/);
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

test('문항 화면은 공통 안내와 문항별 판단 기준 및 선택지 설명을 표시한다', () => {
  const state = core.createInitialState('2026-07-27');
  state.profile.gender = 'female';
  const html = ui.renderQuestionView(state, 7);

  assert.match(html, /정면·무표정 기준/);
  assert.match(html, /입꼬리보다 가로 폭/);
  assert.match(html, /무표정에서는 작아 보여도/);
  assert.match(html, /miyu-question-guidance/);
  assert.match(html, /miyu-option-detail/);
});

test('모든 진단 문항은 컨설턴트용 판단 기준과 헷갈릴 때 확인 포인트를 가진다', () => {
  for (const question of core.QUESTIONS) {
    assert.ok(question.guide, `${question.number}번 판단 기준이 필요합니다`);
    assert.ok(question.hint, `${question.number}번 확인 포인트가 필요합니다`);
    assert.equal(question.options.filter(option => !option.detail).length, 0);
  }
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
  assert.match(html, /무드 진단 결과/);
  assert.match(html, /일본어/);
});

test('고객 해설은 병합된 정체성부터 다섯 섹션 순서로 표시하고 초안 표기를 숨긴다', () => {
  const draft = content.getExplanation('B-2', 'female', 'ja');
  const html = draft.pages.map((_, index) => ui.renderExplanationPanel(draft, validProfile(), index)).join('');
  const classes = [
    'miyu-identity', 'miyu-facial-features', 'miyu-mood', 'miyu-makeup',
    'miyu-hair', 'miyu-accessory-fashion'
  ];
  const positions = classes.map(name => html.indexOf(name));

  assert.ok(positions.every(position => position >= 0));
  assert.deepEqual(positions, positions.slice().sort((left, right) => left - right));
  assert.match(html, /メイク/);
  assert.doesNotMatch(html, /해설 초안|miyu-draft-badge|검토 메모|>초안</);
  assert.doesNotMatch(html, /data-action="open-image"|miyu-image-modal/);
});

test('해설 첫 페이지는 한국어·선택 언어·평균 얼굴·무드 설명을 함께 표시한다', () => {
  const draft = content.getExplanation('B-1', 'male', 'ja');
  const html = ui.renderExplanationPanel(draft, validProfile({
    gender: 'male',
    diagnosisDate: '2026-07-30'
  }), 0);

  assert.match(html, /lang="ko"/);
  assert.match(html, /lang="ja"/);
  assert.match(html, /진단일/);
  assert.doesNotMatch(html, /<dt>고객<\/dt>|<dt>컨설턴트<\/dt>/);
  assert.match(html, /miyu-explanation-visual/);
  assert.match(html, /miyu-facial-features/);
  assert.match(html, /miyu-mood/);
  assert.match(html, /data-gender="male"/);
  assert.doesNotMatch(html, /해설 초안|miyu-draft-badge/);
});

test('해설은 평균 얼굴을 이목구비 특징보다 먼저, 스타일 사진과 함께 표시한다', () => {
  const draft = content.getExplanation('B-2', 'female', 'ja');
  const facial = ui.renderExplanationPanel(draft, validProfile(), 0);
  const makeup = ui.renderExplanationPanel(draft, validProfile(), 3);
  const hair = ui.renderExplanationPanel(draft, validProfile(), 5);

  assert.match(facial, /miyu-average-face/);
  assert.match(facial, /miyu-facial-features/);
  assert.match(makeup, /miyu-makeup-examples/);
  assert.match(hair, /miyu-hair-examples/);
  assert.match(makeup, /추천 메이크업/);
  assert.match(makeup, /おすすめのメイク/);
});

test('추천 메이크업 페이지는 PPT의 네 설명 축과 추천 목록을 따로 표시한다', () => {
  const draft = content.getExplanation('B-1', 'female', 'ja');
  const html = ui.renderExplanationPanel(draft, validProfile(), 3);

  for (const label of ['피부 표현', '색감', '전체 느낌', '살릴 포인트']) {
    assert.match(html, new RegExp(label));
  }
  assert.match(html, /로즈핑크 메이크업/);
  assert.match(html, /ローズピンク/);
  assert.match(html, /miyu-guide-detail-card/);
  assert.match(html, /miyu-guide-list/);
});

test('피하면 좋은 헤어 페이지는 PPT 회피 스타일을 목록으로 따로 표시한다', () => {
  const draft = content.getExplanation('A-1', 'female', 'ja');
  const html = ui.renderExplanationPanel(draft, validProfile(), 6);

  assert.match(html, /슬릭백/);
  assert.match(html, /オールバック/);
  assert.match(html, /miyu-guide-list/);
});

test('해설 패널은 한 타입 정체성과 상단의 다른 타입 보기·하단 페이지 이동 버튼을 표시한다', () => {
  const state = answeredState();
  state.selectedType = 'A-1';
  const draft = content.getExplanation('A-1', 'female', 'ja');

  const html = ui.renderExplanationPanel(draft, state.profile, 0);

  assert.match(html, /class="miyu-type-identity"/);
  assert.match(html, /블로썸 · A-1 판타지/);
  assert.match(html, /ブロッサム · A-1 ファンタジー/);
  assert.doesNotMatch(html, /Blossom · 블로썸 · A-1/);
  assert.match(html, /data-action="explanation-next"/);
  assert.match(html, /class="miyu-explanation-utility"[\s\S]*data-action="open-explanation-picker"/);
  const pager = html.slice(html.indexOf('<footer class="miyu-explanation-pager">'));
  assert.doesNotMatch(pager, /open-explanation-picker/);
  assert.match(html, /miyu-mood/);
  assert.doesNotMatch(html, /miyu-hair/);
});

test('해설 패널은 패션 레퍼런스와 데일리 코디를 한국어와 선택 언어로 표시한다', () => {
  const draft = content.getExplanation('C-3', 'female', 'ja');
  const html = draft.pages.map((_, index) => ui.renderExplanationPanel(draft, validProfile(), index)).join('');

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
    '스타일 레퍼런스', 'スタイル参考',
    '데일리 코디 제안', 'デイリーコーデ提案',
    '추천 헤어', 'おすすめのヘア',
    '추천 메이크업', 'おすすめのメイク',
    '피하면 좋은 헤어', '控えたいヘア',
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
  }), 3);

  assert.match(html, /그루밍/);
  assert.match(html, /推薦的妝容與儀容/);
  assert.match(html, /儀容示例/);
  assert.match(html, /lang="zh-Hant"/);
  assert.doesNotMatch(html, />메이크업</);
});

test('남성 그루밍은 대분류 공용 사진이 아니라 타입별 생성 참고 이미지를 쓴다', () => {
  const draft = content.getExplanation('C-3', 'male', 'ja');
  const html = ui.renderExplanationPanel(draft, validProfile({ gender: 'male' }), 3);

  assert.equal(draft.sections.makeup.examples[0].image, 'reference/male/grooming-detail/c-3/1.jpg');
  assert.match(html, /data-asset="reference\/male\/grooming-detail\/c-3\/1\.jpg"/);
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

test('컨트롤러는 필수 진단 설정이 없으면 시작하지 않고 유효한 설정은 탭 저장소에 보관한다', () => {
  const storage = createMemoryStorage();
  const location = { hash: '#/' };
  const controller = ui.createController({
    storage,
    location,
    confirm: () => true,
    today: () => '2026-07-27'
  });

  assert.deepEqual(
    controller.start(validProfile({ explanationLanguage: '' })),
    { error: '해설 언어를 선택해 주세요', field: 'explanationLanguage' }
  );
  assert.equal(location.hash, '#/');

  const result = controller.start(validProfile({ diagnosisDate: '2026-07-28' }));
  assert.equal(result.error, null);
  assert.equal(location.hash, '#/diagnosis/intro/1');
  const saved = JSON.parse(storage.getItem(ui.STORAGE_KEY)).profile;
  assert.deepEqual(saved, validProfile({ diagnosisDate: '2026-07-28' }));
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

test('최종 타입 확정은 선택만으로 이동하지 않고 새 해설 첫 페이지로 이동한다', () => {
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
  assert.equal(location.hash, '#/diagnosis/explanation/d-1/1');
  assert.equal(controller.resolveRoute(location.hash).kind, 'explanation');
});

test('해설 주소는 선택한 최종 타입의 페이지 범위 안에서만 연다', () => {
  const state = answeredState();
  state.selectedType = 'C-2';
  const location = { hash: '#/diagnosis/explanation/c-2/999' };
  const controller = ui.createController({
    storage: createMemoryStorage({ [ui.STORAGE_KEY]: JSON.stringify(state) }),
    location,
    confirm: () => true,
    today: () => '2026-07-27'
  });

  const view = controller.resolveRoute(location.hash);

  assert.equal(view.kind, 'explanation');
  assert.equal(view.typeCode, 'C-2');
  assert.equal(view.pageIndex, 8);
});
