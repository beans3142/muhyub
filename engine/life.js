// 한 생을 돌리는 엔진. 규칙: docs/p10-engine.md(구조), 1~9단계 문서(수치).
// DOM을 쓰지 않는다. 한 생은 생성기로 흐른다: 갈림길에서 {ask}를 내보내고, 고른 번호를 받아 이어 간다.
// 필요 데이터: ORIGINS, TRAITS*, ARTS, ART_ACCESS, FACTIONS, LADDERS, CAREERS, CAREER_FRAMES, CAREER_RULE, WEALTH,
// EVENT_TEMPLATES, EVENT_TWISTS, EVENT_THREADS, EVENT_RULES, PLACES2, REGIONS, STARTS, NAME_STYLE, SURNAME_*, EPITHET, WORLDSIM(선택)
(function (G) {
const LIFE = {};

// ---------- 굴림 ----------
function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
function J(w, p) {
  w = String(w); const c = w.charCodeAt(w.length - 1), has = c >= 0xAC00 && c <= 0xD7A3 && (c - 0xAC00) % 28 !== 0;
  const rieul = has && (c - 0xAC00) % 28 === 8;
  const m = { 이가: ['이', '가'], 을를: ['을', '를'], 은는: ['은', '는'], 과와: ['과', '와'], 으로: [rieul ? '로' : '으로', '로'], 이다: ['이다', '다'], 아야: ['아', '야'] }[p];
  return w + (has ? m[0] : m[1]);
}
const num = n => Math.round(n).toLocaleString('ko-KR');

// ---------- 표 (1·2단계) ----------
const REALMS = ['범인', '삼류', '이류', '일류', '절정', '초절정', '화경', '현경'];
const MULT = [1, 1, 1.5, 2, 3, 5, 8, 15];
const BASEV = [1, 4, 10, 30, 120, 600, 3600, 27000];
const KQ = [1, 1, 1, 1, 0.95, 0.9, 0.85, 0.8], KO = [1, 1, 1, 0.9, 0.8, 0.7, 0.5, 0.35];
const SLOPE = [2, 2, 2.2, 2.5, 2.8, 3.2, 4, 5];
const CAPA = [10, 20, 40, 70, 120, 200, 360, 99999];
const REQQI = [1, 1, 10, 20, 40, 60, 90, 120];
// 다음 경지 조건: [유효 내공, 깨달음, 주무공 최소 등급(0 삼류…), 성(12 기준), 운용, 관문]
const NEXT = [null, [1, 0, 0, 3, 0, null], [10, 0, 1, 6, 20, null], [20, 1, 2, 6, 35, null], [40, 2, 2, 9, 50, '기 발출'], [60, 3, 3, 8, 70, '강기'], [90, 4, 3, 12, 85, '삼화취정'], [120, 5, 4, 11, 95, '천인합일']];
const BREAK_DC = [0, 30, 45, 60, 75, 85, 95, 105];
const GRADES = ['삼류', '이류', '일류', '상승', '절세', '신공'];
const TECH = [1, 1.5, 2.2, 4, 8, 15];
const NGB = [0.5, 0.8, 1, 1.5, 2, 2.5];
const GRADE_DIFF = [1, 0.8, 0.6, 0.45, 0.3, 0.2];
// 경지별 무공 등급마다 오를 수 있는 성(12 기준), 1단계 5-2
const SUNG_CAP = [[3, 1, 0, 0, 0, 0], [12, 8, 5, 3, 1, 0], [12, 12, 8, 5, 3, 2], [12, 12, 12, 8, 5, 4], [12, 12, 12, 10, 8, 6], [12, 12, 12, 12, 10, 8], [12, 12, 12, 12, 12, 11], [12, 12, 12, 12, 12, 12]];
const COMMON_GRADE = [0, 0, 1, 2, 3, 3, 4, 4];
const ENL = ['범안', '견리', '득의', '통달', '조화', '현묘'];
const STAGES = ['초입', '완숙', '극'];
const STAGE_K = [1, 1.35, 1.7];
// 스탯 18 (1단계 2-1): [이름, 그릇]. 그릇 '근오'는 (근골+오성)/2
const BRANCH = {
  힘: [['근력', '근골'], ['근질', '근골'], ['발경', '근골']],
  속도: [['순발', '근골'], ['지속', '근골'], ['반응', '근오']],
  맷집: [['체력', '근골'], ['강골', '근골'], ['회복', '근골']],
  기술: [['정교', '오성'], ['유연', '근오'], ['수읽기', '오성']],
  지능: [['이해', '오성'], ['지략', '오성'], ['학식', '오성']],
  마음: [['정신력', '심성'], ['의지', '심성'], ['성품', '심성']],
};
const STAT_BRANCH = {}; for (const [b, l] of Object.entries(BRANCH)) for (const [s] of l) STAT_BRANCH[s] = b;
const MIND = new Set(['지능', '마음']);
// 무공 종류별 갈래 가중치(1단계 2-5)
const KIND_W = {
  검: [0.15, 0.3, 0.05, 0.4, 0.1], 도: [0.35, 0.25, 0.1, 0.25, 0.05], 권: [0.3, 0.2, 0.25, 0.2, 0.05], 각: [0.3, 0.2, 0.25, 0.2, 0.05],
  장: [0.15, 0.2, 0.1, 0.4, 0.15], 지: [0.15, 0.2, 0.1, 0.4, 0.15], 조: [0.15, 0.2, 0.1, 0.4, 0.15], 창: [0.25, 0.2, 0.15, 0.35, 0.05], 봉: [0.25, 0.2, 0.15, 0.35, 0.05],
  편: [0.1, 0.25, 0.05, 0.45, 0.15], 암기: [0.05, 0.35, 0, 0.4, 0.2], 독공: [0.05, 0.15, 0.15, 0.3, 0.35], 진법: [0.1, 0.1, 0.1, 0.3, 0.4], 음공: [0.05, 0.15, 0.15, 0.3, 0.35], 외공: [0.3, 0.2, 0.3, 0.15, 0.05], 맨몸: [0.4, 0.3, 0.2, 0.1, 0],
};
const BR5 = ['힘', '속도', '맷집', '기술', '지능'];

// 명성(6단계 3장)
const FAME_STAGE = [0, 1000, 50000, 500000, 5000000];
const FAME_NAME = ['무명소졸', '소유명성', '명동일방', '명진강호', '명동천하'];
const INFAMY_NAME = ['무명소졸', '악명재외', '흉명원양', '악명소저', '문풍상담'];
const FAME_K = [0.5, 1, 1.5, 2, 3, 4, 6, 8];
const FAME_END = [3000, 8000, 30000, 150000, 600000, 2000000, 6000000, 30000000];
const stageOf = n => FAME_STAGE.filter(v => n >= v).length - 1;

// 한 해 방침(10단계 3-1): 4칸 기준 할 일
const PLANS = {
  '무공 전념': ['수련', '수련', '운기', '운기'],
  '무공과 생업': ['수련', '운기', '생업', '생업'],
  '생업 전념': ['생업', '생업', '생업', '생업'],
  '강호 유람': ['유람', '유람', '수련', '운기'],
  '협행': ['협행', '협행', '수련', '운기'],
  '의뢰': ['의뢰', '의뢰', '수련', '생업'],
  '폐관': ['폐관', '폐관', '폐관', '폐관'],
  '글공부': ['글공부', '글공부', '글공부', '생업'],
  '가족과 함께': ['가족', '가족', '생업', '생업'],
};
LIFE.PLANS = Object.keys(PLANS);
// 할 일별 사건 확률(6단계 2-2, 한 칸 한 해)과 사건 틀 갈래
const ACT_EV = { 수련: [0, null], 운기: [0, null], 폐관: [0, null], 생업: [0.05, '생업'], 가족: [0.05, '가족'], 벗: [0.2, '벗'], 스승: [0.1, '스승'], 유람: [0.35, '유람'], 협행: [0.5, '협행'], 의뢰: [0.6, '의뢰'], 연애: [0.3, '연애'], 글공부: [0, null], 쉼: [0.05, '쉼'], 숨기: [0.05, '숨기'] };
const slotEff = n => Math.min(1.25, n === 0 ? 0.2 : 0.2 + 0.8 * Math.min(n, 4) / 4 + 0.05 * Math.max(0, n - 4));

// ---------- 생 만들기 ----------
LIFE.create = function (opts = {}) {
  const seed = opts.seed ?? Math.floor(Math.random() * 1e9);
  const R = rng(seed);
  const P = {
    seed, R, opts, alive: true, age: 0, year: 0, log: [], card: null, ach: new Set(), flags: {},
    apt: {}, st: {}, traits: [], hidden: [], arts: [], realm: 0, stage: 0, enl: 0, qi: 0, pqi: 0, pur: 100, flow: 0, capa: CAPA[0], real: 0,
    gates: {}, trigger: 0, pillYear: 0, fiber: 0, hurt: 0, poison: 0, weapon: 0, fame: 0, infamy: 0, fameMax: 0, infamyMax: 0, align: 0, epithet: null,
    wealth: 0, career: null, skill: {}, rung: 0, member: null, merit: 0, bonds: [], spouse: null, kids: 0, disciples: 0, threads: [], used: {}, usedYear: {},
    plan: '무공 전념', regions: new Set(), kills: 0, fights: 0, wins: 0, upsets: 0, kiyon: 0, deeds: {}, peak: 0, events: [], firsts: {},
  };
  return P;
};

// ---------- 도우미 ----------
const pk = (P, a) => a[Math.floor(P.R() * a.length)];
function wpick(P, list, wf) { let tot = 0; const ws = list.map(x => { const w = Math.max(0, wf(x)); tot += w; return w; }); if (tot <= 0) return null; let r = P.R() * tot; for (let i = 0; i < list.length; i++) if ((r -= ws[i]) <= 0) return list[i]; return list[list.length - 1]; }
const d100 = P => 1 + Math.floor(P.R() * 100);
const d6 = P => 1 + Math.floor(P.R() * 6);
const fxAll = (P, key) => P.traits.map(t => (t.fx || {})[key]).filter(v => v != null);
const mulOf = (P, key) => fxAll(P, key).reduce((m, v) => m * (typeof v === 'object' && v && v.mul ? v.mul : 1), 1);
const hasTrait = (P, n) => P.traits.some(t => t.n === n);
const placeName = id => (G.PLACES2[id] || {}).n || id;
const regionOf = id => (G.PLACES2[id] || {}).r;

// 기록: 해마다 카드 하나
function card(P) {
  if (!P.card || P.card.year !== P.year) { P.card = { year: P.year, age: P.age, place: P.place, lines: [] }; P.log.push(P.card); }
  return P.card;
}
function say(P, t, cls, m) { card(P).lines.push({ t, cls: cls || '', m: m || null }); }
const yr = y => (y < 0 ? `기원전 ${-y}년` : `${y}년`);

// ---------- 스탯 ----------
function aptFor(P, src) { return src === '근오' ? (P.apt.근골 + P.apt.오성) / 2 : P.apt[src]; }
function statCap(P, s) {
  const br = STAT_BRANCH[s], src = BRANCH[br].find(x => x[0] === s)[1];
  let base = aptFor(P, src) * 2;
  for (const c of fxAll(P, 'cap')) if (typeof c[s] === 'number') base += c[s];
  for (const c of fxAll(P, 'mastery')) if (typeof c.모두 === 'number' && br === '기술') base += c.모두 * 5;
  base = Math.max(10, base);
  const m = MIND.has(br) ? Math.pow(1.25, P.enl) : MULT[P.realm];
  let cap = base * m;
  if (P.age < 15) cap *= 0.6;
  if (s === '순발') cap *= 1 + P.fiber / 100; if (s === '지속') cap *= 1 - P.fiber / 100;
  if (s === '발경') cap = Math.min(cap, Math.max(5, (P.st.근질 || 0)), P.flow * 2 * MULT[P.realm] + 10);
  return cap;
}
const baseOf = (P, s) => (P.st[s] || 0) / (MIND.has(STAT_BRANCH[s]) ? Math.pow(1.25, P.enl) : MULT[P.realm]);
function branchBase(P, b) { const l = BRANCH[b].map(([s]) => baseOf(P, s)); return l.reduce((a, v) => a + v, 0) / l.length; }
function grow(P, s, rate) {
  if (!(s in P.st)) return;
  const g = fxAll(P, 'grow').reduce((m, v) => m * (v[s] && v[s].mul ? v[s].mul : 1), 1);
  const cap = statCap(P, s);
  if (P.st[s] < cap) P.st[s] += (cap - P.st[s]) * rate * g;
}
// 판정(1단계 6-1): 스탯 바탕값 보정, 특성 check 보정. 결과 단계를 돌려준다
function check(P, stat, dc, extra = 0, label = '') {
  let mod = extra;
  if (stat && stat.startsWith('자질:')) mod += (P.apt[stat.slice(3)] - 50) / 2;
  else if (stat === '풍모') mod += (P.apt.풍모 - 50) / 2;
  else if (stat && stat in P.st) mod += (baseOf(P, stat) - 100) / 4;
  for (const c of fxAll(P, 'check')) for (const [k, v] of Object.entries(c)) if (typeof v === 'number' && (k === stat || (label && label.includes(k)))) mod += v;
  if (P.hurt) mod -= [0, 5, 10, 20][P.hurt];
  const roll = () => { const n = d100(P); return { n, ok: n >= 96 || (n > 5 && n + mod >= dc), crit: n >= 96, fum: n <= (fxAll(P, 'luck').some(v => v.crit) ? 8 : 5) }; };
  let r = roll();
  if (!r.ok && P.flags.reroll > 0) { P.flags.reroll--; r = roll(); }
  r.stage = r.crit ? '대성공' : r.ok ? '성공' : r.fum ? '대실패' : '실패';
  return r;
}

// ---------- 무공 ----------
const gIdx = g => GRADES.indexOf(g);
function artMax(a) { return a.layers || a.max || 12; }
const s12 = a => a.sung / artMax(a.def) * 12;
function sungCap(P, a) {
  let c = SUNG_CAP[P.realm][gIdx(a.def.g)];
  if (P.apt.오성 >= 90) c += 2; else if (P.apt.오성 >= 75) c += 1;
  if (P.realm > 0 && NEXT[P.realm + 1]) c += Math.max(0, P.enl - NEXT[P.realm + 1][1]);
  return Math.min(12, c);
}
function learn(P, def, how) {
  if (!def || P.arts.some(a => a.def.n === def.n)) return null;
  const a = { def, sung: 0, from: how || '', year: P.year };
  // 계보 승계(3단계 9-2): 같은 계보의 앞 무공을 극성 이상 익혔으면 앞 성의 40%에서 시작
  for (const b of P.arts) if (b.def.nx && b.def.nx.includes(def.n) && s12(b) >= 10) a.sung = artMax(def) * (s12(b) * 0.4 / Math.max(1, gIdx(def.g) - gIdx(b.def.g))) / 12;
  P.arts.push(a);
  say(P, `「${def.n}」(${def.g} ${def.k})${J(def.n, '을를').slice(-1)} ${how || '익히기 시작했다'}.`, 'art');
  if (def.g === '신공') addAch(P, '신공');
  if (P.arts.length >= 10) addAch(P, '박학');
  if (def.role === '심법' || def.k === '심법') revealTraits(P, '지체');
  return a;
}
function byRole(P, role) {
  const l = P.arts.filter(a => (a.def.roles || [a.def.role]).includes(role));
  if (role === '공격') return l.sort((x, y) => artPow(y) - artPow(x))[0] || null;
  return l.sort((x, y) => gIdx(y.def.g) - gIdx(x.def.g) || y.sung - x.sung)[0] || null;
}
function artPow(a) { const s = s12(a); return TECH[gIdx(a.def.g)] * Math.pow(Math.max(0.01, s) / 12, 1.4) * (s >= 12 ? 1.15 : 1); }
const mainArt = P => byRole(P, '공격');
// 수련 대상: 그 역할에서 아직 막히지 않은 가장 높은 등급(같으면 덜 익힌 것)
function trainTarget(P, role) {
  const l = P.arts.filter(a => (a.def.roles || [a.def.role]).includes(role) && s12(a) < sungCap(P, a) - 0.01);
  return l.sort((x, y) => gIdx(y.def.g) - gIdx(x.def.g) || x.sung - y.sung)[0] || null;
}
// 경지 조건의 주무공(2단계 1-2): 조건 등급 이상 공격 무공 중 가장 많이 익힌 것
function gateArt(P, minG) {
  const l = P.arts.filter(a => (a.def.roles || [a.def.role]).includes('공격') && gIdx(a.def.g) >= minG);
  return l.sort((x, y) => s12(y) - s12(x))[0] || null;
}
const heartArt = P => byRole(P, '심법');
function muhak(P) {
  const m = mainArt(P); if (!m) return 1;
  let v = artPow(m); const gm = gIdx(m.def.g);
  const h = heartArt(P), sh = byRole(P, '경신'), df = byRole(P, '방어');
  v *= h ? [1, 0.9, 0.8][clamp(gm - gIdx(h.def.g), 0, 2)] || 1.05 : 0.6;
  v *= sh ? 1 : 0.85; v *= df ? 1 : 0.9;
  const others = P.arts.filter(a => a !== m && (a.def.role === '공격') && s12(a) >= 9).length;
  v *= 1 + Math.min(0.1, others * 0.02);
  return v;
}
// 세력 무공 고르기: 등급 상한 안에서 역할 우선(심법 → 공격 → 경신 → 방어)
function factionArt(P, fid, maxG, prefer) {
  const pool = (LIFE.ARTS_BY_F[fid] || []).filter(a => gIdx(a.g) <= maxG && !P.arts.some(b => b.def.n === a.n) && (!a.req || !a.req.realm || REALMS.indexOf(a.req.realm) <= P.realm));
  if (!pool.length) return null;
  const roles = prefer ? [prefer] : [!heartArt(P) && '심법', !mainArt(P) && '공격', !byRole(P, '경신') && '경신', !byRole(P, '방어') && '방어', '공격', '심법'].filter(Boolean);
  for (const r of roles) {
    const l = pool.filter(a => (a.roles || [a.role]).includes(r));
    if (l.length) { const top = Math.max(...l.map(a => gIdx(a.g))); const best = l.filter(a => gIdx(a.g) >= top - (P.R() < 0.6 ? 0 : 1)); return pk(P, best); }
  }
  return pk(P, pool);
}

// ---------- 무위와 경지 ----------
function effQi(P) { return P.qi * P.pur / 100; }
function stageFill(P) {
  const n = NEXT[P.realm + 1]; if (!n) return 1;
  const m = gateArt(P, n[2]), parts = [Math.min(1, effQi(P) / n[0]), n[1] ? Math.min(1, P.enl / n[1]) : 1, m ? Math.min(1, s12(m) / n[3]) : 0, n[4] ? Math.min(1, P.flow / n[4]) : 1];
  return parts.reduce((a, v) => a + v, 0) / parts.length;
}
function wuwei(P, state = 1) {
  if (P.realm === 0 && !P.arts.length) return Math.max(0.3, (branchBase(P, '힘') + branchBase(P, '속도')) / 200);
  const st = STAGE_K[P.stage];
  const ng = clamp(Math.pow(Math.max(0.5, effQi(P)) / REQQI[P.realm], 0.4), 0.6, 2.5);
  let nae = (P.pur >= 90 ? 1 : P.pur >= 70 ? 0.95 : 0.9) * (0.85 + P.flow / 400) * (0.8 + 0.0005 * P.real);
  if (NEXT[P.realm + 1]) nae *= Math.min(1.2, 1 + 0.1 * Math.max(0, P.enl - NEXT[Math.min(7, P.realm + 1)][1]));
  nae = clamp(nae, 0.7, 1.4);
  const m = mainArt(P), w = KIND_W[m ? m.def.k : '맨몸'] || KIND_W.맨몸;
  let body = 1; BR5.forEach((b, i) => body += w[i] * (branchBase(P, b) - 100) / 200); body = clamp(body, 0.7, 1.4);
  const weapon = [1, 1.1, 1.25, 1.5][P.weapon] || 1;
  const hurt = [1, 0.85, 0.6, 0.3][P.hurt];
  const ext = clamp(body * (P.realm < 3 ? Math.min(1.1, weapon) : weapon) * hurt * state, 0.3, 2);
  return BASEV[P.realm] * st * muhak(P) * ng * Math.pow(nae, KQ[P.realm]) * Math.pow(ext, KO[P.realm]);
}
LIFE.wuwei = wuwei;
// 경지 다섯 축(시트용)
LIFE.nextAxes = function (P) {
  const n = NEXT[P.realm + 1]; if (!n) return null;
  const m = gateArt(P, n[2]) || mainArt(P);
  const ok = [effQi(P) >= n[0], P.enl >= n[1], !!(m && gIdx(m.def.g) >= n[2] && s12(m) >= n[3]), P.flow >= n[4], !n[5] || !!P.gates[P.realm + 1]];
  return {
    to: REALMS[P.realm + 1], ok,
    rows: [
      ['내공', `${effQi(P).toFixed(1)} / ${n[0]}년`, Math.min(1, effQi(P) / n[0])],
      ['깨달음', `${ENL[P.enl]} / ${ENL[n[1]]}`, n[1] ? Math.min(1, P.enl / n[1]) : 1],
      ['주무공', m ? `${m.def.n} ${m.def.g} ${s12(m).toFixed(1)}성 / ${GRADES[n[2]]} 이상 ${n[3]}성` : `없음 / ${GRADES[n[2]]} 이상 ${n[3]}성`, m && gIdx(m.def.g) >= n[2] ? Math.min(1, s12(m) / n[3]) : 0],
      ['운용', `${Math.floor(P.flow)} / ${n[4]}`, n[4] ? Math.min(1, P.flow / n[4]) : 1],
      ...(n[5] ? [['관문', P.gates[P.realm + 1] ? `${n[5]} 넘음` : n[5], P.gates[P.realm + 1] ? 1 : 0]] : []),
    ],
  };
};

// ---------- 인물(상대) ----------
const ROLE_T = r => /흑도|산적|수적|왈패|흉적|마적|인신매매|졸개|복면|살수|자객|마두|사파/.test(r) ? '사' : /마교|혈교/.test(r) ? '마' : /포쾌|관|지현|군/.test(r) ? '관' : '중';
function npcName(P, sex) {
  const NS = G.NAME_STYLE, sur = P.R() < 0.12 ? pk(P, G.SURNAME_RARE) : pk(P, G.SURNAME_REGION[P.region] && P.R() < 0.5 ? G.SURNAME_REGION[P.region] : G.SURNAME_COMMON);
  const st = NS.martial[sex === 'f' ? 'f' : 'm'];
  return sur + (P.R() < 0.4 ? pk(P, st[0]) : pk(P, st[1]) + pk(P, st[2]));
}
function makeNpc(P, role, d, opts = {}) {
  const lo = d ? d[0] : 0, hi = d ? d[1] : 0;
  const base = P.realm === 0 && lo >= 0 ? 1 : P.realm;
  // 역할마다 경지의 끝이 있다: 졸개·왈패·마을 사람은 이류까지, 두목·관주·표두는 일류까지
  const roleCap = /졸개|왈패|취한|아이|마을|노름|촌장|사람|처녀|총각|부모|형제|노파|부호|고리|의원|약재|숙수|선비|상인|사냥꾼|사공|포쾌|전령|피란/.test(role) ? 2 : /두목|관주|표두|흉적|수적|산적/.test(role) ? 3 : 7;
  const realm = clamp(base + lo + Math.floor(P.R() * (hi - lo + 1)), 0, roleCap);
  const sex = /처녀|여|노파|기녀|부인|어미|딸/.test(role) ? 'f' : P.R() < 0.15 ? 'f' : 'm';
  const n = { name: opts.name || npcName(P, sex), role, sex, realm, stage: Math.floor(P.R() * 3), g: COMMON_GRADE[realm] - (P.R() < 0.3 ? 1 : 0) + (P.R() < 0.1 ? 1 : 0), sung: 6 + Math.floor(P.R() * 6), qiK: 0.8 + P.R() * 0.7, real: 100 + Math.floor(P.R() * 600), t: ROLE_T(role), bond: 0, rels: [], met: P.year, alive: true };
  n.g = clamp(n.g, 0, 5);
  // 보이는 경지(10단계 5장): 15% 낮춰 보임(숨은 고수), 10% 높여 보임(허세)
  const r = P.R(); n.shown = r < 0.15 ? Math.max(0, realm - 1 - (P.R() < 0.3 ? 1 : 0)) : r < 0.25 ? Math.min(7, realm + 1) : realm;
  if (realm >= 7) n.shown = 0;
  if (opts.shownLow) n.shown = Math.max(0, realm - 2);
  return n;
}
function npcWuwei(n, state = 1) {
  if (n.realm === 0) return 0.6 + n.qiK * 0.4;
  const mu = TECH[n.g] * Math.pow(n.sung / 12, 1.4) * (n.sung >= 12 ? 1.15 : 1);
  return BASEV[n.realm] * STAGE_K[n.stage] * mu * clamp(n.qiK, 0.6, 2.5) * Math.pow(0.8 + 0.0005 * n.real, KQ[n.realm]) * state;
}
// 가늠: 내가 상대를 어떻게 보나
function perceive(P, n) {
  const diff = P.realm - n.realm, read = baseOf(P, '수읽기');
  const orgName = n.org ? n.org + '의 ' : '';
  const who = `${orgName}${n.role}`;
  if (n.realm >= 7 && P.realm < 7) return { txt: `평범해 보이는 ${who}`, level: 'unknown', know: null };
  if (n.realm === 0 && diff >= 1) return { txt: `무공을 모르는 ${who}`, level: 'exact', know: 0 };
  if (diff >= 2) return { txt: `${REALMS[n.realm]} ${STAGES[n.stage]}의 ${who}`, level: 'exact', know: n.realm };
  if (diff === 1 || (diff === 0 && read >= 120)) return { txt: `${REALMS[n.realm]} ${who}`, level: 'realm', know: n.realm };
  if (diff === 0) return { txt: `${REALMS[n.shown] === '범인' ? '무공을 모르는 듯한' : J(REALMS[n.shown], '으로') + ' 보이는'} ${who}`, level: 'shown', know: n.shown };
  if (diff === -1) return { txt: `${REALMS[n.shown] === '범인' ? '평범해 보이지만' : J(REALMS[n.shown], '으로') + ' 보이지만'} 기척이 묘한 ${who}`, level: 'odd', know: n.shown };
  return { txt: `가늠할 수 없는 ${who}`, level: 'unknown', know: null };
}
function guessOdds(P, n, per) {
  if (per.know == null) return '가늠할 수 없다';
  const guess = Object.assign({}, n, { realm: per.know, stage: 1, g: COMMON_GRADE[per.know], sung: 9, qiK: 1 });
  const p = winP(P, wuwei(P), npcWuwei(guess), 1);
  const odds = p > 0.75 ? '이길 만하다' : p > 0.45 ? '팽팽하다' : p > 0.2 ? '어렵다' : '승산이 거의 없다';
  return per.level === 'odd' && (odds === '이길 만하다' || odds === '팽팽하다') ? '방심할 수 없다' : odds;
}
function winP(P, a, b, mul = 1, tilt = 1, hiRealm) {
  const S = SLOPE[hiRealm != null ? hiRealm : P.realm];
  return 1 / (1 + Math.pow(b / Math.max(0.01, a * mul), S * tilt));
}
const RESOLVE = { 신중: [0.95, 1.15], 평상: [1, 1], 사생결단: [1.1, 0.8], 동귀어진: [1.25, 0.6] };
// 싸움(1단계 6장): 결과 단계와 부상·죽음
function* fight(P, n, opts = {}) {
  let res = '평상';
  const per = perceive(P, n);
  if (opts.lethal && !P.auto) {
    const odds = guessOdds(P, n, per);
    if (odds !== '이길 만하다') {
      const ch = yield { ask: '결단', text: `${per.txt}. ${odds}.`, options: [['신중하게 싸운다', '지면 달아날 틈을 본다'], ['평소대로 싸운다', ''], ['사생결단', '의지가 받쳐야 한다'], ['동귀어진', '함께 죽을 각오']] };
      res = ['신중', '평상', '사생결단', '동귀어진'][ch];
      if (res === '사생결단' && !check(P, '의지', 50).ok) { say(P, '마음이 따라 주지 않았다.'); res = '평상'; }
      if (res === '동귀어진' && !check(P, '의지', 70).ok) { say(P, '끝내 목숨을 내던지지 못했다.'); res = '평상'; }
    }
  }
  const [m, tilt] = RESOLVE[res];
  const a = wuwei(P), b = npcWuwei(n), hi = Math.max(P.realm, n.realm);
  let p = winP(P, a, b, m, tilt, hi);
  if (opts.pMul) p = clamp(p * opts.pMul, 0, 1);
  const u = P.R();
  let stage = u < 0.3 * p ? '대승' : u < 0.85 * p ? '승' : u < p ? '신승' : u < p + 0.7 * (1 - p) ? '패' : '대패';
  if (stage === '대패' && P.real > 500 && P.R() < Math.min(0.25, (P.real - 500) / 2000)) stage = '패';
  P.fights++; P.real = Math.min(1000, P.real + (opts.spar ? 10 : 60 + Math.floor(P.R() * 60)) * mulOf(P, 'real'));
  const win = stage === '대승' || stage === '승' || stage === '신승';
  if (win) { P.wins++; if (n.realm > P.realm) { P.upsets++; addAch(P, '하극상'); } if (!opts.spar) addAch(P, '첫 승'); if (res === '동귀어진') addAch(P, '동귀어진'); if (n.realm > n.shown) addAch(P, '숨은 고수를 만나다'); }
  if (!opts.spar) {
    if (stage === '신승' && P.R() < 0.5) hurtMe(P, 1);
    if (stage === '승' && P.R() < 0.3) hurtMe(P, 1);
    if (res === '동귀어진' && win) { hurtMe(P, 2); if (P.R() < 0.3) die(P, '상대와 함께 쓰러졌다', 'combat'); }
    const lk = opts.lethal ? 0.4 : 0.06;
    if (stage === '패') { hurtMe(P, opts.lethal ? 2 : 1); if (P.R() < lk * 0.2 * (res === '신중' ? 0.5 : res === '사생결단' ? 1.5 : res === '동귀어진' ? 4.5 : 1)) die(P, `${n.name}의 손에 쓰러졌다`, 'combat'); }
    if (stage === '대패') { hurtMe(P, opts.lethal ? 3 : 2); if (P.R() < lk * 0.6 * (res === '신중' ? 0.5 : 1.5)) die(P, `${n.name}의 손에 쓰러졌다`, 'combat'); }
    if (win) P.trigger = Math.max(P.trigger, 1);
  }
  return { stage, win, outcome: stage === '대승' ? '대성공' : win ? '성공' : stage === '대패' ? '대실패' : '실패', per, res };
}
function hurtMe(P, lv) { if (lv > P.hurt) { P.hurt = lv; say(P, ['', '가볍게 다쳤다.', '크게 다쳤다. 내상이 깊다.', '사경을 헤맬 만큼 다쳤다.'][lv], 'ng'); } }
function die(P, cause, kind) { if (!P.alive) return; P.alive = false; P.cause = cause; P.causeKind = kind || ''; }

// ---------- 명성 ----------
function addFame(P, base, kind = 'fame') {
  if (!base) return;
  const key = kind === 'infamy' ? 'infamy' : 'fame', cur = P[key];
  const lvR = Math.max(P.realm, P.career ? [0, 1, 2, 3, 3, 4][P.rung] || 0 : 0);
  let add;
  if (Math.abs(base) >= 1000) add = base;
  else if (base < 0) add = base * 10;
  else add = (base * FAME_K[lvR] + cur * 0.06) * Math.max(0, 1 - cur / FAME_END[lvR]);
  if (P.flags.hidden) add *= 0.1;
  const before = stageOf(cur);
  P[key] = Math.max(0, cur + add); P[key + 'Max'] = Math.max(P[key + 'Max'], P[key]);
  const after = stageOf(P[key]);
  if (after > before) {
    say(P, `${key === 'fame' ? '이름' : '악명'}이 퍼졌다. 강호가 그를 「${(key === 'fame' ? FAME_NAME : INFAMY_NAME)[after]}」이라 한다.`, 'big');
    P.flags.tierUp = true;
    if (after === 4) addAch(P, key === 'fame' ? '명동천하' : '문풍상담');
  }
}
LIFE.fameName = P => { const f = stageOf(P.fame), i = stageOf(P.infamy); return { fame: FAME_NAME[f], infamy: INFAMY_NAME[i], fs: f, is: i }; };
function makeEpithet(P, src) {
  const E = G.EPITHET; if (!E) return;
  const m = mainArt(P), kind = m ? (E.kind[m.def.k] ? m.def.k : '검') : null;
  const core = kind ? pk(P, E.kind[kind]) : pk(P, ['객', '자', '랑']);
  let front;
  if (P.infamy > P.fame) front = pk(P, E.deed.살생많음);
  else if ((P.deeds.협행 || 0) >= 3) front = pk(P, E.deed.협행);
  else front = pk(P, ['청풍', '백룡', '무영', '추혼', '일섬', '철', '운중', '낙화', '비천', '광', '설', '청', '홍']);
  const tier = Math.max(stageOf(P.fame), stageOf(P.infamy));
  const tail = P.infamy > P.fame ? ['', '', '마', '마왕', '마존'][tier] : ['', '', '협', '대협', '존'][tier];
  const old = P.epithet; P.epithet = front + core + (tail || '');
  say(P, old ? `별호가 「${old}」에서 「${P.epithet}」로 바뀌었다.` : `사람들이 그를 「${P.epithet}」이라 부르기 시작했다.`, 'big');
  addAch(P, '별호');
}

// ---------- 인연 ----------
function meet(P, n, rel) { if (!P.bonds.includes(n)) P.bonds.push(n); if (rel && !n.rels.includes(rel)) n.rels.push(rel); return n; }
function findKnown(P, pred) { const l = P.bonds.filter(n => n.alive && pred(n)); return l.length ? pk(P, l) : null; }

// ---------- 생업 ----------
const careerDef = id => G.CAREERS.find(c => c.id === id);
function careerFrame(c) { return G.CAREER_FRAMES[c.frame]; }
function careerCap(P, c) {
  const [a, b] = c.st; let cap = baseOf(P, a) * 4 + baseOf(P, b) * 2;
  for (const x of fxAll(P, 'career')) for (const [k, v] of Object.entries(x)) if (k === c.n || k === c.full) cap += ((v.mul || 1) - 1) * 300;
  return Math.min(1000, cap);
}
function careerApt(P, c) { let m = 1; for (const x of fxAll(P, 'career')) for (const [k, v] of Object.entries(x)) if (k === c.n || k === c.full) m *= v.mul || 1; return m; }
function setCareer(P, id, how) {
  const c = careerDef(id); if (!c) return;
  if (P.career && P.career !== id) {
    const near = (careerDef(P.career).near || []).includes(id) || (c.near || []).includes(P.career);
    if (near) P.skill[id] = Math.max(P.skill[id] || 0, (P.skill[P.career] || 0) / 2);
  }
  P.career = id; P.rung = P.flags['rung_' + id] || 0;
  say(P, `${how || ''}${J(c.lad[P.rung], '으로')} ${c.n} 일을 시작했다.`, 'path');
}

// ---------- 세력 ----------
const facDef = id => G.FACTIONS.find(f => f.id === id);
function ladderOf(f) { return G.LADDERS[f.lad] || G.LADDERS.sect; }
function accessGrade(P) {
  const m = P.member; if (!m) return 0;
  const f = facDef(m.fid), lad = ladderOf(f), name = lad[m.rank];
  if (G.ART_ACCESS[name]) return gIdx(G.ART_ACCESS[name]);
  if (m.disc && G.ART_ACCESS[m.disc]) return gIdx(G.ART_ACCESS[m.disc]);
  return clamp(Math.floor(m.rank / (lad.length - 1) * 5.4), 0, 5);
}
function rankName(P) { const m = P.member; if (!m) return null; const f = facDef(m.fid); const lad = ladderOf(f); return m.disc && f.lad === 'sect' && m.rank < 4 ? m.disc : lad[m.rank]; }
LIFE.rankName = rankName;
function join(P, fid, how, rank = 0, disc) {
  const f = facDef(fid); if (!f) return;
  if (P.member) say(P, `${J(facDef(P.member.fid).n, '을를')} 떠났다.`);
  P.member = { fid, rank, disc: disc || (f.lad === 'sect' ? (rank >= 3 ? '진산제자' : rank >= 2 ? '내문제자' : '입문제자') : null), since: P.year };
  if (f.at && G.PLACES2[f.at]) moveTo(P, f.at);
  say(P, `${how || ''}<b>${f.n}</b>의 ${J(rankName(P), '이가')} 되었다.`, 'big');
  P.events.push(`${P.age}세에 ${f.n}에 들었다`);
  const rn = G.RENAME_ON_JOIN && G.RENAME_ON_JOIN[fid];
  if (rn && P.sex === 'm' && P.age < 30 && rn === 'monk' && fid === 'shaolin') { const nm = pk(P, G.NAME_STYLE.monk.dharma) + pk(P, G.NAME_STYLE.monk.second); say(P, `법명 「${nm}」을 받았다.`); P.dharma = nm; }
  // 입문하면 그 자리의 무공 하나(심법 먼저)
  const a = factionArt(P, fid, accessGrade(P)); if (a) learn(P, a, '전수받았다');
  if (P.plan !== '무공 전념' && P.age < 40) P.plan = '무공 전념';
}
function factionAlive(P, fid) { if (!P.world) { const f = facDef(fid); return !f.from || f.from[0] <= P.year; } const f = P.world.F[fid]; return f && f.alive; }

// ---------- 장소 ----------
function moveTo(P, id) {
  if (!G.PLACES2[id]) return;
  if (P.place !== id) { P.place = id; P.region = regionOf(id); P.regions.add(P.region); if (P.regions.size >= 5) addAch(P, '유랑'); }
}
function nearPlace(P, maxD) {
  const me = G.PLACES2[P.place]; if (!me) return P.place;
  const z = G.REGIONS[me.r].zone;
  const l = Object.entries(G.PLACES2).filter(([id, p]) => id !== P.place && p.v > 0 && G.REGIONS[p.r].zone === z && Math.hypot(p.x - me.x, p.y - me.y) <= maxD && ['성', '진', '관문', '산', '물'].includes(p.t));
  return l.length ? pk(P, l)[0] : P.place;
}
function atText(P, seat) {
  const p = G.PLACES2[P.place]; if (!p) return seat || '';
  const reg = p.r, nm = p.n;
  const prefix = p.t === '특수' ? '' : (nm.startsWith(reg) ? '' : reg + ' ');
  return seat ? `${prefix}${nm}의 ${seat}` : `${prefix}${nm}`;
}

// ---------- 업적 ----------
function addAch(P, n) { if (!P.ach.has(n)) { P.ach.add(n); } }

// ---------- 특성 ----------
function rollTraits(P) {
  const o = P.opts, OPP = new Map();
  for (const [a, b] of G.TRAIT_OPPOSITES || []) { (OPP.get(a) || OPP.set(a, new Set()).get(a)).add(b); (OPP.get(b) || OPP.set(b, new Set()).get(b)).add(a); }
  const clash = (list, t) => list.some(x => (OPP.get(x.n) && OPP.get(x.n).has(t.n)) || (t.unique && x.n === t.n));
  const out = [];
  for (const t of G.TRAITS || []) if (P.R() * 1e7 < t.p * (o.traitX2 ? 2 : 1) && !clash(out, t)) { if (t.sex === 'f' && P.sex !== 'f') continue; out.push(t); }
  const pool = (G.TRAITS_MINOR || []).slice(); let n = d6(P) % 3 + 1 + d6(P) % 3 + 1, guard = 0;
  while (n > 0 && pool.length && guard++ < 200) { const t = wpick(P, pool, x => x.w || 10); pool.splice(pool.indexOf(t), 1); if (!clash(out, t)) { out.push(t); n--; } }
  P.traits = out;
  P.hidden = o.revealTraits ? [] : out.filter(t => !LIFE.MINOR_IDS.has(t.id)).map(t => t.id);
}
function revealTraits(P, cat) {
  const l = P.traits.filter(t => P.hidden.includes(t.id) && (!cat || t.c === cat));
  for (const t of l) { P.hidden = P.hidden.filter(x => x !== t.id); say(P, `타고난 것이 드러났다: <b>${t.n}</b>(${t.tier}).`, 'big'); if (t.n === '천무지체') addAch(P, '천무지체'); }
}
LIFE.isHidden = (P, t) => P.hidden.includes(t.id);

// ---------- 출생 ----------
function* birth(P) {
  const o = P.opts;
  // 시작점(8단계): 해금이면 장 제한
  const starts = (G.STARTS || [{ y: 1450, title: '1450년' }]).filter(s => s.y >= (o.minYear ?? 900) && (!o.chapter || (s.y >= o.chapter[0] && s.y <= o.chapter[1])));
  const sp = pk(P, starts.length ? starts : G.STARTS);
  P.year = sp.y; P.start = sp;
  // 세계: 정본 seed로 시작 연도까지, 그 뒤는 이 생의 seed
  if (G.WORLDSIM && !o.noWorld) {
    const WS = G.WORLDSIM; const w = WS.create({ seed: (G.CANON || {}).seed || 20261124, canon: true, founders: LIFE.FOUNDERS });
    WS.runTo(w, P.year - 1);
    w.opts = { seed: P.seed, canon: false, founders: LIFE.FOUNDERS }; w.R = rng(P.seed ^ 0x5bd1e995);
    P.world = w; P.wev = w.ev.length;
  }
  P.sex = P.R() < 0.5 ? 'm' : 'f';
  // 출신: 가중치 × 지역 인구, 그해 없는 세력의 출신은 뺀다
  let cand = G.ORIGINS.filter(x => (!x.join || x.join.every(f => factionAlive(P, f))) && (!x.f || factionAlive(P, x.f)));
  if (o.noble) { const c2 = cand.filter(x => x.join && x.join.some(f => facDef(f) && facDef(f).prestige >= 2)); if (c2.length) cand = c2; }
  else if (o.martial) { const c2 = cand.filter(x => x.martial); if (c2.length) cand = c2; }
  const chosen = o.originId && cand.find(x => x.id === o.originId);
  const og = chosen || wpick(P, cand, x => x.w * ((G.REGIONS[x.region] || {}).pop || 1));
  P.origin = og;
  P.region = og.region || wpick(P, Object.keys(G.REGIONS).filter(r => G.REGIONS[r].zone === '중원'), r => G.REGIONS[r].pop);
  let home = null;
  const fx = og.f || (og.join && og.join[0]);
  if (fx && facDef(fx) && G.PLACES2[facDef(fx).at]) home = facDef(fx).at;
  if (!home) { const ps = Object.entries(G.PLACES2).filter(([, p]) => p.r === P.region && (p.t === '성' || p.t === '진')); home = ps.length ? pk(P, ps)[0] : Object.keys(G.PLACES2)[0]; }
  moveTo(P, home); P.home = home;
  // 이름
  const NS = G.NAME_STYLE, f0 = fx && facDef(fx);
  const sur = f0 && f0.sur ? f0.sur : (P.R() < 0.1 ? pk(P, G.SURNAME_RARE) : pk(P, (G.SURNAME_REGION[P.region] && P.R() < 0.5) ? G.SURNAME_REGION[P.region] : G.SURNAME_COMMON));
  const okStyle = t => G.STYLE_BY_TAG[t] && NS[G.STYLE_BY_TAG[t]] && NS[G.STYLE_BY_TAG[t]].m && NS[G.STYLE_BY_TAG[t]].f;
  const tagT = (og.tag || []).find(okStyle);
  const style = tagT ? NS[G.STYLE_BY_TAG[tagT]] : og.martial ? NS.martial : (G.STYLE_BY_CAREER[og.career] && NS[G.STYLE_BY_CAREER[og.career]]) || NS.commoner;
  const parts = style[P.sex === 'm' ? 'm' : 'f'];
  P.name = sur + (parts.length === 3 ? (P.R() < 0.4 ? pk(P, parts[0]) : pk(P, parts[1]) + pk(P, parts[2])) : pk(P, pk(P, parts)));
  // 자질(숨김)
  for (const k of ['근골', '오성', '심성', '기연', '풍모']) {
    const dice = [d6(P), d6(P), d6(P), ...(o.bestOf4 ? [d6(P)] : [])].sort((a, b) => b - a).slice(0, 3);
    P.apt[k] = dice.reduce((a, v) => a + v, 0) * 5;
  }
  P.fiber = clamp(Math.round((d6(P) + d6(P) + d6(P) - 10.5) * 3), -30, 30);
  rollTraits(P);
  if (o.extraBig) { const OPPn = new Set(); for (const t of G.TRAITS || []) if (P.R() * 1e7 < t.p && !P.traits.some(x => x.n === t.n)) { P.traits.push(t); if (!o.revealTraits) P.hidden.push(t.id); } }
  for (const [k, v] of Object.entries(o.aptBonus || {})) if (k in P.apt) P.apt[k] += v;
  for (const id of o.buyTraits || []) { const t = (G.TRAITS || []).find(x => x.id === id); if (t && !P.traits.some(x => x.n === t.n)) { P.traits.push(t); P.bought = (P.bought || []).concat(t.n); } }
  for (const st of fxAll(P, 'stat')) for (const [k, v] of Object.entries(st)) if (k in P.apt) P.apt[k] = Math.max(15, P.apt[k] + v);
  for (const b of Object.values(BRANCH)) for (const [s] of b) P.st[s] = 0;
  P.flags.reroll = fxAll(P, 'luck').reduce((a, v) => a + (v.reroll || 0), 0);
  P.align = (og.align || 0) + fxAll(P, 'align').reduce((a, v) => a + v * 10, 0);
  P.wealth = [3, 30, 300, 3000, 30000, 300000][og.wealth || 0];
  P.lifeAdj = fxAll(P, 'life').reduce((a, v) => a + v, 0);
  P.deathWin = fxAll(P, 'death')[0] || null;
  if (P.traits.some(t => t.n === '천무지체')) addAch(P, '천무지체');
  card(P);
  const sx = P.sex === 'm' ? '사내아이' : '계집아이';
  say(P, `${yr(P.year)}, ${atText(P)}. <b>${og.n}</b>에서 ${sx} <b>${P.name}</b>${J(P.name, '이가').slice(-1)} 태어났다.`, 'big');
  P.era = eraOf(P);
  say(P, `때는 <b>${P.era.chapter}</b>, ${J(P.era.label, '이다')}.${P.era.why ? ' ' + P.era.why : ''}`, 'world');
  for (const l of P.era.local) say(P, `${l}.`, 'world');
  // 태생 소속
  if (og.join && og.join.length) {
    const fid = og.join[0], f = facDef(fid);
    if (f) { P.member = { fid, rank: og.rank || 0, disc: f.lad === 'sect' ? ['입문제자', '평제자', '내문제자', '진산제자', '직전제자'][og.rank || 0] : null, since: P.year, born: true }; }
  }
  if (og.career) P.flags.homeCareer = og.career;
  P.plan = P.member ? '무공 전념' : '가족과 함께';
}

// ---------- 사건 해석기 (7단계 문법) ----------
function tplOk(P, t) {
  const n = t.need || {};
  if (n.age && (P.age < n.age[0] || P.age > n.age[1])) return false;
  if (n.realm && (P.realm < n.realm[0] || P.realm > n.realm[1])) return false;
  if (n.fame != null && stageOf(P.fame) < n.fame) return false;
  if (n.infamy != null && stageOf(P.infamy) < n.infamy) return false;
  if (n.career && (Array.isArray(n.career) ? !n.career.includes(P.career) : P.career !== n.career)) return false;
  if (n.tag && !(P.origin.tag || []).some(x => (Array.isArray(n.tag) ? n.tag : [n.tag]).includes(x))) return false;
  if (n.align != null && (n.align > 0 ? P.align < n.align : P.align > n.align)) return false;
  if (n.rel && !P.bonds.some(b => b.alive && b.rels.includes(n.rel))) return false;
  if (n.tierUp && !P.flags.tierUp) return false;
  if (n.bigWin && !P.flags.bigWin) return false;
  const used = P.used[t.id] || 0;
  if (t.max != null && used >= t.max) return false;
  if (n.max != null && used >= n.max) return false;
  if (P.usedYear[t.id] && P.year - P.usedYear[t.id] < 5) return false;
  return true;
}
function tplWeight(P, t) {
  let w = t.w || 10;
  const tg = t.tag || [];
  if ((P.origin.tag || []).some(x => tg.includes(x) || (t.need && t.need.tag && [].concat(t.need.tag).includes(x)))) w *= 2;
  for (const ev of fxAll(P, 'event')) if ([].concat(ev).some(x => t.n.includes(x))) w *= 3;
  if (t.src === '상태') w *= Math.pow(1.25, Math.max(stageOf(P.fame), stageOf(P.infamy)));
  if (P.era) { const key = t.n + ' ' + ((t.who && t.who.r) || ''); if (RE_BANDIT.test(key)) w *= 1 + 1.5 * P.era.dz.bandit; if (RE_DEMON.test(key)) w *= 1 + 1.5 * P.era.dz.demon; }
  const p = G.PLACES2[P.place];
  if (p && t.at) { const nat = (G.SEATS[p.t] || []).concat(LIFE.BIG.has(P.place) ? G.SEATS.대도시 : []); if (nat.includes(t.at)) w *= 1.5; else if (!G.SEATS.어디서나.includes(t.at)) w *= 0.3; }
  return w;
}
function pickTpl(P, src) { const l = G.EVENT_TEMPLATES.filter(t => t.src === src && tplOk(P, t)); return l.length ? wpick(P, l, t => tplWeight(P, t)) : null; }

const PAIRS = { 이: '이가', 가: '이가', 은: '은는', 는: '은는', 을: '을를', 를: '을를', 과: '과와', 와: '과와' };
function fill(s, who, at) { return s.replace(/\{who\}(이|가|은|는|을|를|과|와)(?![가-힣])/g, (_, p) => J(who, PAIRS[p])).replace(/\{who\}/g, who).replace(/\{at\}/g, at); }
function* runTpl(P, t, month, extra = {}) {
  P.used[t.id] = (P.used[t.id] || 0) + 1; P.usedYear[t.id] = P.year;
  let npc = null, per = null;
  if (t.who) {
    const known = t.who.k !== 'new' && (t.who.k === 'known' || P.R() < 0.6) ? findKnown(P, b => (!t.who.rel || b.rels.includes(t.who.rel)) && b.role === t.who.r) : null;
    npc = known || (t.who.k === 'known' ? null : makeNpc(P, t.who.r, t.who.d));
    if (!npc && t.who.k === 'known') return;
    if (t.who.rel && !npc.rels.includes(t.who.rel)) { const k = findKnown(P, b => b.rels.includes(t.who.rel)); if (k) npc = k; }
    per = perceive(P, npc);
  }
  const whoTxt = npc ? (t.ch.some(c => c.c === '싸움') ? per.txt : (npc.known ? `${npc.name}(${npc.role})` : `${npc.role} ${npc.name}`)) : '';
  if (npc) npc.known = true;
  const at = atText(P, t.at);
  const text = fill(t.s, whoTxt, at);
  const opts = t.ch.map(c => [c.t, c.c === '싸움' ? (per ? guessOdds(P, npc, per) : '') : (c.t.includes('냥') ? '' : '')]);
  let i = 0;
  if (t.ch.length > 1) i = yield { ask: t.n, text, month, options: opts, npc: npc && { name: npc.name, role: npc.role, per: per && per.txt } };
  const c = t.ch[i];
  say(P, `${text}`, t.src === '큰' || t.src === '기연' ? 'big' : '', month);
  if (t.ch.length > 1) say(P, `▸ ${c.t}`, 'pick', month);
  let stage = '성공';
  if (c.c === '싸움') {
    if (npc) meet(P, npc);
    const r = yield* fight(P, npc, { lethal: (c.bad || []).concat(c.fum || []).some(e => /death|중상/.test(e)) || /생사|습격|암살|복수|흉적/.test(t.n), spar: /비무|대회|도장/.test(t.n) });
    stage = r.outcome;
    say(P, `${r.win ? '이겼다' : '졌다'}${r.stage === '대승' ? ' — 압승이었다' : r.stage === '신승' ? ' — 간신히' : r.stage === '대패' ? ' — 처참하게' : ''}. ${npc.realm !== npc.shown && per.level !== 'exact' && per.level !== 'realm' ? `상대는 ${REALMS[npc.realm]}의 고수였다.` : ''}`, r.win ? 'ok' : 'ng', month);
  } else if (c.c && c.c !== '없음') {
    const r = check(P, c.c, c.dc || 50, 0, t.n);
    stage = r.stage;
    say(P, `${r.ok ? '' : ''}${{ 대성공: '뜻밖에 크게 풀렸다.', 성공: '잘 풀렸다.', 실패: '뜻대로 되지 않았다.', 대실패: '일이 크게 틀어졌다.' }[stage]}`, r.ok ? 'ok' : 'ng', month);
  }
  if (!P.alive) return;
  const eff = stage === '대성공' ? (c.ok || []).concat(c.crit || []) : stage === '성공' ? c.ok || [] : stage === '실패' ? c.bad || [] : (c.bad || []).concat(c.fum || []);
  yield* applyFx(P, eff, npc, t);
  // 반전(7단계 3-5)
  if (P.alive && t.tw && t.tw.length && P.R() < G.EVENT_RULES.twistBase * (hasTrait(P, '행운아') || hasTrait(P, '불운') ? 1.5 : 1)) {
    const tws = t.tw.map(n => [n, G.EVENT_TWISTS[n]]).filter(([, x]) => x && x.when.includes(stage));
    if (tws.length) { const [n, x] = pk(P, tws); say(P, `반전: ${fill(x.s, npc ? npc.name : '그', at)}`, 'big', month); yield* applyFx(P, x.eff, npc, t); }
  }
  if (t.src === '기연') { P.kiyon++; addAch(P, '기연'); if (P.kiyon >= 3) addAch(P, '세 번의 기연'); }
}
function* applyFx(P, list, npc, t) {
  for (const e of list || []) {
    if (!P.alive) return;
    let m;
    if ((m = e.match(/^fame([+-])(\d+)$/))) addFame(P, (m[1] === '-' ? -1 : 1) * +m[2], 'fame');
    else if ((m = e.match(/^infamy\+(\d+)$/))) addFame(P, +m[1], 'infamy');
    else if ((m = e.match(/^wealth([+-])(\d+)$/))) P.wealth = Math.max(0, P.wealth + (m[1] === '-' ? -1 : 1) * +m[2] * Math.max(1, P.wealth / 200));
    else if ((m = e.match(/^align([+-])(\d+)$/))) P.align = clamp(P.align + (m[1] === '-' ? -1 : 1) * +m[2], -100, 100);
    else if ((m = e.match(/^real\+(\d+)$/))) P.real = Math.min(1000, P.real + +m[1] * mulOf(P, 'real'));
    else if ((m = e.match(/^bond([+-])(\d+)$/))) { if (npc) { meet(P, npc); npc.bond += (m[1] === '-' ? -1 : 1) * +m[2]; } }
    else if ((m = e.match(/^rel:(-?)(.+)$/))) { if (npc) { meet(P, npc); if (m[1]) npc.rels = npc.rels.filter(r => r !== m[2]); else { npc.rels.push(m[2]); relHook(P, npc, m[2]); } } }
    else if ((m = e.match(/^hurt:(.+)$/))) hurtMe(P, { 경상: 1, 중상: 2, 위중: 3 }[m[1]] || 1);
    else if ((m = e.match(/^death:(\d+)$/))) { if (P.R() * 100 < +m[1] * 0.5) die(P, t ? `${t.n}에서 목숨을 잃었다` : '목숨을 잃었다', 'combat'); }
    else if ((m = e.match(/^poison:(.+)$/))) { if (!hasTrait(P, '만독불침지체')) { P.poison = 1; say(P, '독이 몸에 스몄다.', 'ng'); } }
    else if ((m = e.match(/^grow:(.+)$/))) grow(P, m[1], 0.06);
    else if ((m = e.match(/^time-(\d+)$/))) P.flags.timeUsed = (P.flags.timeUsed || 0) + +m[1];
    else if (e === 'enlight') { P.trigger = Math.max(P.trigger, 1); }
    else if ((m = e.match(/^art:(.+)$/))) giveArt(P, m[1], npc, '전수받았다');
    else if ((m = e.match(/^manual:(.+)$/))) { if (check(P, '학식', 50 + gIdx(m[1] === '완본' ? '절세' : m[1]) * 8).ok) giveArt(P, m[1] === '완본' ? '절세' : m[1], null, '비급으로 익히기 시작했다'); else say(P, '비급을 얻었지만 끝내 해독하지 못했다.', 'ng'); }
    else if ((m = e.match(/^pill:(.+)$/))) givePill(P, m[1]);
    else if ((m = e.match(/^qi\+(\d+)$/))) { P.pqi += +m[1]; say(P, `약기 ${m[1]}년이 몸에 들었다.`); }
    else if ((m = e.match(/^weapon:(.+)$/))) { const lv = { 명병: 1, 보검: 2, 신병이기: 3 }[m[1]] || 1; if (lv > P.weapon) { P.weapon = lv; say(P, `${J(m[1], '을를')} 손에 넣었다.`, 'big'); } }
    else if ((m = e.match(/^trait:(-?)(.+)$/))) { const tr = [...G.TRAITS, ...G.TRAITS_MINOR, ...(G.TRAITS_ACQ || []), ...(G.TRAITS_EVENT || [])].find(x => x.n === m[2]); if (m[1]) P.traits = P.traits.filter(x => x.n !== m[2]); else if (tr && !hasTrait(P, tr.n)) { P.traits.push(tr); say(P, `특성 「${tr.n}」${J(tr.n, '이가').slice(-1)} 붙었다.`, 'big'); } }
    else if ((m = e.match(/^skill\+(\d+)$/))) { if (P.career) P.skill[P.career] = Math.min(1000, (P.skill[P.career] || 0) + +m[1]); }
    else if (e === 'rung+1') { if (P.career) yield* careerPromote(P, true); }
    else if (e === 'rank+1') { if (P.member) promote(P, true); }
    else if (e === 'realm+1') { P.trigger = 2; }
    else if ((m = e.match(/^thread:(.+)$/))) { if (G.EVENT_THREADS[m[1]] && !P.threads.some(x => x.k === m[1])) { P.threads.push({ k: m[1], step: 0, npc }); say(P, `— 「${m[1]}」의 실마리가 생겼다.`, 'thread'); } }
    else if ((m = e.match(/^count:(.+)$/))) P.deeds[m[1]] = (P.deeds[m[1]] || 0) + 1;
    else if ((m = e.match(/^rep([+-])(\d+)$/))) P.merit += (m[1] === '-' ? -1 : 1) * +m[2] / 2;
    else if ((m = e.match(/^epithet:(.+)$/))) makeEpithet(P, m[1]);
  }
}
function relHook(P, npc, rel) {
  if (rel === '스승') { addAch(P, '사부님'); P.teacher = npc; }
  if (rel === '의형제') addAch(P, '결의형제');
  if (rel === '배우자') { P.spouse = npc; P.married = P.year; }
  if (rel === '제자') { P.disciples++; addAch(P, '사제의 연'); }
}
function giveArt(P, g, npc, how) {
  let gi = g === '다음 등급' ? Math.min(5, (mainArt(P) ? gIdx(mainArt(P).def.g) : 0) + 1) : g === '견식' ? -1 : gIdx(g);
  if (gi === -1) { const m = mainArt(P); if (m) { m.sung = Math.min(artMax(m.def), m.sung + artMax(m.def) / 12); say(P, `견식이 넓어져 「${m.def.n}」의 이치가 깊어졌다.`); } return; }
  if (gi < 0) gi = 0;
  // 이미 그 등급 이상을 여럿 익혔으면 새 무공 대신 견식이 된다
  const known = P.arts.filter(a => gIdx(a.def.g) >= gi).length;
  if (known >= 3 && P.arts.length >= 5) { const m = trainTarget(P, '공격') || mainArt(P); if (m) { m.sung = Math.min(sungCap(P, m) / 12 * artMax(m.def), m.sung + artMax(m.def) / 12); say(P, `배운 것이 「${m.def.n}」의 견식이 되었다.`, 'art'); } return; }
  const fid = (npc && npc.fid) || (P.member && P.member.fid);
  let a = fid ? factionArt(P, fid, gi) : null;
  if (!a || gIdx(a.g) < gi - 1) { const pool = LIFE.ARTS_BY_G[gi].filter(x => !P.arts.some(b => b.def.n === x.n)); a = pk(P, pool.filter(x => x.f === 'free').length && P.R() < 0.5 ? pool.filter(x => x.f === 'free') : pool); }
  learn(P, a, how);
}
function givePill(P, g) {
  const lv = { 하품: 5, 중품: 15, 상품: 30, 극품: 60, 내단: 40 }[g] || 10;
  P.pqi += lv; P.pillYear = P.year;
  say(P, `영약(${g})을 먹었다. 약기 ${lv}년이 몸에 들었다.`, 'big');
  if (g === '극품') { P.apt.근골 = Math.min(100, P.apt.근골 + 5); }
}

// ---------- 진로 사건(10단계 6장) ----------
function regionFactions(P, pred) {
  const me = G.PLACES2[P.place];
  return G.FACTIONS.filter(f => factionAlive(P, f.id) && pred(f) && G.PLACES2[f.at] && (!me || Math.hypot(G.PLACES2[f.at].x - me.x, G.PLACES2[f.at].y - me.y) < 140));
}
function* pathEvents(P) {
  const og = P.origin;
  // 산문의 방: 6~15세, 소속 없음
  if (!P.member && P.age >= 7 && P.age <= 15 && !P.flags.examTried && P.R() < 0.18 + (og.martial ? 0.2 : 0)) {
    const l = regionFactions(P, f => f.lad === 'sect' && f.entry && f.entry.via && f.entry.via.includes('산문 시험') && (!f.entry.sex || f.entry.sex === P.sex));
    if (l.length) {
      const f = wpick(P, l, x => x.prestige === 1 ? 3 : x.prestige === 2 ? 2 : 1);
      P.flags.examTried = (P.flags.examTried || 0) + 1;
      const ch = yield { ask: '산문의 방', text: `${atText(P)}에 <b>${f.n}</b>${J(f.n, '이가').slice(-1)} 제자를 뽑는다는 방이 붙었다.`, options: [['입문 시험에 나간다', '근골과 오성을 본다'], ['집에 남는다', '']] };
      say(P, `${J(f.n, '이가')} 제자를 뽑는다는 방이 붙었다.`, 'path'); say(P, `▸ ${['입문 시험에 나간다', '집에 남는다'][ch]}`, 'pick');
      if (ch === 0) {
        const dc = 40 + f.prestige * 10 + (og.status === '천민' ? 15 : 0);
        const r = check(P, null, dc, (P.apt.근골 + P.apt.오성 - 100) / 4 + (P.apt.심성 - 50) / 8, '입문');
        if (r.ok) join(P, f.id, '시험을 통과해 ', 0, r.crit ? '내문제자' : '입문제자');
        else say(P, '시험에서 떨어졌다.', 'ng');
      }
      return;
    }
  }
  // 무관에 다니기
  if (!P.member && !P.arts.length && P.age >= 8 && P.age <= 16 && P.wealth >= 20 && !P.flags.dojo && P.R() < 0.15) {
    P.flags.dojo = 1;
    const ch = yield { ask: '동네 무관', text: `${atText(P)}의 무관에서 아이들을 받는다. 한 해에 몇 냥이 든다.`, options: [['무관에 다닌다', '삼류 무공을 배운다'], ['그만둔다', '']] };
    say(P, '동네 무관에서 아이들을 받는다.', 'path'); say(P, `▸ ${ch ? '그만둔다' : '무관에 다닌다'}`, 'pick');
    if (ch === 0) { P.wealth = Math.max(0, P.wealth - 10); P.flags.dojoMember = true; giveArt(P, '삼류', null, '무관에서 배우기 시작했다'); if (!heartArt(P)) learn(P, pk(P, LIFE.FREE_HEART), '무관에서 배웠다'); }
    return;
  }
  // 가업 거들기
  if (P.age === 10 && P.flags.homeCareer && !P.career) { P.skill[P.flags.homeCareer] = 30; say(P, `부모의 ${careerDef(P.flags.homeCareer).n} 일을 거들기 시작했다.`); return; }
  // 성인식과 진로
  if (P.age === 15 && !P.flags.path) {
    P.flags.path = 1;
    const home = P.flags.homeCareer && careerDef(P.flags.homeCareer);
    const options = [], acts = [];
    if (P.member) { options.push([`${facDef(P.member.fid).n}에 남아 수련한다`, rankName(P)]); acts.push('stay'); }
    if (home) { options.push([`가업을 잇는다 (${home.n})`, '그동안 거든 숙련을 쓴다']); acts.push('home'); }
    options.push(['다른 생업을 배운다', '']); acts.push('other');
    if (!P.member) { options.push(['무림인으로 떠난다', '낭인으로 강호를 떠돈다']); acts.push('wander'); }
    if (P.origin.status !== '천민' && baseOf(P, '학식') > 10) { options.push(['과거를 본다', '글공부로 벼슬길에']); acts.push('exam'); }
    if (!P.member) { options.push(['출가한다', '절이나 도관에 든다']); acts.push('monk'); }
    if (!P.member && P.align < 20) { options.push(['흑도에 든다', '뒷골목 방회']); acts.push('black'); }
    const ch = yield { ask: '성인식', text: `열다섯, 성인식을 치렀다. 어떤 길을 가는가?`, options };
    say(P, '열다섯, 성인식을 치렀다.', 'path'); say(P, `▸ ${options[ch][0]}`, 'pick');
    const act = acts[ch];
    if (act === 'stay') { P.plan = '무공 전념'; }
    else if (act === 'home') { setCareer(P, home.id, '가업을 이어 '); P.plan = P.arts.length ? '무공과 생업' : '생업 전념'; if (P.skill[home.id]) say(P, `그동안 거든 덕에 손에 익은 일이었다.`); }
    else if (act === 'other') {
      const l = G.CAREERS.filter(c => c.id !== 'scholar' && c.id !== 'eunuch' && c.id !== (home && home.id));
      const picks = [pk(P, l), pk(P, l), pk(P, l)].filter((x, i, a) => a.indexOf(x) === i);
      const c2 = yield { ask: '생업', text: '어떤 일을 배우는가?', options: picks.map(c => [c.n, c.lad[0] + '부터']) };
      setCareer(P, picks[c2].id); P.plan = '생업 전념';
    } else if (act === 'wander') {
      P.flags.ronin = true; P.plan = '강호 유람'; say(P, '봇짐 하나를 메고 집을 나섰다. 강호로.', 'big');
      if (!P.arts.length) giveArt(P, '삼류', null, '떠돌이 무사에게 몇 수 배웠다');
      setCareer(P, 'hunter', '끼니를 위해 ');
    } else if (act === 'exam') { setCareer(P, 'scholar', '서당에 들어 '); P.plan = '글공부'; }
    else if (act === 'monk') {
      const l = regionFactions(P, f => (f.rel === '불' || f.rel === '도') && f.lad === 'sect' && (!f.entry.sex || f.entry.sex === P.sex));
      if (l.length) join(P, pk(P, l).id, '머리를 깎고 ', 0, '입문제자'); else { say(P, '가까운 절에 들었다. 이름 없는 산사였다.'); P.flags.temple = true; learn(P, pk(P, LIFE.FREE_HEART), '산사에서 배웠다'); P.plan = '무공 전념'; }
    } else if (act === 'black') {
      const l = regionFactions(P, f => f.t === '사' && ['bandit', 'info'].includes(f.lad));
      if (l.length) join(P, pk(P, l).id, '연줄을 타고 '); else { P.flags.ronin = true; say(P, '뒷골목 패거리에 끼었다.'); giveArt(P, '삼류', null, '패거리에게 배웠다'); }
      P.align -= 15;
    }
    if (!P.career && P.flags.homeCareer && act !== 'monk') setCareer(P, P.flags.homeCareer, '틈틈이 ');
    return;
  }
  // 문파 밖 무공 길: 무공이 없는 청년에게 떠돌이 스승
  if (!P.member && P.age >= 16 && P.age <= 35 && P.arts.length === 0 && P.R() < 0.04) {
    const n = makeNpc(P, '떠돌이 무사', [1, 2]);
    const ch = yield { ask: '떠돌이 무사', text: `${atText(P, '객잔')}에서 ${perceive(P, n).txt}가 밥값 대신 무공을 가르쳐 주겠다고 한다.`, options: [['배운다', '몇 해 뒤를 따른다'], ['사양한다', '']] };
    if (ch === 0) { meet(P, n, '스승'); relHook(P, n, '스승'); giveArt(P, '삼류', n, `${n.name}에게서 배웠다`); if (!heartArt(P)) learn(P, pk(P, LIFE.FREE_HEART), `${n.name}에게서 배웠다`); }
    return;
  }
  // 표국·무관 고용
  if (P.realm >= 1 && !P.member && P.age >= 16 && P.age <= 50 && P.R() < 0.05) {
    const l = regionFactions(P, f => f.lad === 'escort' || f.id === 'escortunion');
    const ch = yield { ask: '표국의 부름', text: `${atText(P)}의 표국에서 표사를 구한다.`, options: [['표사가 된다', '표행 호위로 먹고산다'], ['사양한다', '']] };
    if (ch === 0) { if (l.length) join(P, l[0].id, '', 1); else { setCareer(P, 'military', '표국 쟁자수로 '); } P.plan = '의뢰'; }
    return;
  }
  // 하산: 문파 수련을 마친 청년
  if (P.member && P.member.rank <= 3 && P.age >= 20 && P.age <= 40 && facDef(P.member.fid).lad === 'sect' && P.realm >= 2 && !P.flags.downAsked && P.R() < 0.08) {
    P.flags.downAsked = 1;
    const ch = yield { ask: '하산', text: `사문이 하산을 허락했다. 산에 남겠는가?`, options: [['산에 남는다', '사문의 일을 맡는다'], ['하산해 강호로', '속가 제자로 떠돈다']] };
    if (ch === 1) { P.member.disc = '속가제자'; P.flags.ronin = true; P.plan = '강호 유람'; say(P, '하산했다.', 'big'); moveTo(P, nearPlace(P, 80)); }
    return;
  }
  // 혼담
  if (!P.spouse && P.age >= 18 && P.age <= 38 && P.R() < 0.12 * (1 + stageOf(P.fame) * 0.25) * (0.5 + P.apt.풍모 / 100)) {
    const n = makeNpc(P, P.sex === 'm' ? '이웃 처녀' : '이웃 총각', [-3, -1]);
    n.sex = P.sex === 'm' ? 'f' : 'm';
    const rich = stageOf(P.fame) >= 2 && P.R() < 0.5;
    const ch = yield { ask: '혼담', text: rich ? `이름이 알려지자 세가에서 혼담을 넣었다. 상대는 ${n.name}.` : `중매쟁이가 ${J(n.name, '과와')}의 혼담을 가져왔다.`, options: [['혼인한다', ''], ['홀로 간다', '']] };
    say(P, rich ? '세가에서 혼담이 들어왔다.' : `${J(n.name, '과와')}의 혼담이 들어왔다.`); say(P, `▸ ${ch ? '홀로 간다' : '혼인한다'}`, 'pick');
    if (ch === 0) { meet(P, n, '배우자'); relHook(P, n, '배우자'); say(P, `${J(n.name, '과와')} 혼인했다.`, 'big'); if (rich) P.wealth += 300; P.plan = P.plan === '폐관' ? '무공 전념' : P.plan; }
    return;
  }
  // 금분세수
  if (P.age >= 55 && P.member && !P.flags.retire && P.R() < 0.06) {
    P.flags.retire = 1;
    const ch = yield { ask: '금분세수', text: '강호에서 손을 씻을 때가 되었는가.', options: [['금분세수한다', '강호를 떠나 조용히 산다'], ['아직이다', '']] };
    if (ch === 0) { P.flags.retired = true; P.plan = '가족과 함께'; say(P, '금분세수했다. 칼을 걸어 두었다.', 'big'); }
  }
}
// 명성 초청(10단계 6장)
function* invitations(P) {
  const fs = stageOf(P.fame);
  if (P.age < 30 && P.realm >= 2 && fs >= 1 && !P.flags.yongbong && P.R() < 0.25) {
    P.flags.yongbong = 1;
    const ch = yield { ask: '용봉지회 초청장', text: '용봉지회 초청장이 왔다. 젊은 고수들이 겨루는 자리다.', options: [['나간다', '후기지수들과 겨룬다'], ['사양한다', '']] };
    say(P, '<b>용봉지회</b> 초청장이 왔다.', 'big'); say(P, `▸ ${ch ? '사양한다' : '나간다'}`, 'pick');
    if (ch === 0) {
      let w = 0;
      for (let i = 0; i < 3 && P.alive; i++) { const n = makeNpc(P, '후기지수', [0, i >= 2 ? 1 : 0]); n.org = pk(P, G.FACTIONS.filter(f => f.prestige >= 2 && f.t === '정')).n; const r = yield* fight(P, n, { spar: true }); say(P, `${i + 1}회전, ${perceive(P, n).txt}와 겨뤄 ${r.win ? '이겼다' : '졌다'}.`, r.win ? 'ok' : 'ng'); if (!r.win) break; w++; }
      if (w >= 3) { say(P, '용봉지회에서 우승했다!', 'big'); addFame(P, 100000); addAch(P, '용봉지회'); P.flags.bigWin = true; P.events.push(`${P.age}세에 용봉지회에서 우승했다`); }
      else if (w >= 2) { say(P, '용봉지회에서 입상했다.', 'big'); addFame(P, 30000); addAch(P, '용봉지회'); P.events.push(`${P.age}세에 용봉지회에서 입상했다`); }
      P.trigger = Math.max(P.trigger, 1);
    }
    return;
  }
  if (fs >= 3 && P.realm >= 4 && !P.flags.tianxia && P.R() < 0.15) {
    P.flags.tianxia = 1;
    const ch = yield { ask: '천하제일 비무대회', text: '천하제일 비무대회에 초청받았다.', options: [['나간다', '천하의 고수들과 겨룬다'], ['사양한다', '']] };
    say(P, '<b>천하제일 비무대회</b>에 초청받았다.', 'big');
    if (ch === 0) {
      addAch(P, '천하제일 비무'); let w = 0;
      for (let i = 0; i < 4 && P.alive; i++) { const n = makeNpc(P, '천하의 고수', [0, 1]); n.stage = 2; const r = yield* fight(P, n, { spar: true }); say(P, `${i + 1}회전, ${perceive(P, n).txt}와 겨뤄 ${r.win ? '이겼다' : '졌다'}.`, r.win ? 'ok' : 'ng'); if (!r.win) break; w++; }
      if (w >= 4) { say(P, '천하제일 비무대회에서 우승했다! 천하제일인이라 불린다.', 'big'); addFame(P, 2000000); P.flags.tianxiaWin = true; P.events.push(`${P.age}세에 천하제일 비무대회에서 우승했다`); }
      P.trigger = Math.max(P.trigger, 1);
    }
    return;
  }
  if (fs >= 2 && !P.member && P.realm >= 3 && P.R() < 0.06) {
    const l = G.FACTIONS.filter(f => factionAlive(P, f.id) && (f.cat === '연합' || f.cat === '세가') && f.t === (P.align < -20 ? '사' : '정'));
    if (l.length) { const f = pk(P, l); const ch = yield { ask: '객경 초빙', text: `${f.n}에서 객경으로 모시겠다는 서신이 왔다.`, options: [['받아들인다', ''], ['사양한다', '']] }; if (ch === 0) join(P, f.id, '객경으로 ', Math.min(3, ladderOf(f).length - 2)); }
    return;
  }
  if (stageOf(P.infamy) >= 2 && P.R() < stageOf(P.infamy) * 0.05) {
    const n = makeNpc(P, '추살대 우두머리', [0, 1]);
    say(P, `목에 현상금이 걸렸다. ${perceive(P, n).txt}가 이끄는 추살대가 따라붙었다.`, 'big');
    const ch = yield { ask: '추살대', text: `${perceive(P, n).txt}가 이끄는 추살대가 따라붙었다. ${guessOdds(P, n, perceive(P, n))}.`, options: [['맞선다', ''], ['달아난다', '순발과 실전']] };
    if (ch === 0) { const r = yield* fight(P, n, { lethal: true, pMul: 0.8 }); if (r.win) { addFame(P, 200, 'infamy'); say(P, '추살대를 물리쳤다.', 'ok'); } }
    else { const r = check(P, '순발', 55, P.real / 50); say(P, r.ok ? '달아났다.' : '따라잡혔다. 크게 다쳤다.', r.ok ? 'ok' : 'ng'); if (!r.ok) hurtMe(P, 2); }
  }
}

// ---------- 한 해의 결산 ----------
function slotsOf(P) {
  let n = [4, 4, 4, 5, 6, 7, 8, 10][P.realm];
  if (baseOf(P, '체력') >= 140) n++;
  if (hasTrait(P, '근면')) n++; if (hasTrait(P, '게으름')) n--;
  if (hasTrait(P, '잠이 적음')) n++; if (hasTrait(P, '잠이 많음')) n--;
  if (P.hurt >= 2) n -= 2; if (P.age >= 70) n--;
  if (P.age < 15) n = 2;
  return Math.max(2, n);
}
LIFE.slotsOf = slotsOf;
function scheduleOf(P) {
  let plan = PLANS[P.plan] || PLANS['무공 전념'];
  if (P.age < 15) plan = P.member ? ['수련', '운기'] : P.flags.dojoMember ? ['수련', '가족'] : ['가족', '가족'];
  const n = slotsOf(P), out = plan.slice(0, Math.min(n, plan.length));
  while (out.length < n) out.push(plan[0]);
  const cnt = {}; for (const a of out) cnt[a] = (cnt[a] || 0) + 1;
  if (!P.arts.length) { cnt.생업 = (cnt.생업 || 0) + (cnt.수련 || 0) + (cnt.운기 || 0) + (cnt.폐관 || 0); delete cnt.수련; delete cnt.운기; delete cnt.폐관; if (P.age < 15) { cnt.가족 = (cnt.가족 || 0) + (cnt.생업 || 0); delete cnt.생업; } }
  return { cnt, list: out };
}
function trainYear(P, cnt) {
  const closed = cnt.폐관 ? 1.3 : 1;
  const tr = cnt.폐관 ? slotEff(cnt.폐관) : slotEff(cnt.수련 || 0);
  const breath = cnt.폐관 ? slotEff(Math.ceil(cnt.폐관 / 2)) : slotEff((cnt.운기 || 0) + (cnt.수련 || 0) * 0.5);
  const tmul = mulOf(P, 'train'), emul = mulOf(P, 'enlight');
  // 대기만성: 첫해 ×0.1에서 해마다 ×1.1, 최대 ×2.5
  const curve = fxAll(P, 'curve')[0]; const cm = curve ? Math.min(curve.max, curve.start * Math.pow(curve.mul, Math.max(0, P.age - 6))) : 1;
  const und = clamp(0.5 + baseOf(P, '이해') / 200, 0.5, 2);
  // 무공 성취
  const m = trainTarget(P, '공격') || mainArt(P), h = trainTarget(P, '심법') || heartArt(P);
  const focus = [m, h, trainTarget(P, '경신'), trainTarget(P, '방어')].filter(Boolean);
  for (const a of P.arts) {
    const share = a === m ? 1 : a === h ? 0.8 : focus.includes(a) ? 0.45 : 0.12;
    const cap = sungCap(P, a) / 12 * artMax(a.def);
    const before = s12(a);
    if (a.sung < cap) a.sung = Math.min(cap, a.sung + artMax(a.def) / 12 * 3.0 * share * (a.def.role === '심법' ? breath : tr) * und * tmul * cm * closed * GRADE_DIFF[gIdx(a.def.g)]);
    else if (focus.includes(a) && !a.capNoted && a.sung < artMax(a.def)) { a.capNoted = P.realm; say(P, `「${a.def.n}」${J(a.def.n, '이가').slice(-1)} ${s12(a).toFixed(0)}성에서 막혔다. 경지가 받쳐 주지 않는다.`, 'muted'); }
    if (a.capNoted != null && a.capNoted !== P.realm) a.capNoted = null;
    const after = s12(a);
    for (const mk of [4, 8, 12]) if (before < mk && after >= mk) { say(P, `「${a.def.n}」 ${mk === 12 ? '대성' : mk + '성'}에 이르렀다.`, mk === 12 ? 'big' : 'art'); if (mk === 12) addAch(P, '대성'); }
  }
  // 스탯 성장
  const gr = new Map();
  const add = (s, r) => gr.set(s, Math.max(gr.get(s) || 0, r));
  if (m) for (const s of m.def.gr || []) add(s, 0.12 * tr * closed);
  if (m) add('정교', 0.08 * tr);
  if (h) for (const s of h.def.gr || []) add(s, 0.06 * breath);
  add('회복', 0.04 * breath); add('정신력', 0.05 * breath);
  if (cnt.유람) { add('수읽기', 0.06 * slotEff(cnt.유람)); add('반응', 0.04 * slotEff(cnt.유람)); add('지속', 0.04); }
  if (cnt.협행) { add('성품', 0.08 * slotEff(cnt.협행)); add('수읽기', 0.04); }
  if (cnt.의뢰) { add('근질', 0.06 * slotEff(cnt.의뢰)); add('반응', 0.06); add('의지', 0.04); }
  if (cnt.글공부) { add('학식', 0.12 * slotEff(cnt.글공부)); add('이해', 0.08 * slotEff(cnt.글공부)); add('지략', 0.06); }
  if (cnt.가족) add('성품', 0.04 * slotEff(cnt.가족));
  if (cnt.폐관) add('정신력', 0.1);
  if (P.career && cnt.생업) { const c = careerDef(P.career); const e = slotEff(cnt.생업); add(c.st[0], 0.12 * e); add(c.st[1], 0.06 * e); }
  // 어린 날 몸은 저절로 자란다
  for (const s of ['근력', '체력', '순발', '지속', '반응', '유연', '이해', '학식', '성품', '의지', '정신력', '지략', '수읽기', '정교', '회복', '강골']) add(s, P.age < 18 ? 0.05 : 0.01);
  for (const [s, r] of gr) grow(P, s, r);
  // 노화(1단계 2-2)
  if (P.age >= 55 && !P.flags.rejuv) for (const s of ['근력', '순발', '지속', '체력']) P.st[s] *= 0.98;
  // 내공(1단계 4장): 운기 칸이 있을 때만
  if (h && (cnt.운기 || cnt.폐관 || cnt.수련)) {
    const rate = NGB[gIdx(h.def.g)] * (h.def.ng ? h.def.ng / NGB[gIdx(h.def.g)] : 1) * mulOf(P, 'ng') * (1 + 0.15 * P.realm) * breath * closed * (h.def.yy === '마' || h.def.f === 'demon' ? 1.5 : 1);
    P.capa = Math.max(P.capa, CAPA[P.realm] * mulOf(P, 'capa'));
    P.qi = Math.min(P.capa, P.qi + rate);
    const target = h.def.pur || (/마|혈/.test(h.def.yy || '') ? 70 : 95);
    P.pur += (target - P.pur) * 0.1;
    P.flow = Math.min(100, P.flow + (100 - P.flow) * 0.035 * breath * (1 + gIdx(h.def.g) * 0.15) + 0.3);
  } else if (P.arts.length) P.flow = Math.min(100, P.flow + 0.2);
  // 연화
  if (P.pqi > 0) {
    const ref = 5 + (h ? gIdx(h.def.g) : 0) * 5;
    const take = Math.min(P.pqi, ref * (cnt.운기 || cnt.폐관 ? 1 : 0.4));
    P.pqi -= take; const room = P.capa - P.qi;
    if (take > room) { P.capa = Math.min(CAPA[P.realm] * 2, P.capa + (take - room) * 0.3); if (!check(P, '정신력', 50 + Math.min(50, (take - room) / P.capa * 50)).ok) { hurtMe(P, 2); say(P, '넘치는 약기를 다스리지 못해 기혈이 역류했다.', 'ng'); } }
    P.qi = Math.min(P.capa, P.qi + take); P.pur = (P.pur * P.qi + 80 * take) / Math.max(1, P.qi + take);
  }
  if (effQi(P) >= 60) addAch(P, '갑자');
  // 깨달음(2단계 1-3)
  if (P.arts.length && P.enl < 5) {
    const trig = P.trigger > 0 || cnt.폐관;
    const p = (trig ? 0.12 : 0.008) * (0.5 + P.apt.오성 / 90) * emul * Math.pow(0.62, P.enl) * (1 + 0.02 * P.realm) * (cnt.폐관 ? 1.5 : 1);
    if (P.R() < p) { P.enl++; say(P, `깨달음이 왔다. <b>${ENL[P.enl]}</b>의 경지다.`, 'big'); P.events.push(`${P.age}세에 ${ENL[P.enl]}에 이르렀다`); }
  }
  // 관문 사건과 돌파(2단계 1-4)
  const n = NEXT[P.realm + 1];
  if (n && P.arts.length) {
    const ax = LIFE.nextAxes(P);
    const four = ax.ok.slice(0, 4).every(Boolean);
    if (four && n[5] && !P.gates[P.realm + 1]) {
      const st = { '기 발출': ['이해', 60], 강기: ['정신력', 70], 삼화취정: ['정신력', 75], 천인합일: ['정신력', 85] }[n[5]];
      const r = check(P, st[0], st[1], P.trigger ? 10 : 0);
      if (r.ok) { P.gates[P.realm + 1] = true; say(P, `관문을 넘었다: <b>${n[5]}</b>. ${{ '기 발출': '검끝에서 기운이 뻗어 나갔다.', 강기: '기운이 눈에 보이게 굳었다.', 삼화취정: '세 단전에 기운의 꽃이 피었다.', 천인합일: '천지의 기운이 몸을 지나갔다.' }[n[5]]}`, 'big'); }
      else say(P, `${n[5]}의 관문 앞에서 번번이 막혔다.`, 'muted');
    }
    if (ax.ok.every(Boolean)) {
      const dc = BREAK_DC[P.realm + 1] + (h && /마/.test(h.def.yy || '') ? (P.realm + 1 <= 4 ? -10 : 15) : 0);
      const brk = fxAll(P, 'break').reduce((a, v) => a + v, 0);
      const r = check(P, null, dc, (P.apt.오성 - 50) / 2 + (P.trigger ? 15 : 0) + (P.pillYear === P.year ? 10 : 0) + brk);
      if (r.ok) {
        P.realm++; P.stage = r.crit ? 1 : 0; P.capa = Math.max(P.capa, CAPA[P.realm] * mulOf(P, 'capa'));
        say(P, `<b>${REALMS[P.realm]}</b>의 경지에 올랐다!`, 'realm');
        P.events.push(`${P.age}세에 ${REALMS[P.realm]}에 올랐다`);
        if (P.realm > P.peak) P.peak = P.realm;
        if (P.realm === 1) addAch(P, '첫걸음'); if (P.realm === 4) addAch(P, '벽을 넘다');
        if (P.realm === 3 && P.age < 20) addAch(P, '소년고수');
        if (P.age >= 40 && !P.firsts.realmUp) addAch(P, '늦깎이');
        if (P.realm === 4 && P.apt.오성 <= 29) addAch(P, '둔재의 노력');
        if (P.realm === 3 && P.apt.근골 <= 29) addAch(P, '약골의 집념');
        P.firsts.realmUp = true;
        addFame(P, [0, 0, 0, 0, 20000, 100000, 500000, 2000000][P.realm] || 0);
        if (P.realm === 4 && !P.epithet) makeEpithet(P, 'realm');
        if (P.realm === 3) revealTraits(P, '재능');
      } else if (r.fum) {
        say(P, '돌파하다 기혈이 뒤집혔다. <b>주화입마</b>다!', 'ng');
        const r2 = check(P, '정신력', 60 + P.realm * 5);
        if (!r2.ok) { if (P.R() < 0.3) { die(P, '주화입마로 숨이 끊어졌다', 'qi'); return; } P.qi *= 0.5; hurtMe(P, 3); say(P, '내공의 절반을 잃었다.', 'ng'); }
        else { say(P, '간신히 기혈을 바로잡았다.'); addAch(P, '주화입마를 넘다'); }
      }
    }
  }
  // 경지 안 단계
  const f = stageFill(P); P.stage = Math.max(P.stage, f < 1 / 3 ? 0 : f < 2 / 3 ? 1 : 2);
  P.trigger = Math.max(0, P.trigger - 1);
}
function* careerYear(P, cnt) {
  if (!P.career) { if (P.age >= 10 && P.flags.homeCareer && P.age < 15) P.skill[P.flags.homeCareer] = Math.min(300, (P.skill[P.flags.homeCareer] || 0) + 12); return; }
  const c = careerDef(P.career), fr = careerFrame(c), e = slotEff(cnt.생업 || 0);
  const cap = careerCap(P, c), cur = P.skill[c.id] || 0;
  if (cnt.생업) P.skill[c.id] = Math.min(1000, cur + Math.max(0, cap - cur) * 0.08 * careerApt(P, c) * e * 1.6);
  yield* careerPromote(P);
  // 수입
  const inc = (fr.income || [])[P.rung] || 2;
  const living = (G.WEALTH.slice().reverse().find(w => P.wealth >= w.min) || G.WEALTH[0]).living;
  if (c.id === 'merchant' && cnt.생업) P.wealth *= 1 + (-0.2 + P.R() * 0.6 * (0.8 + P.rung * 0.1));
  // 문파 제자는 문파가 먹여 살린다(5단계 2-4)
  const fed = P.member && P.member.disc !== '속가제자' ? 0 : 1;
  P.wealth = Math.max(0, P.wealth + inc * (0.3 + 0.7 * e) - living * 0.6 * fed);
  if (P.wealth >= 100000) addAch(P, '거부');
}
function* careerPromote(P, force) {
  const c = careerDef(P.career), fr = careerFrame(c), next = P.rung + 1;
  if (next >= fr.rungs) return;
  const sk = P.skill[c.id] || 0;
  if (!force) {
    if (sk < fr.th[next]) return;
    if (P.R() >= (fr.gate[next] || 0)) return;
    if (next === fr.rungs - 1 && next !== 6) { if (sk < fr.apexSkill || P.R() >= fr.apexWin) return; }
    else if (!check(P, null, fr.dc[next] || 60, (sk - fr.th[next]) / 10, c.n).ok) return;
  }
  P.rung = next; P.flags['rung_' + c.id] = next;
  say(P, `${c.n} 일에서 한 단 올랐다: <b>${c.lad[next]}</b>.`, next >= 3 ? 'big' : 'ok');
  if (next >= 4) { addFame(P, next === 4 ? 20000 : 200000); P.events.push(`${P.age}세에 ${J(c.lad[next], '이가')} 되었다`); }
  if (c.id === P.flags.homeCareer && next >= 4) addAch(P, '가업을 잇다');
  if (c.id === 'scholar' && next === 3) addAch(P, '장원급제');
}
function promote(P, force) {
  const m = P.member; if (!m || (!force && P.age < 16)) return;
  const f = facDef(m.fid), lad = ladderOf(f), next = m.rank + 1;
  if (next >= lad.length) return;
  const top = next === lad.length - 1;
  const need = f.lad === 'sect' ? [0, 1, 1, 2, 3, 4, 5, 4][next] : Math.min(6, Math.floor(1 + 4 * next / (lad.length - 1)));
  if (!force) {
    if (P.realm < Math.max(0, need - (f.prestige === 1 ? 1 : 0))) return;
    if (top && (P.age < 40 || P.R() > 0.04)) return;
    const dc = next * 15 / (lad.length / 8) + f.prestige * 10;
    if (!check(P, null, dc, P.merit / 2 + Math.min(20, stageOf(P.fame) * 5)).ok) return;
  }
  m.rank = next; if (f.lad === 'sect' && next >= 4) m.disc = null;
  else if (f.lad === 'sect') m.disc = ['입문제자', '평제자', '내문제자', '진산제자'][next] || m.disc;
  say(P, `${f.n}에서 <b>${rankName(P)}</b>에 올랐다.`, 'big');
  P.events.push(`${P.age}세에 ${f.n}의 ${J(rankName(P), '이가')} 되었다`);
  if (top) { addFame(P, (f.size || 100) * 200); P.flags.leader = f.id; }
  const a = factionArt(P, m.fid, accessGrade(P)); if (a && gIdx(a.g) >= (mainArt(P) ? gIdx(mainArt(P).def.g) : 0)) learn(P, a, '사문에서 전수받았다');
}

// 공적으로 비급각을 열람한다(4단계 3-4): 열린 등급 안에서 지금 주무공보다 높거나, 빠진 역할의 무공
function artFromMerit(P) {
  if (P.merit < 15 || P.age < 10) return;
  const acc = accessGrade(P), atk = P.arts.filter(a => (a.def.roles || [a.def.role]).includes('공격')), mg = atk.length ? Math.max(...atk.map(a => gIdx(a.def.g))) : -1, m = mainArt(P);
  const missing = !heartArt(P) ? '심법' : !byRole(P, '경신') ? '경신' : !byRole(P, '방어') ? '방어' : null;
  let want = null;
  if (acc > mg) want = factionArt(P, P.member.fid, acc, '공격');
  else if (missing && P.R() < 0.5) want = factionArt(P, P.member.fid, acc, missing);
  else { const h = heartArt(P); if (h && acc > gIdx(h.def.g)) want = factionArt(P, P.member.fid, acc, '심법'); }
  if (want && !(want.role === '공격' && m && gIdx(want.g) < mg)) { P.merit -= 15; learn(P, want, '비급각에서 받아 익히기 시작했다'); }
}

// ---------- 세계 사건 ----------
function* worldYear(P) {
  const w = P.world; if (!w) return;
  G.WORLDSIM.step(w);
  const evs = w.ev.slice(P.wev); P.wev = w.ev.length;
  const me = P.member && P.member.fid;
  for (const e of evs) {
    if (e.k === '닻' && (e.t || '').length) { const a = (G.ANCHORS || []).find(x => x.id === e.a); if (a && (a.k === '메인' || a.k === '정사')) say(P, `세상: ${e.t.split(/(?<=다\.)/)[0]}`, 'world'); if (a && /정마대전/.test(a.t || '') && P.realm >= 1 && P.age >= 16) yield* warCall(P, a); if (a && /망|건국|왕조|함락/.test(a.t || '') && a.k === '정사') addAch(P, '세상이 바뀌다'); if (a && /혈겁/.test(a.t || '')) P.flags.bloodYear = P.year; }
    if (me && e.f === me && e.k === '멸문') { say(P, `<b>${facDef(me).n}</b>${J(facDef(me).n, '이가').slice(-1)} 무너졌다. 사문이 사라졌다.`, 'big'); P.member = null; P.flags.ronin = true; P.trigger = 2; P.threads.push({ k: '복수', step: 0 }); }
    if (me && e.k === '전쟁' && e.t.includes(facDef(me).n) && P.realm >= 1 && P.age >= 16) yield* warCall(P, null, e.t);
  }
  for (const h of w.hz) if (h[0] === P.year && h[1] === P.region) {
    if (h[2] === '역병') { say(P, `${P.region}에 역병이 돌았다.`, 'world'); if (!check(P, '회복', 45).ok) { hurtMe(P, 2); if ((P.age < 8 || P.age > 60) && P.R() < 0.3) die(P, '역병으로 세상을 떠났다', 'sick'); } }
    if (h[2] === '홍수' || h[2] === '가뭄') { say(P, `${P.region}에 ${h[2] === '홍수' ? '큰물이 졌다' : '가뭄이 들었다'}.`, 'world'); P.wealth *= 0.85; if (P.wealth < 5 && (P.age < 6 || P.age > 65) && P.R() < 0.08) die(P, '굶주림으로 세상을 떠났다', 'hunger'); }
    if (h[2] === '왜구') { say(P, '왜구가 바닷가 고을을 덮쳤다.', 'world'); if (P.realm >= 1 && P.R() < 0.5) { const n = makeNpc(P, '왜구 낭인', [-1, 0]); const r = yield* fight(P, n, { lethal: true }); if (r.win) addFame(P, 50); } }
    if (h[2] === '마적') say(P, '마적 떼가 길을 끊었다.', 'world');
  }
}
function* warCall(P, a, txt) {
  if (P.flags.warYear === P.year) return; P.flags.warYear = P.year;
  const ch = yield { ask: '소집령', text: `${txt || a.t} 소집령이 왔다.`, options: [['참전한다', '세 번 싸운다'], ['몸을 숨긴다', '명성이 깎인다']] };
  say(P, `${txt || a.t.split(/(?<=다\.)/)[0]} 소집령이 왔다.`, 'big'); say(P, `▸ ${ch ? '몸을 숨긴다' : '참전한다'}`, 'pick');
  if (ch === 1) { addFame(P, -50); return; }
  addAch(P, '정마대전'); let w = 0;
  for (let i = 0; i < 3 && P.alive; i++) { const n = makeNpc(P, pk(P, ['마교 무사', '적의 고수', '적의 무사']), [-1, 1]); const r = yield* fight(P, n, { lethal: true }); if (r.win) w++; }
  if (P.alive) { say(P, `${w}번 싸워 이겼다.`, w >= 2 ? 'ok' : ''); addFame(P, w * 100); P.real = Math.min(1000, P.real + 100); P.trigger = 2; P.merit += w * 10; }
}

// ---------- 사슬 ----------
function* threadYear(P) {
  for (const th of P.threads.slice()) {
    const T = G.EVENT_THREADS[th.k]; if (!T) continue;
    if (P.R() >= T.p) continue;
    const step = T.steps[th.step], m = step.match(/^(.*)\((.+)\)$/);
    const txt = m ? m[1] : step, st = m ? m[2] : null;
    let ok = true;
    if (st === '싸움') { const n = th.npc || makeNpc(P, '원수', [0, 1]); const r = yield* fight(P, n, { lethal: true }); ok = r.win; }
    else if (st) ok = check(P, st, 55).ok;
    say(P, `「${th.k}」: ${txt} — ${ok ? '뜻을 이뤘다' : '실패했다'}.`, 'thread');
    if (!P.alive) return;
    if (!ok && st === '싸움') { yield* applyFx(P, T.fail, th.npc); P.threads.splice(P.threads.indexOf(th), 1); continue; }
    if (ok) th.step++;
    if (th.step >= T.steps.length) { say(P, `「${th.k}」의 일이 끝났다.`, 'big'); yield* applyFx(P, T.end, th.npc); P.threads.splice(P.threads.indexOf(th), 1); if (th.k === '복수') addAch(P, '원수를 갚다'); }
  }
}

// ---------- 수명 ----------
function mortality(P) {
  if (P.age < 6) { const q = P.wealth < 10 ? 0.016 : P.wealth < 100 ? 0.01 : 0.005; if (P.R() < q * (hasTrait(P, '병약') ? 2 : 1)) die(P, pk(P, ['홍역', '열병', '설사병', '겨울 추위']) + '으로 세상을 떠났다', 'child'); return; }
  if (P.deathWin && P.age >= P.deathWin[0] && P.age <= P.deathWin[1] && P.realm < 4 && P.R() < 0.04) { die(P, '타고난 절맥이 터져 세상을 떠났다', 'vein'); return; }
  const eff = P.age - P.realm * 6 - (P.apt.근골 - 50) / 8 - (P.lifeAdj || 0) - (P.wealth >= 1000 ? 3 : 0);
  let q = 0.002 + 0.0003 * Math.exp(0.09 * (eff - 20));
  if (P.hurt === 3) q += 0.15; else if (P.hurt === 2) q += 0.02;
  if (P.poison) q += 0.03;
  if (P.R() < q) die(P, P.realm >= 6 ? '좌화했다 — 앉은 채로 숨을 거두었다' : P.age > 60 ? pk(P, ['노환으로 세상을 떠났다', '중풍으로 세상을 떠났다', '해수병으로 세상을 떠났다']) : pk(P, ['병으로 세상을 떠났다', '갑작스러운 병으로 세상을 떠났다']), 'age');
}
function recover(P) {
  if (P.hurt && check(P, '회복', 40 + P.hurt * 10).ok) P.hurt--;
  if (P.poison && check(P, '체력', 50).ok) P.poison = 0;
}

// ---------- 시대와 지역의 위험(10단계 6-1) ----------
const CHAPTERS = [[-500, -222, '검의 시대'], [-221, 219, '제국과 유협'], [220, 588, '산문의 시작'], [589, 906, '승병과 이교'], [907, 1126, '문파의 태동'], [1127, 1278, '구파 정립'], [1279, 1367, '명교와 홍건'], [1368, 1449, '마교의 굴기'], [1450, 1549, '강호의 전성기'], [1550, 1643, '왜구와 동영'], [1644, 1779, '반청'], [1780, 1840, '황혼']];
// 전란을 부르는 정사 닻과 어지러움이 이어지는 해
const WAR_ANCHORS = { qin_fall: 5, yellow_turban: 15, anshi: 8, huangchao: 10, fangla: 3, jingkang: 10, yuefei: 6, mongol: 44, xiangyang: 6, song_fall: 3, red_turban: 17, tumu: 3, wokou: 15, ming_fall: 20, bailian_revolt: 9, opium: 3 };
const RE_BANDIT = /산적|수적|녹림|흑도|왈패|사파|흉적|마적|인신매매|복면|강도|도적/;
const RE_DEMON = /마교|혈교|마두|사교|마공|마인/;
function eraOf(P) {
  const y = P.year, ch = CHAPTERS.find(c => y >= c[0] && y <= c[1]) || CHAPTERS[CHAPTERS.length - 1];
  const e = { chapter: ch[2], label: '비교적 태평한 시기', dz: { bandit: 0, demon: 0, war: 0 }, local: [], banditF: null, demonF: null, why: '' };
  const w = P.world;
  if (w) {
    const since = (re, n) => Object.entries(w.fired).find(([id, f]) => re.test(id) && y - f.y >= 0 && y - f.y < n);
    let wa;
    if (since(/^zhengmo/, 10)) { e.label = '정마대전의 한가운데'; e.dz.demon = 0.8; e.dz.war = 0.6; }
    else if (since(/^blood_calamity/, 10)) { e.label = '혈겁이 휩쓰는 시기'; e.dz.demon = 0.8; }
    else if ((wa = Object.entries(WAR_ANCHORS).find(([id, n]) => w.fired[id] && y - w.fired[id].y >= 0 && y - w.fired[id].y < n))) {
      e.label = '천하가 어지러운 전란기'; e.dz.war = 0.7; e.dz.bandit = 0.4;
      const a = (G.ANCHORS || []).find(x => x.id === wa[0]); e.why = a ? a.t.split(/(?<=다\.)/)[0] : '';
    } else {
      const vis = w.list.filter(f => f.alive && f.state !== '잠적' && f.cat !== '새외');
      const top = t => Math.max(0, ...vis.filter(f => f.t === t).map(f => f.pow));
      // 들어갈 때와 나올 때 문턱을 달리 해서 해마다 오락가락하지 않게 한다
      const j = top('정') || 1, prev = P.era && P.era.label, wars = vis.filter(f => f.war).length / 2;
      if (top('마') >= (prev === '마도가 기세를 올리는 시기' ? 0.55 : 0.7) * j) { e.label = '마도가 기세를 올리는 시기'; e.dz.demon = 0.4; }
      else if (top('사') >= (prev === '사파가 날뛰는 시기' ? 0.55 : 0.7) * j) { e.label = '사파가 날뛰는 시기'; e.dz.bandit = 0.5; }
      else if (wars >= (prev === '문파들이 다투는 어지러운 시기' ? 2 : 5)) { e.label = '문파들이 다투는 어지러운 시기'; e.dz.bandit = 0.3; }
    }
    const me = G.PLACES2[P.place];
    if (me) {
      let nb = null, nd = null;
      for (const [id, o] of Object.entries(w.owner)) {
        const f = w.F[o], p = G.PLACES2[id]; if (!f || !f.alive || !p) continue;
        const d = Math.hypot(p.x - me.x, p.y - me.y);
        if (f.t === '사' && d <= 60 && (!nb || d < nb[2])) nb = [f, p, d];
        if (f.t === '마' && d <= 100 && (!nd || d < nd[2])) nd = [f, p, d];
      }
      if (nb) { e.dz.bandit += 0.4; e.banditF = nb[0].n; e.local.push(nb[1] === me ? `이 고을은 ${nb[0].n}의 손안에 있다` : `근처 ${nb[1].n}에 ${J(nb[0].n, '이가')} 자리 잡고 있다`); }
      if (nd) { e.dz.demon += 0.3; e.demonF = nd[0].n; e.local.push(`${nd[1].n} 쪽에 ${nd[0].n}의 세력이 뻗어 있다`); }
    }
  }
  if (y >= 1550 && y <= 1600 && ['강남', '복건', '광동', '산동'].includes(P.region)) { e.dz.bandit += 0.3; e.local.push('바닷가에 왜구가 출몰한다'); }
  return e;
}
LIFE.eraOf = eraOf;
// 습격 사건: 산적·마교·난리(10단계 6-1). 무공을 모르는 사람도 겪는다
function* incident(P) {
  const dz = P.era.dz, wb = 0.06 * dz.bandit, wd = 0.04 * dz.demon, ww = 0.04 * dz.war, tot = wb + wd + ww;
  if (P.age < 6 || tot <= 0 || P.R() >= tot) return;
  const r = P.R() * tot, kind = r < wb ? 'bandit' : r < wb + wd ? 'demon' : 'war';
  const young = P.age < 14;
  if (kind === 'bandit') {
    const org = P.era.banditF || '산적';
    const n = makeNpc(P, '산적 두목', [0, 1]); n.org = P.era.banditF;
    const per = perceive(P, n);
    const text = `${atText(P)}에 ${org}의 무리가 들이닥쳤다. 앞장선 것은 ${J(per.txt, '이다')}.`;
    const opts = [['숨는다', '들키면 다친다'], ['재물을 내준다', '목숨은 건진다']];
    if (!young) opts.push(['맞선다', guessOdds(P, n, per)]);
    const ch = yield { ask: '산적의 습격', text, options: opts };
    say(P, text, 'big'); say(P, `▸ ${opts[ch][0]}`, 'pick');
    if (ch === 0) {
      const c = check(P, '순발', 50, P.real / 50);
      if (c.ok) { P.wealth *= 0.8; say(P, '숨어서 화를 피했다. 집은 털렸다.', 'ok'); }
      else { P.wealth *= 0.5; hurtMe(P, 1); if (P.R() < ((P.age < 10 || P.age > 60) ? 0.08 : 0.03)) die(P, `${org}의 칼에 쓰러졌다`, 'combat'); }
    } else if (ch === 1) { P.wealth *= 0.4; say(P, '가진 것을 내주고 목숨을 건졌다.'); }
    else {
      meet(P, n, '원수');
      const f = yield* fight(P, n, { lethal: true });
      if (f.win) { addFame(P, 80); P.align = clamp(P.align + 5, -100, 100); P.merit += 10; say(P, '산적을 물리쳤다. 마을 사람들이 고개를 숙였다.', 'ok'); }
    }
  } else if (kind === 'demon') {
    const org = P.era.demonF || '마교';
    const n = makeNpc(P, '마교도', [0, 1]); n.org = P.era.demonF;
    const per = perceive(P, n);
    const text = `${atText(P)}에 ${org}의 무리가 나타나 사람들을 끌고 간다. ${J(per.txt, '이가')} 앞장섰다.`;
    const opts = [['숨는다', '']];
    if (!young) opts.push(['맞선다', guessOdds(P, n, per)]);
    const myF = P.member && facDef(P.member.fid);
    if (myF && myF.t === '정') opts.push(['사문에 알린다', myF.n]);
    const ch = yield { ask: '마교도', text, options: opts };
    say(P, text, 'big'); say(P, `▸ ${opts[ch][0]}`, 'pick');
    const act = opts[ch][0];
    if (act === '숨는다') {
      if (!check(P, '수읽기', 50).ok) {
        if (P.R() < 0.3) die(P, `${org}에게 끌려가 돌아오지 못했다`, 'combat');
        else { hurtMe(P, 2); say(P, '끌려갔다가 겨우 달아났다.', 'ng'); P.trigger = 1; }
      } else say(P, '숨어서 지켜보았다. 이웃들이 끌려갔다.');
    } else if (act === '맞선다') {
      const f = yield* fight(P, n, { lethal: true });
      if (f.win) { addFame(P, 150); P.align = clamp(P.align + 8, -100, 100); say(P, '마교도를 쳐냈다.', 'ok'); }
    } else { P.merit += 20; addFame(P, 40); say(P, '사문에 알렸다. 사형들이 내려와 마교도를 몰아냈다.', 'ok'); }
  } else {
    const text = `난리가 ${atText(P)}까지 번졌다. ${P.era.why || ''}`;
    const ch = yield { ask: '난리', text, options: [['피란한다', '다른 고을로 떠난다'], ['고향을 지킨다', '몸이 버텨야 한다']] };
    say(P, text, 'big'); say(P, `▸ ${['피란한다', '고향을 지킨다'][ch]}`, 'pick');
    if (ch === 0) { P.wealth *= 0.7; moveTo(P, nearPlace(P, 160)); say(P, `${J(atText(P), '으로')} 피란했다.`); }
    else if (!check(P, '체력', 50).ok) { hurtMe(P, 2); if (P.R() < 0.1) die(P, '난리 통에 목숨을 잃었다', 'combat'); }
    else say(P, '고향을 지켜 냈다.', 'ok');
  }
}

// ---------- 한 해 ----------
function* year(P) {
  P.flags.tierUp = false; P.flags.bigWin = false; P.flags.timeUsed = 0;
  card(P);
  if (P.world) yield* worldYear(P);
  if (!P.alive) return;
  const prevEra = P.era; P.era = eraOf(P);
  if (prevEra && prevEra.label !== P.era.label) say(P, `세상의 기운이 바뀌었다: <b>${P.era.label}</b>.`, 'world');
  mortality(P); if (!P.alive) return;
  yield* threadYear(P); if (!P.alive) return;
  // 생애 사건(해마다 30%)
  if (P.age >= 6 && P.R() < 0.3) { const t = pickTpl(P, '생애'); if (t) yield* runTpl(P, t); if (!P.alive) return; }
  // 진로·초청
  yield* pathEvents(P); if (!P.alive) return;
  yield* incident(P); if (!P.alive) return;
  if (P.age >= 15) { yield* invitations(P); if (!P.alive) return; }
  // 달마다 칸 사건(10단계 3-2)
  const sch = scheduleOf(P);
  if (P.age >= 10) {
    const dz = P.era.dz, mulF = Math.pow(1.15, Math.max(stageOf(P.fame), stageOf(P.infamy))) * Math.pow(1.1, Math.max(0, P.realm - 1)) * (hasTrait(P, '행운아') || hasTrait(P, '불운') ? 1.2 : 1) * (1 + 0.4 * Math.max(dz.bandit, dz.demon, dz.war));
    const months = []; for (const a of sch.list) for (let k = 0; k < 3; k++) months.push(a);
    const n12 = months.length / 12;
    let got = 0;
    for (let mo = 1; mo <= 12 && got < 4; mo++) {
      const act = months[Math.floor((mo - 1) * n12) % months.length];
      const [p, src] = ACT_EV[act] || [0, null];
      if (!src || P.R() >= p / 3 * mulF) continue;
      let s = src;
      if ((src === '유람' || src === '협행') && P.R() < 0.05 * (0.5 + P.apt.기연 / 100)) s = '기연';
      const t = pickTpl(P, s); if (!t) continue;
      got++;
      if (src === '협행') { P.deeds.협행 = (P.deeds.협행 || 0) + 1; }
      yield* runTpl(P, t, mo); if (!P.alive) return;
    }
  }
  // 상태 사건(15%)
  if (P.age >= 15 && P.R() < 0.15) { const t = pickTpl(P, '상태'); if (t) yield* runTpl(P, t); if (!P.alive) return; }
  // 유람은 지명을 옮긴다
  if ((sch.cnt.유람 || 0) >= 2 && P.R() < 0.5) moveTo(P, nearPlace(P, 90));
  // 결산
  trainYear(P, sch.cnt); if (!P.alive) return;
  yield* careerYear(P, sch.cnt);
  if (P.member) { P.merit += 3 + (sch.cnt.의뢰 || 0) * 2; promote(P); artFromMerit(P); }
  // 스승이 있으면 가끔 한 수씩 전수(6단계 4-5)
  if (P.teacher && P.teacher.alive && P.age >= 8 && P.R() < 0.12) { const gi = Math.min(COMMON_GRADE[P.teacher.realm] || 0, (mainArt(P) ? gIdx(mainArt(P).def.g) : 0) + 1); giveArt(P, GRADES[gi], P.teacher, `스승 ${P.teacher.name}에게서 전수받았다`); }
  if (P.flags.tierUp && !P.epithet && stageOf(Math.max(P.fame, P.infamy)) >= 1) makeEpithet(P, 'tier');
  else if (P.flags.tierUp && P.epithet && P.R() < 0.5) makeEpithet(P, 'tier');
  // 숨은 특성: 맥은 5~15세에, 나머지는 성인이 되면
  if (P.age >= 5 && P.age <= 15 && P.R() < 0.12) revealTraits(P, '맥');
  if (P.age === 16) revealTraits(P, '운명'); if (P.age === 18) revealTraits(P, '몸');
  if (P.age === 12) revealTraits(P, '지능');
  recover(P);
  // 명성 감소
  P.fame = Math.max(P.fameMax * 0.3, P.fame * 0.98); P.infamy = Math.max(P.infamyMax * 0.3, P.infamy * 0.99);
  if (P.spouse && P.married && P.year - P.married >= 40) addAch(P, '백년해로');
  if (P.spouse && P.age >= 19 && P.age <= 45 && P.R() < 0.18) { P.kids++; say(P, `자식이 태어났다. (${P.kids}째)`); if (P.kids >= 5) addAch(P, '다복'); }
  if (P.realm >= 4 && P.age >= 40 && P.R() < 0.08 * (1 + stageOf(P.fame) * 0.25)) { P.disciples++; say(P, '눈빛이 맑은 아이 하나를 제자로 받았다.'); addAch(P, '사제의 연'); }
  if (P.real >= 900) addAch(P, '백전노장');
  if (P.flags.bloodYear && P.year > P.flags.bloodYear) { addAch(P, '혈겁의 생존자'); P.flags.bloodYear = null; }
  if (P.teacher && P.realm > (P.teacher.realm || 0) && P.realm >= 3) addAch(P, '청출어람');
  if (P.age >= 100) { addAch(P, P.realm === 0 ? '무공 없이 백 세' : '백세'); }
}

// ---------- 엔딩(9단계) ----------
function ending(P) {
  const f = P.flags.leader && facDef(P.flags.leader);
  const rows = [
    ['神', '우화등선', P.peak >= 7 && P.enl >= 5 && P.age >= 90 && P.causeKind === 'age'],
    ['神', '현경의 경지', P.peak >= 7],
    ['天', '천하제일인', P.flags.tianxiaWin],
    ['天', '마도천하', f && (f.t === '마' || f.t === '사') && P.infamy >= 5e6],
    ['天', '무림지존', f && f.t === '정' && f.prestige >= 3 && P.fame >= 5e6],
    ['天', '화경의 고수', P.peak >= 6],
    ['天', '천하제일상', P.flags.rung_merchant >= 5],
    ['天', '재상', P.flags.rung_scholar >= 6],
    ['地', '일대종사', P.peak >= 4 && P.disciples >= 3],
    ['地', '장문인', f && f.prestige >= 2],
    ['地', '초절정 고수', P.peak >= 5],
    ['地', '명진강호', P.fameMax >= 5e5],
    ['地', '대마두', P.infamyMax >= 5e5],
    ['地', '명검의 주인', P.weapon >= 3],
    ['地', '생업의 정점', Object.entries(P.flags).some(([k, v]) => k.startsWith('rung_') && k !== 'rung_scholar' && v >= careerFrame(careerDef(k.slice(5))).rungs - 1)],
    ['地', '진사', P.flags.rung_scholar >= 5],
    ['玄', '절정 고수', P.peak >= 4],
    ['玄', '장로', P.member && P.member.rank >= Math.ceil(ladderOf(facDef(P.member.fid)).length * 0.6)],
    ['玄', '명동일방', P.fameMax >= 5e4],
    ['玄', '흉명원양', P.infamyMax >= 5e4],
    ['玄', '명인', Object.entries(P.flags).some(([k, v]) => k.startsWith('rung_') && k !== 'rung_scholar' && v >= careerFrame(careerDef(k.slice(5))).rungs - 2)],
    ['玄', '거인', P.flags.rung_scholar >= 4],
    ['玄', '은거기인', P.peak >= 3 && P.fameMax < 1000],
    ['黃', '일류 무사', P.peak >= 3],
    ['黃', '백세 장수', P.age >= 100],
    ['黃', '주화입마', P.causeKind === 'qi'],
    ['黃', '요절', P.age < 20],
    ['黃', '비명횡사', P.causeKind === 'combat'],
    ['黃', '강호의 낭인', P.peak >= 1],
    ['黃', '범부의 일생', true],
  ];
  const r = rows.find(x => x[2]);
  return { grade: r[0], name: r[1] };
}
LIFE.ending = ending;
LIFE.ACHS = ['첫걸음', '벽을 넘다', '늦깎이', '소년고수', '대성', '박학', '신공', '갑자', '둔재의 노력', '약골의 집념', '무공 없이 백 세', '주화입마를 넘다',
  '첫 승', '하극상', '백전노장', '숨은 고수를 만나다', '동귀어진', '용봉지회', '천하제일 비무', '혈겁의 생존자',
  '사부님', '청출어람', '결의형제', '원수를 갚다', '백년해로', '다복', '사제의 연', '배신당하다',
  '별호', '명동천하', '문풍상담', '거부', '장원급제', '가업을 잇다', '기연', '세 번의 기연', '천무지체', '세상이 바뀌다', '정마대전', '유랑'];

// ---------- 일생 ----------
LIFE.run = function* (P) {
  yield* birth(P);
  while (P.alive && P.age < 130) {
    yield* year(P);
    if (!P.alive) break;
    P.age++; P.year++;
    yield { tick: true };
  }
  if (P.flags.bloodYear) addAch(P, '혈겁의 생존자');
  const e = ending(P); P.end = e;
  say(P, `${P.age}세, ${P.cause}.`, 'big');
  return e;
};
LIFE.summary = function (P) {
  const s = [];
  s.push(`${yr(P.start.y)}, ${atText({ place: P.home })}의 ${P.origin.n}에서 태어났다.`);
  const m = mainArt(P);
  if (P.peak > 0) s.push(`최고 경지는 ${REALMS[P.peak]}였다${m ? `. 주무공은 「${m.def.n}」 ${Math.round(s12(m))}성` : ''}.`);
  else s.push('끝내 무공의 문턱을 넘지 못했다.');
  if (P.member) s.push(`${facDef(P.member.fid).n}의 ${rankName(P)}${P.flags.leader ? '로서 한 세력을 이끌었다' : '였다'}.`);
  if (P.career) s.push(`${careerDef(P.career).n} 일로 ${careerDef(P.career).lad[P.rung]}에 이르렀다.`);
  if (P.epithet) s.push(`강호는 그를 「${P.epithet}」이라 불렀다.`);
  for (const e of P.events.slice(0, 6)) s.push(e + '.');
  if (P.spouse) s.push(`${J(P.spouse.name, '과와')} 혼인해 ${P.kids ? '자식 ' + P.kids + '명을 두었다' : '자식 없이 살았다'}.`);
  s.push(`${P.age}세에 ${P.cause}.`);
  return s.join(' ');
};

// ---------- 내보내기 ----------
LIFE.REALMS = REALMS; LIFE.GRADES = GRADES; LIFE.ENL = ENL; LIFE.STAGES = STAGES; LIFE.BRANCH = BRANCH;
LIFE.s12 = s12; LIFE.sungCap = sungCap; LIFE.mainArt = mainArt; LIFE.heartArt = heartArt; LIFE.baseOf = baseOf; LIFE.branchBase = branchBase; LIFE.statCap = statCap;
LIFE.effQi = effQi; LIFE.careerDef = careerDef; LIFE.facDef = facDef; LIFE.atText = atText; LIFE.stageOf = stageOf; LIFE.perceive = perceive;
LIFE.init = function () {
  if (LIFE.ready) return;
  LIFE.MINOR_IDS = new Set((G.TRAITS_MINOR || []).map(t => t.id));
  LIFE.BIG = new Set(G.BIG_CITIES || []);
  LIFE.ARTS_BY_F = {}; LIFE.ARTS_BY_G = [[], [], [], [], [], []];
  for (const a of G.ARTS) { (LIFE.ARTS_BY_F[a.f] = LIFE.ARTS_BY_F[a.f] || []).push(a); const gi = GRADES.indexOf(a.g); if (gi >= 0) LIFE.ARTS_BY_G[gi].push(a); }
  LIFE.FREE_HEART = (LIFE.ARTS_BY_F.free || []).filter(a => a.role === '심법' && a.g === '삼류');
  if (!LIFE.FREE_HEART.length) LIFE.FREE_HEART = LIFE.ARTS_BY_G[0].filter(a => a.role === '심법');
  LIFE.FOUNDERS = { shaolin: '발타', wudang: '장삼봉', huashan: '청허자', gaibang: '연무백', qingcheng: '송학도인', zhongnan: '운허진인', emei: '정연 사태', diancang: '단목휘', kunlun: '백운자', kongtong: '철벽진인', bailian: '모자원', quanzhen: '왕중양' };
  LIFE.ready = true;
};
G.LIFE = LIFE;
})(typeof window !== 'undefined' ? window : globalThis);
