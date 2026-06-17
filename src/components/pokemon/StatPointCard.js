// src/components/pokemon/StatPointCard.js
// 노력치 분배 카드 컴포넌트

import { spreadToString, getNatureDescription, STAT_NAMES_KO, STAT_KEYS } from '../../utils/pokemon.js';

/**
 * 노력치 분배 카드 렌더링
 * @param {Object} spread - Firestore에서 가져온 노력치 데이터
 */
export function renderStatPointCard(spread) {
  const isTop = spread.rank === 1;
  const spreadStr = spreadToString(spread.spread || {});
  const natureDesc = getNatureDescription(spread.nature);
  const usageRate = spread.usageRate ? `${spread.usageRate.toFixed(3)}%` : '—';

  return `
    <div class="spread-card ${isTop ? 'rank-1' : ''}">
      <div class="spread-card-header">
        <span class="spread-rank-badge ${isTop ? 'rank-1' : ''}">
          ${isTop ? '★ ' : ''}추천 노력치 ${spread.rank}위
        </span>
        <span class="spread-usage">사용률 ${usageRate}</span>
      </div>

      <div class="spread-nature">
        성격: ${natureDesc}
      </div>

      <div class="stat-bar-group">
        ${renderSpreadBars(spread.spread)}
      </div>

      <div style="margin-top: 12px; font-size: 0.8rem; color: var(--color-text-secondary);">
        분배: ${spreadStr}
      </div>

      ${spread.trustScore ? `
        <div style="margin-top: 8px;">
          <span class="status-badge auto-updated">신뢰도 ${spread.trustScore}</span>
        </div>
      ` : ''}

      <div class="spread-source">
        출처: <a href="${spread.sourceUrl || '#'}" target="_blank" rel="noopener">
          ${spread.source || '—'}
        </a>
        ${spread.lastUpdated ? `· 마지막 업데이트: ${formatDate(spread.lastUpdated)}` : ''}
      </div>
    </div>
  `;
}

function renderSpreadBars(spread = {}) {
  const MAX_POINTS = 32; // 포켓몬챔피언스 스탯포인트 최대치

  const barClasses = {
    hp:             '',
    attack:         'attack',
    defense:        'defense',
    specialAttack:  'sp-atk',
    specialDefense: 'sp-def',
    speed:          'speed',
  };

  return STAT_KEYS.map(key => {
    const val = spread[key] ?? 0;
    const pct = Math.min(100, (val / MAX_POINTS) * 100);
    return `
      <div class="stat-row">
        <span class="stat-label">${STAT_NAMES_KO[key]}</span>
        <span class="stat-value">${val}</span>
        <div class="stat-bar-track">
          <div class="stat-bar-fill ${barClasses[key]}" style="width: ${pct}%"></div>
        </div>
      </div>
    `;
  }).join('');
}

function formatDate(timestamp) {
  if (!timestamp) return '—';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleDateString('ko-KR');
}

/**
 * 여러 노력치 분배 카드 렌더링
 */
export function renderStatPointSpreads(spreads = []) {
  if (!spreads.length) {
    return `
      <div class="empty-state">
        <div class="empty-icon">📊</div>
        <p>등록된 노력치 분배가 없습니다.</p>
      </div>
    `;
  }

  return `
    <div style="display: flex; flex-direction: column; gap: 12px;">
      ${spreads.map(s => renderStatPointCard(s)).join('')}
    </div>
  `;
}
