// src/pages/index.js
// 각 페이지 렌더 함수 모음

import { getAllPokemon, getPokemon, getStatPointSpreads, getUsageRanking, getTierList } from '../data/firestore.js';
import { renderStatPointSpreads } from '../components/pokemon/StatPointCard.js';
import { getSpriteUrl, TYPE_NAMES_KO, TIER_COLORS } from '../utils/pokemon.js';

// ========================
// 홈 페이지
// ========================
export async function renderHomePage() {
  return `
    <div class="page-header">
      <div class="page-title">포켓몬챔피언스 공략 DB</div>
      <div class="page-subtitle">노력치 분배 · 메타 랭킹 · 팀 빌더 — 경쟁전 필수 데이터</div>
    </div>

    <div class="grid-2" style="margin-bottom: 32px;">
      <a href="#/pokemon" class="card" style="cursor:pointer; text-decoration:none;">
        <div class="card-title">포켓몬 도감</div>
        <p style="color: var(--color-text-secondary); font-size: 0.875rem;">
          추천 노력치 · 스탯포인트 분배 · 기술 · 특성 · 파트너 정보
        </p>
      </a>
      <a href="#/meta/usage" class="card" style="cursor:pointer; text-decoration:none;">
        <div class="card-title">사용률 통계</div>
        <p style="color: var(--color-text-secondary); font-size: 0.875rem;">
          Pikalytics 기반 현시즌 사용률 실시간 반영
        </p>
      </a>
      <a href="#/meta/tier" class="card" style="cursor:pointer; text-decoration:none;">
        <div class="card-title">티어리스트</div>
        <p style="color: var(--color-text-secondary); font-size: 0.875rem;">
          S ~ D 티어 분류 · 카운터 포켓몬 · 추천 운용 방식
        </p>
      </a>
      <a href="#/team" class="card" style="cursor:pointer; text-decoration:none;">
        <div class="card-title">팀 빌더</div>
        <p style="color: var(--color-text-secondary); font-size: 0.875rem;">
          파티 구성 · 타입 상성 · 노력치 시뮬레이터
        </p>
      </a>
    </div>

    <div class="card">
      <div class="card-title">📌 포켓몬챔피언스 노력치 안내</div>
      <p style="color: var(--color-text-secondary); font-size: 0.875rem; line-height: 1.8;">
        포켓몬챔피언스의 <strong style="color: var(--color-text-primary);">스탯포인트(Stat Points)</strong>는
        본가 포켓몬의 노력치(EV)와 유사하지만 수치 체계가 다릅니다.<br>
        본 사이트에서는 게임 내 표기 기준으로 <strong style="color: var(--color-accent-gold);">노력치 / 스탯포인트 분배</strong>로 표기합니다.
      </p>
    </div>
  `;
}

// ========================
// 포켓몬 목록 페이지
// ========================
export async function renderPokemonListPage() {
  let pokemon = [];
  try {
    pokemon = await getAllPokemon();
  } catch (e) {
    console.warn('Firebase 미연결 — 샘플 데이터 사용');
    pokemon = getSamplePokemon();
  }

  const cardHtml = pokemon.length
    ? pokemon.map(p => renderPokemonCard(p)).join('')
    : `<div class="empty-state" style="grid-column:1/-1;"><div class="empty-icon">🔍</div><p>포켓몬 데이터가 없습니다.</p></div>`;

  return `
    <div class="page-header">
      <div class="page-title">포켓몬 도감</div>
      <div class="page-subtitle">포켓몬챔피언스 기준 스탯포인트 · 노력치 분배 수록</div>
    </div>

    <div style="display:flex; gap:12px; margin-bottom:24px; flex-wrap:wrap;">
      <input type="search" id="pokemon-filter" placeholder="이름으로 필터..."
        style="background:var(--color-bg-surface); border:1px solid var(--color-border-bright);
               border-radius:var(--radius-md); padding:8px 14px; color:var(--color-text-primary);
               font-family:var(--font-body); font-size:0.875rem; outline:none; width:220px;">
      <select id="type-filter"
        style="background:var(--color-bg-surface); border:1px solid var(--color-border-bright);
               border-radius:var(--radius-md); padding:8px 12px; color:var(--color-text-secondary);
               font-family:var(--font-body); font-size:0.875rem; outline:none;">
        <option value="">모든 타입</option>
        ${Object.entries(TYPE_NAMES_KO).map(([en, ko]) =>
          `<option value="${en}">${ko}</option>`
        ).join('')}
      </select>
    </div>

    <div class="grid-pokemon" id="pokemon-grid">
      ${cardHtml}
    </div>
  `;
}

