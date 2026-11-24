// 2단계 경지 난이도 검증용 간이 시뮬레이터 (엔진 아님). node tools/p2_sim.js [생 수]
// 무공을 익히기 시작한 사람의 일생을 해마다 굴려 최종 경지 분포를 본다. 사건은 확률로만 넣는다.
'use strict';
const N = +process.argv[2] || 200000;
let seed = 7;
function rnd() { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }
const d100 = () => 1 + Math.floor(rnd() * 100);
const d6 = () => 1 + Math.floor(rnd() * 6);
const REALMS = ['범인', '삼류', '이류', '일류', '절정', '초절정', '화경', '현경'];
const GR = ['삼류', '이류', '일류', '상승', '절세'];
// 경지 조건: 유효내공(년), 깨달음, 주무공 등급 이상·성, 중단전, 단전 개방 사건 필요 여부
const GATE = [
  null,
  { ng: 1, en: 0, gr: 0, sung: 3, mid: 0 },
  { ng: 10, en: 0, gr: 1, sung: 6, mid: 20 },
  { ng: 20, en: 1, gr: 2, sung: 6, mid: 35 },
  { ng: 40, en: 2, gr: 2, sung: 9, mid: 50, wall: '기 발출' },
  { ng: 60, en: 3, gr: 3, sung: 8, mid: 70, wall: '강기' },
  { ng: 90, en: 4, gr: 3, sung: 12, mid: 85, wall: '삼화취정' },
  { ng: 120, en: 5, gr: 4, sung: 11, mid: 95, wall: '천인합일' },
];
const DC = [0, 30, 45, 60, 75, 85, 95, 105];   // d100 기준 (개정 3: d20 DC × 5)
// 경지별 무공 등급 성취 상한 (p1 2-3)
const CAP = [
  [12, 8, 5, 3, 1], [12, 8, 5, 3, 1], [12, 12, 8, 5, 3], [12, 12, 12, 8, 5],
  [12, 12, 12, 10, 8], [12, 12, 12, 12, 10], [12, 12, 12, 12, 12], [12, 12, 12, 12, 12],
];
const NG_RATE = [0.5, 0.8, 1.0, 1.5, 2.0];      // 심법 등급별 연 축기(년)
const CAPACITY = [10, 20, 40, 70, 120, 200, 360, 9999];   // p1 4-2 개정 3
const P = { base: { train: 1, enl: 1, mastery: 0, ng: 1 } };
const TRAIT = {
  none: { train: 1, enl: 1, mastery: 0, ng: 1 },
  천무지체: { train: 2.0, enl: 1.5, mastery: 2, ng: 1.2 },
  무골: { train: 1.1, enl: 1, mastery: 0, ng: 1 },
};
const DIAG = {4:{},5:{},6:{}};
function life(traitName, opts = {}) {
  const t = TRAIT[traitName];
  const iq = 5 * (d6() + d6() + d6());           // 오성 자질 15~90 (개정 3: 3d6 × 5)
  const bone = 5 * (d6() + d6() + d6());         // 근골
  const und = 0.5 + iq / 90;                     // 이해 배율 0.67~1.5
  const body = 0.7 + bone / 150;
  // 소속: 문파 입문 여부와 접근 가능한 무공 등급(직책에 따라 오름)
  const sect = rnd() < (opts.sect ?? 0.5);
  let access = sect ? 1 : 0;                     // 접근 가능한 최고 등급 인덱스
  let art = 0, sung = 0, ng = 0, pool = 0, purity = 1, mid = 0, enl = 0, real = 0, realm = 0;
  let alive = true, age = 8, extra = 0;
  const lifespan = 55 + Math.floor(rnd() * 25);
  while (alive && age < lifespan + (realm >= 6 ? 20 : 0) + (realm >= 7 ? 40 : 0)) {
    age++;
    // 직책·인맥으로 상위 무공 접근 (문파 제자는 경지가 오르면 다음 등급을 전수받을 기회)
    if (sect && access < realm + 1 && access < 3 && rnd() < 0.15) access++;
    // 기연: 비급·영약·스승
    const luck = rnd();
    const L = opts.luck || 1;
    if (luck < (0.003 + 0.003 * realm) * L) access = Math.max(access, 4);           // 절세 비급
    else if (luck < 0.015 * L) access = Math.max(access, 3);      // 상승 비급
    if (rnd() < (0.01 + 0.006 * realm) * L) pool += [5, 10, 20, 30, 60][Math.floor(rnd() * rnd() * 5)]; // 영약(대부분 작다)
    const nextG = GATE[Math.min(7, realm + 1)];
    const usable = access > art && (CAP[realm][access] >= (nextG ? nextG.sung : 12) || sung >= Math.min(12, CAP[realm][art]));
    if (usable) { const keep = sung * (0.3 + 0.2 * und) / (1 + (access - art) * 0.5); art = access; sung = Math.max(1, keep); } // 상위 무공으로 갈아타면 성취는 처음부터 가깝게
    // 성취: 해마다 0.25~0.6성, 등급이 높을수록 느림
    const cap = Math.min(12, CAP[realm][art] + t.mastery + (iq >= 15 ? 1 : 0) + (iq >= 18 ? 1 : 0));
    sung = Math.min(cap, sung + 0.45 * und * body * t.train / (1 + art * 0.35) * (0.6 + rnd() * 0.8));
    // 내공: 심법 등급 × 정순, 단전 용량까지
    const capa = CAPACITY[realm] * (t.ng > 1.1 ? 1.2 : 1) + extra;   // extra: 영약으로 넓힌 단전(p1 4-4)
    ng = Math.min(capa, ng + NG_RATE[art] * t.ng * purity * (1 + 0.15 * realm));
    if (pool > 0) { const c = Math.min(pool, 5 + art * 5); pool -= c; const room = capa - ng; const got = c * 0.7; if (got > room) { extra = Math.min(CAPACITY[realm], extra + (got - room) * 0.3); } ng = Math.min(capa + extra, ng + got); }
    // 중단전(운용): 해마다 조금, 깨달음이 높으면 빠름
    mid = Math.min(100, mid + (0.8 + enl * 0.6) * und * (0.5 + rnd()));
    // 계기와 깨달음
    const trigger = rnd() < (0.1 + 0.02 * realm) * (opts.trig || 1);
    if (trigger) real += 5;
    const pEnl = (trigger ? 0.12 : 0.008) * und * t.enl * Math.pow(0.62, enl);
    if (enl < 5 && rnd() < pEnl) enl++;
    // 위험: 생사결·사고
    if (rnd() < 0.008 + (trigger ? 0.02 : 0)) alive = false;
    // 돌파
    const g = GATE[realm + 1];
    if (g && ng * purity >= g.ng && enl >= g.en && art >= g.gr && sung >= g.sung && mid >= g.mid) {
      const roll = d100() + Math.floor((iq - 50) / 2) + (trigger ? 15 : 0);
      if (roll >= DC[realm + 1]) realm++;
    } else if (g && realm >= 4 && opts.diag) {
      const miss = []; if (ng * purity < g.ng) miss.push('내공'); if (enl < g.en) miss.push('깨달음'); if (art < g.gr) miss.push('등급'); if (sung < g.sung) miss.push('성'); if (mid < g.mid) miss.push('중단전');
      for (const m of miss) DIAG[realm][m] = (DIAG[realm][m] || 0) + 1;
    }
  }
  return realm;
}
function run(trait, n, opts = {}) {
  const c = new Array(REALMS.length).fill(0);
  for (let i = 0; i < n; i++) c[life(trait, opts)]++;
  const atLeast = REALMS.map((_, i) => c.slice(i).reduce((a, b) => a + b, 0) / n);
  console.log(`[${trait}] n=${n} ${JSON.stringify(opts)}`);
  console.log(REALMS.map((r, i) => `${r}+ ${(atLeast[i] * 100).toFixed(i >= 5 ? 4 : 2)}%`).join('  '));
}
if (process.argv[3] === 'what-if') {
  run('none', N, { sect: 1 });
  run('none', N, { sect: 1, luck: 3 });
  run('none', N, { sect: 1, luck: 3, trig: 1.5 });
  run('천무지체', 50000, { sect: 1, luck: 3, trig: 1.5 });
  process.exit(0);
}
run('none', N);
run('무골', N);
run('천무지체', Math.min(N, 50000), { diag: true });
console.log('천무지체 경지별 막힌 축(해 수):', JSON.stringify(DIAG));
