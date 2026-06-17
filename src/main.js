// src/main.js

import { router, ROUTES, matchPathParams } from './router.js';
import { renderLayout, initNavigation, updateSidebarActive } from './components/common/Layout.js';
import {
  renderHomePage,
  renderPokemonListPage,
  renderPokemonDetailPage,
  renderUsageStatsPage,
  renderTierListPage,
  renderTeamBuilderPage,
  renderAboutPage,
} from './pages/index.js';

const PAGE_MAP = [
  { pattern: ROUTES.HOME,          render: renderHomePage,         title: '홈' },
  { pattern: ROUTES.POKEMON_DETAIL,render: renderPokemonDetailPage,title: '포켓몬 상세' },
  { pattern: ROUTES.POKEMON_LIST,  render: renderPokemonListPage,  title: '포켓몬 도감' },
  { pattern: ROUTES.USAGE_STATS,   render: renderUsageStatsPage,   title: '사용률 통계' },
  { pattern: ROUTES.TIER_LIST,     render: renderTierListPage,     title: '티어리스트' },
  { pattern: ROUTES.META,          render: renderUsageStatsPage,   title: '메타' },
  { pattern: ROUTES.TEAM_BUILDER,  render: renderTeamBuilderPage,  title: '팀 빌더' },
  { pattern: ROUTES.RANKINGS,      render: renderUsageStatsPage,   title: '랭킹' },
  { pattern: ROUTES.STAT_POINTS,   render: renderPokemonListPage,  title: '노력치 분배' },
  { pattern: ROUTES.ABOUT,         render: renderAboutPage,        title: '정보' },
];

// ─── 초기화 ───────────────────────────────────────────
async function init() {
  const app = document.getElementById('app');

  app.innerHTML = renderLayout(`
    <div class="skeleton" style="height:200px;margin-bottom:16px;"></div>
    <div class="skeleton" style="height:120px;margin-bottom:12px;"></div>
    <div class="skeleton" style="height:120px;"></div>
  `);

  initNavigation();

  router.onChange(path => loadPage(path));

  // 첫 로드
  await loadPage(router.getCurrentPath());
}

// ─── 페이지 로드 ──────────────────────────────────────
async function loadPage(path) {
  // 쿼리스트링 제거 후 매칭
  const cleanPath = path.split('?')[0];

  updateSidebarActive(cleanPath);

  const matched = matchRoute(cleanPath);
  const contentEl = document.getElementById('page-content');
  if (!contentEl) return;

  // 스켈레톤
  contentEl.innerHTML = `
    <div class="skeleton" style="height:48px;width:300px;margin-bottom:12px;"></div>
    <div class="skeleton" style="height:200px;margin-bottom:12px;"></div>
    <div class="skeleton" style="height:160px;"></div>
  `;

  try {
    const html = await matched.render(matched.params);
    contentEl.innerHTML = html;
    document.title = `${matched.title} — 포켓몬챔피언스 DB`;

    bindTabEvents(contentEl);
    bindPokemonFilter(contentEl);
  } catch (err) {
    console.error('Page render error:', err);
    contentEl.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">⚠️</div>
        <p>페이지를 불러오는 중 오류가 발생했습니다.</p>
        <p style="font-size:0.8rem;margin-top:8px;color:var(--color-text-muted);">${err.message}</p>
      </div>
    `;
  }

  window.scrollTo(0, 0);
}

function matchRoute(path) {
  for (const page of PAGE_MAP) {
    const params = matchPathParams(page.pattern, path);
    if (params !== null) return { ...page, params };
  }
  return {
    render: async () => `
      <div class="empty-state">
        <div class="empty-icon">🔎</div>
        <p>페이지를 찾을 수 없습니다: <code>${path}</code></p>
        <a href="#/" class="btn btn-secondary" style="margin-top:16px;">홈으로</a>
      </div>
    `,
    title: '404',
    params: {},
  };
}

// ─── 탭 이벤트 ────────────────────────────────────────
function bindTabEvents(root) {
  const tabBtns   = root.querySelectorAll('.tab-btn');
  const tabPanels = root.querySelectorAll('[data-tab-panel]');

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = btn.dataset.tab;
      tabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      tabPanels.forEach(p => {
        p.style.display = p.dataset.tabPanel === idx ? '' : 'none';
      });
    });
  });

  tabPanels.forEach((p, i) => { if (i > 0) p.style.display = 'none'; });
}

// ─── 포켓몬 필터 ──────────────────────────────────────
function bindPokemonFilter(root) {
  const filterInput = root.querySelector('#pokemon-filter');
  const typeSelect  = root.querySelector('#type-filter');
  const grid        = root.querySelector('#pokemon-grid');
  if (!filterInput || !grid) return;

  function applyFilter() {
    const q    = filterInput.value.toLowerCase();
    const type = typeSelect?.value || '';
    grid.querySelectorAll('.pokemon-card').forEach(card => {
      const name   = card.querySelector('.pokemon-name')?.textContent.toLowerCase() || '';
      const badges = [...card.querySelectorAll('.type-badge')].map(b =>
        b.className.replace('type-badge', '').trim()
      );
      const nameMatch = !q || name.includes(q);
      const typeMatch = !type || badges.includes(type);
      card.style.display = nameMatch && typeMatch ? '' : 'none';
    });
  }

  filterInput.addEventListener('input', applyFilter);
  typeSelect?.addEventListener('change', applyFilter);
}

init().catch(console.error);