function renderPokemonCard(p) {
  const types = (p.types || []).map(t =>
    `<span class="type-badge ${t}">${TYPE_NAMES_KO[t] || t}</span>`
  ).join('');

  return `
    <a href="#/pokemon/${p.id}" class="pokemon-card" style="text-decoration:none;">
      <img
        class="pokemon-img"
        src="${getSpriteUrl(p.nationalDex || p.id)}"
        alt="${p.nameKo || p.name}"
        loading="lazy"
        onerror="this.src='data:image/svg+xml,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'80\' height=\'80\'><rect width=\'80\' height=\'80\' fill=\'%231C2E45\'/></svg>'"
      />
      <div class="pokemon-number">#${String(p.nationalDex || p.id).padStart(3, '0')}</div>
      <div class="pokemon-name">${p.nameKo || p.name}</div>
      <div class="type-list">${types}</div>
    </a>
  `;
}

// ========================
// 포켓몬 상세 페이지
// ========================
export async function renderPokemonDetailPage(params) {
  const id = params.id;
  let pokemon, spreads;

  try {
    [pokemon, spreads] = await Promise.all([
      getPokemon(id),
      getStatPointSpreads(id),
    ]);
  } catch (e) {
    console.warn('Firebase 미연결 — 샘플 데이터 사용');
    pokemon = getSamplePokemonDetail(id);
    spreads = getSampleSpreads();
  }

  if (!pokemon) {
    return `<div class="empty-state"><div class="empty-icon">❓</div><p>포켓몬을 찾을 수 없습니다.</p></div>`;
  }

  const types = (pokemon.types || []).map(t =>
    `<span class="type-badge ${t}">${TYPE_NAMES_KO[t] || t}</span>`
  ).join(' ');

  const tabs = [
    '노력치 분배', '추천 기술', '추천 특성', '추천 아이템',
    '운용 방식', '파트너', '카운터'
  ];

  return `
    <div class="breadcrumb">
      <a href="#/pokemon">포켓몬 도감</a>
      <span>›</span>
      <span>${pokemon.nameKo || pokemon.name}</span>
    </div>

    <!-- 포켓몬 헤더 -->
    <div style="display:flex; gap:32px; align-items:flex-start; margin-bottom:32px; flex-wrap:wrap;">
      <div style="text-align:center;">
        <img
          src="${getOfficialArt(pokemon)}"
          alt="${pokemon.nameKo}"
          style="width:160px; height:160px; object-fit:contain; image-rendering:pixelated;"
        />
      </div>
      <div style="flex:1; min-width:200px;">
        <div style="font-size:0.85rem; color:var(--color-text-muted); margin-bottom:4px;">
          #${String(pokemon.nationalDex || id).padStart(3, '0')}
        </div>
        <h1 style="font-family:var(--font-display); font-size:2rem; font-weight:700; margin-bottom:8px;">
          ${pokemon.nameKo || pokemon.name}
        </h1>
        <div style="margin-bottom:12px;">${types}</div>
        ${pokemon.tier ? `
          <span class="tier-badge ${pokemon.tier}" style="margin-bottom:8px;">${pokemon.tier}</span>
        ` : ''}
        <p style="color:var(--color-text-secondary); font-size:0.875rem; margin-top:8px;">
          ${pokemon.description || ''}
        </p>
      </div>
    </div>

    <!-- 탭 -->
    <div class="tabs" id="detail-tabs">
      ${tabs.map((t, i) =>
        `<button class="tab-btn ${i === 0 ? 'active' : ''}" data-tab="${i}">${t}</button>`
      ).join('')}
    </div>

    <!-- 탭 콘텐츠 -->
    <div id="tab-content">

      <!-- 0: 노력치 분배 -->
      <div data-tab-panel="0">
        <div style="margin-bottom:16px;">
          <h2 style="font-family:var(--font-display); font-size:1.1rem; margin-bottom:4px;">추천 노력치 분배</h2>
          <p style="font-size:0.8rem; color:var(--color-text-muted);">포켓몬챔피언스 기준 스탯포인트 · 출처: Pikalytics</p>
        </div>
        ${renderStatPointSpreads(spreads)}
      </div>

      <!-- 1: 추천 기술 -->
      <div data-tab-panel="1">
        <h2 style="font-family:var(--font-display); font-size:1.1rem; margin-bottom:16px;">추천 기술</h2>
        ${renderMoveList(pokemon.moves)}
      </div>

      <!-- 2: 추천 특성 -->
      <div data-tab-panel="2">
        <h2 style="font-family:var(--font-display); font-size:1.1rem; margin-bottom:16px;">추천 특성</h2>
        ${renderAbilityList(pokemon.abilities)}
      </div>

      <!-- 3: 추천 아이템 -->
      <div data-tab-panel="3">
        <h2 style="font-family:var(--font-display); font-size:1.1rem; margin-bottom:16px;">추천 아이템</h2>
        ${renderItemList(pokemon.items)}
      </div>

      <!-- 4: 운용 방식 -->
      <div data-tab-panel="4">
        <h2 style="font-family:var(--font-display); font-size:1.1rem; margin-bottom:16px;">추천 운용 방식</h2>
        ${renderUsageStyle(pokemon)}
      </div>

      <!-- 5: 파트너 -->
      <div data-tab-panel="5">
        <h2 style="font-family:var(--font-display); font-size:1.1rem; margin-bottom:16px;">추천 파트너</h2>
        ${renderPartners(pokemon.partners)}
      </div>

      <!-- 6: 카운터 -->
      <div data-tab-panel="6">
        <h2 style="font-family:var(--font-display); font-size:1.1rem; margin-bottom:16px;">카운터 포켓몬</h2>
        ${renderCounters(pokemon.counters)}
      </div>

    </div>
  `;
}

