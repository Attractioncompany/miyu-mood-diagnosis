(function (root, factory) {
  const core = typeof module === 'object' && module.exports
    ? require('./diagnosis-core.js')
    : root.MiyuDiagnosisCore;
  const content = typeof module === 'object' && module.exports
    ? require('./explanation-content.js')
    : root.MiyuExplanationContent;
  const api = factory(core, content, root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.MiyuDiagnosisUI = api;

  if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', function () {
      api.normalizeLegacyTypeOrder();
      api.mount(document.getElementById('miyu-diagnosis-app'), {
        storage: root.sessionStorage,
        location: root.location,
        confirm: root.confirm.bind(root),
        today: function () {
          return new Date().toLocaleDateString('en-CA');
        }
      });
    });
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (core, content, root) {
  'use strict';

  const STORAGE_KEY = 'miyuDiagnosisV17';

  let mountedApp = null;
  let mountedController = null;

  function escapeHtml(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function asset(path) {
    const assets = root.MIYU_DIAGNOSIS_ASSETS || {};
    return assets[path] || '';
  }

  function renderAssetImages(paths, alt) {
    return paths.map(path =>
      '<figure class="miyu-answer-figure">'
      + `<img src="${asset(path)}" data-asset="${escapeHtml(path)}" alt="${escapeHtml(alt)}" loading="eager">`
      + '</figure>'
    ).join('');
  }

  function renderStartView(state) {
    const languageOptions = Object.entries(content.LANGUAGES).map(([value, meta]) =>
      `<option value="${value}"${state.profile.explanationLanguage === value ? ' selected' : ''}>${escapeHtml(meta.inputLabel)}</option>`
    ).join('');
    return `<div class="miyu-start-shell">
      <img class="miyu-start-logo" src="${asset('logo')}" data-asset="logo" alt="MIYU">
      <p class="miyu-eyebrow">MIYU MOOD CHECKLIST</p>
      <h1>무드 진단</h1>
      <form class="miyu-profile-form" data-action="start">
        <label>해설 언어
          <select name="explanationLanguage" required>
            <option value="">선택해 주세요</option>
            ${languageOptions}
          </select>
          <span class="miyu-field-error" data-profile-error="explanationLanguage" aria-live="polite"></span>
        </label>
        <label>성별
          <select name="gender" required>
            <option value="">선택해 주세요</option>
            <option value="female"${state.profile.gender === 'female' ? ' selected' : ''}>여성</option>
            <option value="male"${state.profile.gender === 'male' ? ' selected' : ''}>남성</option>
          </select>
          <span class="miyu-field-error" data-profile-error="gender" aria-live="polite"></span>
        </label>
        <label>진단일
          <input name="diagnosisDate" type="date" value="${escapeHtml(state.profile.diagnosisDate)}" required>
          <span class="miyu-field-error" data-profile-error="diagnosisDate" aria-live="polite"></span>
        </label>
        <button class="miyu-button miyu-primary" type="submit">진단 시작</button>
      </form>
    </div>`;
  }

  function renderIntroView(state, pageNumber) {
    const profile = state.profile;
    const page = content.getIntroPage(pageNumber, profile.gender, profile.explanationLanguage);
    if (!page) return '';
    const groups = page.groupVisuals && page.groupVisuals.length
      ? `<div class="miyu-intro-groups miyu-intro-groups-with-faces">${page.groupVisuals.map(item =>
        `<article class="miyu-intro-group miyu-intro-group-face" data-group="${escapeHtml(item.group)}">`
          + `<div class="miyu-intro-face-frame"><img src="${asset(item.image)}" data-asset="${escapeHtml(item.image)}" alt="" loading="eager"></div>`
          + `<strong>${escapeHtml(item.group)}</strong>`
          + renderLocalizedBlock(item.label, profile.explanationLanguage, 'miyu-localized-copy')
          + renderLocalizedBlock(item.caption, profile.explanationLanguage, 'miyu-intro-group-caption')
          + '</article>'
      ).join('')}</div>`
      : '';
    const eyebrow = page.eyebrow
      ? `<p class="miyu-eyebrow">${renderLocalizedBlock(page.eyebrow, profile.explanationLanguage, 'miyu-intro-eyebrow')}</p>`
      : `<p class="miyu-eyebrow">MIYU MOOD CONSULTING</p>`;
    return `<section class="miyu-intro-step" data-intro-page="${pageNumber}">
      <header class="miyu-intro-head"><img src="${asset('logo')}" data-asset="logo" alt="MIYU"></header>
      <main class="miyu-intro-main">
        <p class="miyu-intro-count">INTRO ${pageNumber} / 3</p>
        ${eyebrow}
        <h1>${renderLocalizedBlock(page.title, profile.explanationLanguage, 'miyu-intro-title')}</h1>
        <div class="miyu-intro-copy">${page.body.map(item =>
          renderLocalizedBlock(item, profile.explanationLanguage, 'miyu-localized-copy')
        ).join('')}</div>
        ${groups}
      </main>
      <footer class="miyu-intro-footer">
        <button class="miyu-button miyu-secondary" type="button" data-action="previous-intro">이전</button>
        <button class="miyu-button miyu-primary" type="button" data-action="next-intro">다음</button>
      </footer>
    </section>`;
  }

  function renderBridgeView(state) {
    const profile = state.profile;
    const bridge = content.getBridgeCopy(profile.explanationLanguage);
    if (!bridge) return '';
    return `<section class="miyu-bridge-step">
      <header class="miyu-intro-head"><img src="${asset('logo')}" data-asset="logo" alt="MIYU"></header>
      <main class="miyu-bridge-main">
        <p class="miyu-eyebrow">MIYU MOOD CHECKLIST</p>
        <h1>${renderLocalizedBlock(bridge.title, profile.explanationLanguage, 'miyu-bridge-title')}</h1>
        <div class="miyu-intro-copy">${renderLocalizedBlock(bridge.body, profile.explanationLanguage, 'miyu-localized-copy')}</div>
      </main>
      <footer class="miyu-intro-footer">
        <button class="miyu-button miyu-secondary" type="button" data-action="previous-bridge">이전</button>
        <button class="miyu-button miyu-primary" type="button" data-action="begin-diagnosis">진단 시작</button>
      </footer>
    </section>`;
  }

  function renderProgressDrawer(state, questionIndex) {
    const firstIncomplete = core.firstIncompleteQuestion(state.answers);
    const items = core.QUESTIONS.map((question, index) => {
      const status = index === questionIndex
        ? 'current'
        : index < firstIncomplete
          ? 'complete'
          : 'remaining';
      const disabled = core.canVisitQuestion(state.answers, index) ? '' : ' disabled';
      const statusLabel = status === 'complete' ? '완료' : status === 'current' ? '현재' : '남음';
      return `<button class="miyu-progress-item" type="button"
        data-action="goto-question" data-question="${index}"
        data-status="${status}"${disabled}>
        <span class="miyu-progress-number">${question.number}</span>
        <strong>${escapeHtml(question.title)}</strong>
        <small>${statusLabel}</small>
      </button>`;
    }).join('');
    return `<button class="miyu-drawer-backdrop" type="button" data-action="close-progress" aria-label="진행표 닫기"></button>
      <aside class="miyu-progress-drawer" aria-label="진단 진행표">
        <div class="miyu-drawer-head">
          <img src="${asset('logo')}" data-asset="logo" alt="MIYU">
          <button type="button" data-action="close-progress" aria-label="진행표 닫기">×</button>
        </div>
        <div class="miyu-drawer-summary">
          <strong>진행표</strong>
          <span>${firstIncomplete} / 10 완료</span>
        </div>
        <nav>${items}</nav>
      </aside>`;
  }

  function renderQuestionView(state, questionIndex) {
    const question = core.QUESTIONS[questionIndex];
    const selected = state.answers[questionIndex];
    const cards = question.options.map(option => {
      const pressed = selected.includes(option.code);
      const optionImages = core.getOptionImages(option, state.profile.gender);
      const images = renderAssetImages(optionImages, `${option.code}. ${option.label}`);
      return `<article class="miyu-answer-card" data-selected="${pressed}">
        <button class="miyu-answer-select" type="button"
          data-action="select-answer" data-option="${option.code}"
          aria-pressed="${pressed}">
          <span class="miyu-option-code">${option.code}</span>
          <span class="miyu-option-label">${escapeHtml(option.label)}</span>
          <span class="miyu-option-detail">${escapeHtml(option.detail || '')}</span>
          <span class="miyu-checkmark" aria-hidden="true">✓</span>
        </button>
        ${images ? `<div class="miyu-answer-image" data-image-count="${optionImages.length}">${images}</div>` : '<div class="miyu-answer-no-image" aria-hidden="true"></div>'}
      </article>`;
    }).join('');
    return `<div class="miyu-question-shell">
      ${renderProgressDrawer(state, questionIndex)}
      <header class="miyu-question-head">
        <button type="button" class="miyu-progress-trigger" data-action="open-progress">진행표 ${question.number}/10</button>
        <img src="${asset('logo')}" data-asset="logo" alt="MIYU">
        <span class="miyu-head-spacer" aria-hidden="true"></span>
      </header>
      <main class="miyu-question-main">
        <div class="miyu-question-title-row">
          <p class="miyu-question-count">${question.number} / 10</p>
          <p class="miyu-question-help">1개 또는 2개 선택</p>
        </div>
        <h1>${escapeHtml(question.title)}</h1>
        <p class="miyu-question-subtitle">${escapeHtml(question.subtitle)}</p>
        <aside class="miyu-question-guidance" aria-label="${escapeHtml(question.title)} 선택 기준">
          <p class="miyu-question-rule">정면·무표정 기준으로 먼저 보고, 두 특징이 모두 분명할 때만 최대 2개를 선택해요.</p>
          <p><strong>판단 기준</strong>${escapeHtml(question.guide || '')}</p>
          <p><strong>헷갈릴 때</strong>${escapeHtml(question.hint || '')}</p>
        </aside>
        <div class="miyu-answer-grid">${cards}</div>
        <p class="miyu-selection-error" aria-live="polite"></p>
      </main>
      <footer class="miyu-question-footer">
        <button class="miyu-button miyu-secondary" type="button" data-action="previous">이전</button>
        <button class="miyu-button miyu-primary" type="button" data-action="next"${selected.length ? '' : ' disabled'}>${questionIndex === 9 ? '결과 보기' : '다음'}</button>
      </footer>
    </div>`;
  }

  function renderRankBadge(rank) {
    return rank <= 2
      ? `<span class="miyu-rank-badge" data-rank="${rank}">${rank}위</span>`
      : '';
  }

  function renderResultView(state) {
    const scores = core.calculateScores(state.answers);
    const ranks = core.calculateDenseRanks(scores);
    const scoreCards = core.OPTION_CODES.map(group => {
      const rank = ranks[group];
      const groupName = content.getGroupName(group, state.profile.gender);
      return `<article class="miyu-score-card" data-group="${group}" data-rank="${rank}">
        ${renderRankBadge(rank)}
        <span class="miyu-score-code">${group}</span>
        <span class="miyu-score-name">${groupName}</span>
        <strong>${scores[group]}</strong><small>/ 10</small>
      </article>`;
    }).join('');

    const groupSections = core.OPTION_CODES.map(group => {
      const groupTypes = core.TYPES.filter(type => type.group === group);
      const rank = ranks[group];
      const groupName = content.getGroupName(group, state.profile.gender);
      const typeCards = groupTypes.map(type => {
        const typeImage = state.profile.gender === 'male'
          ? `reference/average/male/${type.code.toLowerCase()}.jpg`
          : type.image;
        const selected = state.selectedType === type.code;
        return `<button class="miyu-type-card" type="button"
          data-action="select-type" data-type="${type.code}"
          data-group="${type.group}" data-rank="${rank}" data-selected="${selected}"
          aria-pressed="${selected}">
          ${renderRankBadge(rank)}
          ${selected ? '<span class="miyu-selected-badge">선택</span>' : ''}
          <span class="miyu-type-photo"><img src="${asset(typeImage)}" data-asset="${typeImage}" alt="${escapeHtml(type.name)}"></span>
          <span class="miyu-type-code">${type.code}</span>
          <strong>${escapeHtml(type.name)}</strong>
        </button>`;
      }).join('');
      return `<section class="miyu-type-group" data-group="${group}" data-rank="${rank}">
        <header>
          ${renderRankBadge(rank)}
          <span>${group}</span>
          <strong>${groupName}</strong>
          <small>${scores[group]}점</small>
        </header>
        <div class="miyu-type-row">${typeCards}</div>
      </section>`;
    }).join('');

    const selected = core.TYPES.find(type => type.code === state.selectedType);
    const confirmLabel = selected
      ? `${selected.code} ${selected.name} 확정 · 해설 보기`
      : '최종 타입을 선택해 주세요';
    const languageLabel = content.LANGUAGES[state.profile.explanationLanguage]?.inputLabel || '';
    return `<div class="miyu-result-shell">
      <header class="miyu-result-head">
        <img src="${asset('logo')}" data-asset="logo" alt="MIYU">
        <p class="miyu-eyebrow">MIYU MOOD CHECKLIST</p>
        <h1>무드 진단 결과</h1>
        <div class="miyu-result-profile">
          <span>${escapeHtml(state.profile.diagnosisDate)}</span>
          <span>${escapeHtml(languageLabel)}</span>
        </div>
      </header>
      <section class="miyu-result-section">
        <div class="miyu-section-heading"><div><p>STEP 1</p><h2>ABCD 점수 합산</h2></div><span>공동순위 포함</span></div>
        <div class="miyu-score-grid" aria-label="ABCD 점수">${scoreCards}</div>
      </section>
      <section class="miyu-result-section">
        <div class="miyu-section-heading"><div><p>STEP 2</p><h2>최종 세부타입 선택</h2></div></div>
        <p class="miyu-result-guide">1·2위는 추천 표시예요. 점수와 관계없이 컨설턴트가 최종 타입을 선택할 수 있어요.</p>
        <div class="miyu-type-grid">${groupSections}</div>
      </section>
      <div class="miyu-result-actions">
        <button class="miyu-button miyu-secondary" type="button" data-action="new-diagnosis">새 진단 시작</button>
        <button class="miyu-button miyu-primary" type="button" data-action="confirm-type"${selected ? '' : ' disabled'}>${escapeHtml(confirmLabel)}</button>
      </div>
    </div>`;
  }

  function renderLocalizedBlock(localized, language, className = '') {
    const languageMeta = content.LANGUAGES[language];
    if (!localized || !languageMeta) return '';
    return `<div class="${escapeHtml(className)}">
      <div class="miyu-language-ko" lang="ko">${escapeHtml(localized.ko)}</div>
      <div class="miyu-language-translated" lang="${escapeHtml(languageMeta.htmlLang)}">${escapeHtml(localized[language])}</div>
    </div>`;
  }

  function renderSectionHeading(label, language) {
    return `<div class="miyu-localized-heading" role="heading" aria-level="3">
      ${renderLocalizedBlock(label, language, 'miyu-localized-heading-copy')}
    </div>`;
  }

  function localizedGroupDisplayName(localized, language) {
    const value = String(localized && localized[language] || '');
    return value.split(' · ').at(-1) || value;
  }

  function renderReferenceImage(reference, language, className, eager = false) {
    if (!reference || !reference.image) return '';
    return `<figure class="${escapeHtml(className)}">
      <img src="${asset(reference.image)}" data-asset="${escapeHtml(reference.image)}" alt="" loading="${eager ? 'eager' : 'lazy'}">
      <figcaption>${renderLocalizedBlock(reference.caption, language, 'miyu-reference-caption')}</figcaption>
    </figure>`;
  }

  function renderReferenceGallery(examples, language, className) {
    return `<div class="miyu-reference-gallery ${escapeHtml(className)}">${examples.map(reference =>
      renderReferenceImage(reference, language, 'miyu-reference-figure')
    ).join('')}</div>`;
  }

  function renderDetailTable(details, language) {
    return `<div class="miyu-detail-table" role="table">
      ${details.map(row => `<div class="miyu-detail-row" role="row">
        <div class="miyu-detail-label" role="rowheader">
          ${renderLocalizedBlock(row.label, language, 'miyu-localized-label')}
        </div>
        <div class="miyu-detail-value" role="cell">
          ${renderLocalizedBlock(row.text, language, 'miyu-localized-value')}
        </div>
      </div>`).join('')}
    </div>`;
  }

  function renderGuideDetail(label, value, language) {
    return `<article class="miyu-guide-detail-card">
      ${renderSectionHeading(label, language)}
      ${renderLocalizedBlock(value, language, 'miyu-localized-copy')}
    </article>`;
  }

  function renderGuideList(label, items, language, variant = 'recommended') {
    const localizedItems = Array.isArray(items && items.ko)
      ? items.ko.map((ko, index) => ({
        ko,
        [language]: items[language] && items[language][index] || ''
      }))
      : [];
    return `<section class="miyu-guide-list-section miyu-guide-list-section-${escapeHtml(variant)}">
      ${renderSectionHeading(label, language)}
      <ul class="miyu-guide-list">${localizedItems.map(item => `<li>
        ${renderLocalizedBlock(item, language, 'miyu-localized-copy')}
      </li>`).join('')}</ul>
    </section>`;
  }

  function renderCareGuide(guide, language, isAvoid) {
    if (isAvoid) {
      return renderGuideList(content.SECTION_LABELS.avoidItems, guide.avoidItems, language, 'avoid');
    }
    return `<div class="miyu-guide-details">
      ${renderGuideDetail(content.SECTION_LABELS.skin, guide.skin, language)}
      ${renderGuideDetail(content.SECTION_LABELS.color, guide.color, language)}
      ${renderGuideDetail(content.SECTION_LABELS.feeling, guide.feeling, language)}
      ${renderGuideDetail(content.SECTION_LABELS.focus, guide.focus, language)}
    </div>
    ${renderGuideList(content.SECTION_LABELS.recommendedItems, guide.recommendedItems, language)}`;
  }

  function renderHairGuide(guide, language, isAvoid) {
    if (isAvoid) {
      return renderGuideList(content.SECTION_LABELS.avoidItems, guide.avoidItems, language, 'avoid');
    }
    return `<div class="miyu-guide-details miyu-hair-guide-details">
      ${renderGuideDetail(content.SECTION_LABELS.texture, guide.texture, language)}
      ${renderGuideDetail(content.SECTION_LABELS.volume, guide.volume, language)}
      ${renderGuideDetail(content.SECTION_LABELS.silhouette, guide.silhouette, language)}
    </div>
    ${renderGuideList(content.SECTION_LABELS.recommendedItems, guide.recommendedItems, language)}`;
  }

  function renderExplanationPage(draft, page) {
    const language = draft.language;
    const sections = draft.sections;
    const summaryItems = sections.facialFeatures.items.map(item =>
      `<li>${renderLocalizedBlock(item, language, 'miyu-localized-summary-item')}</li>`
    ).join('');
    if (page.id === 'identity') {
      return `<section class="miyu-explanation-section miyu-identity">
        <div class="miyu-explanation-layout">
          ${renderReferenceImage(draft.averageFace, language, 'miyu-explanation-visual miyu-average-face-visual', true)}
          <div class="miyu-identity-copy">
            <div class="miyu-facial-features">
              ${renderSectionHeading(content.SECTION_LABELS.facialFeatures, language)}
              <ul class="miyu-summary-list">${summaryItems}</ul>
            </div>
            <div class="miyu-mood">
              ${renderSectionHeading(content.SECTION_LABELS.mood, language)}
              ${renderLocalizedBlock(sections.mood.overview, language, 'miyu-localized-copy')}
              ${renderLocalizedBlock(sections.mood.definition, language, 'miyu-localized-copy')}
              ${renderLocalizedBlock(sections.mood.keywords, language, 'miyu-localized-copy miyu-mood-keywords')}
            </div>
          </div>
        </div>
      </section>`;
    }
    if (page.id === 'facial-details-1' || page.id === 'facial-details-2') {
      return `<section class="miyu-explanation-section miyu-facial-details">
        ${renderDetailTable(page.details, language)}
      </section>`;
    }
    if (page.id === 'makeup-recommended' || page.id === 'makeup-avoid') {
      const exampleLabel = draft.gender === 'male'
        ? content.SECTION_LABELS.groomingExample
        : content.SECTION_LABELS.makeupExample;
      const isAvoid = page.id === 'makeup-avoid';
      return `<section class="miyu-explanation-section miyu-makeup">
        ${renderCareGuide(sections.makeup.guide, language, isAvoid)}
        ${renderSectionHeading(exampleLabel, language)}
        ${renderReferenceGallery(
          isAvoid ? sections.makeup.avoidExamples : sections.makeup.examples,
          language,
          `miyu-makeup-examples ${isAvoid ? 'miyu-avoid-examples' : 'miyu-recommended-examples'}`
        )}
      </section>`;
    }
    if (page.id === 'hair-recommended' || page.id === 'hair-avoid') {
      const isAvoid = page.id === 'hair-avoid';
      return `<section class="miyu-explanation-section miyu-hair">
        ${renderHairGuide(sections.hair.guide, language, isAvoid)}
        ${renderSectionHeading(content.SECTION_LABELS.hairExample, language)}
        ${renderReferenceGallery(
          isAvoid ? sections.hair.avoidExamples : sections.hair.examples,
          language,
          `miyu-hair-examples ${isAvoid ? 'miyu-avoid-examples' : 'miyu-recommended-examples'}`
        )}
      </section>`;
    }
    return `<section class="miyu-explanation-section miyu-accessory-fashion">
      ${renderLocalizedBlock(sections.accessoryFashion, language, 'miyu-localized-copy')}
      ${sections.accessoryFashion.examples && sections.accessoryFashion.examples.length ? `
        ${renderSectionHeading(content.SECTION_LABELS.fashion, language)}
        ${renderReferenceGallery(sections.accessoryFashion.examples, language, 'miyu-fashion-examples')}
      ` : ''}
    </section>`;
  }

  function renderExplanationPanel(draft, profile, pageIndex = 0) {
    if (!draft) return '';
    const language = draft.language;
    const safeIndex = Math.max(0, Math.min(draft.pages.length - 1, Number(pageIndex) || 0));
    const page = draft.pages[safeIndex];
    return `<section class="miyu-explanation-panel"
      data-gender="${escapeHtml(draft.gender)}"
      data-language="${escapeHtml(draft.translated.language)}"
      data-explanation-page="${safeIndex}">
      <header class="miyu-explanation-meta">
        <p>MIYU CONSULTATION NOTE</p>
        <div class="miyu-type-identity">
          ${renderLocalizedBlock({
            ko: `${localizedGroupDisplayName(draft.localizedGroupName, 'ko')} · ${draft.typeCode} ${draft.localizedTypeName.ko}`,
            [language]: `${localizedGroupDisplayName(draft.localizedGroupName, language)} · ${draft.typeCode} ${draft.localizedTypeName[language]}`
          }, language, 'miyu-type-identity-name')}
        </div>
        <dl>
          <div><dt>진단일</dt><dd>${escapeHtml(profile.diagnosisDate)}</dd></div>
        </dl>
      </header>
      <div class="miyu-explanation-page-head">
        ${renderSectionHeading(page.title, language)}
        <span>${safeIndex + 1} / ${draft.pages.length}</span>
      </div>
      ${renderExplanationPage(draft, page)}
      <footer class="miyu-explanation-pager">
        <button class="miyu-button miyu-secondary" type="button" data-action="explanation-previous"${safeIndex === 0 ? ' disabled' : ''}>이전</button>
        <button class="miyu-button miyu-primary" type="button" data-action="explanation-next"${safeIndex === draft.pages.length - 1 ? ' disabled' : ''}>다음</button>
      </footer>
    </section>`;
  }

  function renderExplanationView(state, typeCode, pageIndex = 0) {
    const draft = content.getExplanation(
      typeCode,
      state.profile.gender,
      state.profile.explanationLanguage
    );
    return draft ? renderExplanationPanel(draft, state.profile, pageIndex) : '';
  }

  function createController(adapters) {
    const storage = adapters.storage;
    const location = adapters.location;
    const confirmAction = adapters.confirm;
    const today = adapters.today;
    let state = core.restoreState(storage.getItem(STORAGE_KEY), today());

    function save() {
      storage.setItem(STORAGE_KEY, JSON.stringify(state));
    }

    function getState() {
      return state;
    }

    function start(profile) {
      const nextProfile = {
        explanationLanguage: String(profile.explanationLanguage || ''),
        gender: String(profile.gender || ''),
        diagnosisDate: String(profile.diagnosisDate || '')
      };
      const validation = core.validateProfile(nextProfile);
      if (!validation.valid) {
        return { error: validation.error, field: validation.field };
      }
      state = {
        ...core.createInitialState(today()),
        profile: nextProfile
      };
      save();
      location.hash = '#/diagnosis/intro/1';
      return { error: null, field: null };
    }

    function previousIntro(pageNumber) {
      location.hash = pageNumber <= 1 ? '#/' : `#/diagnosis/intro/${pageNumber - 1}`;
    }

    function nextIntro(pageNumber) {
      location.hash = pageNumber >= 3 ? '#/diagnosis/bridge' : `#/diagnosis/intro/${pageNumber + 1}`;
    }

    function previousBridge() {
      location.hash = '#/diagnosis/intro/3';
    }

    function beginDiagnosis() {
      location.hash = '#/diagnosis/question/1';
    }

    function selectAnswer(questionIndex, optionCode) {
      const result = core.toggleAnswer(state, questionIndex, optionCode);
      state = result.state;
      if (!result.error) {
        state = { ...state, currentQuestion: questionIndex };
        save();
      }
      return result;
    }

    function previous(questionIndex) {
      location.hash = questionIndex <= 0
        ? '#/'
        : `#/diagnosis/question/${questionIndex}`;
    }

    function next(questionIndex) {
      if (!state.answers[questionIndex]?.length) {
        return { error: '답을 1개 이상 선택해 주세요' };
      }
      if (questionIndex >= core.QUESTIONS.length - 1) {
        if (core.firstIncompleteQuestion(state.answers) < core.QUESTIONS.length) {
          const missing = core.firstIncompleteQuestion(state.answers);
          location.hash = `#/diagnosis/question/${missing + 1}`;
        } else {
          state = { ...state, scores: core.calculateScores(state.answers) };
          save();
          location.hash = '#/diagnosis/result';
        }
      } else {
        state = { ...state, currentQuestion: questionIndex + 1 };
        save();
        location.hash = `#/diagnosis/question/${questionIndex + 2}`;
      }
      return { error: null };
    }

    function gotoQuestion(questionIndex) {
      if (!core.canVisitQuestion(state.answers, questionIndex)) {
        return { error: '아직 이동할 수 없는 문항이에요' };
      }
      state = { ...state, currentQuestion: questionIndex };
      save();
      location.hash = `#/diagnosis/question/${questionIndex + 1}`;
      return { error: null };
    }

    function selectType(typeCode) {
      if (!core.TYPES.some(type => type.code === typeCode)) {
        return { error: '선택할 수 없는 타입이에요' };
      }
      state = { ...state, selectedType: typeCode };
      save();
      return { error: null };
    }

    function confirmType() {
      if (!state.selectedType) return { error: '최종 타입을 선택해 주세요' };
      location.hash = `#/diagnosis/explanation/${state.selectedType.toLowerCase()}/1`;
      return { error: null };
    }

    function moveExplanation(pageIndex, direction) {
      const typeCode = state.selectedType;
      const draft = typeCode && content.getExplanation(
        typeCode,
        state.profile.gender,
        state.profile.explanationLanguage
      );
      if (!draft) return { error: '최종 타입을 선택해 주세요' };
      const nextIndex = Math.max(0, Math.min(draft.pages.length - 1, pageIndex + direction));
      location.hash = `#/diagnosis/explanation/${typeCode.toLowerCase()}/${nextIndex + 1}`;
      return { error: null };
    }

    function previousExplanation(pageIndex) {
      return moveExplanation(pageIndex, -1);
    }

    function nextExplanation(pageIndex) {
      return moveExplanation(pageIndex, 1);
    }

    function newDiagnosis() {
      const hasProgress = Boolean(
        state.profile.explanationLanguage
        || state.selectedType
        || state.answers.some(answer => answer.length)
      );
      if (hasProgress && !confirmAction('현재 진단 내용을 지우고 새로 시작할까요?')) {
        return { error: 'cancelled' };
      }
      storage.removeItem(STORAGE_KEY);
      state = core.createInitialState(today());
      location.hash = '#/';
      return { error: null };
    }

    function resolveRoute(hash) {
      if (hash === '#/' || hash === '#/diagnosis' || hash === '#/diagnosis/start') {
        return { kind: 'start', state };
      }

      if (!core.validateProfile(state.profile).valid) {
        location.hash = '#/';
        return { kind: 'redirect', state };
      }

      const introMatch = hash.match(/^#\/diagnosis\/intro\/([1-3])$/);
      if (introMatch) {
        return { kind: 'intro', state, pageNumber: Number(introMatch[1]) };
      }

      if (hash === '#/diagnosis/bridge') {
        return { kind: 'bridge', state };
      }

      const questionMatch = hash.match(/^#\/diagnosis\/question\/(\d+)$/);
      if (questionMatch) {
        const questionIndex = Number(questionMatch[1]) - 1;
        if (!core.canVisitQuestion(state.answers, questionIndex)) {
          const missing = Math.min(
            core.firstIncompleteQuestion(state.answers),
            core.QUESTIONS.length - 1
          );
          location.hash = `#/diagnosis/question/${missing + 1}`;
          return { kind: 'redirect', state };
        }
        state = { ...state, currentQuestion: questionIndex };
        save();
        return { kind: 'question', state, questionIndex };
      }

      if (hash === '#/diagnosis/result') {
        const missing = core.firstIncompleteQuestion(state.answers);
        if (missing < core.QUESTIONS.length) {
          location.hash = `#/diagnosis/question/${missing + 1}`;
          return { kind: 'redirect', state };
        }
        state = { ...state, scores: core.calculateScores(state.answers) };
        save();
        return { kind: 'result', state };
      }

      const explanationMatch = hash.match(/^#\/diagnosis\/explanation\/([a-d]-[1-3])\/(\d+)$/i);
      if (explanationMatch) {
        const typeCode = explanationMatch[1].toUpperCase();
        if (state.selectedType !== typeCode) {
          location.hash = '#/diagnosis/result';
          return { kind: 'redirect', state };
        }
        const draft = content.getExplanation(
          typeCode,
          state.profile.gender,
          state.profile.explanationLanguage
        );
        if (!draft) {
          location.hash = '#/diagnosis/result';
          return { kind: 'redirect', state };
        }
        const requestedIndex = Number(explanationMatch[2]) - 1;
        return {
          kind: 'explanation',
          state,
          typeCode,
          pageIndex: Math.max(0, Math.min(draft.pages.length - 1, requestedIndex))
        };
      }

      location.hash = '#/';
      return { kind: 'redirect', state };
    }

    return {
      getState,
      start,
      previousIntro,
      nextIntro,
      previousBridge,
      beginDiagnosis,
      selectAnswer,
      previous,
      next,
      gotoQuestion,
      selectType,
      confirmType,
      previousExplanation,
      nextExplanation,
      newDiagnosis,
      resolveRoute
    };
  }

  function getMountedProfile() {
    return mountedController ? mountedController.getState().profile : null;
  }

  function isMaleLegacyRoute(hash, profile) {
    return Boolean(
      profile
      && profile.gender === 'male'
      && /^#\/(index|macro(?:\/|$)|moodbook(?:\/|$))/.test(hash)
    );
  }

  function redirectMaleLegacyRoute(hash, profile, location) {
    if (!isMaleLegacyRoute(hash, profile)) return false;
    location.hash = '#/diagnosis/result';
    return true;
  }

  function normalizeLegacyTypeOrder() {
    if (typeof document === 'undefined' || root.__miyuLegacyTypesNormalized) return;
    root.__miyuLegacyTypesNormalized = true;

    const orderedIds = ['01', '03', '07', '05', '06', '09', '12', '16', '18', '13', '08', '17'];
    const typeById = Object.fromEntries(core.TYPES.map(type => [type.hash.slice(-2), type]));

    if (typeof CAT_INFO !== 'undefined') {
      core.TYPES.forEach(type => {
        const id = type.hash.slice(-2);
        if (CAT_INFO[id]) {
          CAT_INFO[id].newCode = type.code;
          CAT_INFO[id].name = type.name;
        }
      });
    }

    if (typeof CAT_AVG_IMG !== 'undefined') {
      const previous = {
        d1: CAT_AVG_IMG['D-1'],
        d2: CAT_AVG_IMG['D-2'],
        d3: CAT_AVG_IMG['D-3']
      };
      CAT_AVG_IMG['D-1'] = previous.d3;
      CAT_AVG_IMG['D-2'] = previous.d1;
      CAT_AVG_IMG['D-3'] = previous.d2;
    }

    const firstSection = document.querySelector('.category-section[data-cat-id]');
    const sectionParent = firstSection?.parentElement;
    orderedIds.forEach(id => {
      const section = document.querySelector(`.category-section[data-cat-id="${id}"]`);
      const type = typeById[id];
      if (!section || !type) return;
      const code = section.querySelector('.cat-code-new');
      if (code) code.textContent = type.code;
      if (sectionParent) sectionParent.appendChild(section);
    });

    const menuTitle = Array.from(document.querySelectorAll('.nav-menu-title'))
      .find(element => element.textContent.includes('세부 카테고리'));
    if (menuTitle) menuTitle.textContent = '세부 카테고리 (12개)';
    const menuParent = document.querySelector('.nav-menu-cat')?.parentElement;
    orderedIds.forEach(id => {
      const item = document.querySelector(`.nav-menu-cat[data-cat="${id}"]`);
      const type = typeById[id];
      if (!item || !type) return;
      item.textContent = `${type.code} ${type.name}`;
      if (menuParent) menuParent.appendChild(item);
    });

    const dGrid = document.querySelector('.lv1-card[data-macro="D"] .lv1-thumb-grid');
    ['13', '08', '17'].forEach(id => {
      const item = dGrid?.querySelector(`a[href="#/cat/${id}"]`);
      const type = typeById[id];
      if (!item || !type) return;
      const code = item.querySelector('.lv1-thumb-code');
      const name = item.querySelector('.lv1-thumb-name');
      const image = item.querySelector('img');
      if (code) code.textContent = type.code;
      if (name) name.textContent = type.name;
      if (image) image.alt = type.code;
      dGrid.appendChild(item);
    });
  }

  function decorateExplanation(catId) {
    if (typeof document === 'undefined' || !mountedController) return;
    const state = mountedController.getState();
    if (!core.validateProfile(state.profile).valid) return;

    const type = core.TYPES.find(item => item.hash === `#/cat/${catId}`);
    const section = document.querySelector(`.category-section[data-cat-id="${catId}"]`);
    if (!type || !section) return;

    document.querySelectorAll('.miyu-explanation-panel').forEach(panel => panel.remove());
    const draft = content.getExplanation(
      type.code,
      state.profile.gender,
      state.profile.explanationLanguage
    );
    const header = section.querySelector('.cat-header');
    if (!draft || !header) return;
    header.insertAdjacentHTML('afterend', renderExplanationPanel(draft, state.profile));

    const isMale = state.profile.gender === 'male';
    const language = state.profile.explanationLanguage;
    if (isMale) {
      const topNav = document.getElementById('topNav');
      if (topNav) topNav.style.display = 'none';
    }
    section.classList.add('miyu-explanation-decorated');
    section.classList.toggle('miyu-explanation-male', isMale);
    const summary = section.querySelector('.cat-summary-block');
    const averageFace = summary?.querySelector('.cat-avg-face')
      || section.querySelector(':scope > .cat-avg-face');
    const peopleGrid = section.querySelector('.people-grid');
    section.querySelectorAll('.miyu-legacy-section-heading').forEach(heading => heading.remove());

    if (!isMale && averageFace) averageFace.remove();
    if (!isMale && peopleGrid) {
      peopleGrid.insertAdjacentHTML(
        'beforebegin',
        `<div class="miyu-legacy-section-heading">${renderSectionHeading(content.SECTION_LABELS.exampleCelebrities, language)}</div>`
      );
    }

    const representative = section.querySelector('.cat-representative');
    if (representative) {
      if (!representative.dataset.personName) {
        representative.dataset.personName = representative.textContent
          .replace(/^대표 인물\s*·\s*/, '')
          .trim();
      }
      representative.innerHTML = `${renderLocalizedBlock(
        content.SECTION_LABELS.exampleCelebrities,
        language,
        'miyu-legacy-representative-label'
      )}<span class="miyu-legacy-person-name">${escapeHtml(representative.dataset.personName)}</span>`;
    }
    const macroEn = section.querySelector('.macro-en');
    const macroKr = section.querySelector('.macro-kr');
    if (type.group === 'B') {
      if (macroEn) macroEn.textContent = isMale ? 'Boyish' : 'Feminine';
      if (macroKr) macroKr.textContent = isMale ? '보이시' : '페미닌';
    }
  }

  function mount(appElement, adapters) {
    if (!appElement || appElement.dataset.mounted === 'true') return;
    appElement.dataset.mounted = 'true';
    mountedApp = appElement;
    mountedController = createController(adapters);

    function currentQuestionIndex() {
      const match = adapters.location.hash.match(/^#\/diagnosis\/question\/(\d+)$/);
      return match ? Number(match[1]) - 1 : mountedController.getState().currentQuestion;
    }

    function renderCurrent(options = {}) {
      const previousScroll = typeof root.scrollY === 'number' ? root.scrollY : 0;
      const route = mountedController.resolveRoute(adapters.location.hash || '#/');
      if (route.kind === 'redirect') return;

      const view = appElement.querySelector('.miyu-diagnosis-view');
      if (route.kind === 'start') view.innerHTML = renderStartView(route.state);
      if (route.kind === 'intro') view.innerHTML = renderIntroView(route.state, route.pageNumber);
      if (route.kind === 'bridge') view.innerHTML = renderBridgeView(route.state);
      if (route.kind === 'question') {
        view.innerHTML = renderQuestionView(route.state, route.questionIndex);
      }
      if (route.kind === 'result') view.innerHTML = renderResultView(route.state);
      if (route.kind === 'explanation') {
        view.innerHTML = renderExplanationView(route.state, route.typeCode, route.pageIndex);
      }
      appElement.style.display = 'block';
      appElement.classList.remove('miyu-drawer-open');
      const topNav = document.getElementById('topNav');
      if (topNav) topNav.style.display = 'none';
      if (options.preserveScroll && typeof root.requestAnimationFrame === 'function') {
        root.requestAnimationFrame(function () {
          root.scrollTo(0, previousScroll);
        });
      }
    }

    appElement.addEventListener('submit', function (event) {
      if (!event.target.matches('[data-action="start"]')) return;
      event.preventDefault();
      const form = new FormData(event.target);
      const result = mountedController.start({
        explanationLanguage: form.get('explanationLanguage'),
        gender: form.get('gender'),
        diagnosisDate: form.get('diagnosisDate')
      });
      if (result.error) {
        appElement.querySelectorAll('[data-profile-error]').forEach(element => {
          element.textContent = '';
        });
        const error = appElement.querySelector(`[data-profile-error="${result.field}"]`);
        if (error) error.textContent = result.error;
      }
    });

    appElement.addEventListener('click', function (event) {
      const target = event.target.closest('[data-action]');
      if (!target) return;
      const action = target.dataset.action;
      if (action === 'open-progress') {
        appElement.classList.add('miyu-drawer-open');
        return;
      }
      if (action === 'close-progress') {
        appElement.classList.remove('miyu-drawer-open');
        return;
      }
      if (action === 'previous-intro') {
        const page = Number(target.closest('[data-intro-page]').dataset.introPage);
        mountedController.previousIntro(page);
        return;
      }
      if (action === 'next-intro') {
        const page = Number(target.closest('[data-intro-page]').dataset.introPage);
        mountedController.nextIntro(page);
        return;
      }
      if (action === 'previous-bridge') {
        mountedController.previousBridge();
        return;
      }
      if (action === 'begin-diagnosis') {
        mountedController.beginDiagnosis();
        return;
      }
      if (action === 'select-answer') {
        const result = mountedController.selectAnswer(currentQuestionIndex(), target.dataset.option);
        renderCurrent({ preserveScroll: true });
        if (result.error) {
          const error = appElement.querySelector('.miyu-selection-error');
          if (error) error.textContent = result.error;
        }
        return;
      }
      if (action === 'previous') {
        mountedController.previous(currentQuestionIndex());
        return;
      }
      if (action === 'next') {
        const result = mountedController.next(currentQuestionIndex());
        if (result.error) {
          const error = appElement.querySelector('.miyu-selection-error');
          if (error) error.textContent = result.error;
        }
        return;
      }
      if (action === 'goto-question') {
        mountedController.gotoQuestion(Number(target.dataset.question));
        return;
      }
      if (action === 'select-type') {
        mountedController.selectType(target.dataset.type);
        renderCurrent({ preserveScroll: true });
        return;
      }
      if (action === 'confirm-type') {
        mountedController.confirmType();
        return;
      }
      if (action === 'explanation-previous' || action === 'explanation-next') {
        const pageIndex = Number(target.closest('[data-explanation-page]').dataset.explanationPage);
        if (action === 'explanation-previous') mountedController.previousExplanation(pageIndex);
        if (action === 'explanation-next') mountedController.nextExplanation(pageIndex);
        return;
      }
      if (action === 'new-diagnosis') {
        mountedController.newDiagnosis();
      }
    });

    appElement.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') {
        appElement.classList.remove('miyu-drawer-open');
      }
    });
  }

  function renderRoute(hash) {
    if (!mountedApp || !mountedController) return;
    const route = mountedController.resolveRoute(hash);
    if (route.kind === 'redirect') return;
    const view = mountedApp.querySelector('.miyu-diagnosis-view');
    if (route.kind === 'start') view.innerHTML = renderStartView(route.state);
    if (route.kind === 'intro') view.innerHTML = renderIntroView(route.state, route.pageNumber);
    if (route.kind === 'bridge') view.innerHTML = renderBridgeView(route.state);
    if (route.kind === 'question') {
      view.innerHTML = renderQuestionView(route.state, route.questionIndex);
    }
    if (route.kind === 'result') view.innerHTML = renderResultView(route.state);
    if (route.kind === 'explanation') {
      view.innerHTML = renderExplanationView(route.state, route.typeCode, route.pageIndex);
    }
    mountedApp.style.display = 'block';
    mountedApp.classList.remove('miyu-drawer-open');
    const topNav = document.getElementById('topNav');
    if (topNav) topNav.style.display = 'none';
    if (typeof root.scrollTo === 'function') root.scrollTo({ top: 0, behavior: 'auto' });
  }

  return {
    STORAGE_KEY,
    escapeHtml,
    renderStartView,
    renderIntroView,
    renderBridgeView,
    renderProgressDrawer,
    renderQuestionView,
    renderResultView,
    renderLocalizedBlock,
    localizedGroupDisplayName,
    renderDetailTable,
    renderExplanationPanel,
    renderExplanationView,
    createController,
    getMountedProfile,
    isMaleLegacyRoute,
    redirectMaleLegacyRoute,
    normalizeLegacyTypeOrder,
    decorateExplanation,
    mount,
    renderRoute
  };
});
