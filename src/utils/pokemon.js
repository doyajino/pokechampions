// src/utils/pokemon.js

export const TYPE_NAMES_KO = {
  normal:   '노말',  fire:     '불꽃',  water:    '물',
  grass:    '풀',    electric: '전기',  ice:      '얼음',
  fighting: '격투',  poison:   '독',    ground:   '땅',
  flying:   '비행',  psychic:  '에스퍼', bug:     '벌레',
  rock:     '바위',  ghost:    '고스트', dragon:  '드래곤',
  dark:     '악',    steel:    '강철',  fairy:    '페어리',
};

export const STAT_NAMES_KO = {
  hp:             'HP',
  attack:         '공격',
  defense:        '방어',
  specialAttack:  '특공',
  specialDefense: '특방',
  speed:          '스피드',
};

export const STAT_KEYS = ['hp', 'attack', 'defense', 'specialAttack', 'specialDefense', 'speed'];

export const NATURE_NAMES_KO = {
  Hardy: '굳센', Lonely: '외로운', Brave: '용감한', Adamant: '고집',
  Naughty: '개구쟁이', Bold: '뻔뻔한', Docile: '솔직한', Relaxed: '노력',
  Impish: '짓궂은', Lax: '촐랑대는', Timid: '겁쟁이', Hasty: '성급한',
  Serious: '신중한', Jolly: '명랑한', Naive: '천진난만', Modest: '얌전한',
  Mild: '온화한', Quiet: '조용한', Bashful: '수줍은', Rash: '덜렁대는',
  Calm: '차분한', Gentle: '온순한', Sassy: '건방진', Careful: '주의깊은',
  Quirky: '변덕쟁이',
};

export const NATURE_EFFECTS = {
  Adamant: { up: 'attack', down: 'specialAttack' },
  Jolly:   { up: 'speed',  down: 'specialAttack' },
  Modest:  { up: 'specialAttack', down: 'attack' },
  Timid:   { up: 'speed',  down: 'attack' },
  Bold:    { up: 'defense', down: 'attack' },
  Calm:    { up: 'specialDefense', down: 'attack' },
  Careful: { up: 'specialDefense', down: 'specialAttack' },
  Impish:  { up: 'defense', down: 'specialAttack' },
  Brave:   { up: 'attack', down: 'speed' },
  Quiet:   { up: 'specialAttack', down: 'speed' },
  // 중립 성격은 null
};

/**
 * 포켓몬 스프라이트 URL 반환 (PokeAPI CDN)
 */
export function getSpriteUrl(pokemonId) {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemonId}.png`;
}

export function getOfficialArtUrl(pokemonId) {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${pokemonId}.png`;
}

/**
 * 노력치 분배를 한국어 텍스트로 변환
 * spread: { hp: 2, attack: 32, ... }
 */
export function spreadToString(spread) {
  return STAT_KEYS
    .map(key => `${STAT_NAMES_KO[key]} ${spread[key] ?? 0}`)
    .join(' / ');
}

/**
 * 성격 효과 설명
 */
export function getNatureDescription(nature) {
  const effect = NATURE_EFFECTS[nature];
  if (!effect) return `${nature} (${NATURE_NAMES_KO[nature] || ''}) — 중립`;
  const upKo   = STAT_NAMES_KO[effect.up];
  const downKo = STAT_NAMES_KO[effect.down];
  return `${nature} (${NATURE_NAMES_KO[nature] || ''}) — ${upKo}↑ ${downKo}↓`;
}

/**
 * 티어별 색상
 */
export const TIER_COLORS = {
  S: '#ff4d4d',
  A: '#ff8c42',
  B: '#f0c040',
  C: '#4caf50',
  D: '#7c7c7c',
};
