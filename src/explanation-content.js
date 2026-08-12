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

    for (const typeCode of Object.keys(TYPE_DRAFTS)) {
      const type = getRawTypeContent(typeCode);
      if (!type) throw new Error(`Missing explanation type: ${typeCode}`);
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

  function buildExplanationPages(type, genderContent, sections, language) {
    return [
      {
        id: 'summary',
        title: data.SECTION_LABELS.representativeSummary,
        content: localizedText(genderContent.overview, language)
      },
      {
        id: 'facial-features',
        title: data.SECTION_LABELS.facialFeatures,
        content: joinedLocalized(type.common.representativeSummary, language)
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
        id: 'mood',
        title: data.SECTION_LABELS.mood,
        content: joinedLocalized([
          sections.mood.overview,
          sections.mood.definition,
          sections.mood.keywords
        ], language)
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
        id: 'accessory-fashion',
        title: data.SECTION_LABELS.accessoryFashion,
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
    const makeupCopy = type.recommendations.makeup[safeGender];
    const hairCopy = data.GROUP_HAIR[type.group][safeGender];
    const careAvoid = data.GROUP_CARE_AVOID[type.group][safeGender];
    const hairAvoid = data.GROUP_HAIR_AVOID[type.group][safeGender];
    const typeAsset = typeCode.toLowerCase();
    const groupAsset = type.group.toLowerCase();
    const careExample = safeGender === 'female'
      ? `reference/female/makeup/${typeAsset}.jpg`
      : `reference/male/grooming/recommended/${groupAsset}.jpg`;
    const careAvoidExample = safeGender === 'female'
      ? `reference/female/makeup/${typeAsset}.jpg`
      : `reference/male/grooming/avoid/${groupAsset}.jpg`;
    const hairExample = safeGender === 'female'
      ? `reference/female/hair/${groupAsset}.jpg`
      : `reference/male/hair/recommended/${groupAsset}.jpg`;
    const hairAvoidExample = safeGender === 'female'
      ? `reference/female/hair/${groupAsset}.jpg`
      : `reference/male/hair/avoid/${groupAsset}.jpg`;
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
        examples: [{
          image: careExample,
          caption: data.REFERENCE_CAPTIONS.makeup[safeGender]
        }],
        avoid: careAvoid,
        avoidExamples: [{
          image: careAvoidExample,
          caption: data.REFERENCE_CAPTIONS.makeup[safeGender]
        }]
      },
      hair: {
        ...hairCopy,
        copy: hairCopy,
        avoid: hairAvoid,
        examples: [{
          image: hairExample,
          caption: data.REFERENCE_CAPTIONS.hair[safeGender]
        }],
        avoidExamples: [{
          image: hairAvoidExample,
          caption: data.REFERENCE_CAPTIONS.hair[safeGender]
        }]
      },
      accessoryFashion: type.recommendations.accessoryFashion[safeGender]
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
