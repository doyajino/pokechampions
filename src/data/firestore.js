// src/data/firestore.js
// Firestore CRUD 레이어 — 포켓몬/노력치/메타 데이터

import { db } from '../firebase.js';
import {
  collection, doc, getDoc, getDocs,
  setDoc, updateDoc, addDoc, deleteDoc,
  query, where, orderBy, limit,
  serverTimestamp, onSnapshot,
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// =====================
// 컬렉션 경로 상수
// =====================
const COL = {
  POKEMON:         'pokemon',
  STAT_POINTS:     'statPoints',         // 포켓몬별 노력치 분배 서브컬렉션
  STAT_HISTORY:    'statPointHistory',
  META:            'meta',
  TEAMS:           'teams',
  RANKINGS:        'rankings',
};

// =====================
// 포켓몬 기본 정보
// =====================

/** 전체 포켓몬 목록 조회 */
export async function getAllPokemon() {
  const snap = await getDocs(collection(db, COL.POKEMON));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

/** 포켓몬 단건 조회 */
export async function getPokemon(pokemonId) {
  const snap = await getDoc(doc(db, COL.POKEMON, String(pokemonId)));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

/** 포켓몬 저장/업데이트 */
export async function upsertPokemon(pokemonId, data) {
  await setDoc(doc(db, COL.POKEMON, String(pokemonId)), {
    ...data,
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

// =====================
// 노력치 (스탯포인트) 데이터
// =====================

/**
 * 포켓몬의 추천 노력치 분배 목록 조회
 * Firestore 구조:
 *   pokemon/{pokemonId}/statPoints/{spreadId}
 */
export async function getStatPointSpreads(pokemonId) {
  const ref = collection(db, COL.POKEMON, String(pokemonId), COL.STAT_POINTS);
  const q = query(ref, orderBy('rank', 'asc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

/**
 * 노력치 분배 저장
 * data 예시:
 * {
 *   rank: 1,
 *   nature: "Adamant",
 *   spread: { hp: 2, attack: 32, defense: 0, specialAttack: 0, specialDefense: 0, speed: 32 },
 *   usageRate: 11.621,
 *   source: "Pikalytics",
 *   sourceUrl: "https://...",
 *   trustScore: 95
 * }
 */
export async function upsertStatPointSpread(pokemonId, spreadId, data) {
  const ref = doc(db, COL.POKEMON, String(pokemonId), COL.STAT_POINTS, spreadId);
  await setDoc(ref, {
    ...data,
    lastUpdated: serverTimestamp(),
  }, { merge: true });
}

/** 노력치 변경 히스토리 기록 */
export async function logStatPointHistory(pokemonId, before, after, reason, sourceUrls = []) {
  const ref = collection(db, COL.STAT_HISTORY, String(pokemonId), 'history');
  await addDoc(ref, {
    before,
    after,
    changedFields: getChangedFields(before, after),
    reason,
    sourceUrls,
    createdAt: serverTimestamp(),
  });
}

function getChangedFields(before, after) {
  const changed = [];
  if (before.nature !== after.nature) changed.push('nature');
  if (JSON.stringify(before.spread) !== JSON.stringify(after.spread)) changed.push('statPointSpread');
  return changed;
}

/** 히스토리 조회 */
export async function getStatPointHistory(pokemonId, limitCount = 20) {
  const ref = collection(db, COL.STAT_HISTORY, String(pokemonId), 'history');
  const q = query(ref, orderBy('createdAt', 'desc'), limit(limitCount));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// =====================
// 메타 / 랭킹
// =====================

/** 현재 시즌 사용률 랭킹 조회 */
export async function getUsageRanking(season = 'current', limitCount = 50) {
  const ref = collection(db, COL.RANKINGS);
  const q = query(
    ref,
    where('season', '==', season),
    orderBy('usageRate', 'desc'),
    limit(limitCount)
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

/** 티어리스트 조회 */
export async function getTierList(season = 'current') {
  const ref = collection(db, COL.META);
  const q = query(ref, where('season', '==', season), where('type', '==', 'tierList'));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return snap.docs[0].data();
}

// =====================
// 팀 빌더
// =====================

/** 팀 저장 */
export async function saveTeam(userId, teamData) {
  const ref = collection(db, COL.TEAMS);
  return await addDoc(ref, {
    userId,
    ...teamData,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

/** 유저 팀 목록 조회 */
export async function getUserTeams(userId) {
  const ref = collection(db, COL.TEAMS);
  const q = query(ref, where('userId', '==', userId), orderBy('updatedAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

/** 팀 실시간 구독 */
export function subscribeTeam(teamId, callback) {
  const ref = doc(db, COL.TEAMS, teamId);
  return onSnapshot(ref, snap => {
    if (snap.exists()) callback({ id: snap.id, ...snap.data() });
  });
}
