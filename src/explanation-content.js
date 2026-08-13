(function (root, factory) {
  const data = typeof module === 'object' && module.exports
    ? require('./explanation-data.js')
    : root.MiyuExplanationData;
  const api = factory(data);
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.MiyuExplanationContent = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (data) {
  'use strict';

  if (!data) throw new Error('MiyuExplanationData is required');

  const LOCALIZED_LANGUAGES = ['ko', 'ja', 'zh-CN', 'zh-TW'];
  const DETAIL_KEYS = [
    'faceShape', 'headShape', 'hairline', 'forehead', 'eyebrows',
    'eyes', 'nose', 'lips', 'ears', 'jaw'
  ];
  const TYPE_CODES = [
    'A-1', 'A-2', 'A-3', 'B-1', 'B-2', 'B-3',
    'C-1', 'C-2', 'C-3', 'D-1', 'D-2', 'D-3'
  ];
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
    female: Object.fromEntries(
      Object.entries(data.GROUP_LABELS.female).map(([group, value]) => [group, value.ko])
    ),
    male: Object.fromEntries(
      Object.entries(data.GROUP_LABELS.male).map(([group, value]) => [group, value.ko])
    )
  };

  // PPT의 D-1~3 표기 순서와 앱의 D-1~3 표기 순서가 다르므로, 시각 자료는
  // 코드가 아닌 실제 타입명으로 연결한다.
  const PPT_VISUAL_KEY_BY_TYPE_NAME = Object.freeze({
    '판타지': 'fantasy', '프루티': 'fruity', '소다': 'soda',
    '로맨틱': 'romantic', '소프트': 'soft', '엘레강스': 'elegance',
    '빈티지': 'vintage', '세련': 'refined', '딥시크': 'deep-chic',
    '카리스마': 'charisma', '클리어': 'clear', '샤프': 'sharp'
  });

  const TYPE_DRAFTS = Object.fromEntries(
    TYPE_CODES.map(typeCode => {
      const type = data.TYPE_CONTENT[typeCode];
      return [
        typeCode,
        type
          ? {
              group: type.group,
              name: type.name,
              femaleKo: type.gender.female.overview.ko,
              maleKo: type.gender.male.overview.ko,
              image: type.image || null
            }
          : { group: '', name: '', femaleKo: '', maleKo: '', image: null }
      ];
    })
  );

  function normalizedGender(gender) {
    return gender === 'male' ? 'male' : 'female';
  }

  function getGroupName(group, gender) {
    return GROUP_NAMES[normalizedGender(gender)][group] || '';
  }

  function getRawTypeContent(typeCode) {
    return data.TYPE_CONTENT[typeCode] || null;
  }

  function getIntroPage(pageNumber, gender, language) {
    const page = (data.INTRO_PAGES || []).find(item => item.id === Number(pageNumber));
    if (!page || !LOCALIZED_LANGUAGES.includes(language)) return null;
    const safeGender = normalizedGender(gender);
    return {
      ...page,
      groups: page.groups ? data.GROUP_LABELS[safeGender] : null,
      groupVisuals: page.groups
        ? ['A', 'B', 'C', 'D'].map(group => ({
            group,
            label: data.GROUP_LABELS[safeGender][group],
            image: data.INTRO_GROUP_VISUALS[group].image[safeGender],
            caption: data.INTRO_GROUP_VISUALS[group].caption
          }))
        : []
    };
  }

  function getBridgeCopy(language) {
    return LOCALIZED_LANGUAGES.includes(language) ? data.BRIDGE_COPY : null;
  }

  function collectLocalizedValues(value, output = []) {
    if (!value || typeof value !== 'object') return output;
    const keys = Object.keys(value);
    if (LOCALIZED_LANGUAGES.some(key => keys.includes(key))) {
      output.push(value);
      return output;
    }
    for (const nested of Object.values(value)) collectLocalizedValues(nested, output);
    return output;
  }

  function assertLocalizedValue(value, message) {
    for (const language of LOCALIZED_LANGUAGES) {
      if (!value || typeof value !== 'object'
        || !Object.prototype.hasOwnProperty.call(value, language)
        || !String(value[language] || '').trim()) {
        throw new Error(`Missing ${language} ${message}`);
      }
    }
  }

  function assertLocalizedList(value, message) {
    for (const language of LOCALIZED_LANGUAGES) {
      if (!value || typeof value !== 'object' || !Array.isArray(value[language])
        || value[language].length === 0 || value[language].some(item => !String(item || '').trim())) {
        throw new Error(`Missing ${language} ${message}`);
      }
    }
  }

  function assertStructuredGuide(guide, message, fields) {
    if (!guide || typeof guide !== 'object') throw new Error(`Missing ${message}`);
    for (const field of fields) assertLocalizedValue(guide[field], `${message}.${field}`);
    assertLocalizedList(guide.recommendedItems, `${message}.recommendedItems`);
    assertLocalizedList(guide.avoidItems, `${message}.avoidItems`);
  }

  function assertCompleteContent() {
    for (const [section, localizedValue] of Object.entries(data.SECTION_LABELS)) {
      assertLocalizedValue(localizedValue, `section label: ${section}`);
    }
    for (const [gender, groups] of Object.entries(data.GROUP_LABELS)) {
      for (const [group, localizedValue] of Object.entries(groups)) {
        assertLocalizedValue(localizedValue, `group label: ${gender}.${group}`);
      }
    }
    for (const page of data.INTRO_PAGES || []) {
      assertLocalizedValue(page.title, `intro title: ${page.id}`);
      if (page.eyebrow) assertLocalizedValue(page.eyebrow, `intro eyebrow: ${page.id}`);
      for (const [index, body] of (page.body || []).entries()) {
        assertLocalizedValue(body, `intro body: ${page.id}.${index}`);
      }
    }
    for (const [group, reference] of Object.entries(data.INTRO_GROUP_VISUALS || {})) {
      if (!reference.image || !reference.image.female?.startsWith('reference/intro/')
        || !reference.image.male?.startsWith('reference/average/male/')) {
        throw new Error(`Missing intro reference: ${group}`);
      }
      assertLocalizedValue(reference.caption, `intro reference caption: ${group}`);
    }
    for (const [kind, byGender] of Object.entries(data.REFERENCE_CAPTIONS || {})) {
      for (const [gender, value] of Object.entries(byGender)) {
        assertLocalizedValue(value, `reference caption: ${kind}.${gender}`);
      }
    }
    assertLocalizedValue(data.BRIDGE_COPY && data.BRIDGE_COPY.title, 'bridge title');
    assertLocalizedValue(data.BRIDGE_COPY && data.BRIDGE_COPY.body, 'bridge body');
    for (const [group, value] of Object.entries(data.GROUP_HAIR || {})) {
      for (const gender of ['female', 'male']) {
        assertLocalizedValue(value[gender], `group hair: ${group}.${gender}`);
      }
    }
    for (const [group, value] of Object.entries(data.GROUP_CARE_AVOID || {})) {
      for (const gender of ['female', 'male']) {
        assertLocalizedValue(value[gender], `group care avoid: ${group}.${gender}`);
      }
    }
    for (const [group, value] of Object.entries(data.GROUP_HAIR_AVOID || {})) {
      for (const gender of ['female', 'male']) {
        assertLocalizedValue(value[gender], `group hair avoid: ${group}.${gender}`);
      }
    }
    const makeupGuidesByName = data.TYPE_MAKEUP_GUIDES_BY_NAME || {};
    if (Object.keys(makeupGuidesByName).length !== Object.keys(TYPE_DRAFTS).length) {
      throw new Error('Expected one named female makeup guide for every explanation type');
    }
    for (const [name, guide] of Object.entries(makeupGuidesByName)) {
      assertLocalizedValue(guide.recommended, `makeup recommendation: ${name}`);
      assertLocalizedValue(guide.avoid, `makeup avoid: ${name}`);
    }
    const femaleDetailGuides = data.TYPE_MAKEUP_DETAIL_GUIDES_BY_NAME || {};
    const maleDetailGuides = data.TYPE_MALE_GROOMING_GUIDES_BY_NAME || {};
    if (Object.keys(femaleDetailGuides).length !== Object.keys(TYPE_DRAFTS).length || Object.keys(maleDetailGuides).length !== Object.keys(TYPE_DRAFTS).length) {
      throw new Error('Expected one structured care guide for every explanation type and gender');
    }
    const hairDetailGuides = data.GROUP_HAIR_DETAIL_GUIDES || {};
    for (const gender of ['female', 'male']) {
      for (const group of ['A', 'B', 'C', 'D']) {
        assertStructuredGuide(hairDetailGuides[gender] && hairDetailGuides[gender][group], `hair detail guide: ${gender}.${group}`, ['texture', 'volume', 'silhouette']);
      }
    }

    for (const typeCode of Object.keys(TYPE_DRAFTS)) {
      const type = getRawTypeContent(typeCode);
      if (!type) throw new Error(`Missing explanation type: ${typeCode}`);
      if (!makeupGuidesByName[type.name]) {
        throw new Error(`Missing named female makeup guide: ${typeCode}.${type.name}`);
      }
      assertStructuredGuide(femaleDetailGuides[type.name], `female makeup detail guide: ${typeCode}.${type.name}`, ['skin', 'color', 'feeling', 'focus']);
      assertStructuredGuide(maleDetailGuides[type.name], `male grooming detail guide: ${typeCode}.${type.name}`, ['skin', 'color', 'feeling', 'focus']);
      if (!type.localizedName || !type.common || !type.common.definition
        || !type.common.moodKeywords || !type.gender) {
        throw new Error(`Missing explanation section: ${typeCode}`);
      }
      assertLocalizedValue(type.localizedName, `type name: ${typeCode}`);
      if (!Array.isArray(type.common.representativeSummary)
        || type.common.representativeSummary.length === 0) {
        throw new Error(`Missing representative summary: ${typeCode}`);
      }
      for (const [index, localizedValue] of type.common.representativeSummary.entries()) {
        assertLocalizedValue(localizedValue, `representative summary: ${typeCode}.${index}`);
      }
      assertLocalizedValue(type.common.definition, `definition: ${typeCode}`);
      assertLocalizedValue(type.common.moodKeywords, `mood keywords: ${typeCode}`);
      if (!Array.isArray(type.common.details) || type.common.details.length !== DETAIL_KEYS.length) {
        throw new Error(`Expected 10 explanation details: ${typeCode}`);
      }
      const actualDetailKeys = type.common.details.map(row => row.key);
      if (actualDetailKeys.some((key, index) => key !== DETAIL_KEYS[index])) {
        throw new Error(`Unexpected explanation detail order: ${typeCode}`);
      }
      for (const detail of type.common.details) {
        assertLocalizedValue(detail.label, `detail label: ${typeCode}.${detail.key}`);
        assertLocalizedValue(detail.text, `detail text: ${typeCode}.${detail.key}`);
      }
      for (const [gender, careKey] of [['female', 'makeup'], ['male', 'grooming']]) {
        const required = ['overview', 'hair', careKey, 'fashion', 'avoid'];
        if (!type.gender[gender] || required.some(key => !type.gender[gender][key])) {
          throw new Error(`Missing ${gender} styling: ${typeCode}`);
        }
        for (const key of required) {
          assertLocalizedValue(type.gender[gender][key], `${gender} styling: ${typeCode}.${key}`);
        }
      }
      for (const kind of ['makeup', 'accessoryFashion']) {
        for (const gender of ['female', 'male']) {
          assertLocalizedValue(
            type.recommendations && type.recommendations[kind] && type.recommendations[kind][gender],
            `${gender} recommendation: ${typeCode}.${kind}`
          );
        }
      }
    }
    return true;
  }

  function localizedText(value, language) {
    return {
      ko: String(value && value.ko || ''),
      [language]: String(value && value[language] || '')
    };
  }

  function joinedLocalized(values, language) {
    const asArray = Array.isArray(values) ? values : [values];
    return {
      ko: asArray.map(value => value && value.ko).filter(Boolean).join(' '),
      [language]: asArray.map(value => value && value[language]).filter(Boolean).join(' ')
    };
  }

  function localizedReferenceExamples(imageDirectory, captions, count = 3) {
    const values = Array.isArray(captions && captions.ko) ? captions.ko : [];
    const captionIndex = index => Math.min(
      values.length - 1,
      Math.floor(index * values.length / count)
    );
    return Array.from({ length: count }, (_, index) => ({
      image: `${imageDirectory}/${index + 1}.jpg`,
      caption: {
        ko: values[captionIndex(index)] || values.at(-1) || '',
        ja: captions && captions.ja && (captions.ja[captionIndex(index)] || captions.ja.at(-1)) || '',
        'zh-CN': captions && captions['zh-CN'] && (captions['zh-CN'][captionIndex(index)] || captions['zh-CN'].at(-1)) || '',
        'zh-TW': captions && captions['zh-TW'] && (captions['zh-TW'][captionIndex(index)] || captions['zh-TW'].at(-1)) || ''
      }
    }));
  }

  function fashionReferenceExamples(imageDirectory) {
    const captions = [
      { ko: '이 타입이 주는 전체적인 인상', ja: 'このタイプらしい全体の印象', 'zh-CN': '体现该类型的整体印象', 'zh-TW': '呈現此類型的整體印象' },
      { ko: '실루엣과 색감의 균형', ja: 'シルエットと色のバランス', 'zh-CN': '轮廓与色彩的平衡', 'zh-TW': '輪廓與色彩的平衡' },
      { ko: '작지만 또렷한 액세서리 포인트', ja: '小さくても明確なアクセサリーのポイント', 'zh-CN': '小而明确的配饰重点', 'zh-TW': '小而明確的配飾重點' }
    ];
    return [1, 2, 3].map((number, index) => ({
      image: `${imageDirectory}/${number}.jpg`,
      caption: captions[index]
    }));
  }

  function firstSentence(localizedValue) {
    return Object.fromEntries(LOCALIZED_LANGUAGES.map(language => {
      const source = String(localizedValue && localizedValue[language] || '').trim();
      const match = source.match(/^.*?[.!。](?:\s|$)/);
      return [language, (match ? match[0] : source).trim()];
    }));
  }

  function dailyOutfits(type, genderContent, safeGender) {
    const imageDirectory = `reference/${safeGender}/daily/${type.group.toLowerCase()}`;
    const looks = [
      { ko: '룩 1 · 편안한 기본 조합', ja: 'LOOK 1 · 軽やかなベーシック', 'zh-CN': 'LOOK 1 · 轻松基础搭配', 'zh-TW': 'LOOK 1 · 輕鬆基礎搭配' },
      { ko: '룩 2 · 색감 한 가지를 살린 조합', ja: 'LOOK 2 · 色を一つ生かす組み合わせ', 'zh-CN': 'LOOK 2 · 突出一种颜色的搭配', 'zh-TW': 'LOOK 2 · 突出一種色彩的搭配' },
      { ko: '룩 3 · 약속 있는 날의 정돈된 조합', ja: 'LOOK 3 · 外出日の整った組み合わせ', 'zh-CN': 'LOOK 3 · 外出日的利落搭配', 'zh-TW': 'LOOK 3 · 外出日的俐落搭配' }
    ];
    const fashion = firstSentence(type.recommendations.accessoryFashion[safeGender]);
    const style = firstSentence(genderContent.fashion);
    const caution = firstSentence(genderContent.avoid);
    return looks.map((name, index) => ({
      image: `${imageDirectory}/${index + 1}.jpg`,
      name,
      material: fashion,
      design: style,
      accessory: fashion,
      note: caution
    }));
  }

  function buildExplanationPages(type, genderContent, sections, language) {
    return [
      {
        id: 'identity',
        title: data.SECTION_LABELS.mood,
        content: joinedLocalized([
          genderContent.overview,
          ...type.common.representativeSummary,
          sections.mood.definition,
          sections.mood.keywords
        ], language)
      },
      {
        id: 'facial-details-1',
        title: data.SECTION_LABELS.details,
        content: joinedLocalized(type.common.details.slice(0, 5).map(row => row.text), language),
        details: type.common.details.slice(0, 5)
      },
      {
        id: 'facial-details-2',
        title: data.SECTION_LABELS.details,
        content: joinedLocalized(type.common.details.slice(5).map(row => row.text), language),
        details: type.common.details.slice(5)
      },
      {
        id: 'makeup-recommended',
        title: data.SECTION_LABELS.recommendedCare,
        content: localizedText(sections.makeup.copy, language)
      },
      {
        id: 'makeup-avoid',
        title: data.SECTION_LABELS.avoidCare,
        content: localizedText(sections.makeup.avoid, language)
      },
      {
        id: 'hair-recommended',
        title: data.SECTION_LABELS.recommendedHair,
        content: localizedText(sections.hair.copy, language)
      },
      {
        id: 'hair-avoid',
        title: data.SECTION_LABELS.avoidHair,
        content: localizedText(sections.hair.avoid, language)
      },
      {
        id: 'fashion-reference',
        title: data.SECTION_LABELS.fashionReference,
        content: localizedText(sections.accessoryFashion, language)
      },
      {
        id: 'daily-outfits',
        title: data.SECTION_LABELS.dailyOutfits,
        content: localizedText(sections.accessoryFashion, language)
      }
    ];
  }

  function getExplanation(typeCode, gender, language) {
    const type = getRawTypeContent(typeCode);
    if (!type) return null;

    const safeGender = normalizedGender(gender);
    const languageMeta = language === 'ko'
      ? { displayLabel: '한국어', htmlLang: 'ko' }
      : LANGUAGES[language];
    if (!languageMeta) return null;
    const selectedLanguage = language;
    const genderContent = type.gender[safeGender];
    const localizedGroupName = data.GROUP_LABELS[safeGender][type.group];
    const averageFace = {
      image: `reference/average/${safeGender}/${typeCode.toLowerCase()}.jpg`,
      caption: data.REFERENCE_CAPTIONS.averageFace[safeGender]
    };
    const makeupGuide = data.TYPE_MAKEUP_GUIDES_BY_NAME[type.name];
    const structuredCareGuide = safeGender === 'female'
      ? data.TYPE_MAKEUP_DETAIL_GUIDES_BY_NAME[type.name]
      : data.TYPE_MALE_GROOMING_GUIDES_BY_NAME[type.name];
    const structuredHairGuide = data.GROUP_HAIR_DETAIL_GUIDES[safeGender][type.group];
    if (!makeupGuide || !structuredCareGuide || !structuredHairGuide) {
      throw new Error(`Missing structured explanation guide: ${typeCode}.${safeGender}`);
    }
    const makeupCopy = safeGender === 'female'
      ? makeupGuide.recommended
      : type.recommendations.makeup[safeGender];
    const hairCopy = data.GROUP_HAIR[type.group][safeGender];
    const careAvoid = safeGender === 'female'
      ? makeupGuide.avoid
      : data.GROUP_CARE_AVOID[type.group][safeGender];
    const hairAvoid = data.GROUP_HAIR_AVOID[type.group][safeGender];
    const typeAsset = typeCode.toLowerCase();
    const pptVisualAsset = PPT_VISUAL_KEY_BY_TYPE_NAME[type.name];
    const groupAsset = type.group.toLowerCase();
    if (!pptVisualAsset) throw new Error(`Missing PPT visual key: ${type.name}`);
    const careExample = safeGender === 'female'
      ? `reference/female/makeup/recommended/${pptVisualAsset}`
      : `reference/male/grooming-detail/${typeAsset}`;
    const careAvoidExample = safeGender === 'female'
      ? `reference/female/makeup/avoid/${pptVisualAsset}`
      : `reference/male/grooming/avoid/${groupAsset}`;
    const hairExample = safeGender === 'female'
      ? `reference/female/hair/recommended/${groupAsset}`
      : `reference/male/hair/${groupAsset}`;
    const hairAvoidExample = safeGender === 'female'
      ? `reference/female/hair/avoid/${groupAsset}`
      : `reference/male/hair/avoid-ppt/${groupAsset}`;
    const sections = {
      facialFeatures: {
        label: data.SECTION_LABELS.facialFeatures,
        items: type.common.representativeSummary,
        details: type.common.details
      },
      mood: {
        label: data.SECTION_LABELS.mood,
        overview: genderContent.overview,
        definition: type.common.definition,
        keywords: type.common.moodKeywords
      },
      makeup: {
        ...makeupCopy,
        copy: makeupCopy,
        guide: structuredCareGuide,
        examples: localizedReferenceExamples(
          careExample,
          structuredCareGuide.recommendedItems,
          safeGender === 'female' ? 6 : 3
        ),
        avoid: careAvoid,
        avoidExamples: localizedReferenceExamples(careAvoidExample, structuredCareGuide.avoidItems)
      },
      hair: {
        ...hairCopy,
        copy: hairCopy,
        guide: structuredHairGuide,
        avoid: hairAvoid,
        examples: localizedReferenceExamples(hairExample, structuredHairGuide.recommendedItems),
        avoidExamples: localizedReferenceExamples(hairAvoidExample, structuredHairGuide.avoidItems)
      },
      accessoryFashion: {
        ...type.recommendations.accessoryFashion[safeGender],
        idolExamples: safeGender === 'female'
          ? fashionReferenceExamples(`reference/female/fashion/${pptVisualAsset}`)
          : [],
        dailyOutfits: dailyOutfits(type, genderContent, safeGender)
      }
    };
    Object.defineProperties(sections, {
      overview: { value: genderContent.overview },
      representativeSummary: {
        value: { label: data.SECTION_LABELS.representativeSummary, items: type.common.representativeSummary }
      },
      definition: { value: type.common.definition },
      moodKeywords: { value: type.common.moodKeywords },
      details: { value: type.common.details },
      styling: {
        value: {
          hair: genderContent.hair,
          [safeGender === 'male' ? 'grooming' : 'makeup']: genderContent[safeGender === 'male' ? 'grooming' : 'makeup'],
          fashion: genderContent.fashion,
          avoid: genderContent.avoid
        }
      }
    });
    return {
      typeCode,
      typeName: type.name,
      localizedTypeName: type.localizedName,
      group: type.group,
      groupName: localizedGroupName.ko,
      localizedGroupName,
      gender: safeGender,
      language: selectedLanguage,
      sections,
      people: safeGender === 'female' ? type.people : [],
      Korean: {
        label: '한국어',
        htmlLang: 'ko',
        summary: genderContent.overview.ko
      },
      translated: {
        language: selectedLanguage,
        label: languageMeta.displayLabel,
        htmlLang: languageMeta.htmlLang,
        summary: genderContent.overview[selectedLanguage]
      },
      averageFace,
      pages: buildExplanationPages(type, genderContent, sections, selectedLanguage),
      image: type.image || null,
      draft: type.draft !== false
    };
  }

  return {
    LANGUAGES,
    GROUP_NAMES,
    TYPE_DRAFTS,
    TYPE_CONTENT: data.TYPE_CONTENT,
    SECTION_LABELS: data.SECTION_LABELS,
    GROUP_LABELS: data.GROUP_LABELS,
    getGroupName,
    getRawTypeContent,
    getIntroPage,
    getBridgeCopy,
    collectLocalizedValues,
    assertCompleteContent,
    getExplanation
  };
});