function getOfficialArt(pokemon) {
  const id = pokemon.nationalDex || pokemon.id;
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`;
}

// ========================
// 탭별 렌더 함수
// ========================

function emptyState(msg) {
  return `<div class="empty-state"><div class="empty-icon">📭</div><p>${msg}</p></div>`;
}

function renderMoveList(moves = []) {
  if (!moves?.length) return emptyState('추천 기술 데이터가 없습니다.');
  return `
    <div style="display:flex; flex-direction:column; gap:8px;">
      ${moves.map((m, i) => {
        const name = typeof m === 'string' ? m : m.name;
        const usage = typeof m === 'object' && m.usage ? m.usage.toFixed(1) + '%' : '';
        return `
          <div class="card" style="display:flex; align-items:center; justify-content:space-between; padding:12px 16px;">
            <div style="display:flex; align-items:center; gap:12px;">
              <span style="font-family:var(--font-display); font-size:1.1rem; color:var(--color-text-muted); min-width:24px;">${i+1}</span>
              <span style="font-weight:600;">${name}</span>
            </div>
            ${usage ? `<span style="color:var(--color-accent-blue); font-family:var(--font-display);">${usage}</span>` : ''}
          </div>`;
      }).join('')}
    </div>`;
}

function renderAbilityList(abilities = []) {
  if (!abilities?.length) return emptyState('추천 특성 데이터가 없습니다.');
  return `
    <div style="display:flex; flex-direction:column; gap:8px;">
      ${abilities.map((a, i) => {
        const name = typeof a === 'string' ? a : a.name;
        const usage = typeof a === 'object' && a.usage ? a.usage.toFixed(1) + '%' : '';
        return `
          <div class="card" style="display:flex; align-items:center; justify-content:space-between; padding:12px 16px;">
            <div style="display:flex; align-items:center; gap:12px;">
              <span style="font-family:var(--font-display); font-size:1.1rem; color:var(--color-text-muted); min-width:24px;">${i+1}</span>
              <span style="font-weight:600;">${name}</span>
            </div>
            ${usage ? `<span style="color:var(--color-accent-blue); font-family:var(--font-display);">${usage}</span>` : ''}
          </div>`;
      }).join('')}
    </div>`;
}

function renderItemList(items = []) {
  if (!items?.length) return emptyState('추천 아이템 데이터가 없습니다.');
  return `
    <div style="display:flex; flex-direction:column; gap:8px;">
      ${items.map((item, i) => {
        const name = typeof item === 'string' ? item : item.name;
        const usage = typeof item === 'object' && item.usage ? item.usage.toFixed(1) + '%' : '';
        return `
          <div class="card" style="display:flex; align-items:center; justify-content:space-between; padding:12px 16px;">
            <div style="display:flex; align-items:center; gap:12px;">
              <span style="font-family:var(--font-display); font-size:1.1rem; color:var(--color-text-muted); min-width:24px;">${i+1}</span>
              <span style="font-weight:600;">${name}</span>
            </div>
            ${usage ? `<span style="color:var(--color-accent-blue); font-family:var(--font-display);">${usage}</span>` : ''}
          </div>`;
      }).join('')}
    </div>`;
}

function renderUsageStyle(pokemon) {
  const topMove = pokemon.moves?.[0];
  const topAbility = pokemon.abilities?.[0];
  const topItem = pokemon.items?.[0];
  const topNature = pokemon.natures?.[0] || pokemon.recommendedStatPointSpreads?.[0];

  if (!topMove && !topAbility && !topItem) return emptyState('운용 방식 데이터가 없습니다.');

  const nature = topNature?.nature || '-';
  const moveName = typeof topMove === 'string' ? topMove : topMove?.name || '-';
  const abilName = typeof topAbility === 'string' ? topAbility : topAbility?.name || '-';
  const itemName = typeof topItem === 'string' ? topItem : topItem?.name || '-';

  return `
    <div class="card" style="margin-bottom:16px;">
      <div class="card-title">주요 운용 방식</div>
      <div style="display:grid; grid-template-columns: repeat(2, 1fr); gap:16px; margin-top:8px;">
        <div>
          <div style="font-size:0.75rem; color:var(--color-text-muted); margin-bottom:4px;">성격</div>
          <div style="font-weight:600;">${nature}</div>
        </div>
        <div>
          <div style="font-size:0.75rem; color:var(--color-text-muted); margin-bottom:4px;">주요 특성</div>
          <div style="font-weight:600;">${abilName}</div>
        </div>
        <div>
          <div style="font-size:0.75rem; color:var(--color-text-muted); margin-bottom:4px;">주요 아이템</div>
          <div style="font-weight:600;">${itemName}</div>
        </div>
        <div>
          <div style="font-size:0.75rem; color:var(--color-text-muted); margin-bottom:4px;">주요 기술</div>
          <div style="font-weight:600;">${moveName}</div>
        </div>
      </div>
    </div>
    <div class="card">
      <div class="card-title">추천 기술 구성</div>
      <div style="margin-top:8px;">
        ${(pokemon.moves || []).slice(0, 4).map(m => {
          const name = typeof m === 'string' ? m : m.name;
          return `<span style="display:inline-block; background:var(--color-bg-elevated); border-radius:4px; padding:4px 12px; margin:3px; font-size:0.875rem;">${name}</span>`;
        }).join('')}
      </div>
    </div>`;
}

function renderPartners(partners = []) {
  if (!partners?.length) return emptyState('파트너 데이터가 없습니다.');
  return `
    <div style="display:flex; flex-wrap:wrap; gap:12px;">
      ${partners.map((p, i) => {
        const name = typeof p === 'string' ? p : p.name;
        const rank = typeof p === 'object' ? p.rank : null;
        const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '');
        return `
          <div class="card" style="text-align:center; min-width:100px; padding:12px; cursor:default;">
            <img src="https://cdn.pikalytics.com/images/championssprites/${slug}.png" alt="${name}"
              style="width:60px; height:60px; object-fit:contain; margin:0 auto 8px; image-rendering:pixelated;"
              onerror="this.style.opacity='0.3'">
            <div style="font-size:0.85rem; font-weight:600;">${name}</div>
            ${rank ? `<div style="font-size:0.75rem; color:var(--color-text-muted);">#${rank}</div>` : ''}
          </div>`;
      }).join('')}
    </div>`;
}

function renderCounters(counters = []) {
  if (!counters?.length) return emptyState('카운터 데이터가 없습니다.<br><small>추후 업데이트 예정</small>');
  return `
    <div style="display:flex; flex-wrap:wrap; gap:12px;">
      ${counters.map(c => {
        const name = typeof c === 'string' ? c : c.name;
        const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '');
        return `
          <div class="card" style="text-align:center; min-width:100px; padding:12px;">
            <img src="https://cdn.pikalytics.com/images/championssprites/${slug}.png" alt="${name}"
              style="width:60px; height:60px; object-fit:contain; margin:0 auto 8px; image-rendering:pixelated;"
              onerror="this.style.opacity='0.3'">
            <div style="font-size:0.85rem; font-weight:600;">${name}</div>
          </div>`;
      }).join('')}
    </div>`;
}

// ========================
// 사용률 통계 페이지
// ========================
export async function renderUsageStatsPage() {
  let rankings = [];
  try {
    rankings = await getUsageRanking('current', 30);
  } catch (e) {
    rankings = getSampleRankings();
  }

  const rows = rankings.map((r, i) => `
    <tr>
      <td><span class="rank-num ${i < 3 ? 'top3' : ''}">${i + 1}</span></td>
      <td>
        <div style="display:flex; align-items:center; gap:10px;">
          <img src="${getSpriteUrl(r.nationalDex || r.pokemonId)}" width="36" height="36"
               style="image-rendering:pixelated;" alt="${r.nameKo}">
          <span style="color:var(--color-text-primary);">${r.nameKo || r.name}</span>
        </div>
      </td>
      <td>
        ${(r.types || []).map(t =>
          `<span class="type-badge ${t}">${TYPE_NAMES_KO[t] || t}</span>`
        ).join(' ')}
      </td>
      <td>
        <div class="usage-bar">
          <div class="usage-bar-track">
            <div class="usage-bar-fill" style="width:${Math.min(100, (r.usageRate || 0) * 4)}%"></div>
          </div>
          <span class="usage-pct">${(r.usageRate || 0).toFixed(2)}%</span>
        </div>
      </td>
      ${r.tier ? `<td><span class="tier-badge ${r.tier}">${r.tier}</span></td>` : '<td>—</td>'}
    </tr>
  `).join('');

  return `
    <div class="page-header">
      <div class="page-title">사용률 통계</div>
      <div class="page-subtitle">현시즌 경쟁전 사용률 · Pikalytics 기반 자동 수집</div>
    </div>

    <div class="card" style="padding:0; overflow:hidden;">
      <table class="meta-table">
        <thead>
          <tr>
            <th style="width:48px;">순위</th>
            <th>포켓몬</th>
            <th>타입</th>
            <th>사용률</th>
            <th>티어</th>
          </tr>
        </thead>
        <tbody>${rows || '<tr><td colspan="5" style="text-align:center;color:var(--color-text-muted);padding:32px;">데이터 없음</td></tr>'}</tbody>
      </table>
    </div>
  `;
}

// ========================
// 티어리스트 페이지
// ========================
export async function renderTierListPage() {
  let tierData;
  try {
    tierData = await getTierList();
  } catch (e) {
    tierData = getSampleTierList();
  }

  const tiers = ['S', 'A', 'B', 'C', 'D'];

  return `
    <div class="page-header">
      <div class="page-title">티어리스트</div>
      <div class="page-subtitle">현시즌 메타 기준 포켓몬챔피언스 경쟁전 티어</div>
    </div>

    ${tiers.map(tier => {
      const pokemon = tierData?.[tier] || [];
      return `
        <div style="margin-bottom:24px;">
          <div style="display:flex; align-items:center; gap:10px; margin-bottom:12px;">
            <span class="tier-badge ${tier}">${tier}</span>
            <span style="font-family:var(--font-display); font-size:0.9rem; color:var(--color-text-secondary);">
              ${getTierLabel(tier)}
            </span>
          </div>
          <div style="display:flex; flex-wrap:wrap; gap:8px; padding:16px; background:var(--color-bg-surface); border:1px solid var(--color-border); border-radius:var(--radius-lg);">
            ${pokemon.length
              ? pokemon.map(p => `
                  <a href="#/pokemon/${p.id}"
                    style="display:flex; flex-direction:column; align-items:center; gap:4px; text-decoration:none;
                           padding:8px; border-radius:var(--radius-md); transition:background 0.15s;"
                    onmouseover="this.style.background='var(--color-bg-elevated)'"
                    onmouseout="this.style.background=''"
                  >
                    <img src="${getSpriteUrl(p.nationalDex || p.id)}" width="52" height="52"
                         style="image-rendering:pixelated;" alt="${p.nameKo}">
                    <span style="font-size:0.75rem; color:var(--color-text-secondary);">${p.nameKo}</span>
                  </a>
                `).join('')
              : `<span style="color:var(--color-text-muted); font-size:0.85rem;">등록된 포켓몬 없음</span>`
            }
          </div>
        </div>
      `;
    }).join('')}
  `;
}

function getTierLabel(tier) {
  return { S: '최상위 메타', A: '상위권', B: '준수한 픽', C: '상황 의존', D: '하위권' }[tier] || '';
}

// ========================
// 팀 빌더 페이지 (뼈대)
// ========================
export async function renderTeamBuilderPage() {
  return `
    <div class="page-header">
      <div class="page-title">팀 빌더</div>
      <div class="page-subtitle">파티 구성 · 타입 상성 분석 · 노력치 시뮬레이터</div>
    </div>

    <div class="card" style="margin-bottom:16px;">
      <div class="card-title">내 파티</div>
      <div style="display:grid; grid-template-columns:repeat(6, 1fr); gap:12px; margin-top:8px;">
        ${Array(6).fill(null).map((_, i) => `
          <div style="aspect-ratio:1; background:var(--color-bg-base); border:2px dashed var(--color-border);
                      border-radius:var(--radius-md); display:flex; align-items:center; justify-content:center;
                      color:var(--color-text-muted); font-size:1.5rem; cursor:pointer;"
               onclick="alert('포켓몬 선택 모달 — 추후 구현')">
            +
          </div>
        `).join('')}
      </div>
    </div>

    <div class="grid-2">
      <div class="card">
        <div class="card-title">타입 상성 분석</div>
        <p style="color:var(--color-text-muted); font-size:0.875rem;">파티를 구성하면 자동으로 분석됩니다.</p>
      </div>
      <div class="card">
        <div class="card-title">노력치 요약</div>
        <p style="color:var(--color-text-muted); font-size:0.875rem;">각 포켓몬의 스탯포인트 분배를 확인합니다.</p>
      </div>
    </div>
  `;
}

// ========================
// About 페이지
// ========================
export async function renderAboutPage() {
  return `
    <div class="page-header">
      <div class="page-title">사이트 정보</div>
    </div>
    <div class="card">
      <div class="card-title">데이터 출처</div>
      <p style="color:var(--color-text-secondary); font-size:0.875rem; line-height:1.9;">
        노력치/스탯포인트 통계: <a href="https://pikalytics.com" target="_blank">Pikalytics</a> (1순위)<br>
        보조 통계: <a href="https://pokemondb.net/pokebase" target="_blank">PokéBase</a><br>
        메타/팀/아이템 검증: Pokémon Zone<br>
        데미지 검증: Pikalytics Damage Calculator
      </p>
    </div>
    <div class="card" style="margin-top:16px;">
      <div class="card-title">표기 안내</div>
      <p style="color:var(--color-text-secondary); font-size:0.875rem; line-height:1.9;">
        본 사이트의 <strong style="color:var(--color-text-primary);">노력치</strong>는 포켓몬챔피언스의
        <strong style="color:var(--color-accent-gold);">Stat Points(스탯포인트)</strong> 기준으로 표기합니다.<br>
        본가 포켓몬의 EV(252 기준)와 수치 체계가 다를 수 있습니다.
      </p>
    </div>
  `;
}

// ========================
// 샘플 데이터 (Firebase 미연결 시)
// ========================
function getSamplePokemon() {
  return [
    { id: '1',   nationalDex: 1,   nameKo: '이상해씨',   types: ['grass', 'poison'] },
    { id: '4',   nationalDex: 4,   nameKo: '파이리',     types: ['fire'] },
    { id: '7',   nationalDex: 7,   nameKo: '꼬부기',     types: ['water'] },
    { id: '25',  nationalDex: 25,  nameKo: '피카츄',     types: ['electric'] },
    { id: '39',  nationalDex: 39,  nameKo: '푸린',       types: ['normal', 'fairy'] },
    { id: '52',  nationalDex: 52,  nameKo: '나옹',       types: ['normal'] },
    { id: '94',  nationalDex: 94,  nameKo: '겐가',       types: ['ghost', 'poison'] },
    { id: '131', nationalDex: 131, nameKo: '라프라스',   types: ['water', 'ice'] },
    { id: '143', nationalDex: 143, nameKo: '잠만보',     types: ['normal'] },
    { id: '149', nationalDex: 149, nameKo: '망나뇽',     types: ['dragon', 'flying'] },
    { id: '248', nationalDex: 248, nameKo: '마기라스',   types: ['rock', 'dark'] },
    { id: '282', nationalDex: 282, nameKo: '가디안',     types: ['psychic', 'fairy'] },
  ];
}

function getSamplePokemonDetail(id) {
  return {
    id, nationalDex: Number(id),
    name: 'pikachu', nameKo: '피카츄',
    types: ['electric'],
    tier: 'A',
    description: '전기 타입의 상징적인 포켓몬. 스피드가 높고 특공 기반 공격이 강력합니다.',
  };
}

function getSampleSpreads() {
  return [
    {
      rank: 1, nature: 'Timid',
      spread: { hp: 0, attack: 0, defense: 0, specialAttack: 32, specialDefense: 0, speed: 32 },
      usageRate: 24.512, source: 'Pikalytics', sourceUrl: 'https://pikalytics.com', trustScore: 95,
    },
    {
      rank: 2, nature: 'Modest',
      spread: { hp: 4, attack: 0, defense: 0, specialAttack: 32, specialDefense: 0, speed: 28 },
      usageRate: 12.341, source: 'Pikalytics', sourceUrl: 'https://pikalytics.com', trustScore: 88,
    },
  ];
}

function getSampleRankings() {
  return [
    { pokemonId: '149', nationalDex: 149, nameKo: '망나뇽',   types: ['dragon','flying'], usageRate: 24.5, tier: 'S' },
    { pokemonId: '248', nationalDex: 248, nameKo: '마기라스', types: ['rock','dark'],     usageRate: 19.2, tier: 'S' },
    { pokemonId: '282', nationalDex: 282, nameKo: '가디안',   types: ['psychic','fairy'], usageRate: 15.8, tier: 'A' },
    { pokemonId: '94',  nationalDex: 94,  nameKo: '겐가',     types: ['ghost','poison'],  usageRate: 13.1, tier: 'A' },
    { pokemonId: '131', nationalDex: 131, nameKo: '라프라스', types: ['water','ice'],     usageRate: 10.4, tier: 'B' },
    { pokemonId: '25',  nationalDex: 25,  nameKo: '피카츄',   types: ['electric'],        usageRate: 8.9,  tier: 'B' },
  ];
}

function getSampleTierList() {
  return {
    S: [
      { id: '149', nationalDex: 149, nameKo: '망나뇽' },
      { id: '248', nationalDex: 248, nameKo: '마기라스' },
    ],
    A: [
      { id: '282', nationalDex: 282, nameKo: '가디안' },
      { id: '94',  nationalDex: 94,  nameKo: '겐가' },
    ],
    B: [
      { id: '131', nationalDex: 131, nameKo: '라프라스' },
      { id: '25',  nationalDex: 25,  nameKo: '피카츄' },
    ],
    C: [],
    D: [],
  };
}
