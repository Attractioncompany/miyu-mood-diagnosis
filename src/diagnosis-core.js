(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.MiyuDiagnosisCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const OPTION_CODES = ['A', 'B', 'C', 'D'];
  const SUPPORTED_LANGUAGES = ['ja', 'zh-CN', 'zh-TW'];
  const SUPPORTED_GENDERS = ['female', 'male'];

  const QUESTIONS = [
    {
      number: 1,
      title: '얼굴형',
      subtitle: 'Face Shape',
      guide: '정면·무표정에서 머리카락을 넘긴 뒤, 이마·광대·턱의 폭과 얼굴 세로 길이를 함께 비교해요.',
      hint: '둥근형은 가로와 세로가 비슷하고, 긴형은 세로 길이가 더 길어요. 두 경우 모두 C로 선택해요.',
      options: [
        { code: 'A', label: '역삼각형', detail: '이마·광대 쪽이 넓고 턱끝으로 갈수록 폭이 좁아져요.', images: { female: ['questions/q01-a.png'], male: ['questions/male/q01-a.png'] } },
        { code: 'B', label: '계란형', detail: '이마·광대·턱의 균형이 자연스럽고 윤곽이 부드럽게 좁아져요.', images: { female: ['questions/q01-b.png'], male: ['questions/male/q01-b.png'] } },
        { code: 'C', label: '둥근형 / 긴형', detail: '윤곽이 둥글거나, 얼굴 세로 길이가 가로보다 확실히 길어요.', images: { female: ['questions/q01-c-1.png', 'questions/q01-c-2.png'], male: ['questions/male/q01-c-1.png', 'questions/male/q01-c-2.png'] } },
        { code: 'D', label: '각진형', detail: '턱의 모서리와 옆 폭이 눈에 띄어 윤곽이 또렷해 보여요.', images: { female: ['questions/q01-d.png'], male: ['questions/male/q01-d.png'] } }
      ]
    },
    {
      number: 2,
      title: '턱선',
      subtitle: 'Jawline · 그림표',
      guide: '정면과 45도 각도에서 턱끝 모양, 턱의 옆 폭, 하악각의 선명함을 봐요.',
      hint: '턱끝이 둥글거나 뒤로 들어가 보여 각이 약하면 B예요. 턱끝이 뾰족한지와 턱 모서리가 강한지는 따로 봐요.',
      options: [
        { code: 'A', label: '짧은 턱 + 넓은 V', detail: '아래턱 길이가 짧고 턱끝이 넓게 모이는 V 형태예요.', images: { female: ['questions/q02-a.png'], male: ['questions/male/q02-a.png'] } },
        { code: 'B', label: '부드러운 U자 / 무턱', detail: '모서리가 강하지 않고 턱끝이 둥글거나 뒤로 들어가 보여요.', images: { female: ['questions/q02-b.png'], male: ['questions/male/q02-b.png'] } },
        { code: 'C', label: '각진 턱 + 평평한 끝', detail: '턱 모서리가 보이고 턱끝이 뾰족하기보다 평평하게 마무리돼요.', images: { female: ['questions/q02-c.png'], male: ['questions/male/q02-c.png'] } },
        { code: 'D', label: '각진 턱 + 뾰족한 V 끝', detail: '하악각은 발달했지만 턱끝은 분명하게 뾰족한 V예요.', images: { female: ['questions/q02-d.png'], male: ['questions/male/q02-d.png'] } }
      ]
    },
    {
      number: 3,
      title: '이마',
      subtitle: 'Forehead',
      guide: '머리카락을 넘긴 정면과 옆모습에서 눈썹부터 헤어라인까지의 높이와 앞으로 나온 정도를 봐요.',
      hint: '이마 자체의 넓이와 눈썹뼈의 돌출은 다를 수 있어요. 눈썹뼈가 도드라지면 D를 우선 확인해요.',
      options: [
        { code: 'A', label: '볼록한 이마', detail: '옆모습에서 이마 중앙이 자연스럽게 앞으로 나온 편이에요.', images: { female: ['questions/q03-a.png'], male: ['questions/male/q03-a.png'] } },
        { code: 'B', label: '곡선이 자연스럽고 균형 잡힌 이마', detail: '높이와 곡선이 과하지 않고 눈썹부터 헤어라인까지 균형 있어요.', images: { female: ['questions/q03-b.png'], male: ['questions/male/q03-b.png'] } },
        { code: 'C', label: '좁은 이마', detail: '눈썹부터 헤어라인까지의 높이가 짧거나 좌우 폭이 좁아 보여요.', images: { female: ['questions/q03-c.png'], male: ['questions/male/q03-c.png'] } },
        { code: 'D', label: '눈썹뼈가 도드라진 이마', detail: '눈썹 위 뼈가 앞으로 나와 윗얼굴 윤곽이 또렷해 보여요.', images: { female: ['questions/q03-d.png'], male: ['questions/male/q03-d.png'] } }
      ]
    },
    {
      number: 4,
      title: '눈썹',
      subtitle: 'Eyebrows',
      guide: '눈썹 메이크업보다 본래 모량·두께·산의 각도와 눈썹뼈의 존재감을 먼저 봐요.',
      hint: '눈썹이 두껍고 진하거나 눈썹뼈가 도드라지면 D예요. 두 조건이 모두 있어야 하는 것은 아니에요.',
      options: [
        { code: 'A', label: '가늘고 연한 눈썹', detail: '모량이나 색이 옅고 선이 가늘어 눈썹 존재감이 약해 보여요.', images: { female: ['questions/q04-a.png'], male: ['questions/male/q04-a.png'] } },
        { code: 'B', label: '둥근 세미 아치 눈썹', detail: '눈썹산이 급하지 않고 둥근 곡선으로 부드럽게 이어져요.', images: { female: ['questions/q04-b.png'], male: ['questions/male/q04-b.png'] } },
        { code: 'C', label: '산이 강한 아치 눈썹', detail: '중간의 눈썹산이 분명해 각도와 높이가 눈에 띄어요.', images: { female: ['questions/q04-c.png'], male: ['questions/male/q04-c.png'] } },
        { code: 'D', label: '두껍고 진한 눈썹 / 도드라진 눈썹뼈', detail: '눈썹 자체가 굵고 진하거나, 눈썹 위 뼈가 도드라져 보여요.', images: { female: ['questions/q04-d.png'], male: ['questions/male/q04-d.png'] } }
      ]
    },
    {
      number: 5,
      title: '눈',
      subtitle: 'Eyes',
      guide: '무표정 정면에서 눈의 세로 열림, 눈꼬리 방향, 눈매 선의 둥글고 날카로운 정도를 봐요.',
      hint: 'C와 D 모두 상향일 수 있어요. 눈꼬리만 살짝 올라가면 C, 선 자체가 곧고 날카로우면 D예요.',
      options: [
        { code: 'A', label: '둥근 호 느낌의 눈', detail: '무표정에서도 세로 열림이 느껴지고 눈매가 둥글게 보여요.', images: { female: ['questions/q05-a.png'], male: ['questions/male/q05-a.png'] } },
        { code: 'B', label: '하향 아몬드 눈', detail: '가로로 긴 아몬드형이며 바깥 눈꼬리가 살짝 아래로 향해요.', images: { female: ['questions/q05-b.png'], male: ['questions/male/q05-b.png'] } },
        { code: 'C', label: '상향 아몬드 눈', detail: '가로로 긴 아몬드형이며 바깥 눈꼬리가 살짝 위로 향해요.', images: { female: ['questions/q05-c.png'], male: ['questions/male/q05-c.png'] } },
        { code: 'D', label: '상향형 날카로운 눈매', detail: '눈꼬리가 올라가고 눈매 선 자체가 곧고 각지게 느껴져요.', images: { female: ['questions/q05-d.png'], male: ['questions/male/q05-d.png'] } }
      ]
    },
    {
      number: 6,
      title: '광대',
      subtitle: 'Cheekbones',
      guide: '정면과 45도 각도에서 눈 아래 앞광대와 얼굴 옆쪽 광대 중 어느 지점이 더 도드라지는지 봐요.',
      hint: '웃을 때만 볼살이 생기는 경우는 A예요. 앞광대는 코 옆·눈 아래, 옆광대는 얼굴 가장자리의 폭을 봐요.',
      options: [
        { code: 'A', label: '평면 / 웃을 때 볼살', detail: '무표정에서는 평평하고, 웃을 때만 볼살 볼륨이 생겨요.', images: { female: ['questions/q06-a.png'], male: ['questions/male/q06-a.png'] } },
        { code: 'B', label: '돌출이 약한 정돈형', detail: '앞·옆광대가 강하게 튀어나오지 않고 얼굴선 안에 정돈돼 보여요.', images: { female: ['questions/q06-b.png'], male: ['questions/male/q06-b.png'] } },
        { code: 'C', label: '옆광대 발달형', detail: '앞쪽은 평평하지만 얼굴 옆 가장자리 폭이 도드라져 보여요.', images: { female: ['questions/q06-c-1.png', 'questions/q06-c-2.png'], male: ['questions/male/q06-c-1.png', 'questions/male/q06-c-2.png'] } },
        { code: 'D', label: '앞광대 발달형', detail: '눈 아래·코 옆의 앞광대가 앞으로 볼륨감 있게 보여요.', images: { female: ['questions/q06-d.png'], male: ['questions/male/q06-d.png'] } }
      ]
    },
    {
      number: 7,
      title: '코',
      subtitle: 'Nose',
      guide: '정면에서는 콧볼과 콧대 폭을, 옆모습에서는 콧대의 직선·길이·끝 모양을 함께 봐요.',
      hint: '콧볼의 존재감은 A, 콧대의 굵고 곧은 선은 C, 가늘고 긴 세로감은 D를 우선 확인해요.',
      options: [
        { code: 'A', label: '콧볼 있는 둥근 코', detail: '코끝이 둥글고 정면에서 콧볼의 폭과 존재감이 보여요.', images: { female: ['questions/q07-a.png'], male: ['questions/male/q07-a.png'] } },
        { code: 'B', label: '부드럽고 강하게 부각되지 않는 코', detail: '콧대·코끝·콧볼이 어느 한쪽으로 강하게 부각되지 않아요.', images: { female: ['questions/q07-b.png'], male: ['questions/male/q07-b.png'] } },
        { code: 'C', label: '굵고 직선인 콧대', detail: '콧대가 비교적 두껍고 시작부터 끝까지 곧은 선이 분명해요.', images: { female: ['questions/q07-c.png'], male: ['questions/male/q07-c.png'] } },
        { code: 'D', label: '가늘고 긴 콧대', detail: '콧대 폭이 가늘고 눈썹부터 코끝까지 세로 길이감이 느껴져요.', images: { female: ['questions/q07-d.png'], male: ['questions/male/q07-d.png'] } }
      ]
    },
    {
      number: 8,
      title: '입',
      subtitle: 'Lips',
      guide: '무표정의 립라인·입술 두께를 먼저 보고, 웃을 때 입꼬리보다 가로 폭이 얼마나 넓어지는지도 확인해요.',
      hint: '입 크기와 립라인의 선명함은 별개예요. 무표정에서는 작아 보여도 웃을 때 폭이 크게 넓어지면 A가 될 수 있어요.',
      options: [
        { code: 'A', label: '웃을 때 가로 폭이 넓은 입', detail: '무표정에서는 작아 보여도 웃을 때 가로 폭이 확실히 넓어지고 입술산이 보여요.', images: { female: ['questions/q08-a.png'], male: ['questions/male/q08-a.png'] } },
        { code: 'B', label: '작고 얇은 윗입술', detail: '입 전체 크기가 작고 윗입술이 아랫입술보다 확실히 얇아요.', images: { female: ['questions/q08-b.png'], male: ['questions/male/q08-b.png'] } },
        { code: 'C', label: '또렷한 입술산과 립라인', detail: '입술 두께와 관계없이 입술산·바깥 윤곽선이 선명하게 보여요.', images: { female: ['questions/q08-c.png'], male: ['questions/male/q08-c.png'] } },
        { code: 'D', label: '흐린 립라인과 도톰한 입술', detail: '바깥 윤곽선이 부드럽고 입술 자체의 볼륨감이 도드라져요.', images: { female: ['questions/q08-d.png'], male: ['questions/male/q08-d.png'] } }
      ]
    },
    {
      number: 9,
      title: '무드',
      subtitle: 'Mood · 추구미가 아닌 첫인상, 평소 표정 기준',
      guide: '헤어·메이크업·옷·추구미를 제외하고, 무표정에 가까운 얼굴을 처음 3초 봤을 때의 인상으로 선택해요.',
      hint: '한 인상만 고르기 어렵다면 두 가지가 모두 분명할 때만 최대 2개를 선택해요. 좋고 나쁨을 판단하는 문항은 아니에요.',
      options: [
        { code: 'A', label: '밝고 사랑스러운 · 동안 · 웃상', detail: '발랄하고 동안으로 느껴지며 표정이 밝거나 웃는 인상이 나요.', images: { female: [], male: [] } },
        { code: 'B', label: '우아하고 성숙한 인상', detail: '정석적이고 차분하며 고급스러운 분위기가 먼저 느껴져요.', images: { female: [], male: [] } },
        { code: 'C', label: '개성 있고 깊이 있는 인상', detail: '동양적·이국적 인상 또는 뚜렷한 캐릭터성이 느껴져요.', images: { female: [], male: [] } },
        { code: 'D', label: '선명하고 카리스마 있는 인상', detail: '도회적이고 날카로운 선명함이 첫인상에서 느껴져요.', images: { female: [], male: [] } }
      ]
    },
    {
      number: 10,
      title: '이목구비 강도',
      subtitle: '눈썹, 눈, 코, 입, 턱선, 광대',
      guide: '눈썹·눈·코·입·턱선·광대 중 크기·두께·각도·돌출이 첫눈에 분명한 요소의 개수를 세요.',
      hint: '강도는 매력이나 좋고 나쁨이 아니에요. 평소 표정에서 특징이 뚜렷하게 보이는 요소만 하나씩 세요.',
      options: [
        { code: 'A', label: '매우 약함 (0~1개)', detail: '첫인상에서 분명한 요소가 0개 또는 1개예요.', images: { female: [], male: [] } },
        { code: 'B', label: '약함 (2개)', detail: '첫인상에서 분명한 요소가 2개예요.', images: { female: [], male: [] } },
        { code: 'C', label: '중간 (3개)', detail: '첫인상에서 분명한 요소가 3개예요.', images: { female: [], male: [] } },
        { code: 'D', label: '강함 (4개 이상)', detail: '첫인상에서 분명한 요소가 4개 이상이에요.', images: { female: [], male: [] } }
      ]
    }
  ];

  const TYPES = [
    { code: 'A-1', group: 'A', name: '판타지', image: 'types/a-1.png', hash: '#/cat/01' },
    { code: 'A-2', group: 'A', name: '프루티', image: 'types/a-2.png', hash: '#/cat/03' },
    { code: 'A-3', group: 'A', name: '소다', image: 'types/a-3.png', hash: '#/cat/07' },
    { code: 'B-1', group: 'B', name: '로맨틱', image: 'types/b-1.png', hash: '#/cat/05' },
    { code: 'B-2', group: 'B', name: '소프트', image: 'types/b-2.png', hash: '#/cat/06' },
    { code: 'B-3', group: 'B', name: '엘레강스', image: 'types/b-3.png', hash: '#/cat/09' },
    { code: 'C-1', group: 'C', name: '빈티지', image: 'types/c-1.png', hash: '#/cat/12' },
    { code: 'C-2', group: 'C', name: '세련', image: 'types/c-2.png', hash: '#/cat/16' },
    { code: 'C-3', group: 'C', name: '딥시크', image: 'types/c-3.png', hash: '#/cat/18' },
    { code: 'D-1', group: 'D', name: '카리스마', image: 'types/d-1.png', hash: '#/cat/13' },
    { code: 'D-2', group: 'D', name: '클리어', image: 'types/d-2.png', hash: '#/cat/08' },
    { code: 'D-3', group: 'D', name: '샤프', image: 'types/d-3.png', hash: '#/cat/17' }
  ];

  function emptyProfile(today) {
    return {
      explanationLanguage: '',
      gender: '',
      diagnosisDate: today
    };
  }

  function createInitialState(today) {
    return {
      version: 17,
      profile: emptyProfile(today),
      answers: Array.from({ length: QUESTIONS.length }, () => []),
      currentQuestion: 0,
      scores: { A: 0, B: 0, C: 0, D: 0 },
      selectedType: null
    };
  }

  function getOptionImages(option, gender) {
    if (!SUPPORTED_GENDERS.includes(gender)) return [];
    return Array.isArray(option.images?.[gender]) ? option.images[gender] : [];
  }

  function validateProfile(profile) {
    const required = [
      ['explanationLanguage', '해설 언어를 선택해 주세요'],
      ['gender', '성별을 선택해 주세요'],
      ['diagnosisDate', '진단일을 입력해 주세요']
    ];
    for (const [field, error] of required) {
      if (!String(profile?.[field] || '').trim()) {
        return { valid: false, field, error };
      }
    }
    if (!SUPPORTED_LANGUAGES.includes(profile.explanationLanguage)) {
      return {
        valid: false,
        field: 'explanationLanguage',
        error: '해설 언어를 다시 선택해 주세요'
      };
    }
    if (!SUPPORTED_GENDERS.includes(profile.gender)) {
      return { valid: false, field: 'gender', error: '성별을 다시 선택해 주세요' };
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(profile.diagnosisDate)) {
      return { valid: false, field: 'diagnosisDate', error: '진단일을 다시 확인해 주세요' };
    }
    return { valid: true, field: null, error: null };
  }

  function calculateScores(answers) {
    const scores = { A: 0, B: 0, C: 0, D: 0 };
    answers.forEach(answer => {
      answer.forEach(code => {
        if (OPTION_CODES.includes(code)) scores[code] += 1;
      });
    });
    return scores;
  }

  function calculateDenseRanks(scores) {
    const values = Array.from(new Set(Object.values(scores))).sort((a, b) => b - a);
    return Object.fromEntries(
      OPTION_CODES.map(code => [code, values.indexOf(scores[code]) + 1])
    );
  }

  function toggleAnswer(state, questionIndex, optionCode) {
    if (!OPTION_CODES.includes(optionCode)) {
      return { state, error: '선택할 수 없는 답이에요' };
    }
    if (!Number.isInteger(questionIndex) || questionIndex < 0 || questionIndex >= QUESTIONS.length) {
      return { state, error: '선택할 수 없는 문항이에요' };
    }

    const current = state.answers[questionIndex] || [];
    let next;
    if (current.includes(optionCode)) {
      next = current.filter(code => code !== optionCode);
    } else if (current.length >= 2) {
      return { state, error: '최대 2개까지 선택할 수 있어요' };
    } else {
      next = [...current, optionCode];
    }

    const answers = state.answers.map((answer, index) =>
      index === questionIndex ? next : [...answer]
    );
    return {
      state: { ...state, answers, scores: calculateScores(answers) },
      error: null
    };
  }

  function firstIncompleteQuestion(answers) {
    const index = answers.findIndex(answer => answer.length === 0);
    return index === -1 ? QUESTIONS.length : index;
  }

  function canVisitQuestion(answers, targetIndex) {
    return Number.isInteger(targetIndex)
      && targetIndex >= 0
      && targetIndex <= firstIncompleteQuestion(answers)
      && targetIndex < QUESTIONS.length;
  }

  function isValidAnswers(answers) {
    return Array.isArray(answers)
      && answers.length === QUESTIONS.length
      && answers.every(answer =>
        Array.isArray(answer)
        && answer.length <= 2
        && new Set(answer).size === answer.length
        && answer.every(code => OPTION_CODES.includes(code))
      );
  }

  function restoreState(serialized, today) {
    if (!serialized) return createInitialState(today);
    try {
      const parsed = JSON.parse(serialized);
      if (
        parsed.version !== 17
        || !isValidAnswers(parsed.answers)
        || !validateProfile(parsed.profile).valid
      ) {
        return createInitialState(today);
      }

      const selectedType = parsed.selectedType === null
        || TYPES.some(type => type.code === parsed.selectedType)
        ? parsed.selectedType
        : null;
      return {
        version: 17,
        profile: {
          explanationLanguage: parsed.profile.explanationLanguage,
          gender: parsed.profile.gender,
          diagnosisDate: parsed.profile.diagnosisDate
        },
        answers: parsed.answers.map(answer => [...answer]),
        currentQuestion: Number.isInteger(parsed.currentQuestion)
          ? Math.min(9, Math.max(0, parsed.currentQuestion))
          : 0,
        scores: calculateScores(parsed.answers),
        selectedType
      };
    } catch (error) {
      return createInitialState(today);
    }
  }

  function explanationHash(typeCode) {
    return TYPES.find(type => type.code === typeCode)?.hash || '#/index';
  }

  return {
    OPTION_CODES,
    SUPPORTED_LANGUAGES,
    SUPPORTED_GENDERS,
    QUESTIONS,
    TYPES,
    createInitialState,
    getOptionImages,
    validateProfile,
    toggleAnswer,
    calculateScores,
    calculateDenseRanks,
    firstIncompleteQuestion,
    canVisitQuestion,
    restoreState,
    explanationHash
  };
});
