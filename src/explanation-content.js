(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.MiyuExplanationContent = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const LANGUAGES = {
    ja: { inputLabel: '일본어', displayLabel: '日本語', htmlLang: 'ja' },
    'zh-CN': { inputLabel: '중국어 간체(중국)', displayLabel: '简体中文', htmlLang: 'zh-CN' },
    'zh-TW': {
      inputLabel: '중국어 번체(홍콩·대만)',
      displayLabel: '繁體中文',
      htmlLang: 'zh-Hant'
    }
  };

  const GROUP_NAMES = {
    female: {
      A: 'Blossom · 블로썸',
      B: 'Feminine · 페미닌',
      C: 'Mood · 무드',
      D: 'Modern · 모던'
    },
    male: {
      A: 'Blossom · 블로썸',
      B: 'Boyish · 보이시',
      C: 'Mood · 무드',
      D: 'Modern · 모던'
    }
  };

  const TYPE_DRAFTS = {
    'A-1': {
      group: 'A',
      name: '판타지',
      femaleKo: '신비롭고 섬세한 인상이 돋보여요. 맑은 피부 표현과 가벼운 헤어로 분위기를 살려요.',
      maleKo: '신비롭고 감각적인 인상이에요. 가벼운 헤어와 간결한 스타일에 독특한 포인트가 잘 맞아요.',
      image: null
    },
    'A-2': {
      group: 'A',
      name: '프루티',
      femaleKo: '밝고 생기 있는 인상이 먼저 보여요. 투명한 색감과 산뜻한 헤어·메이크업이 잘 어울려요.',
      maleKo: '밝고 생기 있는 인상이에요. 자연스러운 볼륨과 선명한 색상 포인트가 장점을 살려줘요.',
      image: null
    },
    'A-3': {
      group: 'A',
      name: '소다',
      femaleKo: '맑고 사랑스러운 인상이 강점이에요. 가벼운 컬과 깨끗한 색감으로 생기를 더해요.',
      maleKo: '맑고 친근한 인상이에요. 가벼운 앞머리와 산뜻한 캐주얼 스타일이 잘 어울려요.',
      image: null
    },
    'B-1': {
      group: 'B',
      name: '로맨틱',
      femaleKo: '여리고 감성적인 인상이 돋보여요. 부드러운 곡선과 은은한 색감이 잘 맞아요.',
      maleKo: '감성적인 보이시 타입이에요. 부드러운 헤어와 니트·셔츠처럼 편안한 소재가 잘 맞아요.',
      image: null
    },
    'B-2': {
      group: 'B',
      name: '소프트',
      femaleKo: '차분하고 편안한 인상이 강점이에요. 정돈된 결감과 부드러운 윤기를 살려요.',
      maleKo: '차분한 보이시 타입이에요. 과하지 않은 볼륨과 정돈된 스타일이 안정감을 높여줘요.',
      image: null
    },
    'B-3': {
      group: 'B',
      name: '엘레강스',
      femaleKo: '성숙하고 지적인 인상이 돋보여요. 단정한 헤어와 절제된 색감으로 고급감을 살려요.',
      maleKo: '단정하고 지적인 보이시 타입이에요. 깔끔한 가르마와 재킷·코트가 잘 어울려요.',
      image: null
    },
    'C-1': {
      group: 'C',
      name: '빈티지',
      femaleKo: '자연스럽고 개성 있는 분위기가 강점이에요. 질감이 느껴지는 소재와 색을 활용해요.',
      maleKo: '자연스럽고 개성 있는 인상이에요. 결이 살아 있는 헤어와 데님·스웨이드 같은 소재가 잘 맞아요.',
      image: null
    },
    'C-2': {
      group: 'C',
      name: '세련',
      femaleKo: '도시적이고 균형 잡힌 인상이 돋보여요. 정돈된 선과 모노톤으로 세련미를 살려요.',
      maleKo: '도시적이고 균형 잡힌 인상이에요. 정돈된 헤어와 모노톤 스타일이 세련미를 높여줘요.',
      image: null
    },
    'C-3': {
      group: 'C',
      name: '딥시크',
      femaleKo: '깊고 강렬한 분위기가 먼저 보여요. 어두운 색과 절제된 포인트가 잘 어울려요.',
      maleKo: '깊고 강렬한 인상이에요. 어두운 색과 절제된 스타일링이 분위기를 또렷하게 해줘요.',
      image: null
    },
    'D-1': {
      group: 'D',
      name: '카리스마',
      femaleKo: '선명하고 힘 있는 인상이 강점이에요. 구조적인 선과 또렷한 대비를 살려요.',
      maleKo: '골격이 선명하고 힘 있는 인상이에요. 이마를 드러낸 헤어와 구조적인 옷이 잘 맞아요.',
      image: null
    },
    'D-2': {
      group: 'D',
      name: '클리어',
      femaleKo: '정갈하고 깨끗한 인상이 돋보여요. 군더더기 없는 선과 맑은 색감이 잘 맞아요.',
      maleKo: '정갈하고 깨끗한 인상이에요. 군더더기 없는 헤어와 흰색·네이비·회색이 잘 어울려요.',
      image: null
    },
    'D-3': {
      group: 'D',
      name: '샤프',
      femaleKo: '날렵하고 긴장감 있는 인상이 강점이에요. 또렷한 선과 정교한 포인트를 살려요.',
      maleKo: '날렵하고 긴장감 있는 인상이에요. 선이 또렷한 헤어와 각이 잡힌 옷이 장점을 살려줘요.',
      image: null
    }
  };

  const GROUP_TRANSLATIONS = {
    ja: {
      female: {
        A: '明るく生き生きとした印象です。透明感のある色と軽やかなヘア・メイクで魅力を引き出します。',
        B: 'やわらかく上品な印象です。整った質感と自然なツヤを生かすスタイルが似合います。',
        C: 'その人らしい雰囲気と個性が残るタイプです。質感や色のポイントを一つに絞ると魅力が際立ちます。',
        D: '輪郭とパーツがはっきりした印象です。シャープなラインと明確なコントラストが似合います。'
      },
      male: {
        A: '明るく生き生きとした印象です。自然なボリュームと軽やかなスタイルで魅力を引き出します。',
        B: 'やわらかく端正なボーイッシュタイプです。整ったヘアと落ち着いた素材が似合います。',
        C: 'その人らしい雰囲気と個性が残るタイプです。ヘアや素材の質感を生かすと魅力が際立ちます。',
        D: '骨格とパーツがはっきりした印象です。構築的なヘアとシャープなシルエットが似合います。'
      }
    },
    'zh-CN': {
      female: {
        A: '整体印象明亮而有活力。通透的色彩与轻盈的发型、妆容能更好地展现优势。',
        B: '整体印象柔和而优雅。整洁的质感与自然光泽更能体现高级感。',
        C: '个人氛围与辨识度十分突出。保留材质或色彩中的一个重点，会更有魅力。',
        D: '轮廓与五官线条较为鲜明。清晰的线条和明确的对比更适合这一类型。'
      },
      male: {
        A: '整体印象明亮而有活力。自然的发型层次与轻盈穿搭能更好地展现优势。',
        B: '属于柔和端正的清秀少年感类型。整洁的发型与沉稳舒适的材质很适合。',
        C: '个人氛围与辨识度十分突出。突出发型或服装材质，会更有魅力。',
        D: '骨骼轮廓与五官线条较为鲜明。结构感发型与利落廓形更适合这一类型。'
      }
    },
    'zh-TW': {
      female: {
        A: '整體印象明亮而有活力。通透的色彩與輕盈的髮型、妝容能更好地展現優勢。',
        B: '整體印象柔和而優雅。整潔的質感與自然光澤更能呈現精緻感。',
        C: '個人氛圍與辨識度十分突出。保留材質或色彩中的一個重點，會更有魅力。',
        D: '輪廓與五官線條較為鮮明。清晰的線條和明確的對比更適合這一類型。'
      },
      male: {
        A: '整體印象明亮而有活力。自然的髮型層次與輕盈穿搭能更好地展現優勢。',
        B: '屬於柔和端正的清秀少年感類型。整潔的髮型與沉穩舒適的材質很適合。',
        C: '個人氛圍與辨識度十分突出。凸顯髮型或服裝材質，會更有魅力。',
        D: '骨骼輪廓與五官線條較為鮮明。結構感髮型與俐落輪廓更適合這一類型。'
      }
    }
  };

  function normalizedGender(gender) {
    return gender === 'male' ? 'male' : 'female';
  }

  function getGroupName(group, gender) {
    return GROUP_NAMES[normalizedGender(gender)][group] || '';
  }

  function getExplanation(typeCode, gender, language) {
    const type = TYPE_DRAFTS[typeCode];
    if (!type) return null;

    const safeGender = normalizedGender(gender);
    const languageMeta = LANGUAGES[language];
    const translatedSummary = languageMeta
      ? GROUP_TRANSLATIONS[language][safeGender][type.group]
      : '선택한 언어의 번역 준비 중이에요.';
    return {
      typeCode,
      typeName: type.name,
      group: type.group,
      groupName: getGroupName(type.group, safeGender),
      gender: safeGender,
      Korean: {
        label: '한국어',
        htmlLang: 'ko',
        summary: safeGender === 'male' ? type.maleKo : type.femaleKo
      },
      translated: {
        language: languageMeta ? language : 'ko',
        label: languageMeta ? languageMeta.displayLabel : '한국어',
        htmlLang: languageMeta ? languageMeta.htmlLang : 'ko',
        summary: translatedSummary
      },
      image: type.image,
      draft: true
    };
  }

  return {
    LANGUAGES,
    GROUP_NAMES,
    TYPE_DRAFTS,
    getGroupName,
    getExplanation
  };
});
