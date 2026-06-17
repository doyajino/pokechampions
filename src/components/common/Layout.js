// src/components/common/Layout.js

import { router, ROUTES } from '../../router.js';

const NAV_ITEMS = [
  {
    section: '포켓몬',
    items: [
      { icon: '🔍', label: '포켓몬 도감',   path: ROUTES.POKEMON_LIST },
      { icon: '📊', label: '노력치 분배',   path: ROUTES.STAT_POINTS },
    ]
  },
  {
    section: '메타',
    items: [
      { icon: '📈', label: '사용률 통계',   path: ROUTES.USAGE_STATS },
      { icon: '⚔️', label: '티어리스트',    path: ROUTES.TIER_LIST },
    ]
  },
  {
    section: '팀',
    items: [
      { icon: '🏆', label: '랭킹',          path: ROUTES.RANKINGS },
      { icon: '🛠️', label: '팀 빌더',       path: ROUTES.TEAM_BUILDER },
    ]
  },
];

export function renderLayout(contentHtml) {
  return `
    <div class="layout-root">
      ${renderHeader()}
      <div class="content-wrapper">
        ${renderSidebar()}
        <main class="main-content" id="page-content">
          ${contentHtml}
        </main>
      </div>
    </div>
  `;
}

function renderHeader() {
  return `
    <header class="site-header">
      <a class="site-logo" href="#/">
        포켓몬<span>챔피언스</span> DB
      </a>
      <div class="header-search">
        <input
          type="search"
          id="global-search"
          placeholder="포켓몬 이름 검색..."
          autocomplete="off"
        />
      </div>
      <nav class="header-nav">
        <a href="#${ROUTES.META}">메타</a>
        <a href="#${ROUTES.TIER_LIST}">티어</a>
        <a href="#${ROUTES.TEAM_BUILDER}">팀 빌더</a>
        <a href="#${ROUTES.ABOUT}">정보</a>
      </nav>
    </header>
  `;
}

function renderSidebar() {
  const currentPath = router.getCurrentPath();

  const sectionsHtml = NAV_ITEMS.map(section => `
    <div class="sidebar-section">
      <div class="sidebar-section-label">${section.section}</div>
      ${section.items.map(item => `
        <a
          class="sidebar-nav-item ${currentPath === item.path ? 'active' : ''}"
          href="#${item.path}"
        >
          <span class="nav-icon">${item.icon}</span>
          ${item.label}
        </a>
      `).join('')}
    </div>
  `).join('');

  return `
    <aside class="sidebar" id="sidebar">
      ${sectionsHtml}
    </aside>
  `;
}

/** 앱 초기화 시 1회 호출 */
export function initNavigation() {
  // 검색창 엔터
  document.addEventListener('keydown', e => {
    if (e.key === 'Enter' && e.target.id === 'global-search') {
      const q = e.target.value.trim();
      if (q) router.navigate(`${ROUTES.POKEMON_LIST}?q=${encodeURIComponent(q)}`);
    }
  });
}

/** 사이드바/헤더 active 상태 갱신 */
export function updateSidebarActive(path) {
  document.querySelectorAll('.sidebar-nav-item').forEach(el => {
    const href = el.getAttribute('href')?.replace('#', '') || '';
    el.classList.toggle('active', href === path);
  });
  document.querySelectorAll('.header-nav a').forEach(el => {
    const href = el.getAttribute('href')?.replace('#', '') || '';
    el.classList.toggle('active', path.startsWith(href) && href !== '/');
  });
}
