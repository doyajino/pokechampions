/**
 * collect.js
 * Pikalytics에서 포켓몬챔피언스 노력치/사용률 데이터 수집
 * GitHub Actions에서 매일 자동 실행
 */

const puppeteer = require('puppeteer');
const admin = require('firebase-admin');

const DRY_RUN = process.argv.includes('--dry-run');

// ─── Firebase 초기화 ──────────────────────────────────────────
function initFirebase() {
  if (DRY_RUN) { console.log('[DRY-RUN] Firebase 초기화 건너뜀'); return null; }

  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  if (!process.env.FIREBASE_PROJECT_ID || !privateKey) {
    throw new Error('GitHub Secrets에 FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY 설정 필요');
  }
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId:   process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey,
    }),
  });
  return admin.firestore();
}

// ─── 수집 대상 포켓몬 ─────────────────────────────────────────
const POKEMON_LIST = [
  { slug: 'dragonite',      id: '149', nameKo: '망나뇽',     types: ['dragon','flying']   },
  { slug: 'tyranitar',      id: '248', nameKo: '마기라스',   types: ['rock','dark']        },
  { slug: 'garchomp',       id: '445', nameKo: '한카리아스', types: ['dragon','ground']    },
  { slug: 'gardevoir',      id: '282', nameKo: '가디안',     types: ['psychic','fairy']    },
  { slug: 'gengar',         id: '94',  nameKo: '겐가',       types: ['ghost','poison']     },
  { slug: 'metagross',      id: '376', nameKo: '메타그로스', types: ['steel','psychic']    },
  { slug: 'salamence',      id: '373', nameKo: '보만다',     types: ['dragon','flying']    },
  { slug: 'lapras',         id: '131', nameKo: '라프라스',   types: ['water','ice']        },
  { slug: 'pikachu',        id: '25',  nameKo: '피카츄',     types: ['electric']           },
  { slug: 'umbreon',        id: '197', nameKo: '블래키',     types: ['dark']               },
  { slug: 'flygon',         id: '330', nameKo: '플라이곤',   types: ['dragon','ground']    },
  { slug: 'absol',          id: '359', nameKo: '앱솔',       types: ['dark']               },
  { slug: 'urshifu',        id: '892', nameKo: '우라오스',   types: ['fighting','water']   },
  { slug: 'incineroar',     id: '727', nameKo: '어둠숲무왕', types: ['fire','dark']        },
  { slug: 'calyrex-shadow', id: '898', nameKo: '블리자포스', types: ['psychic','ghost']    },
  { slug: 'miraidon',       id: '1008',nameKo: '미라이돈',   types: ['electric','dragon']  },
  { slug: 'chien-pao',      id: '1002',nameKo: '칼-엘',      types: ['dark','ice']         },
  { slug: 'zamazenta',      id: '889', nameKo: '자마젠타',   types: ['fighting','steel']   },
];

