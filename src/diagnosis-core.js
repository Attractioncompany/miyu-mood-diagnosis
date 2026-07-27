(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.MiyuDiagnosisCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const OPTION_CODES = ['A', 'B', 'C', 'D'];

  const QUESTIONS = [
    {
      number: 1,
      title: '얼굴형',
      subtitle: 'Face Shape',
      options: [
        { code: 'A', label: '역삼각형', images: ['questions/q01-a.png'] },
        { code: 'B', label: '계란형', images: ['questions/q01-b.png'] },
        { code: 'C', label: '둥근형 / 긴형', images: ['questions/q01-c-1.png', 'questions/q01-c-2.png'] },
        { code: 'D', label: '각진형', images: ['questions/q01-d.png'] }
      ]
    },
    {
      number: 2,
      title: '턱선',
      subtitle: 'Jawline · 그림표',
      options: [
        { code: 'A', label: '짧은 턱 + 넓은 V', images: ['questions/q02-a.png'] },
        { code: 'B', label: '부드러운 U자 또는 부드러운 각진형 / 무턱', images: ['questions/q02-b.png'] },
        { code: 'C', label: '각진 느낌 + 끝이 평평', images: ['questions/q02-c.png'] },
        { code: 'D', label: '하악각이 발달해 각진 느낌이지만 끝이 뾰족한 V', images: ['questions/q02-d.png'] }
      ]
    },
    {
      number: 3,
      title: '이마',
      subtitle: 'Forehead',
      options: [
        { code: 'A', label: '볼록 나온 이마', images: ['questions/q03-a.png'] },
        { code: 'B', label: '예쁜 이마', images: ['questions/q03-b.png'] },
        { code: 'C', label: '좁은 이마', images: ['questions/q03-c.png'] },
        { code: 'D', label: '이마 눈썹뼈가 튀어나온 이마', images: ['questions/q03-d.png'] }
      ]
    },
    {
      number: 4,
      title: '눈썹',
      subtitle: 'Eyebrows',
      options: [
        { code: 'A', label: '가늘고 연한 눈썹', images: ['questions/q04-a.png'] },
        { code: 'B', label: '둥근 세미 아치 눈썹', images: ['questions/q04-b.png'] },
        { code: 'C', label: '산이 강한 아치 눈썹', images: ['questions/q04-c.png'] },
        { code: 'D', label: '두껍고 눈썹뼈가 발달한 눈썹 (없거나 있거나)', images: ['questions/q04-d.png'] }
      ]
    },
    {
      number: 5,
      title: '눈',
      subtitle: 'Eyes',
      options: [
        { code: 'A', label: '둥근 호 느낌이 강한 눈, 웃지 않을 때 둥근 느낌', images: ['questions/q05-a.png'] },
        { code: 'B', label: '아몬드 모양, 눈꼬리 하향', images: ['questions/q05-b.png'] },
        { code: 'C', label: '아몬드 모양, 눈꼬리 상향', images: ['questions/q05-c.png'] },
        { code: 'D', label: '상향형 날카롭고 뾰족한 각진 눈매', images: ['questions/q05-d.png'] }
      ]
    },
    {
      number: 6,
      title: '광대',
      subtitle: 'Cheekbones',
      options: [
        { code: 'A', label: '평면 / 웃을 때 볼살 생김', images: ['questions/q06-a.png'] },
        { code: 'B', label: '돌출 약함, 정돈됨', images: ['questions/q06-b.png'] },
        { code: 'C', label: '앞광대 평평, 옆광대 발달', images: ['questions/q06-c-1.png', 'questions/q06-c-2.png'] },
        { code: 'D', label: '앞광대 있는 편', images: ['questions/q06-d.png'] }
      ]
    },
    {
      number: 7,
      title: '코',
      subtitle: 'Nose',
      options: [
        { code: 'A', label: '콧볼 있는 둥근 코', images: ['questions/q07-a.png'] },
        { code: 'B', label: '여성스러운 코 (코가 강하게 부각되지 않음)', images: ['questions/q07-b.png'] },
        { code: 'C', label: '콧대가 두껍고 직선 콧대', images: ['questions/q07-c.png'] },
        { code: 'D', label: '콧대가 가늘고 긴 코 (코 길이감 있음)', images: ['questions/q07-d.png'] }
      ]
    },
    {
      number: 8,
      title: '입',
      subtitle: 'Lips',
      options: [
        { code: 'A', label: '입이 가로로 길고 입이 큼 + 큐피드 활 또렷 (무표정일 때 입이 작고, 웃을 때 가로로 길어짐)', images: ['questions/q08-a.png'] },
        { code: 'B', label: '입술이 작고 윗입술이 아랫입술 대비 얇음', images: ['questions/q08-b.png'] },
        { code: 'C', label: '입술산과 립라인이 또렷함', images: ['questions/q08-c.png'] },
        { code: 'D', label: '립라인이 흐리고 입술이 두꺼움', images: ['questions/q08-d.png'] }
      ]
    },
    {
      number: 9,
      title: '무드',
      subtitle: 'Mood · 추구미가 아닌 첫인상, 평소 표정 기준',
      options: [
        { code: 'A', label: '통통 튀는 · 발랄한 · 러블리한 · 동안 · 웃상', images: [] },
        { code: 'B', label: '정석미인 · 우아한 · 고급스러운 · 성숙한', images: [] },
        { code: 'C', label: '동양적인 · 이국적인 · 캐릭터 있는', images: [] },
        { code: 'D', label: '날카로운 · 선명한 · 카리스마 있는', images: [] }
      ]
    },
    {
      number: 10,
      title: '이목구비 강도',
      subtitle: '눈썹, 눈, 코, 입, 턱선, 광대',
      options: [
        { code: 'A', label: '매우 약함 (0~1개)', images: [] },
        { code: 'B', label: '약함 (2개)', images: [] },
        { code: 'C', label: '중간 (3개)', images: [] },
        { code: 'D', label: '강함 (4개 이상)', images: [] }
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

  function createInitialState(today) {
    return {
      version: 17,
      profile: { name: '', date: today, personalColor: '' },
      answers: Array.from({ length: QUESTIONS.length }, () => []),
      currentQuestion: 0,
      scores: { A: 0, B: 0, C: 0, D: 0 },
      selectedType: null
    };
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
      if (parsed.version !== 17 || !isValidAnswers(parsed.answers)) {
        return createInitialState(today);
      }

      const selectedType = parsed.selectedType === null
        || TYPES.some(type => type.code === parsed.selectedType)
        ? parsed.selectedType
        : null;
      return {
        version: 17,
        profile: {
          name: typeof parsed.profile?.name === 'string' ? parsed.profile.name : '',
          date: typeof parsed.profile?.date === 'string' ? parsed.profile.date : today,
          personalColor: typeof parsed.profile?.personalColor === 'string'
            ? parsed.profile.personalColor
            : ''
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
    QUESTIONS,
    TYPES,
    createInitialState,
    toggleAnswer,
    calculateScores,
    calculateDenseRanks,
    firstIncompleteQuestion,
    canVisitQuestion,
    restoreState,
    explanationHash
  };
});
