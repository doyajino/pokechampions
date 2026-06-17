/**
 * collect.js
 * Pikalytics 포켓몬챔피언스 전용 데이터 수집
 * URL: https://www.pikalytics.com (Champions Reg M-B 기본값)
 *
 * 포켓몬챔피언스는 SV와 달리:
 * - EV Spread 수치(HP/Atk/...) 없음 → 성격(Nature) + 사용률만 제공
 * - 별도 상세 URL 없음 → SPA, 사이드바 클릭으로 포켓몬 전환
 */

const puppeteer = require('puppeteer');
const admin = require('firebase-admin');

const DRY_RUN = process.argv.includes('--dry-run');

// ─── Firebase 초기화 ──────────────────────────────────────────
function initFirebase() {
  if (DRY_RUN) { console.log('[DRY-RUN] Firebase 초기화 건너뜀'); return null; }

  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  if (!process.env.FIREBASE_PROJECT_ID || !privateKey) {
    throw new Error('GitHub Secrets 미설정: FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY');
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

// ─── 현재 포켓몬 데이터 파싱 ──────────────────────────────────
async function parseCurrentPokemon(page) {
  return await page.evaluate(() => {
    const result = {
      name: null, rank: null, usageRate: null,
      moves: [], items: [], abilities: [], natures: [], partners: [],
    };

    const allText = document.body.innerText;
    const lines = allText.split('\n').map(l => l.trim()).filter(Boolean);

    // 포켓몬 이름 (헤더)
    const nameEl = document.querySelector('h1, .pokedex-pokemon-name, [class*="pokemon-header"] span');
    result.name = nameEl?.textContent?.trim()
      || document.querySelector('.champions-sprite-shell img[alt]')?.alt
      || null;

    // Monthly Rank (우측 상단)
    const rankEl = document.querySelector('[class*="monthly-rank"] a, [class*="rank"] a');
    const rankText = rankEl?.textContent?.trim() || allText.match(/Monthly Rank\s*\n\s*#(\d+)/)?.[1];
    result.rank = rankText ? parseInt(rankText.replace('#', '')) : null;

    // 사용률 — 사이드바에서 현재 포켓몬 찾기
    const activeEntry = document.querySelector('.pokedex-entry.active, [class*="active"][class*="entry"]');
    const usageText = activeEntry?.textContent?.trim() || '';
    const usageMatch = usageText.match(/([\d.]+)%/);
    if (usageMatch) result.usageRate = parseFloat(usageMatch[1]);

    // 기술 파싱
    const moveSections = [...document.querySelectorAll('[class*="move-section"], [class*="pokedex-move"], .pokedex-move-section')];
    if (moveSections.length) {
      moveSections.slice(0, 6).forEach(el => {
        const name = el.querySelector('[class*="name"]')?.textContent?.trim();
        const pct  = el.querySelector('[class*="percent"], [class*="usage"]')?.textContent?.trim();
        if (name && name !== 'Other') result.moves.push({ name, usage: parseFloat(pct) || 0 });
      });
    } else {
      // 텍스트 파싱 fallback
      const movesBlock = allText.match(/Best Moves for[\s\S]*?(?=Best Items|Best Abilities|Nature \/ EV)/)?.[0] || '';
      movesBlock.split('\n').forEach(l => {
        const m = l.trim().match(/^(.+?)\s+([\d.]+)%$/);
        if (m && m[1] !== 'Other' && result.moves.length < 6) {
          result.moves.push({ name: m[1].trim(), usage: parseFloat(m[2]) });
        }
      });
    }

    // 아이템 파싱
    const itemsBlock = allText.match(/Best Items for[\s\S]*?(?=Best Abilities|Nature \/ EV|Best Moves)/)?.[0] || '';
    itemsBlock.split('\n').forEach(l => {
      const m = l.trim().match(/^(.+?)\s+([\d.]+)%$/);
      if (m && m[1] !== 'Other' && result.items.length < 4) {
        result.items.push({ name: m[1].trim(), usage: parseFloat(m[2]) });
      }
    });

    // 특성 파싱
    const abilBlock = allText.match(/Best Abilities for[\s\S]*?(?=Nature \/ EV|Best Moves|Best Items)/)?.[0] || '';
    abilBlock.split('\n').forEach(l => {
      const m = l.trim().match(/^(.+?)\s+([\d.]+)%$/);
      if (m && m[1] !== 'Other' && result.abilities.length < 3) {
        result.abilities.push({ name: m[1].trim(), usage: parseFloat(m[2]) });
      }
    });

    // 성격 (Nature / EV Spreads) — 포켓몬챔피언스는 성격+사용률만 제공
    const natureBlock = allText.match(/Nature \/ EV Spreads[\s\S]*?(?=\n\nBest|\n\nPokemon|$)/)?.[0] || '';
    let rank = 1;
    natureBlock.split('\n').forEach(l => {
      const m = l.trim().match(/^([A-Z][a-z]+)\s+([\d.]+)%$/);
      if (m && rank <= 5) {
        result.natures.push({ rank, nature: m[1], usageRate: parseFloat(m[2]) });
        rank++;
      }
    });

    // 파트너 (Best Teammates)
    const tmBlock = allText.match(/Best Teammates for[\s\S]*?(?=\n\nBest|\n\nPokemon|$)/)?.[0] || '';
    tmBlock.split('\n').forEach(l => {
      const m = l.trim().match(/^([A-Z][a-zA-Z\-']+(?:\s[A-Z][a-zA-Z\-']+)?)\s+#(\d+)$/);
      if (m && result.partners.length < 5) {
        result.partners.push({ name: m[1], rank: +m[2] });
      }
    });

    return result;
  });
}

// ─── 사이드바 포켓몬 목록 수집 ────────────────────────────────
async function getSidebarPokemonList(page) {
  return await page.evaluate(() => {
    const list = [];

    // 이미지 alt로 포켓몬 이름 수집
    const imgs = [...document.querySelectorAll('img[src*="championssprites"]')];
    const names = new Set();
    imgs.forEach(img => {
      if (img.alt && img.alt !== 'Garchomp') { // 현재 선택된 포켓몬 제외
        const entry = img.closest('[class*="entry"], li, [class*="pokemon"]');
        const rankEl = entry?.querySelector('[class*="rank"], [class*="number"]');
        const rankText = entry?.textContent?.match(/#(\d+)/)?.[1];
        if (!names.has(img.alt)) {
          names.add(img.alt);
          list.push({ name: img.alt, rank: rankText ? +rankText : null });
        }
      }
    });

    return list.sort((a, b) => (a.rank || 999) - (b.rank || 999));
  });
}

// ─── 특정 포켓몬 클릭하여 데이터 로드 ────────────────────────
async function clickPokemon(page, pokemonName) {
  // 이미지 alt로 포켓몬 클릭
  const clicked = await page.evaluate((name) => {
    const imgs = [...document.querySelectorAll('img[src*="championssprites"]')];
    const img = imgs.find(i => i.alt?.toLowerCase() === name.toLowerCase());
    if (img) {
      const clickTarget = img.closest('li, [class*="entry"], [class*="pokemon-item"]') || img.parentElement;
      clickTarget.click();
      return true;
    }
    return false;
  }, pokemonName);

  if (!clicked) {
    // 텍스트로 fallback 클릭
    const found = await page.evaluate((name) => {
      const allElements = [...document.querySelectorAll('[class*="pokedex"] *')];
      const el = allElements.find(e => e.textContent.trim() === name && e.children.length === 0);
      if (el) { (el.closest('li') || el).click(); return true; }
      return false;
    }, pokemonName);
    if (!found) return false;
  }

  await page.waitForTimeout(1500);
  return true;
}

// ─── 포켓몬 이름 → 국립도감번호 매핑 ─────────────────────────
const CHAMPIONS_POKEMON_IDS = {
  // 포켓몬챔피언스 주요 포켓몬 (추후 확장)
  'Garchomp': '445',       'Basculegion': '902',   'Whimsicott': '547',
  'Kingambit': '983',      'Sinistcha': '1002',    'Incineroar': '727',
  'Charizard': '6',        'Staraptor': '398',     'Sylveon': '700',
  'Gardevoir': '282',      'Greninja': '658',      'Dragonite': '149',
  'Gengar': '94',          'Tyranitar': '248',     'Metagross': '376',
  'Salamence': '373',      'Lapras': '131',        'Pikachu': '25',
  'Umbreon': '197',        'Flygon': '330',        'Absol': '359',
  'Floette-Eternal': '670','Barbaracle': '689',    'Mudsdale': '750',
  'Mimikyu': '778',        'Drampa': '780',        'Runerigus': '867',
  'Falinks': '870',        'Bellibolt': '939',     'Tinkaton': '959',
  'Meowscarada': '908',    'Skeledirge': '909',    'Quaquaval': '910',
  'Arcanine': '59',        'Gyarados': '130',      'Snorlax': '143',
  'Togekiss': '468',       'Lucario': '448',       'Garchomp': '445',
  'Hydreigon': '635',      'Aegislash': '681',     'Talonflame': '663',
  'Goodra': '706',         'Diancie': '719',       'Kommo-o': '784',
  'Toxapex': '748',        'Mimikyu': '778',       'Corviknight': '879',
  'Gholdengo': '1000',     'Annihilape': '979',    'Clodsire': '980',
  'Grafaiai': '978',       'Revavroom': '974',     'Farigiraf': '981',
  'Maushold': '925',       'Tinkatink': '957',     'Bombirdier': '962',
  'Flamigo': '973',        'Cetitan': '972',       'Veluza': '976',
  'Dondozo': '977',        'Tatsugiri': '978',     'Glimmet': '969',
  'Glimmora': '970',       'Greavard': '971',      'Houndstone': '972',
  'Bramblin': '966',       'Brambleghast': '967',  'Gimmighoul': '999',
  'Great Tusk': '984',     'Scream Tail': '985',   'Brute Bonnet': '986',
  'Flutter Mane': '987',   'Slither Wing': '988',  'Sandy Shocks': '989',
  'Iron Treads': '990',    'Iron Bundle': '991',   'Iron Hands': '992',
  'Iron Jugulis': '993',   'Iron Moth': '994',     'Iron Thorns': '995',
  'Frigibax': '996',       'Arctibax': '997',      'Baxcalibur': '998',
};

function getPokemonId(name) {
  // 직접 매핑
  if (CHAMPIONS_POKEMON_IDS[name]) return CHAMPIONS_POKEMON_IDS[name];
  // 소문자 매칭
  const lower = name.toLowerCase().replace(/[^a-z]/g, '');
  for (const [k, v] of Object.entries(CHAMPIONS_POKEMON_IDS)) {
    if (k.toLowerCase().replace(/[^a-z]/g, '') === lower) return v;
  }
  return null;
}

// ─── Firestore 저장 ───────────────────────────────────────────
async function saveToFirestore(db, pokemonName, rank, scraped) {
  const id = getPokemonId(pokemonName);
  if (!id) {
    console.log(`  ⚠️  ID 없음: ${pokemonName}`);
    return;
  }

  const now = admin.firestore.FieldValue.serverTimestamp();
  const ref = db.collection('pokemon').doc(id);

  const data = {
    id,
    nameEn: pokemonName,
    usageRank: rank,
    usageRate: scraped.usageRate,
    moves: scraped.moves,
    items: scraped.items,
    abilities: scraped.abilities,
    natures: scraped.natures,       // 포켓몬챔피언스 스탯포인트 성격
    partners: scraped.partners,
    source: 'Pikalytics',
    sourceUrl: 'https://www.pikalytics.com',
    lastCollected: now,
  };

  // 추천 스탯포인트 (성격 기반)
  if (scraped.natures.length > 0) {
    data.recommendedStatPointSpreads = scraped.natures.map((n, i) => ({
      rank: i + 1,
      nature: n.nature,
      usageRate: n.usageRate,
      source: 'Pikalytics',
      sourceUrl: 'https://www.pikalytics.com',
      trustScore: 95,
      lastUpdated: now,
    }));
  }

  await ref.set(data, { merge: true });
  console.log(`  ✅ 저장: ${pokemonName} (ID: ${id}, 랭킹 #${rank})`);
}

// ─── 메인 실행 ────────────────────────────────────────────────
async function main() {
  console.log('🚀 포켓몬챔피언스 데이터 수집 시작 (Pikalytics)');
  console.log(`   모드: ${DRY_RUN ? 'DRY-RUN' : '실제 저장'}\n`);

  const db = initFirebase();

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36');
  await page.setViewport({ width: 1400, height: 900 });

  // Pikalytics 홈 로드 (포켓몬챔피언스 기본값)
  console.log('📥 https://www.pikalytics.com 로드 중...');
  await page.goto('https://www.pikalytics.com', { waitUntil: 'networkidle2', timeout: 40000 });
  await page.waitForTimeout(2000);

  // Champions Reg M-B 탭 선택 확인
  const regMB = await page.evaluate(() => {
    const btn = document.querySelector('.pokedex-toggle-button-active');
    return btn?.textContent?.trim();
  });
  console.log(`   현재 포맷: ${regMB || '확인 필요'}`);

  // 사이드바에서 전체 포켓몬 목록 수집
  const sidebarList = await page.evaluate(() => {
    const list = [];
    const seen = new Set();

    // 사이드바 항목들 수집
    const entries = [...document.querySelectorAll('[class*="entry"]:not([class*="header"])')];
    entries.forEach(entry => {
      const img = entry.querySelector('img[src*="championssprites"]');
      const rankText = entry.textContent?.match(/#(\d+)/)?.[1];
      if (img?.alt && !seen.has(img.alt)) {
        seen.add(img.alt);
        list.push({ name: img.alt, rank: rankText ? +rankText : 999 });
      }
    });

    // fallback: img 직접 수집
    if (list.length === 0) {
      const imgs = [...document.querySelectorAll('img[src*="championssprites"]')];
      imgs.forEach((img, i) => {
        if (img.alt && !seen.has(img.alt)) {
          seen.add(img.alt);
          list.push({ name: img.alt, rank: i + 1 });
        }
      });
    }

    return list.sort((a, b) => a.rank - b.rank);
  });

  console.log(`\n📋 포켓몬 목록: ${sidebarList.length}마리 발견`);
  sidebarList.slice(0, 5).forEach(p => console.log(`   ${p.rank}. ${p.name}`));
  console.log('   ...');

  // 수집할 포켓몬 수 (상위 50마리 또는 전체)
  const targetList = sidebarList.slice(0, 50);
  const stats = { success: 0, skip: 0, error: 0 };

  for (const pokemon of targetList) {
    console.log(`\n[${pokemon.rank}] ${pokemon.name}`);

    try {
      // 포켓몬 클릭하여 상세 로드
      const clicked = await clickPokemon(page, pokemon.name);
      if (!clicked) {
        console.log('  ⚠️  클릭 실패 — 건너뜀');
        stats.skip++;
        continue;
      }

      // 데이터 파싱
      const scraped = await parseCurrentPokemon(page);
      console.log(`  기술: ${scraped.moves.length}개 | 아이템: ${scraped.items.length}개 | 성격: ${scraped.natures.length}개`);
      if (scraped.natures[0]) {
        console.log(`  1위 성격: ${scraped.natures[0].nature} (${scraped.natures[0].usageRate}%)`);
      }

      if (DRY_RUN) { stats.success++; continue; }

      await saveToFirestore(db, pokemon.name, pokemon.rank, scraped);
      stats.success++;

      await page.waitForTimeout(1000); // 요청 간격

    } catch (err) {
      console.error(`  ❌ ${err.message}`);
      stats.error++;
    }
  }

  await browser.close();

  console.log('\n══════════════════════════════');
  console.log(`✅ 성공: ${stats.success} | ⏭️ 건너뜀: ${stats.skip} | ❌ 오류: ${stats.error}`);
  console.log('══════════════════════════════');

  if (stats.error > 0) process.exit(1);
}

main().catch(err => { console.error('치명적 오류:', err); process.exit(1); });