// ─── Pikalytics 파싱 ──────────────────────────────────────────
async function scrapePikalytics(page, slug) {
  const url = `https://www.pikalytics.com/pokedex/sv/${slug}`;
  console.log(`  📥 ${url}`);

  await page.goto(url, { waitUntil: 'networkidle2', timeout: 40000 });
  await page.waitForSelector('.pokedex-section-title-wrap', { timeout: 10000 }).catch(() => {});

  return await page.evaluate(() => {
    const result = {
      usageRate: null,
      spreads:   [],
      moves:     [],
      items:     [],
      abilities: [],
      partners:  [],
    };

    const allText = document.body.innerText;

    // ── EV Spreads: "Adamant 180/252/4/0/4/68  22.260%" 패턴 ──
    const spreadRe = /([A-Z][a-z]+)\s+(\d+)\/(\d+)\/(\d+)\/(\d+)\/(\d+)\/(\d+)\s+([\d.]+)%/g;
    let m, rank = 1;
    while ((m = spreadRe.exec(allText)) !== null && rank <= 5) {
      result.spreads.push({
        rank,
        nature: m[1],
        spread: {
          hp:             +m[2],
          attack:         +m[3],
          defense:        +m[4],
          specialAttack:  +m[5],
          specialDefense: +m[6],
          speed:          +m[7],
        },
        usageRate: parseFloat(m[8]),
      });
      rank++;
    }

    // ── 기술: Best Moves 섹션 ──
    const moveEls = document.querySelectorAll(
      '[class*="pokedex-move"] .pokedex-pokemon-info-section-item-name,' +
      '[class*="move-name"],' +
      '.pokedex-pokemon-moves-list-item-name'
    );
    if (moveEls.length) {
      [...moveEls].slice(0, 6).forEach(el => {
        const t = el.textContent.trim();
        if (t && t !== 'Other') result.moves.push(t);
      });
    } else {
      // 텍스트 파싱 fallback
      const movesBlock = allText.match(/Best Moves for[\s\S]*?(?=Best Teammates|Best Items|Best EV)/)?.[0] || '';
      const lines = movesBlock.split('\n').filter(l => /^\S.+\s+[\d.]+%$/.test(l.trim()));
      lines.slice(0, 6).forEach(l => result.moves.push(l.replace(/\s+[\d.]+%$/, '').trim()));
    }

    // ── 아이템 ──
    const itemEls = document.querySelectorAll(
      '[class*="pokedex-item"] .pokedex-pokemon-info-section-item-name,' +
      '.pokedex-pokemon-items-list-item-name'
    );
    if (itemEls.length) {
      [...itemEls].slice(0, 4).forEach(el => {
        const t = el.textContent.trim();
        if (t && t !== 'Other') result.items.push(t);
      });
    } else {
      const itemsBlock = allText.match(/Best Items for[\s\S]*?(?=Best Moves|Best Teammates|Best EV)/)?.[0] || '';
      const lines = itemsBlock.split('\n').filter(l => /^\S.+\s+[\d.]+%$/.test(l.trim()));
      lines.slice(0, 4).forEach(l => result.items.push(l.replace(/\s+[\d.]+%$/, '').trim()));
    }

    // ── 특성 ──
    const abilityEls = document.querySelectorAll(
      '[class*="pokedex-ability"] .pokedex-pokemon-info-section-item-name,' +
      '.pokedex-pokemon-abilities-list-item-name'
    );
    if (abilityEls.length) {
      [...abilityEls].slice(0, 3).forEach(el => {
        const t = el.textContent.trim();
        if (t && t !== 'Other') result.abilities.push(t);
      });
    } else {
      const abBlock = allText.match(/Best Abilities for[\s\S]*?(?=Best Moves|Best Items|Best EV)/)?.[0] || '';
      const lines = abBlock.split('\n').filter(l => /^\S.+\s+[\d.]+%$/.test(l.trim()));
      lines.slice(0, 3).forEach(l => result.abilities.push(l.replace(/\s+[\d.]+%$/, '').trim()));
    }

    // ── 파트너 ──
    const partnerEls = document.querySelectorAll(
      '[class*="pokedex-teammate"] .pokedex-pokemon-info-section-item-name,' +
      '.pokedex-pokemon-teammates-list-item-name'
    );
    [...partnerEls].slice(0, 5).forEach(el => {
      const t = el.textContent.trim();
      if (t) result.partners.push(t);
    });

    // ── 사용률 ──
    const usageMatch = allText.match(/(\d{1,2}\.\d+)%\s*\n[\s\S]*?Base Stats/);
    if (usageMatch) result.usageRate = parseFloat(usageMatch[1]);

    return result;
  });
}

// ─── 업데이트 판단 ────────────────────────────────────────────
function shouldAutoUpdate(existing, newData) {
  if (!existing?.recommendedStatPointSpreads?.length) return { update: true, reason: 'no_existing_data' };

  const oldTop = existing.recommendedStatPointSpreads[0];
  const newTop = newData.spreads[0];
  if (!newTop) return { update: false, reason: 'no_new_spread' };

  const sameNature = oldTop.nature === newTop.nature;
  const sameSpread = JSON.stringify(oldTop.spread) === JSON.stringify(newTop.spread);

  if (sameNature && sameSpread)             return { update: false, reason: 'no_change' };
  if ((newTop.usageRate - oldTop.usageRate) >= 6) return { update: true,  reason: 'usage_surge' };
  if (!sameNature && sameSpread)            return { update: false, reason: 'pending_review', status: 'pending_review' };

  return { update: false, reason: 'conflict', status: 'conflict' };
}

