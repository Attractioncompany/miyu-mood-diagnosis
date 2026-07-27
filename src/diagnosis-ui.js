(function (root, factory) {
  const core = typeof module === 'object' && module.exports
    ? require('./diagnosis-core.js')
    : root.MiyuDiagnosisCore;
  const api = factory(core, root);
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
})(typeof globalThis !== 'undefined' ? globalThis : this, function (core, root) {
  'use strict';

  const STORAGE_KEY = 'miyuDiagnosisV17';
  const GROUP_NAMES = {
    A: 'Blossom · 블로썸',
    B: 'Feminine · 페미닌',
    C: 'Mood · 무드',
    D: 'Modern · 모던'
  };

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
    return paths.map((path, index) =>
      `<button class="miyu-image-zoom" type="button" data-action="open-image" data-image="${escapeHtml(path)}" aria-label="${escapeHtml(alt)} 이미지 ${index + 1} 크게 보기">`
      + `<img src="${asset(path)}" data-asset="${escapeHtml(path)}" alt="${escapeHtml(alt)}" loading="eager">`
      + '<span aria-hidden="true">확대</span>'
      + '</button>'
    ).join('');
  }

  function renderStartView(state) {
    return `<div class="miyu-start-shell">
      <img class="miyu-start-logo" src="${asset('logo')}" data-asset="logo" alt="MIYU">
      <p class="miyu-eyebrow">MIYU MOOD CHECKLIST</p>
      <h1>무드 진단</h1>
      <p class="miyu-start-copy">10개의 항목을 차례로 확인해 주세요. 각 문항은 최대 2개까지 선택할 수 있어요.</p>
      <form class="miyu-profile-form" data-action="start">
        <label>이름
          <input name="clientName" value="${escapeHtml(state.profile.name)}" required autocomplete="name">
          <span class="miyu-field-error" data-profile-error aria-live="polite"></span>
        </label>
        <label>진단일
          <input name="diagnosisDate" type="date" value="${escapeHtml(state.profile.date)}">
        </label>
        <label>퍼스널컬러 <span class="miyu-optional">선택</span>
          <input name="personalColor" value="${escapeHtml(state.profile.personalColor)}" placeholder="예: 여름 쿨">
        </label>
        <button class="miyu-button miyu-primary" type="submit">진단 시작</button>
      </form>
    </div>`;
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
      const images = renderAssetImages(option.images, `${option.code}. ${option.label}`);
      return `<article class="miyu-answer-card" data-selected="${pressed}">
        <button class="miyu-answer-select" type="button"
          data-action="select-answer" data-option="${option.code}"
          aria-pressed="${pressed}">
          <span class="miyu-option-code">${option.code}</span>
          <span class="miyu-option-label">${escapeHtml(option.label)}</span>
          <span class="miyu-checkmark" aria-hidden="true">✓</span>
        </button>
        ${images ? `<div class="miyu-answer-image" data-image-count="${option.images.length}">${images}</div>` : '<div class="miyu-answer-no-image" aria-hidden="true"></div>'}
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
      return `<article class="miyu-score-card" data-group="${group}" data-rank="${rank}">
        ${renderRankBadge(rank)}
        <span class="miyu-score-code">${group}</span>
        <span class="miyu-score-name">${GROUP_NAMES[group]}</span>
        <strong>${scores[group]}</strong><small>/ 10</small>
      </article>`;
    }).join('');

    const groupSections = core.OPTION_CODES.map(group => {
      const groupTypes = core.TYPES.filter(type => type.group === group);
      const rank = ranks[group];
      const typeCards = groupTypes.map(type => {
        const selected = state.selectedType === type.code;
        return `<button class="miyu-type-card" type="button"
          data-action="select-type" data-type="${type.code}"
          data-group="${type.group}" data-rank="${rank}" data-selected="${selected}"
          aria-pressed="${selected}">
          ${renderRankBadge(rank)}
          ${selected ? '<span class="miyu-selected-badge">선택</span>' : ''}
          <span class="miyu-type-photo"><img src="${asset(type.image)}" data-asset="${type.image}" alt="${escapeHtml(type.name)}"></span>
          <span class="miyu-type-code">${type.code}</span>
          <strong>${escapeHtml(type.name)}</strong>
        </button>`;
      }).join('');
      return `<section class="miyu-type-group" data-group="${group}" data-rank="${rank}">
        <header>
          ${renderRankBadge(rank)}
          <span>${group}</span>
          <strong>${GROUP_NAMES[group]}</strong>
          <small>${scores[group]}점</small>
        </header>
        <div class="miyu-type-row">${typeCards}</div>
      </section>`;
    }).join('');

    const selected = core.TYPES.find(type => type.code === state.selectedType);
    const confirmLabel = selected
      ? `${selected.code} ${selected.name}으로 확정하고 해설 보기`
      : '최종 타입을 선택해 주세요';
    const personalColor = state.profile.personalColor
      ? `<span>퍼스널컬러 ${escapeHtml(state.profile.personalColor)}</span>`
      : '';
    return `<div class="miyu-result-shell">
      <header class="miyu-result-head">
        <img src="${asset('logo')}" data-asset="logo" alt="MIYU">
        <p class="miyu-eyebrow">MIYU MOOD CHECKLIST</p>
        <h1>${escapeHtml(state.profile.name)}님의 진단 결과</h1>
        <div class="miyu-result-profile"><span>${escapeHtml(state.profile.date)}</span>${personalColor}</div>
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
      const name = String(profile.name || '').trim();
      if (!name) return { error: '이름을 입력해 주세요' };
      state = {
        ...state,
        profile: {
          name,
          date: String(profile.date || state.profile.date || today()),
          personalColor: String(profile.personalColor || '').trim()
        }
      };
      save();
      const firstIncomplete = core.firstIncompleteQuestion(state.answers);
      location.hash = firstIncomplete === core.QUESTIONS.length
        ? '#/diagnosis/result'
        : `#/diagnosis/question/${firstIncomplete + 1}`;
      return { error: null };
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
      location.hash = core.explanationHash(state.selectedType);
      return { error: null };
    }

    function newDiagnosis() {
      const hasProgress = Boolean(
        state.profile.name
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

      location.hash = '#/';
      return { kind: 'redirect', state };
    }

    return {
      getState,
      start,
      selectAnswer,
      previous,
      next,
      gotoQuestion,
      selectType,
      confirmType,
      newDiagnosis,
      resolveRoute
    };
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
      if (code) code.textContent = type.code;
      if (name) name.textContent = type.name;
      dGrid.appendChild(item);
    });
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
      if (route.kind === 'question') {
        view.innerHTML = renderQuestionView(route.state, route.questionIndex);
      }
      if (route.kind === 'result') view.innerHTML = renderResultView(route.state);
      appElement.style.display = 'block';
      appElement.classList.remove('miyu-drawer-open', 'miyu-modal-open');
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
        name: form.get('clientName'),
        date: form.get('diagnosisDate'),
        personalColor: form.get('personalColor')
      });
      if (result.error) {
        const error = appElement.querySelector('[data-profile-error]');
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
      if (action === 'open-image') {
        const modal = appElement.querySelector('.miyu-image-modal');
        const image = modal?.querySelector('img');
        if (image) {
          image.src = asset(target.dataset.image);
          image.alt = target.querySelector('img')?.alt || '진단 참고 이미지';
        }
        appElement.classList.add('miyu-modal-open');
        document.body.style.overflow = 'hidden';
        return;
      }
      if (action === 'close-image') {
        appElement.classList.remove('miyu-modal-open');
        document.body.style.overflow = '';
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
      if (action === 'new-diagnosis') {
        mountedController.newDiagnosis();
      }
    });

    appElement.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') {
        appElement.classList.remove('miyu-drawer-open', 'miyu-modal-open');
        document.body.style.overflow = '';
      }
    });
  }

  function renderRoute(hash) {
    if (!mountedApp || !mountedController) return;
    const route = mountedController.resolveRoute(hash);
    if (route.kind === 'redirect') return;
    const view = mountedApp.querySelector('.miyu-diagnosis-view');
    if (route.kind === 'start') view.innerHTML = renderStartView(route.state);
    if (route.kind === 'question') {
      view.innerHTML = renderQuestionView(route.state, route.questionIndex);
    }
    if (route.kind === 'result') view.innerHTML = renderResultView(route.state);
    mountedApp.style.display = 'block';
    mountedApp.classList.remove('miyu-drawer-open', 'miyu-modal-open');
    const topNav = document.getElementById('topNav');
    if (topNav) topNav.style.display = 'none';
    document.body.style.overflow = '';
    if (typeof root.scrollTo === 'function') root.scrollTo({ top: 0, behavior: 'auto' });
  }

  return {
    STORAGE_KEY,
    escapeHtml,
    renderStartView,
    renderProgressDrawer,
    renderQuestionView,
    renderResultView,
    createController,
    normalizeLegacyTypeOrder,
    mount,
    renderRoute
  };
});
