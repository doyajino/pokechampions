// src/router.js
// GitHub Pages 호환 해시 라우터
// URL 형태: https://도야.github.io/pokechampions/#/pokemon/25

export const BASE = '/pokechampions';

export const ROUTES = {
  HOME:           '/',
  POKEMON_LIST:   '/pokemon',
  POKEMON_DETAIL: '/pokemon/:id',
  META:           '/meta',
  TIER_LIST:      '/meta/tier',
  USAGE_STATS:    '/meta/usage',
  TEAM_BUILDER:   '/team',
  RANKINGS:       '/rankings',
  STAT_POINTS:    '/stat-points',
  ABOUT:          '/about',
};

class Router {
  constructor() {
    this.currentPath = '/';
    this.listeners = [];

    window.addEventListener('hashchange', () => this._handleChange());
    window.addEventListener('popstate',   () => this._handleChange());
  }

  /** 해시에서 경로 추출: #/pokemon/25 → /pokemon/25 */
  _getHashPath() {
    const hash = window.location.hash; // '#/pokemon/25' or ''
    if (hash.startsWith('#/')) return hash.slice(1); // '/pokemon/25'
    return '/';
  }

  navigate(path) {
    window.location.hash = path; // hashchange 이벤트 자동 발생
  }

  _handleChange() {
    this.currentPath = this._getHashPath();
    this.listeners.forEach(fn => fn(this.currentPath));
  }

  onChange(fn) {
    this.listeners.push(fn);
  }

  getCurrentPath() {
    return this._getHashPath();
  }
}

export const router = new Router();

/** 패턴 매칭 유틸 */
export function matchPathParams(pattern, path) {
  const pp = pattern.split('/');
  const pa = path.split('/');
  if (pp.length !== pa.length) return null;
  const params = {};
  for (let i = 0; i < pp.length; i++) {
    if (pp[i].startsWith(':')) params[pp[i].slice(1)] = pa[i];
    else if (pp[i] !== pa[i]) return null;
  }
  return params;
}