// ─── Firestore 저장 ───────────────────────────────────────────
async function saveToFirestore(db, pokemon, scraped, existing) {
  const decision = shouldAutoUpdate(existing, scraped);
  console.log(`  📊 판단: ${decision.reason}`);

  const ref = db.collection('pokemon').doc(pokemon.id);
  const now = admin.firestore.FieldValue.serverTimestamp();

  const baseData = {
    id:         pokemon.id,
    nationalDex: parseInt(pokemon.id),
    name:       pokemon.slug,
    nameKo:     pokemon.nameKo,
    types:      pokemon.types,
    usageRate:  scraped.usageRate,
    moves:      scraped.moves,
    items:      scraped.items,
    abilities:  scraped.abilities,
    partners:   scraped.partners,
    lastCollected: now,
  };

  if (decision.update && scraped.spreads.length > 0) {
    // 히스토리 저장
    if (existing?.recommendedStatPointSpreads?.length) {
      await db.collection('statPointHistory').doc(pokemon.id)
        .collection('history').add({
          before: existing.recommendedStatPointSpreads[0],
          after:  scraped.spreads[0],
          changedFields: ['nature', 'statPointSpread'],
          reason: `auto_${decision.reason}`,
          sourceUrls: [`https://www.pikalytics.com/pokedex/sv/${pokemon.slug}`],
          createdAt: now,
        });
    }

    // 노력치 서브컬렉션 저장
    const batch = db.batch();
    for (const sp of scraped.spreads) {
      const spreadRef = ref.collection('statPoints').doc(`rank_${sp.rank}`);
      batch.set(spreadRef, {
        ...sp,
        source:    'Pikalytics',
        sourceUrl: `https://www.pikalytics.com/pokedex/sv/${pokemon.slug}`,
        trustScore: 95,
        lastUpdated: now,
      });
    }
    await batch.commit();

    baseData.recommendedStatPointSpreads = scraped.spreads;
    console.log(`  ✅ 노력치 ${scraped.spreads.length}개 저장`);
  } else if (decision.status) {
    baseData.statPointStatus = decision.status;
    baseData.pendingSpreads  = scraped.spreads;
    console.log(`  ⚠️  ${decision.status} — 수동 검토 필요`);
  }

  await ref.set(baseData, { merge: true });
}

// ─── 메인 ─────────────────────────────────────────────────────
async function main() {
  console.log('🚀 포켓몬챔피언스 데이터 수집 시작');
  console.log(`   모드: ${DRY_RUN ? 'DRY-RUN' : '실제 저장'} | 대상: ${POKEMON_LIST.length}마리\n`);

  const db = initFirebase();

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36');
  await page.setViewport({ width: 1280, height: 900 });

  const stats = { success: 0, skip: 0, error: 0 };

  for (const pokemon of POKEMON_LIST) {
    console.log(`\n[${pokemon.id}] ${pokemon.nameKo} (${pokemon.slug})`);
    try {
      const scraped = await scrapePikalytics(page, pokemon.slug);

      console.log(`  사용률: ${scraped.usageRate ?? '?'}%`);
      console.log(`  노력치: ${scraped.spreads.length}개 | 기술: ${scraped.moves.length}개 | 아이템: ${scraped.items.length}개`);

      if (scraped.spreads.length > 0) {
        const top = scraped.spreads[0];
        console.log(`  1위: ${top.nature} HP${top.spread.hp}/Atk${top.spread.attack}/Def${top.spread.defense}/SpA${top.spread.specialAttack}/SpD${top.spread.specialDefense}/Spe${top.spread.speed} (${top.usageRate}%)`);
      }

      if (DRY_RUN) { stats.success++; continue; }

      const existingSnap = await db.collection('pokemon').doc(pokemon.id).get();
      await saveToFirestore(db, pokemon, scraped, existingSnap.exists ? existingSnap.data() : null);
      stats.success++;

      await new Promise(r => setTimeout(r, 2500)); // Pikalytics 부하 방지

    } catch (err) {
      console.error(`  ❌ ${err.message}`);
      stats.error++;
    }
  }

  await browser.close();

  console.log('\n══════════════════════════════');
  console.log(`✅ 성공: ${stats.success} | ❌ 오류: ${stats.error}`);
  console.log('══════════════════════════════');

  if (stats.error > 0) process.exit(1);
}

main().catch(err => { console.error('치명적 오류:', err); process.exit(1); });
