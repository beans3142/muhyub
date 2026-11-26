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
  w = String(w); const base = w.replace(/\s*\([^)]*\)$/, '').replace(/[」』"]$/, '').replace(/<[^>]+>/g, ''); const c = base.charCodeAt(base.length - 1), has = c >= 0xAC00 && c <= 0xD7A3 && (c - 0xAC00) % 28 !== 0;
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
const BREAK_DC = [0, 30, 45, 62, 82, 92, 100, 110];
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

// 한 해 방침(10단계 3-1, 9-20): 4칸 기준 할 일, 보이는 조건, 설명
const sectKind = P => P.member && ['정식', '직계', '방계'].includes(P.member.kind) && ['sect', 'clan'].includes(facDef(P.member.fid).lad);
const ladOf = P => P.member && facDef(P.member.fid) ? (P.member.fid === 'escortunion' ? 'escort' : facDef(P.member.fid).lad) : null;
const SHOP_CAREERS = ['merchant', 'cook', 'smith', 'doctor'];
// 방침(9-20, 9-41): 일곱 가지로 줄였다. 칸은 처지에 따라 정해진다
const PLAN_DEF = [
  ['수련', P => ['수련', '수련', '운기', '운기'], P => P.arts.length, '초식과 운기에 매달린다'],
  ['폐관', P => ['폐관', '폐관', '폐관', '폐관'], P => P.arts.length, '문을 닫는다. 사건이 오지 않고 성취·내공 ×1.6'],
  ['소속의 일', P => { const l = ladOf(P); return l === 'escort' ? ['의뢰', '의뢰', '의뢰', '수련'] : l === 'bandit' ? ['의뢰', '의뢰', '수련', '운기'] : P.career === 'military' && !P.member ? ['생업', '생업', '생업', '수련'] : ['사문', '사문', '수련', '운기']; }, P => P.member || P.career === 'military', '소속에서 맡은 일을 한다. 공적이 쌓인다'],
  ['생업', P => P.career === 'scholar' ? ['글공부', '글공부', '글공부', '생업'] : P.arts.length ? ['수련', '운기', '생업', '생업'] : ['생업', '생업', '생업', '생업'], P => true, '먹고살 일을 한다. 무공이 있으면 틈틈이 닦는다'],
  ['강호 유람', P => P.arts.length ? ['유람', '탐색', '수련', '운기'] : ['유람', '유람', '생업', '가족'], P => true, '떠돌며 견문을 넓히고 기연과 일거리를 찾는다'],
  ['협행·의뢰', P => P.align >= 0 ? ['협행', '협행', '의뢰', '수련'] : ['의뢰', '의뢰', '수련', '운기'], P => P.arts.length, '칼로 남의 일을 해결한다'],
  ['사람과 함께', P => ['가족', '벗', relPeople(P, ['정인', '마음에 둔 사람']).length || !P.spouse ? '연애' : '가족', relPeople(P, ['스승']).length ? '스승' : relPeople(P, ['제자']).length ? '제자' : '생업'], P => true, '식구·벗·스승·제자와 시간을 보낸다'],
  ['세력 운영', P => ['세력', '세력', '수련', '운기'], P => P.force, '내 세력을 돌본다'],
];
// 예전 방침 이름은 새 이름으로 옮긴다
const PLAN_ALIAS = { '무공 전념': '수련', '무학 정진': '수련', '내공 증진': '수련', '기연 찾기': '강호 유람', '배울 곳 찾기': '강호 유람', '사문 수련': '소속의 일', '사문의 일': '소속의 일', '표행': '소속의 일', '약탈': '소속의 일', '근무': '소속의 일', '무공과 생업': '생업', '생업 전념': '생업', '가게 늘리기': '생업', '글공부': '생업', '협행': '협행·의뢰', '의뢰': '협행·의뢰', '가족과 함께': '사람과 함께', '인연 쌓기': '사람과 함께', '사제와 함께': '사람과 함께' };
const PLANS = Object.fromEntries(PLAN_DEF.map(d => [d[0], d[1]]));
LIFE.plansFor = P => P.age < 15 ? [] : PLAN_DEF.filter(d => d[2](P)).map(d => ({ n: d[0], desc: d[3] }));
function planSlots(P) { const k = PLAN_ALIAS[P.plan] || P.plan; return (PLANS[k] || PLANS.수련)(P); }
function fixPlan(P) {
  if (P.flags.roamUntil && P.year >= P.flags.roamUntil && P.flags.roamBack) { P.plan = P.flags.roamBack; P.flags.roamBack = null; if (P.member) { say(P, `강호행을 마치고 ${facDef(P.member.fid).n}로 돌아왔다.`, 'path'); const at = facDef(P.member.fid).at; if (at && G.PLACES2[at]) moveTo(P, at); P.merit += 10; } }
  // 스승을 넘어서는 것은 사건이 아니라 상태다. 넘어서면 더 높은 고수의 스카우트가 기회에 섞인다(9-23)
  for (const b of P.bonds) if (b.alive && b.rels.includes('스승') && !b.passed && P.realm > b.realm && P.realm >= 2) { b.passed = true; addAch(P, '청출어람'); }
  if (P.age < 15) return; if (PLAN_ALIAS[P.plan]) P.plan = PLAN_ALIAS[P.plan]; const l = LIFE.plansFor(P); if (!l.some(d => d.n === P.plan)) P.plan = P.arts.length ? '수련' : P.career ? '생업' : '강호 유람'; }
LIFE.PLANS = PLAN_DEF.map(d => d[0]);
// 할 일별 사건 확률(6단계 2-2, 한 칸 한 해)과 사건 틀 갈래
const ACT_EV = { 탐색: [0.5, '유람'], 사문: [0.35, '의뢰'], 제자: [0.25, '제자'], 놀이: [0.4, '놀이'], 세력: [0.3, '세력'], 수련: [0, null], 운기: [0, null], 폐관: [0, null], 생업: [0.05, '생업'], 가족: [0.05, '가족'], 벗: [0.2, '벗'], 스승: [0.1, '스승'], 유람: [0.35, '유람'], 협행: [0.5, '협행'], 의뢰: [0.6, '의뢰'], 연애: [0.3, '연애'], 글공부: [0, null], 쉼: [0.05, '쉼'], 숨기: [0.05, '숨기'] };
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
    plan: '무학 정진', rep: {}, regions: new Set(), kills: 0, fights: 0, wins: 0, upsets: 0, kiyon: 0, deeds: {}, peak: 0, events: [], firsts: {},
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
  for (const c of fxAll(P, 'check')) for (const [k, v] of Object.entries(c)) if (typeof v === 'number' && (k === stat || (label && k.split(/[·:, ]/).some(w => w.length >= 2 && label.includes(w))))) mod += v;
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
function plainSur(P) {
  let sur, guard = 0;
  do { sur = P.R() < 0.12 ? pk(P, G.SURNAME_RARE) : pk(P, G.SURNAME_REGION[P.region] && P.R() < 0.5 ? G.SURNAME_REGION[P.region] : G.SURNAME_COMMON); } while (LIFE.CLAN_SUR.has(sur) && guard++ < 20);
  return sur;
}
function npcName(P, sex) {
  const NS = G.NAME_STYLE, sur = plainSur(P);
  const st = NS.martial[sex === 'f' ? 'f' : 'm'];
  return sur + (P.R() < 0.4 ? pk(P, st[0]) : pk(P, st[1]) + pk(P, st[2]));
}
// 역할의 경지 폭 [최소, 최대](0 범인 … 7 현경). 맞는 것이 없으면 null(내 경지 기준만)
const ROLE_BANDS = [
  // p1 6장 위상: 일류 = 대문파 당주·장로, 절정 = 장문인·원로, 화경 = 구파 장문인·가주·호법, 현경 = 한 세대 몇 명
  [/맹주|교주/, [5, 6]],
  [/장문인|가주|호법/, [4, 6]],
  [/장로|원로|당주|맹의/, [3, 5]],
  [/마두/, [3, 6]],
  [/이름난 고수|은거기인|숨은 고수|죽어가는 고수|천하의|선대|절대고수/, [3, 6]],
  [/두목|채주|표두|관주|추격대장|추살대|우두머리|조장/, [2, 4]],
  [/영물|무덤지기/, [2, 5]],
  [/아이|동네|골목|마을|부모|형제|자식|배우자|노파|처녀|총각|중매|이웃|피란|거지|노름|소매치기|참외|서당|약재|부호|고리|의원|사냥꾼|사공|고물|이야기꾼|책방|바둑|탁발|선비|숙수|상인|거상|왈패|취한|졸개|포쾌|패잔병|관군|징집|굶주린|지현|태감|탐관/, [0, 2]],
  [/산적|수적|마적|녹림|흑도|표사|무사|무인|낭인|쟁탈자|도굴꾼|습격자|복면|살수|자객|경쟁|사형|사매|연적|젊은|도전자|흉적|마교도|혈교/, [1, 3]],
];
function roleBand(role) { for (const [re, b] of ROLE_BANDS) if (re.test(role || '')) return b; return null; }
function makeNpc(P, role, d, opts = {}) {
  const lo = d ? d[0] : 0, hi = d ? d[1] : 0;
  // 무공 없는 사람이 만나는 상대는 대개 범인·삼류다. 이류 이상은 드물다
  const base = P.realm;
  // 역할마다 경지의 끝이 있다: 졸개·왈패·마을 사람은 이류까지, 두목·관주·표두는 일류까지
  // 역할마다 경지 폭이 있다(9-21). 상대는 내 경지를 따라가되 그 폭을 벗어나지 않는다
  const band = opts.band || roleBand(role) || [0, 7];
  let realm = clamp(base + lo + Math.floor(P.R() * (hi - lo + 1)), band[0], band[1]);
  if (P.realm === 0 && realm >= 2 && !opts.keep && !opts.band && P.R() < 0.8) realm = Math.max(band[0], 1);
  // 우두머리·고수 역할이 아니면 위로 한 단계 치우친 상대는 절반만 남긴다
  if (realm > P.realm && !opts.band && !/두목|채주|고수|관주|우두머리|후보|마두/.test(role) && P.R() < 0.5) realm = Math.max(band[0], realm - 1);
  // 역할 이름이 성별을 말하면 그대로 따른다(아가씨·사매는 여, 총각·사형은 남). 말하지 않을 때만 굴린다
  const sex = opts.sex || (/처녀|여|노파|기녀|부인|어미|딸|아가씨|사매|사저|낭자|소저|규수|비구니|사태|과부|할미|누이/.test(role) ? 'f' : /총각|공자|사형|청년|사내|노인|노승|스님|도사|할아범|젊은이/.test(role) ? 'm' : P.R() < 0.15 ? 'f' : 'm');
  const n = { name: opts.name || npcName(P, sex), role, sex, realm, stage: Math.floor(P.R() * 3), g: COMMON_GRADE[realm] - (P.R() < 0.3 ? 1 : 0) + (P.R() < 0.1 ? 1 : 0), sung: 6 + Math.floor(P.R() * 6), qiK: 0.8 + P.R() * 0.7, real: 100 + Math.floor(P.R() * 600), t: ROLE_T(role), bond: 0, rels: [], met: P.year, alive: true };
  n.g = clamp(n.g, 0, 5);
  // 이름값: 경지가 높을수록 이름이 알려지고 별호가 붙는다(10단계 9-9)
  n.fame = realm >= 2 ? Math.round(Math.pow(10, 2 + realm * 0.8) * (0.3 + P.R())) : 0;
  if (realm >= 3 && P.R() < 0.4 + realm * 0.08 && G.EPITHET) { const E = G.EPITHET, ks = Object.keys(E.kind); n.epithet = pk(P, ['철혈', '청풍', '무영', '추혼', '광', '귀', '일섬', '쌍', '흑', '백', '혈', '비']) + pk(P, E.kind[pk(P, ks)]); }
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
  // 이름난 상대는 별호로 알아본다(명성 50만 이상이거나 알아본 경우, 또는 내가 경지까지 읽을 때)
  const famous = n.epithet && (n.intel || n.fame >= 500000 || diff >= 1 || n.legend);
  const who = famous ? `「${n.epithet}」 ${n.name}, ${orgName}${n.role}` : `${orgName}${n.role}`;
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
  // 특성(9-26): inner는 무위 배율, outer는 상황 배율(평균으로 절반만), resolve는 생사결에서 기세, check의 싸움·비무
  const outer = fxAll(P, 'outer').flat().reduce((x, o) => x * (1 + ((o && o.mul) || 1) - 1) ** 0.5, 1);
  const rsv = opts.lethal ? fxAll(P, 'resolve').reduce((x, v) => x + (typeof v === 'number' ? v : 0), 0) : 0;
  const ck = fxAll(P, 'check').reduce((x, c) => x + (c.싸움 || 0) + (opts.spar ? c.비무 || 0 : 0), 0);
  const a = wuwei(P) * mulOf(P, 'inner') * outer * (1 + rsv / 200) * (1 + ck / 100), b = npcWuwei(n), hi = Math.max(P.realm, n.realm);
  let p = winP(P, a, b, m, tilt, hi);
  if (opts.pMul) p = clamp(p * opts.pMul, 0, 1);
  const u = P.R();
  let stage = u < 0.3 * p ? '대승' : u < 0.85 * p ? '승' : u < p ? '신승' : u < p + 0.7 * (1 - p) ? '패' : '대패';
  if (stage === '대패' && P.real > 500 && P.R() < Math.min(0.25, (P.real - 500) / 2000)) stage = '패';
  // 승패를 한 줄로 남긴다(9-57): 결과 카드가 이 줄을 보여 준다
  say(P, `${J(n.name, '과와')} ${opts.spar ? '겨뤄' : '싸워'} ${{ 대승: '크게 이겼다', 승: '이겼다', 신승: '간신히 이겼다', 패: '졌다', 대패: '크게 졌다' }[stage]}.`, stage === '패' || stage === '대패' ? 'ng' : 'ok');
  if (!opts.spar && (n.fid || n.org)) repAdd(P, n.fid || facIdByName(P, n.org), -8);
  P.fights++; P.real = Math.min(1000, P.real + (opts.spar ? 10 : 60 + Math.floor(P.R() * 60)) * mulOf(P, 'real'));
  const win = stage === '대승' || stage === '승' || stage === '신승';
  if (win) { P.wins++; if (n.realm > P.realm) { P.upsets++; addAch(P, '하극상'); } if (!opts.spar) addAch(P, '첫 승'); if (res === '동귀어진') addAch(P, '동귀어진'); if (n.realm > n.shown) addAch(P, '숨은 고수를 만나다'); }
  if (!opts.spar) {
    if (stage === '신승' && P.R() < 0.5) hurtMe(P, 1);
    if (stage === '승' && P.R() < 0.3) hurtMe(P, 1);
    if (res === '동귀어진' && win) { hurtMe(P, 2); if (P.R() < 0.3) die(P, '상대와 함께 쓰러졌다', 'combat'); }
    // 지면 달아날 틈을 본다(1단계 6-4 도주). 경지가 낮을수록 어렵다
    const fled = !win && P.realm >= n.realm - 1 && check(P, '순발', 55, P.real / 50 + (P.realm - n.realm) * 15).ok;
    if (fled) say(P, '틈을 보아 몸을 뺐다.', 'muted');
    const ally = !win && !fled && opts.lethal && relPeople(P, ['의형제', '벗']).find(b => (b.rels.includes('의형제') || b.bond >= 50) && P.R() < 0.25);
    if (ally) { say(P, `쓰러지려는 찰나 ${J(ally.name, '이가')} 달려와 막아섰다.`, 'big'); ally.bond += 10; addAch(P, '생사지교'); }
    const lk = fled || ally ? 0 : opts.lethal ? 0.4 : 0.06;
    if (stage === '패') { hurtMe(P, opts.lethal ? 2 : 1); if (P.R() < lk * 0.2 * (res === '신중' ? 0.5 : res === '사생결단' ? 1.5 : res === '동귀어진' ? 4.5 : 1)) die(P, `${n.name}의 손에 쓰러졌다`, 'combat'); }
    if (stage === '대패') { hurtMe(P, opts.lethal ? 3 : 2); if (P.R() < lk * 0.6 * (res === '신중' ? 0.5 : 1.5)) die(P, `${n.name}의 손에 쓰러졌다`, 'combat'); }
    if (win && opts.lethal) P.trigger = Math.max(P.trigger, 1);
    // 후천 특성의 계수기(9-22)
    const c = P.cnt || (P.cnt = {});
    if (opts.lethal && P.alive) c.생사결 = (c.생사결 || 0) + 1;
    if (opts.lethal && win && (stage === '대승' || P.R() < 0.4)) { P.kills = (P.kills || 0) + 1; c.lastKill = P.year; if ((n.t !== '마' && n.t !== '사') || (P.member && (facDef(P.member.fid).rules || []).includes('살생 금지'))) ruleBreak(P, '살생', `${J(n.name, '을를')} 베었다`); }
    if (stage === '대패') { c.대패 = P.year; c.대패들 = (c.대패들 || []).filter(y => y > P.year - 5).concat(P.year); if (opts.lethal && !check(P, '정신력', 55).ok) c.겁 = P.year; }
    if (opts.lethal && win) c.생사승 = (c.생사승 || 0) + 1;
    // 전리품(9-38): 생사결이나 사파·마도 상대로 이기면 지닌 것을 거둔다
    if (win && P.alive && (opts.lethal || n.t === '사' || n.t === '마') && !n.legend) loot(P, n, opts.lethal ? 1 : 0.5);
    if (win && P.alive && !opts.spar) afterBeatBacked(P, n);
  }
  return { stage, win, outcome: stage === '대승' ? '대성공' : win ? '성공' : stage === '대패' ? '대실패' : '실패', per, res };
}
function hurtMe(P, lv) { if (P.flags.armor && lv > 1 && P.R() < 0.4) lv--; if (lv >= 2) { const c = P.cnt || (P.cnt = {}); c.중상 = (c.중상 || 0) + 1; if (lv >= 3) { c.위중 = P.year; c.위중n = (c.위중n || 0) + 1; c.사경 = 1; } } if (lv > P.hurt) { P.hurt = lv; say(P, ['', '가볍게 다쳤다.', '크게 다쳤다. 내상이 깊다.', '사경을 헤맬 만큼 다쳤다.'][lv], 'ng'); } }
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
    if (key === 'infamy') ruleBreak(P, '명예', '악명이 가문의 이름을 더럽혔다');
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
// 특성의 bond: rate는 호감이 쌓이는 속도, start는 처음 만날 때 호감(9-26)
function bondRate(P) { return fxAll(P, 'bond').reduce((x, b) => x * (b.rate || 1), 1); }
function meet(P, n, rel) {
  if (n.since == null) n.since = P.year;
  if (n.id == null) { n.id = (P.nidSeq = (P.nidSeq || 0) + 1); n.bond = (n.bond || 0) + fxAll(P, 'bond').reduce((x, b) => x + (b.start || 0), 0); }
  if (n.age == null) fleshOut(P, n);
  n.log = n.log || [];
  if (!P.bonds.includes(n)) P.bonds.push(n);
  if (rel && !n.rels.includes(rel)) n.rels.push(rel);
  if (n.fid == null && n.org) n.fid = facIdByName(P, n.org);
  return n;
}
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
  if (m.kind === '속가') return 1; if (m.kind === '객경') return 2;
  if (G.ART_ACCESS[name]) return gIdx(G.ART_ACCESS[name]);
  if (m.disc && G.ART_ACCESS[m.disc]) return gIdx(G.ART_ACCESS[m.disc]);
  return clamp(Math.floor(m.rank / (lad.length - 1) * 5.4), 0, 5);
}
function rankName(P) { const m = P.member; if (!m) return null; const f = facDef(m.fid); const lad = ladderOf(f); if (m.kind === '속가') return '속가제자'; if (m.kind === '객경') return '객경'; const r = m.disc && f.lad === 'sect' && m.rank < 4 ? m.disc : lad[m.rank]; return f.lad === 'clan' && m.rank === 0 ? (m.kind === '직계' ? '직계' : '방계') : r; }
LIFE.rankName = rankName;
function join(P, fid, how, rank = 0, disc, kind) {
  const f = facDef(fid); if (!f) return;
  if (P.member) { const old = facDef(P.member.fid), nf = facDef(fid); if (old && nf && old.t !== nf.t && [old.t, nf.t].includes('정')) P.flags.turncoat = P.year; say(P, `${J(old.n, '을를')} 떠났다.`); }
  P.member = { fid, rank, disc: disc || (f.lad === 'sect' ? (rank >= 3 ? '진산제자' : rank >= 2 ? '내문제자' : '입문제자') : null), since: P.year, kind: kind || (f.lad === 'sect' ? '정식' : f.lad === 'clan' ? '방계' : '고용') };
  if (f.at && G.PLACES2[f.at]) moveTo(P, f.at);
  say(P, `${how || ''}<b>${f.n}</b>의 ${J(rankName(P), '이가')} 되었다.`, 'big');
  P.events.push(`${P.age}세에 ${f.n}에 들었다`);
  const rn = G.RENAME_ON_JOIN && G.RENAME_ON_JOIN[fid];
  if (rn && P.sex === 'm' && P.age < 30 && rn === 'monk' && fid === 'shaolin') { const nm = pk(P, G.NAME_STYLE.monk.dharma) + pk(P, G.NAME_STYLE.monk.second); say(P, `법명 「${nm}」을 받았다.`); P.dharma = nm; }
  repAdd(P, fid, 30);
  if (!relPeople(P, ['스승']).length && ['sect', 'clan', 'demon', 'beggar'].includes(f.lad)) {
    const t = makeNpc(P, f.lad === 'clan' ? '가문의 어른' : f.lad === 'beggar' ? '장로 거지' : '사부', [1, 2]); t.org = f.n; t.fid = fid; t.age = 40 + Math.floor(P.R() * 25);
    if (f.rel === '불') t.name = pk(P, G.NAME_STYLE.monk.dharma) + pk(P, G.NAME_STYLE.monk.second) + ' 대사';
    meet(P, t, '스승'); relHook(P, t, '스승'); t.bond = 12; say(P, `사부 ${J(t.name, '이가')} 정해졌다.`, 'bond');
  }
  // 입문하면 그 자리의 무공 하나(심법 먼저)
  const a = factionArt(P, fid, accessGrade(P)); if (a) learn(P, a, '전수받았다');
  if (P.plan !== '무학 정진' && P.age < 40) P.plan = '무학 정진';
}
function factionAlive(P, fid) { if (!P.world) { const f = facDef(fid); return !f.from || f.from[0] <= P.year; } const f = P.world.F[fid]; return f && f.alive; }

// ---------- 장소 ----------
function moveTo(P, id) {
  if (!G.PLACES2[id]) return;
  if (P.place !== id) { P.movedY = P.year; P.place = id; P.region = regionOf(id); P.regions.add(P.region); if (P.regions.size >= 5) addAch(P, '유랑'); }
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
  // 해금은 고르는 것이 아니라 그쪽으로 기울이는 것이다(사용자 요청 2026-11-25): 고른 시대에 태어날 확률 60%
  const wantCh = o.chapter && P.R() < 0.6;
  const starts = (G.STARTS || [{ y: 1450, title: '1450년' }]).filter(s => s.y >= (o.minYear ?? 900) && (!wantCh || (s.y >= o.chapter[0] && s.y <= o.chapter[1])));
  const sp = pk(P, starts.length ? starts : G.STARTS);
  P.year = sp.y; P.start = sp;
  // 세계: 정본 seed로 시작 연도까지, 그 뒤는 이 생의 seed
  if (G.WORLDSIM && !o.noWorld) {
    const WS = G.WORLDSIM;
    // 지난 생들이 세운 세력은 그 연도에 서는 세력으로 들어간다(10단계 9-8)
    const extra = (o.legends || []).filter(l => l.force && G.PLACES2[l.force.at]).map((l, i) => ({ id: 'legend' + i, n: l.force.n, t: l.force.kind === '산채' ? '사' : l.force.kind === '상단' ? '중' : '정', cat: '신생', rel: '없음', lad: l.force.kind === '산채' ? 'bandit' : 'sect', at: l.force.at, from: [l.force.y, l.force.y], fall: 20, prestige: l.force.men >= 300 ? 2 : 1, size: Math.max(60, l.force.men), founder: l.name }));
    const w = WS.create({ seed: (G.CANON || {}).seed || 20261124, canon: true, founders: LIFE.FOUNDERS, named: G.NAMED, extra });
    WS.runTo(w, P.year - 1);
    w.opts = { seed: P.seed, canon: false, founders: LIFE.FOUNDERS, named: G.NAMED }; w.R = rng(P.seed ^ 0x5bd1e995);
    P.world = w; P.wev = w.ev.length;
  }
  P.sex = o.sex ? (P.R() < 0.75 ? o.sex : o.sex === 'm' ? 'f' : 'm') : (P.R() < 0.5 ? 'm' : 'f');
  // 출신: 가중치 × 지역 인구, 그해 없는 세력의 출신은 뺀다
  let cand = G.ORIGINS.filter(x => (!x.join || x.join.every(f => factionAlive(P, f))) && (!x.f || factionAlive(P, x.f)));
  if (o.region && P.R() < 0.6) { const c2 = cand.filter(x => x.region === o.region); if (c2.length) cand = c2; }
  // 출신의 결(9-44): 해금으로 고른 쪽 출신이 나올 확률을 높인다
  const LEAN = { 흑도: x => (x.join || []).some(f => facDef(f) && ['bandit', 'info', 'assassin', 'demon', 'shadow'].includes(facDef(f).lad)) || (x.tag || []).some(t => ['산적', '수적', '마적', '흑도', '하오', '도둑', '살수'].includes(t)), 세가: x => (x.join || []).some(f => facDef(f) && facDef(f).lad === 'clan'), 상인: x => x.career === 'merchant' || (x.wealth || 0) >= 3, 고아: x => /고아|거지|떠돌이/.test(x.n) || (x.tag || []).some(t => ['고아', '거지', '떠돌이'].includes(t)), 관부: x => (x.tag || []).includes('관') || x.career === 'military' || x.career === 'scholar' };
  if (o.lean && LEAN[o.lean] && P.R() < 0.6) { const c2 = cand.filter(LEAN[o.lean]); if (c2.length) cand = c2; }
  if (o.noble && P.R() < 0.6) { const c2 = cand.filter(x => x.join && x.join.some(f => facDef(f) && facDef(f).prestige >= 2)); if (c2.length) cand = c2; }
  else if (o.martial && P.R() < 0.6) { const c2 = cand.filter(x => x.martial); if (c2.length) cand = c2; }
  const chosen = o.originId && P.R() < 0.4 && cand.find(x => x.id === o.originId);
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
  const sur = f0 && f0.sur ? f0.sur : plainSur(P);
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
  for (const [k, v] of Object.entries(o.aptBonus || {})) if (k in P.apt) P.apt[k] = Math.min(100, P.apt[k] + v);
  // 고른 자질은 한 번 더 굴려 높은 쪽을 쓴다
  if (o.aptFavor === 'lowest') o.aptFavor = ['근골', '오성', '심성', '기연', '풍모'].sort((a, b) => P.apt[a] - P.apt[b])[0];
  if (o.aptFavor && o.aptFavor in P.apt) { const again = (d6(P) + d6(P) + d6(P)) * 5; if (again > P.apt[o.aptFavor]) P.apt[o.aptFavor] = Math.round(again); }
  for (const id of (o.buyTraits || []).filter(() => P.R() < 0.35)) { const t = (G.TRAITS || []).find(x => x.id === id); if (t && !P.traits.some(x => x.n === t.n)) { P.traits.push(t); P.boughtTraits = (P.boughtTraits || []).concat(t.n); } }
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
  P.era = eraOf(P); P.startEra = P.era;
  say(P, `때는 <b>${P.era.chapter}</b>, ${J(P.era.label, '이다')}.${P.era.why ? ' ' + P.era.why : ''}`, 'world');
  for (const l of P.era.local) say(P, `${l}.`, 'world');
  // 태생 소속
  if (og.join && og.join.length) {
    const fid = og.join[0], f = facDef(fid);
    if (f) { P.member = { fid, rank: og.rank || 0, disc: f.lad === 'sect' ? ['입문제자', '평제자', '내문제자', '진산제자', '직전제자'][og.rank || 0] : null, since: P.year, born: true, kind: f.lad === 'clan' ? ((og.rank || 0) >= 1 || /직계|가주|본가/.test(og.n) ? '직계' : '방계') : /속가/.test(og.n) ? '속가' : f.lad === 'sect' ? '정식' : '고용' }; if (P.member.kind === '직계' && P.member.rank < 1) P.member.rank = 1; }
  }
  if (og.career) P.flags.homeCareer = og.career;
  if (o.wealthMul) P.wealth *= o.wealthMul;
  if (o.longLife) { const t = G.TRAITS.find(x => x.n === "장수 집안"); if (t && !P.traits.some(x => x.n === t.n)) P.traits.push(t); }
  if (o.masterLuck) P.flags.masterLuck = 1;
  if (o.startArt && P.R() < 0.5) { const def = G.ARTS.find(a => a.n === o.startArt) || o.startArtDef; if (def) P.flags.memoryArt = def; }
  P.plan = P.member ? '무학 정진' : '가족과 함께';
}

// ---------- 사건 해석기 (7단계 문법) ----------
function tplOk(P, t) {
  const n = t.need || {};
  if (n.age && (P.age < n.age[0] || P.age > n.age[1])) return false;
  if (n.realm && (P.realm < n.realm[0] || P.realm > n.realm[1])) return false;
  if (n.fame != null && stageOf(P.fame) < n.fame) return false;
  if (n.infamy != null && stageOf(P.infamy) < n.infamy) return false;
  if (n.career && (Array.isArray(n.career) ? !n.career.includes(P.career) : P.career !== n.career)) return false;
  if (t.src === '약탈' && !(P.member && facDef(P.member.fid).lad === 'bandit')) return false;
  if (t.src === '세력' && !P.force) return false;
  if (n.tag && !(P.origin.tag || []).some(x => (Array.isArray(n.tag) ? n.tag : [n.tag]).includes(x))) return false;
  if (n.align != null && (n.align > 0 ? P.align < n.align : P.align > n.align)) return false;
  if (n.rel && !P.bonds.some(b => b.alive && b.rels.includes(n.rel))) return false;
  if (n.tierUp && !P.flags.tierUp) return false;
  if (n.rung != null && (P.rung || 0) < n.rung) return false;
  if (n.range != null && rangeLevel(P) < n.range) return false;
  if (n.rankMin != null && (!P.member || P.member.rank < n.rankMin)) return false;
  if (n.bigWin && !P.flags.bigWin) return false;
  if (n.member && !P.member) return false;
  if (n.fid && !(P.member && [].concat(n.fid).includes(P.member.fid))) return false;
  if (n.fcat && !(P.member && [].concat(n.fcat).includes(facDef(P.member.fid).cat))) return false;
  if (n.lad && ladOf(P) !== n.lad) return false;
  if (n.nomember && P.member) return false;
  if (n.noarts && P.arts.length) return false;
  const used = P.used[t.id] || 0;
  if (t.max != null && used >= t.max) return false;
  if (n.max != null && used >= n.max) return false;
  if (P.usedYear[t.id] && P.year - P.usedYear[t.id] < GRADE_GAP[gradeOf(t)]) return false;
  return true;
}
// 사건 등급(9-19): 다시 나오기까지의 간격(년)과 가중치
const GRADE_GAP = { 일상: 3, 흔함: 5, 드묾: 10, 희귀: 30, 전설: 999 };
const GRADE_W = { 일상: 1, 흔함: 1, 드묾: 0.6, 희귀: 0.35, 전설: 0.15 };
const TPL_GRADE = {
  st_betrayal: '드묾', st_revenge: '드묾', st_pursuit: '드묾', st_deviation: '드묾', fr_oath: '드묾', ms_jealous: '드묾', st_challenger: '드묾',
  hd_exposed: '드묾', w_demon_chase: '드묾', w_league: '드묾', bg_annihilate: '드묾', bg_bloodfeast: '드묾', qy_misread: '드묾', qy_hermit: '드묾',
  bg_manual: '희귀', bg_weapon: '희귀', qy_cliff: '희귀', qy_cave_art: '희귀', qy_beast_core: '희귀', qy_spring: '희귀', qy_herb: '희귀', qy_dying_master: '희귀',
  bg_tomb: '전설',
};
function gradeOf(t) { return t.grade || TPL_GRADE[t.id] || (t.src === '놀이' ? '일상' : '흔함'); }
LIFE.gradeOf = gradeOf;
function tplWeight(P, t) {
  let w = t.w || 10;
  const tg = t.tag || [];
  if ((P.origin.tag || []).some(x => tg.includes(x) || (t.need && t.need.tag && [].concat(t.need.tag).includes(x)))) w *= 2;
  for (const ev of fxAll(P, 'event')) if ([].concat(ev).some(x => t.n.includes(x))) w *= 3;
  if (t.src === '상태') w *= Math.pow(1.25, Math.max(stageOf(P.fame), stageOf(P.infamy)));
  if (P.realm < 2 && t.who && /두목|채주|이름난 고수|우두머리|마두/.test(t.who.r)) w *= 0.35;
  // 경지에 맞는 사건(9-21): 상대 역할의 경지 폭보다 한참 위면 거의 안 나오고, 한참 아래면 줄어든다
  const band = t.who && roleBand(t.who.r);
  if (band && /싸움/.test(JSON.stringify(t.ch || ''))) { if (P.realm > band[1] + 1) w *= 0.08; else if (P.realm > band[1]) w *= 0.4; else if (P.realm < band[0] - 1) w *= 0.3; }
  w *= GRADE_W[gradeOf(t)];
  if (P.era) { const key = t.n + ' ' + ((t.who && t.who.r) || ''); if (RE_BANDIT.test(key)) w *= 1 + 1.5 * P.era.dz.bandit; if (RE_DEMON.test(key)) w *= 1 + 1.5 * P.era.dz.demon; }
  const p = G.PLACES2[P.place];
  if (p && t.at) { const nat = (G.SEATS[p.t] || []).concat(LIFE.BIG.has(P.place) ? G.SEATS.대도시 : []); if (nat.includes(t.at)) w *= 1.5; else if (!G.SEATS.어디서나.includes(t.at)) w *= 0.3; }
  return w;
}
// 드묾 이상은 뽑혀도 한 번 더 굴려 통과해야 일어난다(9-19)
const GRADE_PASS = { 일상: 1, 흔함: 1, 드묾: 0.4, 희귀: 0.35, 전설: 0.25 };
function pickTpl(P, src) { const l = LIFE.TPL.filter(t => t.src === src && tplOk(P, t)); if (!l.length) return null; const t = wpick(P, l, t => tplWeight(P, t)); return t.need && (t.need.tierUp || t.need.bigWin) || P.R() < GRADE_PASS[gradeOf(t)] ? t : null; }

const PAIRS = { 이: '이가', 가: '이가', 은: '은는', 는: '은는', 을: '을를', 를: '을를', 과: '과와', 와: '과와' };
function fill(s, who, at) { return s.replace(/\{who\}(이|가|은|는|을|를|과|와)(?![가-힣])/g, (_, p) => J(who, PAIRS[p])).replace(/\{who\}/g, who).replace(/\{at\}/g, at); }
// 장면(9-30): 계절·날씨·지형·시대를 한 구절 덧붙여 같은 사건도 매번 다르게 읽히게 한다
const SEASON = m => m <= 2 || m === 12 ? '겨울' : m <= 5 ? '봄' : m <= 8 ? '여름' : '가을';
const SCENE = {
  봄: ['살구꽃이 지는 무렵', '봄비가 그친 아침', '보리가 패기 시작할 때', '황사가 하늘을 덮은 날', '얼음이 풀린 개울 소리가 들리는 날', '복숭아꽃이 흐드러진 날', '아지랑이 피는 한낮'],
  여름: ['장맛비가 사흘째 내리는 날', '매미 소리가 귀를 때리는 한낮', '천둥이 먼 산을 울리는 저녁', '모기가 들끓는 밤', '물이 불어 강이 누렇게 흐를 때', '땡볕에 길바닥이 갈라진 날', '반딧불이 날리는 밤'],
  가을: ['단풍이 산허리를 물들인 날', '추수가 끝난 들판에 바람이 부는 날', '기러기가 남쪽으로 가는 저녁', '서리가 처음 내린 새벽', '보름달이 유난히 밝은 밤', '낙엽이 길을 덮은 오후', '안개가 짙은 새벽'],
  겨울: ['눈이 발목까지 쌓인 날', '삭풍이 문풍지를 울리는 밤', '강이 꽁꽁 언 아침', '세밑 장이 선 날', '함박눈이 소리 없이 내리는 밤', '처마에 고드름이 달린 날', '입김이 하얗게 서리는 새벽'],
};
const PLACE_SCENE = { 산: ['솔바람이 분다.', '산새도 울지 않는다.', '골짜기에 물소리가 울린다.'], 물: ['물비린내가 난다.', '사공들의 노랫소리가 들린다.'], 성: ['저잣거리가 시끌벅적하다.', '관아의 북소리가 들린다.', '주루마다 등불이 걸렸다.'], 진: ['장꾼들이 오간다.', '개 짖는 소리만 들린다.'], 새외: ['모래바람이 분다.', '말 울음소리가 멀리서 들린다.'] };
function sceneOf(P, month, atKey) {
  if (P.R() > 0.55) return '';
  const p = G.PLACES2[P.place];
  let s = pk(P, SCENE[SEASON(month || P.month || 1)]) + '. ';
  const ps = p && (PLACE_SCENE[p.t] || (p.t === '섬' ? PLACE_SCENE.물 : p.t === '관문' || p.t === '특수' ? PLACE_SCENE.산 : null));
  if (ps && P.R() < 0.4) s += pk(P, ps) + ' ';
  const dz = P.era && P.era.dz;
  if (dz && P.R() < 0.2) s += dz.war >= 0.5 ? '전란 소식이 끊이지 않는다. ' : dz.bandit >= 0.5 ? '길마다 도적 이야기뿐이다. ' : dz.demon >= 0.5 ? '마교가 움직인다는 말이 돈다. ' : '';
  return s;
}
const OUTCOME = {
  대성공: ['뜻밖에 크게 풀렸다.', '생각보다 훨씬 잘되었다.', '하늘이 도왔다.', '일이 술술 풀렸다. 이런 날도 있다.'],
  성공: ['잘 풀렸다.', '해냈다.', '그럭저럭 잘 넘어갔다.', '마음먹은 대로 되었다.', '한숨 돌렸다.'],
  실패: ['뜻대로 되지 않았다.', '일이 꼬였다.', '헛물만 켰다.', '생각처럼 되지 않았다.', '손에 쥔 것 없이 돌아섰다.'],
  대실패: ['일이 크게 틀어졌다.', '최악으로 흘러갔다.', '하는 일마다 어긋났다.', '돌이킬 수 없이 틀어졌다.'],
};
function* runTpl(P, t, month, extra = {}) {
  P.used[t.id] = (P.used[t.id] || 0) + 1; P.usedYear[t.id] = P.year;
  if (t.id === 'lf_parent_death' && P.flags.parentDeathAge == null) P.flags.parentDeathAge = P.age;
  let npc = null, per = null;
  if (t.who) {
    const known = t.who.k !== 'new' && (t.who.k === 'known' || P.R() < 0.6) ? findKnown(P, b => (!t.who.rel || b.rels.includes(t.who.rel)) && b.role === t.who.r) : null;
    npc = known || (t.who.k === 'known' ? null : makeNpc(P, t.who.r, t.who.d));
    // 숙적의 그림자(9-28): 소속이 있으면 싸움 상대가 숙적·적대 세력 사람일 때가 있다
    if (npc && !known && P.member && !npc.org && t.ch.some(c => c.c === '싸움') && P.R() < 0.25) { const rv = rivalOf(P); if (rv) { npc.org = rv.n; npc.fid = rv.id; npc.rivalSect = true; } }
    if (!npc && t.who.k === 'known') return;
    if (t.who.rel && !npc.rels.includes(t.who.rel)) { const k = findKnown(P, b => b.rels.includes(t.who.rel)); if (k) npc = k; }
    per = perceive(P, npc);
  }
  const whoTxt = npc ? (t.ch.some(c => c.c === '싸움') ? per.txt : (npc.known ? `${npc.name}(${npc.role})` : `${npc.role} ${npc.name}`)) : '';
  if (npc) npc.known = true;
  const at = atText(P, t.at);
  const text = sceneOf(P, month, t.at) + fill(t.s, whoTxt, at);
  const opts = t.ch.map(c => [c.t, c.c === '싸움' ? (per ? guessOdds(P, npc, per) : '') : (c.t.includes('냥') ? '' : '')]);
  let i = 0;
  if (t.ch.length > 1) i = yield { ask: t.n, text, month, options: opts, npc: npc && { name: npc.name, role: npc.role, per: per && per.txt }, who: npc };
  const c = t.ch[i];
  say(P, `${text}`, t.src === '큰' || t.src === '기연' ? 'big' : '', month);
  if (t.ch.length > 1) say(P, `▸ ${c.t}`, 'pick', month);
  let stage = '성공';
  if (c.c === '싸움') {
    if (!npc) { npc = makeNpc(P, '상대', [0, 1]); per = perceive(P, npc); }
    meet(P, npc);
    if (/떼|무리|졸개들|관군|두목|채주|우두머리/.test(t.s + ' ' + npc.role) && !npc.men && P.R() < 0.7) { npc.men = 5 + Math.floor(P.R() * (10 + npc.realm * 15)); if (!npc.org && RE_BANDIT.test(npc.role) && P.era && P.era.banditF) npc.org = P.era.banditF; }
    const r = yield* fightAsk(P, npc, t.n, { lethal: (c.bad || []).concat(c.fum || []).some(e => /death|중상/.test(e)) || /생사|습격|암살|복수|흉적/.test(t.n), spar: /비무|대회|도장/.test(t.n) });
    if (r.retreat) return;
    stage = r.outcome;
    if (npc && npc.rivalSect) { if (r.win) { P.merit += 8; say(P, `${npc.org} 사람을 꺾어 사문의 체면을 세웠다.`, 'ok'); } else P.merit = Math.max(0, P.merit - 5); }
    if (r.stage) say(P, `${r.win ? '이겼다' : '졌다'}${r.stage === '대승' ? ' — 압승이었다' : r.stage === '신승' ? ' — 간신히' : r.stage === '대패' ? ' — 처참하게' : ''}. ${npc.realm !== npc.shown && per.level !== 'exact' && per.level !== 'realm' ? `상대는 ${REALMS[npc.realm]}의 고수였다.` : ''}`, r.win ? 'ok' : 'ng', month);
  } else if (c.c && c.c !== '없음') {
    const r = check(P, c.c, c.dc || 50, 0, `${t.src} ${t.n} ${c.t}`);
    stage = r.stage;
    say(P, pk(P, OUTCOME[stage]), r.ok ? 'ok' : 'ng', month);
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
  if (npc && P.bonds.includes(npc)) { npc.log.push(`${P.age}세 · ${t.n}`); npc.met = P.year; know(P, npc); }
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
    else if ((m = e.match(/^bond([+-])(\d+)$/))) { if (npc) { meet(P, npc); npc.bond += m[1] === '-' ? -m[2] : Math.round(+m[2] * bondRate(P)); } }
    else if ((m = e.match(/^rel:(-?)(.+)$/))) { if (npc) { meet(P, npc); if (m[1]) npc.rels = npc.rels.filter(r => r !== m[2]); else if (!npc.rels.includes(m[2])) { npc.rels.push(m[2]); relHook(P, npc, m[2]); } } }
    else if ((m = e.match(/^hurt:(.+)$/))) hurtMe(P, { 경상: 1, 중상: 2, 위중: 3 }[m[1]] || 1);
    else if ((m = e.match(/^death:(\d+)$/))) { if (P.R() * 100 < +m[1] * 0.5) die(P, t ? `${t.n}에서 목숨을 잃었다` : '목숨을 잃었다', 'combat'); }
    else if ((m = e.match(/^poison:(.+)$/))) { if (!hasTrait(P, '만독불침지체')) { P.poison = 1; P.cnt = P.cnt || {}; P.cnt.중독 = (P.cnt.중독 || 0) + 1; say(P, '독이 몸에 스몄다.', 'ng'); } }
    else if ((m = e.match(/^grow:(.+)$/))) grow(P, m[1], 0.06);
    else if ((m = e.match(/^time-(\d+)$/))) P.flags.timeUsed = (P.flags.timeUsed || 0) + +m[1];
    else if (e === 'enlight') { P.trigger = Math.max(P.trigger, 1); }
    else if ((m = e.match(/^art:(.+)$/))) giveArt(P, m[1], npc, '전수받았다');
    else if ((m = e.match(/^manual:(.+)$/))) { if (check(P, '학식', 50 + gIdx(m[1] === '완본' ? '절세' : m[1]) * 8).ok) giveArt(P, m[1] === '완본' ? '절세' : m[1], null, '비급으로 익히기 시작했다'); else say(P, '비급을 얻었지만 끝내 해독하지 못했다.', 'ng'); }
    else if ((m = e.match(/^pill:(.+)$/))) givePill(P, m[1]);
    else if ((m = e.match(/^qi\+(\d+)$/))) { P.pqi += +m[1]; say(P, `약기 ${m[1]}년이 몸에 들었다.`); }
    else if ((m = e.match(/^weapon:(.+)$/))) { const lv = { 명병: 1, 보검: 2, 신병이기: 3 }[m[1]] || 1; if (lv > P.weapon) { P.weapon = lv; say(P, `${J(m[1], '을를')} 손에 넣었다.`, 'big'); } }
    else if ((m = e.match(/^trait:(-?)(.+)$/))) { const tr = [...G.TRAITS, ...G.TRAITS_MINOR, ...(G.TRAITS_ACQ || []), ...(G.TRAITS_EVENT || []), ...(G.TRAITS_LIFE || [])].find(x => x.n === m[2]); if (m[1]) P.traits = P.traits.filter(x => x.n !== m[2]); else if (tr && !hasTrait(P, tr.n)) { P.traits.push(tr); say(P, `특성 「${tr.n}」${J(tr.n, '이가').slice(-1)} 붙었다.`, 'big'); } }
    else if ((m = e.match(/^skill\+(\d+)$/))) { if (P.career) P.skill[P.career] = Math.min(1000, (P.skill[P.career] || 0) + +m[1]); }
    else if (e === 'rung+1') { if (P.career) yield* careerPromote(P, true); }
    else if (e === 'rank+1') { if (P.member) promote(P, 'merit'); }
    else if (e === 'realm+1') { P.trigger = 2; }
    else if ((m = e.match(/^thread:(.+)$/))) { if (G.EVENT_THREADS[m[1]] && !P.threads.some(x => x.k === m[1])) { P.threads.push({ k: m[1], step: 0, npc }); say(P, `— 「${m[1]}」의 실마리가 생겼다.`, 'thread'); } }
    else if ((m = e.match(/^count:(.+)$/))) { P.deeds[m[1]] = (P.deeds[m[1]] || 0) + 1; if (m[1] === '파문 위기') ruleBreak(P, '문규'); if (m[1] === '술') ruleBreak(P, '음주'); }
    else if ((m = e.match(/^rep([+-])(\d+)$/))) { const v = (m[1] === '-' ? -1 : 1) * +m[2]; const fid = (npc && (npc.fid || facIdByName(P, npc.org))) || (P.member && P.member.fid); repAdd(P, fid, v); if (P.member && fid === P.member.fid) P.merit += v / 2; }
    else if ((m = e.match(/^epithet:(.+)$/))) makeEpithet(P, m[1]);
    else if ((m = e.match(/^men([+-])(\d+)$/))) { if (m[1] === '+') gainMen(P, +m[2], '사람들 가운데'); else loseMen(P, +m[2]); }
    else if (e === 'biz+1') { P.biz = (P.biz || 0) + 1; say(P, '가진 것이 하나 늘었다.', 'ok'); }
    else if ((m = e.match(/^merit([+-])(\d+)$/))) P.merit += (m[1] === '-' ? -1 : 1) * +m[2];
    else if ((m = e.match(/^rumor:(.+)$/))) { const ks = Object.keys(G.RUMORS); const kind = m[1] === 'any' ? wpick(P, ks, k => GRADE_W[G.RUMORS[k].grade || '흔함']) : m[1]; if (G.RUMORS[kind] && !(P.rumorSeen[kind] > P.year - RUMOR_GAP[G.RUMORS[kind].grade || '흔함'])) { const R0 = G.RUMORS[kind]; P.rumorSeen[kind] = P.year; const cand = placesInRange(P, R0.where); const pl = cand.length ? pk(P, cand)[0] : P.place; const mo = Math.min(12, (P.month || 1) + 1 + Math.floor(P.R() * 3)); P.rumorQueue.push({ kind, place: pl, month: mo, until: P.year * 12 + mo + RUMOR_LIFE[R0.grade || '흔함'] }); } }
    else if (e === 'heal') { P.hurt = 0; P.poison = 0; }
    else if (e === 'move') moveTo(P, nearPlace(P, RANGE_DIST[rangeLevel(P)] > 200 ? 160 : RANGE_DIST[rangeLevel(P)]));
  }
}
function relHook(P, npc, rel) {
  if (rel === '스승') { addAch(P, '사부님'); P.teacher = npc; }
  if (rel === '의형제') addAch(P, '결의형제');
  if (rel === '배우자') { P.spouse = npc; P.married = P.year; ruleBreak(P, '혼인'); }
  if (rel === '제자') { P.disciples++; addAch(P, '사제의 연'); if (P.member && npc.org !== facDef(P.member.fid).n && P.R() < 0.35) ruleBreak(P, '전수', '사문 밖 사람에게 사문의 무공을 가르쳤다'); }
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
function givePill(P, g) { P.cnt = P.cnt || {}; P.cnt.영약 = (P.cnt.영약 || 0) + 1;
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
  // 가업 거들기
  if (P.age === 10 && P.flags.homeCareer && !P.career) { P.skill[P.flags.homeCareer] = 30; say(P, `부모의 ${careerDef(P.flags.homeCareer).n} 일을 거들기 시작했다.`); return; }
  if (P.age === 10 && P.flags.memoryArt && !P.flags.memoryUsed) { P.flags.memoryUsed = 1; say(P, '꿈에서 본 초식이 손에 익는다. 전생의 기억인가.', 'big'); learn(P, P.flags.memoryArt, '꿈결에 떠올려 익히기 시작했다'); if (!heartArt(P)) learn(P, pk(P, LIFE.FREE_HEART), '함께 떠올렸다'); }
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
    if (act === 'stay') { P.plan = '무학 정진'; }
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
      if (l.length) join(P, pk(P, l).id, '머리를 깎고 ', 0, '입문제자'); else { say(P, '가까운 절에 들었다. 이름 없는 산사였다.'); P.flags.temple = true; learn(P, pk(P, LIFE.FREE_HEART), '산사에서 배웠다'); P.plan = '무학 정진'; }
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
    const ch = yield { ask: '떠돌이 무사', text: `${atText(P, '객잔')}에서 ${perceive(P, n).txt}가 밥값 대신 무공을 가르쳐 주겠다고 한다.`, options: [['배운다', '몇 해 뒤를 따른다'], ['사양한다', '']], who: n };
    if (ch === 0) { meet(P, n, '스승'); relHook(P, n, '스승'); giveArt(P, '삼류', n, `${n.name}에게서 배웠다`); if (!heartArt(P)) learn(P, pk(P, LIFE.FREE_HEART), `${n.name}에게서 배웠다`); }
    return;
  }
  // 하산: 문파 수련을 마친 청년
  if (P.member && P.member.rank <= 3 && P.age >= 20 && P.age <= 40 && facDef(P.member.fid).lad === 'sect' && P.realm >= 2 && !P.flags.downAsked && P.R() < 0.08) {
    P.flags.downAsked = 1;
    const ch = yield { ask: '하산', text: `사문이 하산을 허락했다. 산에 남겠는가?`, options: [['산에 남는다', '사문의 일을 맡는다'], ['하산해 강호로', '속가 제자로 떠돈다']] };
    if (ch === 1) { P.member.disc = '속가제자'; P.flags.ronin = true; P.plan = '강호 유람'; say(P, '하산했다.', 'big'); moveTo(P, nearPlace(P, 80)); }
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
  if (fs >= 2 && !P.member && P.realm >= 3 && P.R() < 0.06) {
    const l = G.FACTIONS.filter(f => factionAlive(P, f.id) && (f.cat === '연합' || f.cat === '세가') && f.t === (P.align < -20 ? '사' : '정'));
    if (l.length) { const f = pk(P, l); const ch = yield { ask: '객경 초빙', text: `${f.n}에서 객경으로 모시겠다는 서신이 왔다.`, options: [['받아들인다', ''], ['사양한다', '']] }; if (ch === 0) join(P, f.id, '객경으로 ', Math.min(3, ladderOf(f).length - 2)); }
    return;
  }
  if (stageOf(P.infamy) >= 2 && P.R() < stageOf(P.infamy) * 0.05) {
    const n = makeNpc(P, '추살대 우두머리', [0, 1]);
    say(P, `목에 현상금이 걸렸다. ${perceive(P, n).txt}가 이끄는 추살대가 따라붙었다.`, 'big');
    const ch = yield { ask: '추살대', text: `${perceive(P, n).txt}가 이끄는 추살대가 따라붙었다. ${guessOdds(P, n, perceive(P, n))}.`, options: [['맞선다', ''], ['달아난다', '순발과 실전']], who: n };
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
  if (P.age < 15) n = P.age < 6 ? 2 : 3;
  return Math.max(2, n);
}
LIFE.slotsOf = slotsOf;
function scheduleOf(P) {
  let plan = planSlots(P);
  if (P.age < 15) plan = P.age < 6 ? ['가족', '가족'] : P.member ? ['수련', '운기', '놀이'] : P.flags.dojoMember ? ['수련', '놀이', '가족'] : ['놀이', '놀이', '가족'];
  const n = slotsOf(P), out = plan.slice(0, Math.min(n, plan.length));
  while (out.length < n) out.push(plan[0]);
  const cnt = {}; for (const a of out) cnt[a] = (cnt[a] || 0) + 1;
  if (!P.arts.length) { cnt.생업 = (cnt.생업 || 0) + (cnt.수련 || 0) + (cnt.운기 || 0) + (cnt.폐관 || 0); delete cnt.수련; delete cnt.운기; delete cnt.폐관; if (P.age < 15) { cnt.놀이 = (cnt.놀이 || 0) + (cnt.생업 || 0); delete cnt.생업; } }
  if (!P.force) delete cnt.세력;
  return { cnt, list: out };
}
function trainYear(P, cnt) {
  // 폐관: 수련과 운기를 함께 하고 ×1.6(9-20)
  const closed = cnt.폐관 ? 1.6 : 1;
  const tr = cnt.폐관 ? slotEff(cnt.폐관) * 0.85 : slotEff((cnt.수련 || 0) + (cnt.사문 || 0) * 0.5);
  const breath = cnt.폐관 ? slotEff(cnt.폐관) * 0.85 : slotEff((cnt.운기 || 0) + (cnt.수련 || 0) * 0.5);
  const sectFid = P.plan === '소속의 일' && P.member && ['sect', 'clan'].includes(ladOf(P)) ? P.member.fid : null;
  const tmul = mulOf(P, 'train'), emul = mulOf(P, 'enlight');
  // 대기만성: 첫해 ×0.1에서 해마다 ×1.1, 최대 ×2.5
  const curve = fxAll(P, 'curve')[0]; const cm = curve ? Math.min(curve.max, curve.start * Math.pow(curve.mul, Math.max(0, P.age - 6))) : 1;
  const und = clamp(0.5 + baseOf(P, '이해') / 200, 0.5, 2);
  // 무공 성취
  const m = trainTarget(P, '공격') || mainArt(P), h = trainTarget(P, '심법') || heartArt(P);
  const focus = [m, h, trainTarget(P, '경신'), trainTarget(P, '방어')].filter(Boolean);
  for (const a of P.arts) {
    const share = (a === m ? 1 : a === h ? 0.8 : focus.includes(a) ? 0.45 : 0.12) * (sectFid && a.def.f === sectFid ? 1.3 : 1);
    const cap = sungCap(P, a) / 12 * artMax(a.def);
    const before = s12(a);
    if (a.sung < cap) a.sung = Math.min(cap, a.sung + artMax(a.def) / 12 * 3.0 * share * (a.def.role === '심법' ? breath : tr) * und * tmul * cm * closed * GRADE_DIFF[gIdx(a.def.g)]);
    else if (focus.includes(a) && a.capNoted == null && a.sung < artMax(a.def)) { a.capNoted = P.realm; say(P, `「${a.def.n}」${J(a.def.n, '이가').slice(-1)} ${s12(a).toFixed(0)}성에서 막혔다. 경지가 받쳐 주지 않는다.`, 'muted'); }
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
  // 노화(1단계 2-2): 55세부터 해마다 2%. 내공이 깊으면 늦게 시작하고 느리게 빠진다
  const ageStart = 55 + Math.min(20, effQi(P) / 6) + fxAll(P, 'aging').reduce((a, v) => a + v, 0);
  if (P.age >= ageStart && !P.flags.rejuv) for (const s of ['근력', '순발', '지속', '체력']) P.st[s] *= 1 - 0.02 / (1 + effQi(P) / 60);
  // 내공(1단계 4장): 운기 칸이 있을 때만
  if (h && (cnt.운기 || cnt.폐관 || cnt.수련)) {
    const rate = NGB[gIdx(h.def.g)] * (h.def.ng ? h.def.ng / NGB[gIdx(h.def.g)] : 1) * mulOf(P, 'ng') * (1 + 0.15 * P.realm) * breath * closed * (h.def.yy === '마' || h.def.f === 'demon' ? 1.5 : 1);
    P.capa = Math.max(P.capa, CAPA[P.realm] * mulOf(P, 'capa'));
    P.qi = Math.min(P.capa, P.qi + rate * (P.flags.jadeSeat ? 2 : 1));
    const target = h.def.pur || (/마|혈/.test(h.def.yy || '') ? 70 : 95);
    P.pur += (target - P.pur) * 0.1;
    const fl = fxAll(P, 'flow'), flCap = 100 + fl.reduce((x, f) => x + (f.cap || 0), 0), flMul = fl.reduce((x, f) => x * ((f.grow && f.grow.mul) || 1), 1);
    if (!P.flags.flowStart) { P.flags.flowStart = 1; P.flow += fl.reduce((x, f) => x + (f.start || 0), 0); }
    P.flow = Math.min(flCap, P.flow + (flCap - P.flow) * 0.035 * breath * flMul * (1 + gIdx(h.def.g) * 0.15) + 0.3);
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
    const p = (trig ? 0.055 : 0.004) * (0.5 + P.apt.오성 / 90) * emul * Math.pow(0.62, P.enl) * (1 + 0.02 * P.realm) * (cnt.폐관 ? 1.5 : 1);
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
        P.realm++; if (P.age >= 40 && P.realm >= 3) P.flags.lateBloom = 1; P.stage = r.crit ? 1 : 0; P.capa = Math.max(P.capa, CAPA[P.realm] * mulOf(P, 'capa'));
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
        realmTraits(P);
        if (P.realm === 3) revealTraits(P, '재능');
      } else if (r.fum || P.R() < 0.03 * (mulOf(P, 'deviate') - 1)) {
        say(P, '돌파하다 기혈이 뒤집혔다. <b>주화입마</b>다!', 'ng');
        const r2 = check(P, '정신력', (60 + P.realm * 5) * Math.sqrt(mulOf(P, 'deviate')));
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
  // 돈은 economyYear(9-37)가 센다. 상인은 재산이 장사 밑천이라 오르내린다
  if (c.id === 'merchant' && cnt.생업) P.wealth *= 1 + (-0.2 + P.R() * 0.6 * (0.8 + P.rung * 0.1));
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
// 사다리별 [최소 나이, 필요 경지](0 범인 … 7 현경). p1 6장 위상: 일류 = 대문파 당주·장로, 절정 = 장문인·원로
const LADDER_RULE = {
  sect: [[0, 0], [12, 1], [15, 1], [18, 2], [24, 2], [28, 3], [32, 3], [36, 3], [45, 3], [55, 4], [65, 4], [45, 4]],
  clan: [[0, 0], [0, 0], [16, 1], [22, 2], [28, 3], [35, 3], [50, 4], [25, 3], [45, 4]],
  league: [[0, 0], [18, 1], [24, 2], [28, 3], [33, 3], [38, 3], [40, 4], [45, 4], [50, 5]],
  demon: [[0, 0], [16, 1], [20, 2], [24, 2], [28, 3], [32, 3], [36, 3], [40, 4], [48, 4], [50, 5], [50, 5]],
  bandit: [[0, 0], [16, 0], [20, 1], [24, 1], [28, 2], [32, 2], [36, 3], [45, 4]],
  beggar: [[0, 0], [12, 0], [16, 1], [20, 1], [26, 2], [35, 3], [45, 3], [50, 4]],
  info: [[0, 0], [15, 0], [20, 1], [25, 1], [30, 2], [38, 2], [45, 3], [50, 3]],
  assassin: [[0, 0], [17, 1], [21, 2], [26, 2], [32, 3], [38, 3], [45, 4]],
  shadow: [[0, 0], [17, 1], [22, 1], [28, 2], [36, 3], [42, 3], [48, 4]],
  guard: [[0, 0], [18, 0], [23, 1], [28, 1], [33, 2], [40, 2], [48, 3]],
  escort: [[0, 0], [17, 1], [22, 1], [27, 2], [33, 2], [40, 3], [46, 3]],
};
function promote(P, force) {
  const m = P.member; if (!m || (!force && P.age < 16) || m.kind === '속가' || m.kind === '객경') return;
  const f = facDef(m.fid), lad = ladderOf(f), next = m.rank + 1;
  if (next >= lad.length) return;
  if (m.kind === '방계' && f.lad === 'clan' && next >= lad.length - 1) return;
  const top = next === lad.length - 1;
  // 자리마다 최소 나이·경지·그 자리에 머문 햇수가 있다(9-32). 스무 살 장로·채주는 없다
  const rule = (LADDER_RULE[f.lad] || [])[next] || [Math.round(16 + next * 3), Math.min(6, Math.floor(1 + 4 * next / (lad.length - 1)))];
  const [minAge, needRealm] = rule, stay = 2 + Math.floor(next / 2);
  // 'merit'(사건의 공): 판정과 재임 햇수는 건너뛰되 나이(3년 여유)·경지 조건은 지킨다
  if (force === 'merit') { if (P.age < minAge - 3 || P.realm < Math.max(0, needRealm - ((f.prestige || 0) <= 1 ? 1 : 0)) || top) { P.merit += 15; say(P, '공을 세웠지만 아직 그 자리에 오를 나이·경지가 아니다. 공적으로 쌓였다.', 'muted'); return; } }
  else if (!force) {
    if (P.age < minAge) return;
    if (P.realm < Math.max(0, needRealm - ((f.prestige || 0) <= 1 ? 1 : 0))) return;
    if (P.year - (m.rankY || m.since || P.year) < stay) return;
    if (top && P.R() > 0.04) return;
    const dc = next * 15 / (lad.length / 8) + f.prestige * 10;
    if (force !== 'merit' && !check(P, null, dc, P.merit / 2 + Math.min(20, stageOf(P.fame) * 5)).ok) return;
  }
  m.rank = next; m.rankY = P.year; if (f.lad === 'sect' && next >= 4) m.disc = null;
  else if (f.lad === 'sect') m.disc = ['입문제자', '평제자', '내문제자', '진산제자'][next] || m.disc;
  say(P, `${f.n}에서 <b>${rankName(P)}</b>에 올랐다.`, 'big');
  P.events.push(`${P.age}세에 ${f.n}의 ${J(rankName(P), '이가')} 되었다`);
  if (top) { addFame(P, (f.size || 100) * 200); P.flags.leader = f.id; addAch(P, '수장의 자리'); }
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
  for (let i = 0; i < 3 && P.alive; i++) { const n = makeNpc(P, pk(P, ['마교 무사', '적의 고수', '적의 무사']), [-1, 0]); const r = yield* fight(P, n, { lethal: i === 2 }); if (r.win) w++; else if (P.hurt >= 2) { say(P, '크게 다쳐 싸움터에서 물러났다.', 'ng', P.month); break; } }
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
// 경지 특성(2단계 3-14): 화경·현경에 오르면 몸이 바뀐다
const REALM_TRAITS = { 6: ['임독양맥 타통', '삼화취정', '환골탈태', '한서불침'], 7: ['생사현관 타통', '천인합일', '두 번째 환골탈태', '반로환동', '반박귀진'] };
function realmTraits(P) {
  for (const n of REALM_TRAITS[P.realm] || []) {
    const t = (G.TRAITS_REALM || []).find(x => x.n === n); if (!t || P.traits.some(x => x.n === n)) continue;
    P.traits.push(t);
    for (const [k, v] of Object.entries((t.fx || {}).stat || {})) if (k in P.apt) P.apt[k] += v;
    if (n === '반로환동') { P.flags.rejuv = true; for (const k of ['근력', '순발', '지속', '체력']) P.st[k] = Math.max(P.st[k], statCap(P, k) * 0.9); }
    if (/환골탈태/.test(n) && P.hurt) P.hurt = 0;
    say(P, { 환골탈태: '뼈와 살이 새로 맞춰졌다. 묵은 탁기가 땀으로 빠져나갔다 — <b>환골탈태</b>.', 반로환동: '흰머리가 검어지고 주름이 펴졌다 — <b>반로환동</b>.', '임독양맥 타통': '임맥과 독맥이 뚫려 기운이 막힘없이 돈다.', '생사현관 타통': '생사현관이 열렸다.', 천인합일: '하늘과 땅의 기운이 내 숨과 하나가 되었다.' }[n] || `<b>${n}</b>`, 'big');
    P.events.push(`${P.age}세에 ${n}`);
  }
  // 오기조원은 화경 완숙에서
  if (P.realm >= 6 && P.stage >= 1) { const t = (G.TRAITS_REALM || []).find(x => x.n === '오기조원'); if (t && !P.traits.some(x => x.n === t.n)) { P.traits.push(t); say(P, '다섯 장기의 기운이 근원으로 모였다 — <b>오기조원</b>.', 'big'); } }
}
LIFE.realmTraits = realmTraits;
// 죽음(9-36): 옛 시대라 범인은 병과 사고로 일찍 죽는다. 경지가 오를수록 잔병이 사라지고 상처도 덜 치명적이다.
// 늙음은 경지·근골·내공·특성으로 늦춰지고 상한이 없다(현경 고수는 이백 년도 산다). 반로환동이면 늙음이 멎는다
const SICK = [1, 0.85, 0.65, 0.45, 0.25, 0.15, 0.08, 0.03];
const WOUND = [1.3, 1.1, 1, 0.8, 0.6, 0.4, 0.25, 0.1];
const ILLS = ['학질', '이질', '폐병', '열병', '돌림병', '종기', '고뿔이 도진 것', '배앓이'];
function mortality(P) {
  if (P.age < 6) { const q = P.wealth < 10 ? 0.03 : P.wealth < 100 ? 0.022 : 0.012; if (P.R() < q * (hasTrait(P, '병약') ? 2 : 1)) die(P, pk(P, ['홍역', '열병', '설사병', '겨울 추위', '마마']) + '으로 세상을 떠났다', 'child'); return; }
  if (P.deathWin && P.age >= P.deathWin[0] && P.age <= P.deathWin[1] && P.realm < 4 && P.R() < 0.04) { die(P, '타고난 절맥이 터져 세상을 떠났다', 'vein'); return; }
  const sick = SICK[P.realm] * (hasTrait(P, '병약') ? 2 : 1), poor = P.wealth < 10 ? 1.4 : P.wealth >= 1000 ? 0.6 : 1;
  // 한 해 앓는 병: 보이게 적고, 그해 죽을 확률을 올린다
  let q = 0.006 * sick * poor;
  if (P.age >= 10 && P.R() < 0.07 * sick * poor) { const ill = pk(P, ILLS); P.illYear = ill; say(P, `${J(ill, '을를')} 앓아 한 철을 누워 지냈다.`, 'ng'); q += 0.05 * poor * (P.age >= 50 ? 1.5 : 1); P.flags.illSurvive = 1; }
  const life = fxAll(P, 'life').concat(fxAll(P, 'aging')).reduce((a, v) => a + (typeof v === 'number' ? v : 0), 0);
  const eff = P.age - P.realm * 8 - (P.apt.근골 - 50) / 8 - life - effQi(P) / 6 - (P.wealth >= 1000 ? 3 : 0);
  if (!P.flags.rejuv) q += 0.0006 * Math.exp(0.095 * (eff - 20));
  if (P.hurt === 3) q += 0.12 * WOUND[P.realm]; else if (P.hurt === 2) q += 0.02 * WOUND[P.realm];
  if (P.poison) q += 0.03 * WOUND[P.realm];
  if (P.R() < q) {
    if (P.illYear && P.R() < 0.6) { die(P, `${P.illYear}으로 세상을 떠났다`, 'sick'); return; }
    die(P, P.hurt >= 2 && P.age < 60 ? '상처가 덧나 세상을 떠났다' : P.realm >= 6 ? '좌화했다 — 앉은 채로 숨을 거두었다' : P.age > 60 ? pk(P, ['노환으로 세상을 떠났다', '중풍으로 세상을 떠났다', '잠든 채 깨어나지 않았다']) : pk(P, ['갑작스러운 병으로 세상을 떠났다', '해수병으로 세상을 떠났다', '사고로 세상을 떠났다']), P.hurt >= 2 ? 'combat' : P.age > 60 ? 'age' : 'sick');
  }
  if (P.flags.illSurvive && P.alive) { P.flags.illSurvive = 0; if (P.age >= 15) addAch(P, '역병을 이겨 내다'); }
  P.illYear = null;
}
function recover(P) {
  if (P.hurt && (P.R() < 0.4 || check(P, '회복', (P.age < 15 ? 20 : 35) + P.hurt * 5).ok)) P.hurt--;
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
        if (f.t === '사' && (f.def.lad === 'bandit' || f.cat === '흑도' || f.cat === '신생' || f.cat === '군소') && f.def.cat !== '세가' && d <= 60 && (!nb || d < nb[2])) nb = [f, p, d];
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
    const org = P.era.banditF || (G.PLACES2[P.place] ? G.PLACES2[P.place].n.slice(0, 2) + '채' : '산적');
    const boss = P.R() < 0.3, n = makeNpc(P, boss ? '산적 두목' : '산적', boss ? [0, 1] : [-1, 0]); n.org = org; n.men = boss ? 10 + Math.floor(P.R() * 25) : 3 + Math.floor(P.R() * 8);
    const per = perceive(P, n);
    const text = `${atText(P)}에 ${org}의 무리가 들이닥쳤다. 앞장선 것은 ${J(per.txt, '이다')}.`;
    const opts = [['숨는다', '들키면 다친다'], ['재물을 내준다', '목숨은 건진다']];
    if (!young) opts.push(['맞선다', guessOdds(P, n, per)]);
    const ch = yield { ask: '산적의 습격', text, options: opts, who: n };
    say(P, text, 'big'); say(P, `▸ ${opts[ch][0]}`, 'pick');
    if (ch === 0) {
      const c = check(P, '순발', 50, P.real / 50);
      if (c.ok) { P.wealth *= 0.8; say(P, '숨어서 화를 피했다. 집은 털렸다.', 'ok'); }
      else { P.wealth *= 0.5; hurtMe(P, 1); if (P.R() < ((P.age < 10 || P.age > 60) ? 0.08 : 0.03)) die(P, `${org}의 칼에 쓰러졌다`, 'combat'); }
    } else if (ch === 1) { P.wealth *= 0.4; say(P, '가진 것을 내주고 목숨을 건졌다.'); }
    else {
      meet(P, n, '원수');
      const f = yield* fightAsk(P, n, '산적의 습격', { lethal: true });
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
    const ch = yield { ask: '마교도', text, options: opts, who: n };
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

// ---------- 활동 범위(10단계 9-4) ----------
const RANGE_NAME = ['고을', '지방', '몇 성', '천하'];
const RANGE_DIST = [30, 70, 140, 9999];
function rangeLevel(P) {
  const fs = Math.max(stageOf(P.fame), stageOf(P.infamy));
  const f = P.member && facDef(P.member.fid);
  // 경지·명성·나이·직위·생업 단계가 오를수록 넓어진다(9-23)
  let r = P.realm >= 5 || fs >= 3 ? 3 : P.realm >= 3 || fs >= 2 ? 2 : P.realm >= 1 || fs >= 1 || P.age >= 18 ? 1 : 0;
  if (P.age >= 30 && P.realm >= 2) r = Math.max(r, 2);
  if (P.realm >= 4 && P.age >= 35) r = 3;
  if (f && P.member.rank >= 2) r = Math.max(r, 1);
  if (f && (P.member.rank >= 4 || (f.prestige >= 3 && P.member.rank >= 3))) r = Math.max(r, 2);
  if ((P.rung || 0) >= 3) r = Math.max(r, 2);
  if (P.force && P.force.men >= 100) r = Math.max(r, 2);
  return r;
}
LIFE.rangeLevel = rangeLevel; LIFE.RANGE_NAME = RANGE_NAME;
function placesInRange(P, types, wider = 0) {
  const lv = Math.min(3, rangeLevel(P) + wider), me = G.PLACES2[P.place], d = RANGE_DIST[lv];
  return Object.entries(G.PLACES2).filter(([id, p]) => id !== P.place && (!types || types.includes(p.t)) && (!me || Math.hypot(p.x - me.x, p.y - me.y) <= d) && (lv >= 3 || G.REGIONS[p.r].zone === '중원'));
}

// ---------- 수하와 무리(10단계 9-5) ----------
const UNIT = { 집사: 0, 부당주: 30, 당주: 50, 각주: 80, '직계 자제': 0, 무사대원: 0, '무사대 조장': 10, 무사대주: 50, 소가주: 50, 조원: 0, 행동대원: 0, 소두목: 15, 부분타주: 15, '일급 살수': 0, 부막주: 50, 부수뇌: 150, 부천호: 500, 지휘첨사: 1500, '선임 표사': 0, 총표두: 40, 조장: 10, 대주: 50, 단주: 100, '단주·향주': 100, 백호: 100, 천호: 1000, 총기: 50, 소기: 10, 두목: 30, 부채주: 60, 채주: 150, 총채주: 500, '각주·당주': 50, 호법: 200, 군사: 300, 부맹주: 500, 맹주: 1000, 부교주: 1000, 교주: 3000, 표두: 20, 부국주: 50, 국주: 100, 분타주: 30, 총관: 100, 문주: 300, 장로: 100, 태상장로: 50, 장문인: 500, 가주: 200, 원로: 30, '6결(장로)': 100, '7결(후계)': 200, '8결(방주)': 1000, 살주: 30, 막주: 100, 간부: 30, 수뇌: 300 };
function unitSize(P) { const r = rankName(P); return (r && UNIT[r]) || 0; }
function myMen(P) { return (P.men || 0) + unitSize(P) + (P.force ? P.force.men : 0); }
LIFE.myMen = myMen; LIFE.unitSize = unitSize;
// 무리의 힘 = 평균 무위 × 머릿수^0.6 + 우두머리 무위
function groupPow(avgRealm, men, leaderWw) { const avg = BASEV[clamp(Math.round(avgRealm), 0, 7)] * STAGE_K[1] * 0.6; return avg * Math.pow(Math.max(1, men), 0.6) + leaderWw; }
function* groupFight(P, enemy) {
  const mine = myMen(P) + allyHelp(P), myAvg = Math.max(0.6, P.realm * 0.4 + (P.force ? P.force.avg || 1 : 1) * 0.6 - 0.3);
  const a = groupPow(myAvg, mine, wuwei(P)), b = groupPow(enemy.avg, enemy.men, npcWuwei(enemy.leader));
  const p = winP(P, a, b, 1, 1, Math.max(P.realm, enemy.leader.realm));
  const win = P.R() < p;
  const lossMine = Math.round(mine * (win ? 0.05 + P.R() * 0.1 : 0.2 + P.R() * 0.25)), lossEnemy = Math.round(enemy.men * (win ? 0.3 + P.R() * 0.3 : 0.05 + P.R() * 0.1));
  loseMen(P, lossMine);
  say(P, `${mine}명이 ${enemy.men}명과 맞붙었다. ${win ? `이겼다. 적 ${lossEnemy}명이 쓰러졌다` : `밀렸다. ${lossMine}명을 잃었다`}.`, win ? 'ok' : 'ng');
  P.real = Math.min(1000, P.real + 40);
  if (win) afterBeatBacked(P, enemy.leader);
  if (win) loot(P, enemy.leader, 1 + enemy.men / 10, `${enemy.leader.org || enemy.leader.name + '의 무리'}에게서`);
  if (!win && P.R() < 0.3) hurtMe(P, 2);
  if (!win && P.R() < 0.05) die(P, `${enemy.leader.name}의 무리와 싸우다 쓰러졌다`, 'combat');
  return { win, outcome: win ? (lossEnemy > enemy.men * 0.5 ? '대성공' : '성공') : '실패' };
}
function loseMen(P, n) {
  let left = n;
  const take = (o, k) => { const t = Math.min(o[k] || 0, left); o[k] -= t; left -= t; };
  take(P, 'men'); if (P.force) take(P.force, 'men');
}
function gainMen(P, n, how) { if (n <= 0) return; if (P.force) P.force.men += n; else P.men = (P.men || 0) + n; if (how) say(P, `${how} ${n}명이 따르게 되었다.`, 'ok'); const m = myMen(P); for (const [k, v] of [[10, '수하 열 명'], [50, '수하 쉰 명'], [100, '백인을 거느리다'], [500, '오백 무리'], [1000, '천인을 거느리다']]) if (m >= k) addAch(P, v); }

// ---------- 소문(10단계 9-3) ----------
// 소문은 단발 사건이다(9-19). 등급이 해마다 생길 확률, 같은 종류가 다시 생기기까지의 간격, 기한(달)을 정한다
const RUMOR_P = { 흔함: 0.06, 드묾: 0.035, 희귀: 0.006, 전설: 0.0025 };
const RUMOR_GAP = { 흔함: 3, 드묾: 10, 희귀: 30, 전설: 999 };
const RUMOR_LIFE = { 흔함: 6, 드묾: 9, 희귀: 15, 전설: 18 };
function* rumorYear(P) {
  const lv = rangeLevel(P), seek = P.plan === '강호 유람' && P.arts.length;
  for (const kind of Object.keys(G.RUMORS)) {
    const R0 = G.RUMORS[kind], gr = R0.grade || '흔함';
    if (P.rumorSeen[kind] > P.year - RUMOR_GAP[gr]) continue;
    let p = RUMOR_P[gr] * (1 + 0.4 * lv) * (seek && gr !== '흔함' ? 2.5 : 1);
    if (kind === '흉적 현상금') p *= 1 + 1.5 * P.era.dz.bandit;
    if (P.R() >= p) continue;
    // 드묾은 활동 범위보다 한 단계, 희귀 이상은 두 단계 넓게 들린다
    const wider = gr === '흔함' ? 0 : gr === '드묾' ? 1 : 2;
    const cand = placesInRange(P, R0.where, wider).concat([[P.place, G.PLACES2[P.place]]]).filter(([, p]) => p && R0.where.includes(p.t));
    if (!cand.length) continue;
    const [pid] = pk(P, cand);
    let legend = null;
    if (kind === '전설 고수의 무덤') legend = legendsOf(P).filter(l => l.died < P.year && l.died > P.year - 600 && l.realm >= 4 && l.died - l.born >= 30 && !P.legendsMet.has('무덤:' + l.name)).sort(() => P.R() - 0.5)[0] || null;
    if (legend) P.legendsMet.add('무덤:' + legend.name);
    P.rumorSeen[kind] = P.year;
    const month = 1 + Math.floor(P.R() * 12);
    P.rumorQueue.push({ kind, place: pid, legend, month, until: P.year * 12 + month + RUMOR_LIFE[gr] - wider * 2 });
  }
}
function* rumorHear(P, r) {
  const R0 = G.RUMORS[r.kind]; P.seenRumors.add(r.kind);
  if (P.closed) return; // 폐관 중에는 소문이 닿지 않는다
  let text = R0.s.replace('{place}', atText({ place: r.place }));
  if (r.legend) text = `${atText({ place: r.place })} 어딘가에 옛 고수 <b>${r.legend.ep ? '「' + r.legend.ep + '」 ' : r.legend.art ? '「' + r.legend.art + '」의 주인 ' : ''}${r.legend.name}</b>(${yr(r.legend.born)}~${yr(r.legend.died)})의 무덤이 있다는 소문이 돈다.`;
  if (P.age < 15) { say(P, text + ' 아이는 귀를 쫑긋 세웠다.', 'rumor', r.month); return; }
  const ch = yield { ask: '소문', text, month: r.month, options: [['쫓는다', `${R0.steps.length}걸음, 위험이 따른다`], ['흘려듣는다', '']] };
  say(P, text, 'rumor', r.month); say(P, `▸ ${ch ? '흘려듣는다' : '쫓는다'}`, 'pick', r.month);
  if (ch === 0) { P.threads.push({ k: '소문:' + r.kind, kind: r.kind, place: r.place, legend: r.legend, step: 0, until: r.until }); addAch(P, '소문을 쫓다'); }
}
function* rumorStep(P, th) {
  const R0 = G.RUMORS[th.kind], step = R0.steps[th.step], m = step.match(/^(.*)\((.+)\)$/);
  // 기한이 지나면 남이 먼저 차지한다(9-19)
  if (th.until && P.year * 12 + P.month > th.until) { say(P, `「${th.kind}」 — 누군가 먼저 차지했다는 소식이 들렸다.`, 'muted'); return 'gone'; }
  const txt = m[1], spec = m[2].split(':');
  if (P.place !== th.place && P.R() < 0.7) { moveTo(P, th.place); say(P, `${J(atText(P), '으로')} 발길을 옮겼다.`, 'muted'); }
  let ok;
  if (spec[0] === '싸움') {
    const [lo, hi] = (spec[2] || '0,1').split(',').map(Number);
    const n = makeNpc(P, spec[1], [lo, hi]);
    say(P, `「${th.kind}」: ${txt}.`, 'thread');
    const r = yield* fightAsk(P, n, `「${th.kind}」 — ${txt}`, { lethal: th.kind === '흉적 현상금' });
    ok = r.win;
  } else { ok = check(P, spec[0], 60 + th.step * 8).ok; say(P, `「${th.kind}」: ${txt} — ${ok ? '해냈다' : '실패했다'}.`, 'thread'); }
  if (!P.alive) return 'dead';
  if (!ok) { yield* applyFx(P, R0.fail); say(P, `「${th.kind}」의 일은 거기서 끝났다.`, 'muted'); return 'fail'; }
  th.step++;
  if (th.step >= R0.steps.length) {
    say(P, `「${th.kind}」의 끝에 닿았다.`, 'big');
    if (th.legend) { const def = th.legend.art && G.ARTS.find(a => a.n === th.legend.art) || (th.legend.artDef); if (def) learn(P, def, `${th.legend.name}의 무덤에서 얻은 비급으로 익히기 시작했다`); addAch(P, '전설의 무덤'); }
    yield* applyFx(P, R0.end);
    addAch(P, '소문의 끝: ' + th.kind);
    P.events.push(`${P.age}세에 「${th.kind}」의 소문을 끝까지 쫓았다`);
    return 'done';
  }
  return 'go';
}

// 싸움 앞에서 정보를 알아보는 갈림길(10단계 9-9)
function* fightAsk(P, n, title, opts = {}) {
  let per = perceive(P, n);
  if (!P.auto && !n.intel && (n.realm >= P.realm || n.epithet || n.men)) {
    const ch = yield { ask: title, text: `상대: ${per.txt}${n.men ? ` (무리 ${n.men}명)` : ''}. ${guessOdds(P, n, per)}.${backerText(P, n)}`, options: [['맞선다', ''], ['먼저 정보를 알아본다', '지략 또는 은자 몇 냥']], who: n };
    if (ch === 1) {
      const ok = P.wealth >= 20 ? (P.wealth -= 10, true) : check(P, '지략', 50).ok;
      if (ok) { n.intel = true; if (backerFor(P, n)) n.backerKnown = true; per = perceive(P, n); say(P, `알아보니 ${per.txt}${n.org ? ` — ${n.org} 사람` : ''}였다.${n.backer ? ` 뒤를 봐주는 것은 ${facDef(n.backer).n}다.` : ''}`, 'muted'); addAch(P, '정보는 힘'); }
      else say(P, '알아낸 것이 없었다.', 'muted');
      const c2 = yield { ask: title, text: `상대: ${per.txt}. ${guessOdds(P, n, per)}.`, options: [['맞선다', ''], ['물러선다', '명성이 조금 깎인다']], who: n };
      if (c2 === 1) { addFame(P, -10); say(P, '물러섰다.'); return { win: false, retreat: true, outcome: '실패' }; }
    }
  }
  if (n.men && myMen(P) > 0) {
    const ch = P.auto ? (myMen(P) >= n.men / 3 ? 0 : 1) : yield { ask: title, text: `무리 ${n.men}명. 나를 따르는 사람이 ${myMen(P)}명이다.`, options: [['무리를 이끌고 맞선다', ''], ['우두머리와 겨룬다', '']], who: n };
    if (ch === 0) return yield* groupFight(P, { men: n.men, avg: Math.max(0, n.realm - 1), leader: n });
  }
  const r = yield* fight(P, n, opts);
  if (r.win && n.men && !P.auto) {
    const c3 = yield { ask: '수하로 삼는다', text: `${n.name}이 무릎을 꿇었다. 따르던 ${n.men}명이 눈치를 본다.`, options: [['수하로 삼는다', '악명이 조금 붙을 수 있다'], ['풀어 준다', '협명']], who: n };
    if (c3 === 0) { meet(P, n, '수하'); gainMen(P, Math.ceil(n.men * 0.4), `${n.name}과 그 무리 가운데`); }
    else { addFame(P, 40); P.align = clamp(P.align + 3, -100, 100); }
  } else if (r.win && n.men && P.auto && P.R() < 0.4) { meet(P, n, '수하'); gainMen(P, Math.ceil(n.men * 0.4)); }
  if (r.win && !n.men && !opts.spar) yield* oath(P, n);
  return r;
}

// ---------- 단발 모집(9-19): 생에 한 번씩만 ----------
function* singleYear(P) {
  const seek = P.plan === '강호 유람' && P.arts.length ? 3 : 1;
  // 대문파 제자 대모집: 위상 3 문파가 10~15년에 한 번 산문을 크게 연다
  if (!P.member && P.age >= 7 && P.age <= 15 && !P.flags.bigExam && P.R() < 0.08) {
    const l = nearFactions(P, f => f.lad === 'sect' && (f.prestige || 0) >= 3 && (!f.entry || !f.entry.sex || f.entry.sex === P.sex), 400);
    if (l.length) {
      const f = pk(P, l); P.flags.bigExam = 1;
      const rival = makeNpc(P, '또래 아이', [0, 0]); rival.realm = 0;
      const ch = yield { ask: '산문이 열린다', text: `<b>${f.n}</b>${J(f.n, '이가').slice(-1)} 십수 년 만에 산문을 크게 연다. ${atText({ place: f.at })}까지 천 리 길, 천하의 아이들이 몰려든다고 한다.`, month: P.month, options: [['길을 떠나 시험을 본다', '근골·오성·심성 세 관문, 경쟁이 거세다'], ['집에 남는다', '']] };
      say(P, `${J(f.n, '이가')} 산문을 크게 연다는 소식이 왔다.`, 'path', P.month);
      if (ch === 0) {
        say(P, `▸ ${atText({ place: f.at })}까지 길을 떠났다. 산문 앞에는 아이들이 구름처럼 모였다.`, 'pick', P.month);
        const a = check(P, '자질:근골', 65, 0, '입문'), b = a.ok && check(P, '자질:오성', 65, 0, '입문'), c = b && b.ok && check(P, '자질:심성', 55, 0, '입문');
        if (c && c.ok) { join(P, f.id, '세 관문을 모두 넘어 ', 0, c.crit ? '내문제자' : '입문제자', '정식'); addAch(P, '대문파의 산문'); meet(P, rival, '맞수'); say(P, `함께 붙은 ${J(rival.name, '이가')} 나를 흘겨본다.`, 'bond', P.month); }
        else say(P, `${['근골', '오성', '심성'][!a.ok ? 0 : !b.ok ? 1 : 2]}의 관문에서 떨어졌다. 다음 산문은 십수 년 뒤에나 열린다.`, 'ng', P.month);
      }
      return;
    }
  }
  // 장로의 후인 찾기: 문파 정식 제자만
  if (P.member && P.member.kind === '정식' && facDef(P.member.fid).lad === 'sect' && P.member.rank <= 2 && P.age >= 12 && P.age <= 30 && !P.flags.elderHeir && P.R() < 0.025) {
    P.flags.elderHeir = 1;
    const f = facDef(P.member.fid), el = bandNpc(P, '장로', [Math.max(3, P.realm + 1), Math.min(5, P.realm + 3)]); el.org = f.n; el.fid = f.id; el.age = 70 + Math.floor(P.R() * 20);
    const ch = yield { ask: '장로의 후인', text: `${f.n}의 ${J(el.name, '이가')} 늙어 마지막 제자를 들인다고 한다. 제자들 가운데 셋을 골라 시험한다.`, month: P.month, options: [['나선다', '오성과 심성을 본다. 붙으면 진산제자'], ['나서지 않는다', '']], who: el };
    say(P, `${f.n}의 장로 ${J(el.name, '이가')} 마지막 제자를 찾는다.`, 'path', P.month);
    if (ch === 0) {
      const r = check(P, '자질:오성', 60, (P.apt.심성 - 50) / 4 + P.realm * 3, '입문');
      if (r.ok) { P.member.rank = Math.max(P.member.rank, 3); P.member.disc = '진산제자'; meet(P, el, '스승'); relHook(P, el, '스승'); giveArt(P, r.crit ? '상승' : '일류', el, `${el.name}에게서 배웠다`); say(P, `${el.name}의 마지막 제자가 되었다.`, 'big', P.month); addAch(P, '장로의 후인'); P.events.push(`${P.age}세에 장로 ${el.name}의 마지막 제자가 되었다`); }
      else say(P, '다른 사형제가 뽑혔다.', 'ng', P.month);
    }
    return;
  }
  // 절대고수의 후인 찾기: 세상에 수십 년에 한 번
  if (P.age >= 10 && P.age <= 35 && !P.flags.heir && P.R() < 0.005 * seek) {
    P.flags.heir = 1;
    const ms = bandNpc(P, '절대고수', [5, 6]); ms.age = 90 + Math.floor(P.R() * 30); ms.epithet = ms.epithet || pk(P, ['검마', '창천신검', '무영신수', '천수노인', '일장진천', '혈수서생', '백발검선']);
    const ch = yield { ask: '절대고수의 후인', text: `강호에 소문이 돈다. 은거한 절대고수 「${ms.epithet}」가 죽기 전에 후인을 찾는다고. 시험은 세 가지라 한다.`, month: P.month, options: [['찾아간다', '자질·심성·싸움 세 관문. 붙으면 상승 이상 무공'], ['흘려듣는다', '']], who: ms };
    say(P, `「${ms.epithet}」가 후인을 찾는다는 소문이 돈다.`, 'rumor', P.month);
    if (ch === 0) {
      const a = check(P, '자질:근골', 70, (P.apt.오성 - 50) / 4, '입문');
      if (!a.ok) { say(P, '노인은 내 손목을 한 번 짚어 보고는 고개를 저었다.', 'ng', P.month); return; }
      const b = check(P, '의지', 60, (P.apt.심성 - 50) / 3);
      if (!b.ok) { say(P, '사흘 밤낮을 문 앞에 꿇어앉았지만 끝내 버티지 못했다.', 'ng', P.month); return; }
      const rv = bandNpc(P, '후인 후보', [Math.max(1, P.realm - 1), Math.min(6, P.realm + 1)]);
      say(P, `마지막 관문 — 남은 후보 ${J(rv.name, '과와')} 겨룬다.`, 'path', P.month);
      const r = yield* fight(P, rv, { spar: true });
      if (!P.alive) return;
      if (!r.win) { meet(P, rv, '맞수'); say(P, `${J(rv.name, '이가')} 후인이 되었다.`, 'ng', P.month); return; }
      meet(P, ms, '스승'); relHook(P, ms, '스승'); ms.bond = 40;
      giveArt(P, P.R() < 0.2 ? '절세' : '상승', ms, `「${ms.epithet}」의 후인으로 이어받았다`);
      say(P, `「${ms.epithet}」 ${ms.name}의 후인이 되었다.`, 'big', P.month); addAch(P, '절대고수의 후인'); P.events.push(`${P.age}세에 「${ms.epithet}」의 후인이 되었다`);
      if (P.R() < 0.5) { P.qi = Math.min(P.capa * 1.5, P.qi + 20); P.capa = Math.max(P.capa, P.qi); say(P, '노인이 마지막 공력을 내게 넘겨주었다.', 'big', P.month); }
    }
  }
}

// ---------- 대회(정기 사건, 9-19) ----------
// 대회마다 참가자의 경지 폭이 정해져 있다. 참가자는 내 경지를 따라오지 않는다(9-21)
const TOURNEY = {
  // top: 결승에 한 급 위 상대가 나올 확률과 그 급
  고을: { n: '고을 비무대회', bands: [[0, 1], [0, 1], [1, 1]], top: [0.2, 2], fameIn: 50, fameWin: 300 },
  지역: { n: '무림대회', bands: [[1, 2], [1, 2], [2, 2]], top: [0.2, 3], fameIn: 300, fameWin: 2000 },
  용봉: { n: '용봉지회', bands: [[2, 3], [2, 3], [3, 4], [3, 4]], fameIn: 30000, fameWin: 100000 },
  천하: { n: '천하제일 비무대회', bands: [[4, 5], [4, 5], [5, 5], [5, 6], [5, 6]], fameIn: 300000, fameWin: 2000000 },
};
function bandNpc(P, role, b) { return makeNpc(P, role, [b[0] - P.realm, b[1] - P.realm], { band: b, keep: true }); }
function* tourney(P, kind) {
  const T = TOURNEY[kind], rounds = T.bands.length;
  let w = 0;
  for (let i = 0; i < rounds && P.alive; i++) {
    const ln = kind === '천하' && i >= rounds - 2 && P.R() < 0.35 ? legendNpc(P) : null;
    const last = i === rounds - 1, b = last && T.top && P.R() < T.top[0] ? [T.top[1], T.top[1]] : T.bands[i];
    const npc = ln || bandNpc(P, last ? '우승 후보' : '참가자', b);
    if (kind === '용봉') npc.org = pk(P, G.FACTIONS.filter(f => f.prestige >= 2 && (f.t === '정' || f.t === '중'))).n;
    const r = yield* fight(P, npc, { spar: true });
    say(P, `${i + 1}회전 — ${perceive(P, npc).txt}와 겨뤄 ${r.win ? '이겼다' : '졌다'}.`, r.win ? 'ok' : 'ng');
    if (!r.win) break; w++;
  }
  if (w >= rounds) { say(P, `<b>${T.n}</b>에서 우승했다!`, 'big'); addFame(P, T.fameWin); P.flags.bigWin = true; P.events.push(`${P.age}세에 ${T.n}에서 우승했다`); addAch(P, T.n + ' 우승'); if (kind === '천하') P.flags.tianxiaWin = true; }
  else if (w >= rounds - 1) { say(P, `${T.n}에서 입상했다.`, 'big'); addFame(P, T.fameIn); addAch(P, T.n + ' 입상'); }
  P.trigger = Math.max(P.trigger, 1);
}
// 지역 무림대회는 성(省)마다 3년에 한 번, 성마다 해가 어긋난다
const regionCycle = r => [...(r || '')].reduce((a, c) => a + c.charCodeAt(0), 0) % 3;
function* tourneyYear(P) {
  const y = P.year;
  // 고을 비무대회: 큰 고을에서 2년에 한 번, 범인~이류가 나온다
  const hereP = G.PLACES2[P.place];
  if (P.realm <= 2 && P.age >= 12 && P.age <= 35 && hereP && (hereP.t === '성' || hereP.t === '진') && y % 3 === 0 && !(P.realm === 0 && P.R() < 0.6)) {
    const ch = yield { ask: '고을 비무대회', text: `${atText(P)} 장터에 비무대가 섰다. 고을의 힘깨나 쓰는 젊은이들이 모인다.`, options: [['나간다', '비무 셋, 상대는 범인~이류'], ['구경만 한다', '']] };
    if (ch === 0) yield* tourney(P, '고을');
  }
  // 지역 대회: 내가 있는 성(省)의 대회만, 15~40세, 한 번 우승하면 다시 나가지 않는다
  const here = G.PLACES2[P.place];
  if (P.realm >= 1 && P.realm <= 3 && P.age >= 15 && P.age <= 40 && !P.ach.has('무림대회 우승') && here && regionCycle(here.r) === ((y % 3) + 3) % 3) {
    const cities = placesInRange(P, ['성']).concat([[P.place, here]]).filter(([, p]) => p && p.t === '성' && p.r === here.r);
    if (cities.length) {
      const [city] = pk(P, cities);
      const ch = yield { ask: '무림대회', text: `${atText({ place: city })}에서 3년 만의 무림대회가 열린다. ${G.REGIONS[G.PLACES2[city].r] ? G.PLACES2[city].r + ' 일대의' : '고을의'} 젊은 무인들이 모인다.`, options: [['나간다', '비무 셋, 상대는 삼류~일류'], ['구경만 한다', '']] };
      say(P, `${atText({ place: city })}에서 무림대회가 열렸다.`, 'big');
      if (ch === 0) { moveTo(P, city); yield* tourney(P, '지역'); }
    }
  }
  if (y % 4 === 0 && P.age < 30 && P.age >= 16 && P.realm >= 2 && P.realm <= 5 && (stageOf(P.fame) >= 1 || (P.member && facDef(P.member.fid).prestige >= 2))) {
    const ch = yield { ask: '용봉지회', text: '용봉지회 초청장이 왔다. 천하의 후기지수가 겨루는 자리다.', options: [['나간다', '비무 넷, 상대는 이류~절정'], ['사양한다', '']] };
    say(P, '<b>용봉지회</b> 초청장이 왔다.', 'big');
    if (ch === 0) yield* tourney(P, '용봉');
  }
  if (y % 10 === 5 && stageOf(P.fame) >= 3 && P.realm >= 4) {
    const ch = yield { ask: '천하제일 비무대회', text: '천하제일 비무대회에 초청받았다.', options: [['나간다', '비무 다섯, 상대는 절정 이상'], ['사양한다', '']] };
    say(P, '<b>천하제일 비무대회</b>에 초청받았다.', 'big');
    if (ch === 0) { addAch(P, '천하제일 비무'); yield* tourney(P, '천하'); }
  }
}

// ---------- 전설(10단계 9-8) ----------
// 네임드 인물(data/named.js)과 지난 생 기록을 함께 쓴다(docs/p11-cast.md 2-3)
const legendsOf = P => (G.NAMED || []).concat(P.opts.legends || []);
function legendNpc(P) {
  const l = legendsOf(P).filter(x => x.born <= P.year - 16 && x.died >= P.year && x.realm >= 3);
  if (!l.length) return null;
  const x = pk(P, l), n = makeNpc(P, '이름난 고수', [0, 0]);
  n.name = x.name; n.epithet = x.ep; n.realm = x.realm; n.shown = x.realm; n.stage = 2; n.fame = 500000; n.legend = true; n.g = COMMON_GRADE[x.realm] + 1;
  if (!P.legendsMet.has(x.name)) { P.legendsMet.add(x.name); if (x.kind) say(P, `${x.ep ? '「' + x.ep + '」 ' : ''}${x.name} — 강호에 모르는 사람이 없는 이름이다.`, 'muted'); else { addAch(P, '전생과 마주치다'); say(P, `${x.ep ? '「' + x.ep + '」 ' : ''}${x.name} — 어디선가 들어 본 이름이다.`, 'muted'); } }
  return n;
}

// ---------- 행동(10단계 9-6) ----------
const FORCE_KINDS = { 문파: ['검문', '도문', '문', '파', '장'], 방회: ['방', '회', '련'], 산채: ['채', '산채'], 상단: ['상단', '상회'] };
LIFE.actions = function (P) {
  const out = [], add = (id, n, ok, why, desc) => out.push({ id, n, ok: !!ok, why: ok ? '' : why, desc });
  const lv = rangeLevel(P), fs = stageOf(P.fame);
  add('travel', '다른 고을로 떠난다', P.age >= 15, '열다섯 살부터', `활동 범위: ${RANGE_NAME[lv]}`);
  add('found', '문파를 세운다', !P.force && (P.realm >= 4 || fs >= 2) && P.wealth >= 1000 * (P.opts.founder ? 0.5 : 1) && P.age >= 20, P.force ? '이미 세력이 있다' : '절정 이상 또는 명성 2단계, 재산 1,000냥', '내 세력');
  add('found2', '방회·산채·상단을 세운다', !P.force && (P.realm >= 3 || P.rung >= 3) && P.wealth >= 300 && P.age >= 18, P.force ? '이미 세력이 있다' : '일류 이상 또는 생업 3단, 재산 300냥', '사파·상인 쪽 세력');
  add('create', '무공을 창안한다', P.realm >= 3 && P.enl >= 2 && mainArt(P), '일류 이상, 깨달음 득의 이상', '한 해 폐관');
  add('manual', '비급을 구한다', P.wealth >= 30 && P.age >= 12, '재산 30냥 이상', '헌책방·책장수·흑점·사문 장경각');
  add('dojo', '도장 깨기', P.realm >= 1 && P.age >= 16, '삼류 이상', '이 고을 무관에 비무를 건다');
  add('master', relPeople(P, ['스승']).length ? '더 높은 스승을 찾는다' : '스승을 찾는다', P.age >= 10 && P.age <= 50 && !relPeople(P, ['스승']).some(b => b.alive && b.realm > P.realm), P.age < 10 ? '열 살부터' : P.age > 50 ? '쉰 살까지' : '지금 스승에게 배울 것이 남았다', '시험이 있다');
  add('disciple', '제자를 들인다', (P.realm >= 4 || P.force) && P.age >= 30, '절정 이상 또는 세력 수장', '');
  add('seclude', P.flags.hidden ? '세상으로 돌아온다' : '은거한다', P.age >= 40 || P.flags.hidden, '마흔 살부터', '명성이 멈추고 수련이 깊어진다');
  add('intel', '소문을 수소문한다', P.age >= 12, '', '객잔·하오문에서 은자 몇 냥');
  const shops = shopsHere(P); add('shop', '가게에 들른다', P.age >= 10 && shops.length, '성·진에 있을 때', shops.join(' · ') || '');
  const c = P.career;
  if (c === 'cook') { add('dish', '신메뉴를 만든다', true, '', `이름난 요리 ${(P.dishes || []).length}가지`); add('branch', '분점을 낸다', P.rung >= 2 && P.wealth >= 300 * (1 + (P.biz || 0)), `숙수 2단, 재산 ${300 * (1 + (P.biz || 0))}냥`, `가게 ${1 + (P.biz || 0)}곳`); }
  if (c === 'merchant') { add('caravan', '상단을 꾸린다', P.wealth >= 200 * (1 + (P.biz || 0)), `재산 ${200 * (1 + (P.biz || 0))}냥`, `상단 ${P.biz || 0}개`); add('trade', '먼 교역을 떠난다', P.age >= 16, '', '활동 범위 안 두 고을'); }
  if (c === 'smith') add('forge', '명검을 벼린다', (P.skill.smith || 0) >= 300, '대장장이 숙련 300', `벼린 이름난 병기 ${(P.forged || []).length}자루`);
  if (c === 'doctor') add('visit', '왕진을 나선다', true, '', '이름과 숙련');
  if (c === 'scholar') add('exam', '과거를 본다', P.year % 3 === 0 && P.rung < 3 && P.age <= 45, '과거는 3년마다(연도가 3의 배수인 해)', `지금 ${careerDef('scholar').lad[P.rung]}`);
  if (c === 'herb' || c === 'hunter') add('deep', '깊은 산에 든다', true, '', '영초·영물');
  if (c === 'thief') add('heist', '큰 털이를 한다', true, '', '');
  if (c === 'farm' || c === 'fisher') add('land', c === 'farm' ? '땅을 늘린다' : '배를 늘린다', P.wealth >= 150 * (1 + (P.biz || 0)), `재산 ${150 * (1 + (P.biz || 0))}냥`, `가진 것 ${P.biz || 0}`);
  if (c === 'geomancer') add('site', '명당을 찾는다', true, '', '무덤 소문');
  return out;
};
function forceName(P, kind) {
  const p = G.PLACES2[P.place], base = p ? p.n.slice(0, 2) : '강호';
  const sylA = ['청', '백', '천', '무', '현', '비', '철', '운', '금', '태'], sylB = ['운', '룡', '검', '풍', '하', '산', '영', '광', '양', '진'];
  const suf = pk(P, FORCE_KINDS[kind]);
  return [base + suf, pk(P, sylA) + pk(P, sylB) + suf, (P.epithet ? P.epithet.slice(0, 2) : pk(P, sylA) + pk(P, sylB)) + suf];
}
function* doAction(P, id) {
  const sayA = t => say(P, t, 'act', P.month);
  if (id === 'shop') { yield* doShop(P); return; }
  if (id === 'master') { yield* seekMaster(P); return; }
  if (id === 'travel') {
    const l = placesInRange(P, ['성', '진', '산', '관문', '새외', '섬']).sort(() => P.R() - 0.5).slice(0, 5);
    if (!l.length) return;
    const ch = yield { ask: '떠날 곳', text: `어디로 갈까? (활동 범위: ${RANGE_NAME[rangeLevel(P)]})`, options: l.map(([pid, p]) => [atText({ place: pid }), p.note || '']).concat([['그만둔다', '']]) };
    if (ch < l.length) { moveTo(P, l[ch][0]); sayA(`${J(atText(P), '으로')} 떠났다.`); P.era = eraOf(P); for (const x of P.era.local) say(P, x + '.', 'world', P.month); }
  } else if (id === 'found' || id === 'found2') {
    const kinds = id === 'found' ? ['문파'] : P.align < -10 ? ['산채', '방회'] : P.career === 'merchant' || P.rung >= 3 ? ['상단', '방회'] : ['방회', '산채'];
    const kind = kinds.length > 1 ? kinds[yield { ask: '세력의 종류', text: '어떤 세력을 세우는가?', options: kinds.map(k => [k, '']) }] : kinds[0];
    const names = forceName(P, kind);
    const ni = yield { ask: '세력의 이름', input: true, text: `${atText(P)}에 ${kind}를 세운다. 이름을 짓는다.`, options: names.map(n => [n, '']) };
    const name = typeof ni === 'string' && ni.trim() ? ni.trim().slice(0, 12) : names[ni | 0];
    if (typeof ni === 'string' && ni.trim()) addAch(P, '이름을 짓다');
    P.wealth -= (id === 'found' ? 1000 : 300) * (P.opts.founder ? 0.5 : 1);
    const men = Math.max(5, Math.round((P.men || 0) + (stageOf(P.fame) * 10)));
    P.force = { name, kind, home: P.place, men, avg: Math.max(1, P.realm - 2), since: P.year };
    P.men = 0;
    if (P.member) { sayA(`${J(facDef(P.member.fid).n, '을를')} 나왔다.`); P.member = null; }
    sayA(`<b>${name}</b>${J(name, '을를').slice(-1)} 세웠다. ${atText(P)}에 현판이 걸렸다. 따르는 사람 ${men}명.`);
    P.events.push(`${P.age}세에 ${J(name, '을를')} 세웠다`);
    addAch(P, kind === '문파' ? '개파' : '세력을 세우다');
    if (P.world && G.WORLDSIM.addFaction) { const t = kind === '산채' ? '사' : kind === '상단' ? '중' : P.align < -20 ? '사' : '정'; P.force.wid = G.WORLDSIM.addFaction(P.world, { n: name, t, at: P.place, prestige: 1, size: men }, P.year); }
    P.plan = '세력 운영';
  } else if (id === 'create') {
    const m = mainArt(P), gi = Math.min(5, gIdx(m.def.g) + 1, Math.max(0, P.realm - 2));
    sayA('한 해 동안 문을 걸어 잠그고 자신의 무공을 짓기 시작했다.');
    P.flags.createYear = P.year;
    const r = check(P, '이해', 60 + gi * 8, P.enl * 5);
    if (r.ok) {
      const E = G.EPITHET, syl = ['청', '운', '천', '무', '현', '비', '혈', '설', '광', '태', '일', '귀'];
      const nm = (P.epithet ? P.epithet.slice(0, 2) : pk(P, syl) + pk(P, syl)) + (m.def.k === '검' ? '검법' : m.def.k === '도' ? '도법' : m.def.k === '심법' ? '신공' : m.def.k + '법');
      const def = Object.assign({}, m.def, { n: nm, g: GRADES[r.crit ? Math.min(5, gi + 1) : gi], f: 'own', o: 'own', nx: null, uq: null, tech: TECH[r.crit ? Math.min(5, gi + 1) : gi] });
      learn(P, def, '스스로 지어 익히기 시작했다');
      P.created = (P.created || []).concat(nm); addAch(P, '무공 창안'); P.events.push(`${P.age}세에 「${nm}」${J(nm, '을를').slice(-1)} 창안했다`);
      addFame(P, 1000 * (gi + 1));
    } else sayA('무공의 꼴이 잡히지 않았다. 한 해가 헛되이 갔다.');
    P.trigger = 1;
  } else if (id === 'manual') {
    yield* buyManual(P); return;
    const tiers = [['삼류 비급', 0, 50], ['이류 비급', 1, 200], ['일류 비급', 2, 1000], ['상승 비급', 3, 5000]].filter(t => t[2] <= P.wealth);
    const ch = yield { ask: '흑점', text: '흑점 주인이 비급 몇 권을 늘어놓는다.', options: tiers.map(t => [t[0], `${t[2]}냥`]).concat([['그만둔다', '']]) };
    if (ch < tiers.length) { P.wealth -= tiers[ch][2]; if (check(P, '학식', 45 + tiers[ch][1] * 8).ok) giveArt(P, GRADES[tiers[ch][1]], null, '흑점에서 산 비급으로 익히기 시작했다'); else sayA('산 비급이 가짜였다. 아니면 해독하지 못했다.'); }
  } else if (id === 'dojo') {
    const n = makeNpc(P, '무관 관주', [0, 1]);
    const r = yield* fightAsk(P, n, '도장 깨기', { spar: true });
    if (r.win) { addFame(P, 150); addAch(P, '도장 깨기'); sayA(`${atText(P)}의 무관 현판을 떼어 냈다.`); } else if (!r.retreat) addFame(P, -30);
  } else if (id === 'disciple') {
    const n = makeNpc(P, '제자 지망생', [-9, -9]); n.realm = 0; meet(P, n, '제자'); relHook(P, n, '제자'); sayA(`${J(n.name, '을를')} 제자로 들였다.`);
  } else if (id === 'seclude') {
    P.flags.hidden = !P.flags.hidden; sayA(P.flags.hidden ? '산으로 들어가 은거했다.' : '세상으로 돌아왔다.'); if (P.flags.hidden) { P.plan = '폐관'; addAch(P, '은거'); }
  } else if (id === 'intel') {
    if (P.wealth >= 5) P.wealth -= 5; yield* applyFx(P, ['rumor:any']); { const bk = G.FACTIONS.filter(f => factionAlive(P, f.id) && (f.t === '사' || f.lad === 'info' || f.lad === 'bandit') && (f.prestige || 0) >= 1); if (bk.length && P.R() < 0.5) { const b = pk(P, bk); P.knownBackers = (P.knownBackers || []).concat(b.id); sayA(`이 고을 흑도 뒤에 ${J(b.n, '이가')} 있다는 것을 알아냈다.`); } }
    sayA(pk(P, ['객잔에서 은자 몇 냥을 쓰며 소문을 모았다.', '하오문 꼬마에게 엽전을 쥐여 주고 이야기를 들었다.', '찻집 노인들 틈에 앉아 반나절 귀를 열어 두었다.', '표국 쟁자수들에게 술을 사며 길 소식을 들었다.', '거지 아이들에게 만두를 나눠 주고 소문을 얻었다.'])); addAch(P, '정보는 힘');
  } else if (id === 'dish') {
    const r = check(P, '정교', 55, ((P.skill.cook || 0) - 300) / 20);
    const food = ['동파육', '팔보오리', '용정새우', '마파두부', '불도장', '사자머리', '취계', '홍소육', '만두', '양고기탕'], adj = ['옥', '금', '비취', '천향', '홍', '설', '무림'];
    if (r.ok) { const nm = pk(P, adj) + pk(P, food); P.dishes = (P.dishes || []).concat(nm); addFame(P, r.crit ? 3000 : 200); P.skill.cook = Math.min(1000, (P.skill.cook || 0) + 30); sayA(`새 요리 「${nm}」을 내놓았다. ${r.crit ? '고을이 들썩였다.' : '손님들이 찾기 시작했다.'}`); addAch(P, '신메뉴'); }
    else sayA('새 요리를 내놓았지만 손님들 반응이 시큰둥했다.');
  } else if (['branch', 'caravan', 'land'].includes(id)) {
    const cost = { branch: 300, caravan: 200, land: 150 }[id] * (1 + (P.biz || 0));
    P.wealth -= cost; P.biz = (P.biz || 0) + 1;
    sayA({ branch: `${atText({ place: nearPlace(P, 70) })}에 분점을 냈다. 가게가 ${P.biz + 1}곳이 되었다.`, caravan: `상단을 하나 더 꾸렸다. 상단이 ${P.biz}개다.`, land: `${P.career === 'farm' ? '땅' : '배'}을 늘렸다.` }[id]);
    addAch(P, { branch: '분점', caravan: '상단주', land: '땅부자' }[id]);
  } else if (id === 'trade') {
    const l = placesInRange(P, ['성']); const to = l.length ? pk(P, l)[0] : P.place;
    const r = check(P, '지략', 55, P.rung * 5);
    if (P.R() < 0.25 + P.era.dz.bandit * 0.3) { const n = makeNpc(P, '녹림 산적 두목', [0, 1]); n.men = 10 + Math.floor(P.R() * 30); n.org = P.era.banditF; say(P, `${atText({ place: to })}로 가는 길에 산적이 길을 막았다.`, 'big', P.month); const f = yield* fightAsk(P, n, '교역길의 산적', { lethal: true }); if (!f.win) { P.wealth *= 0.6; return; } }
    P.wealth *= r.ok ? 1.25 + (r.crit ? 0.5 : 0) : 0.9; sayA(`${atText({ place: to })}까지 교역을 다녀왔다. ${r.ok ? '이문이 컸다.' : '손해를 봤다.'}`);
  } else if (id === 'forge') {
    const r = check(P, '정교', 65, ((P.skill.smith || 0) - 400) / 15);
    const nm = pk(P, ['청', '자', '백', '현', '용', '봉', '추', '운']) + pk(P, ['광', '천', '령', '혈', '하', '성']) + pk(P, ['검', '도', '창']);
    if (r.ok) { const lv = r.crit ? 2 : 1; P.forged = (P.forged || []).concat(nm); addFame(P, r.crit ? 20000 : 500); sayA(`「${nm}」을 벼려 냈다. ${['', '명병이다.', '보검이다! 무인들이 찾아오기 시작했다.'][lv]}`); if (lv > P.weapon) P.weapon = lv; addAch(P, '명검을 벼리다'); }
    else sayA('쇠가 뜻대로 따라 주지 않았다.');
  } else if (id === 'visit') {
    const r = check(P, '학식', 55); addFame(P, r.ok ? 150 : 20); P.skill.doctor = Math.min(1000, (P.skill.doctor || 0) + 20); sayA(r.ok ? '먼 마을까지 왕진을 다녀왔다. 살려 낸 사람이 많았다.' : '왕진을 다녀왔다.');
  } else if (id === 'exam') {
    const c = careerDef('scholar'), fr = careerFrame(c), next = P.rung + 1;
    const r = check(P, '학식', fr.dc[next] - 40, ((P.skill.scholar || 0) - fr.th[next]) / 8);
    sayA(`${['', '원시', '향시', '회시와 전시'][next]}에 응시했다.`);
    if (r.ok) { P.rung = next; P.flags.rung_scholar = next; say(P, `급제했다: <b>${c.lad[next]}</b>.`, 'big', P.month); if (next === 3) { addFame(P, 200000); addAch(P, '장원급제'); } }
    else say(P, '낙방했다.', 'ng', P.month);
  } else if (id === 'deep') { const want = P.R() < 0.5 ? 'c_herb_old' : 'c_hunter_beast', t = G.LIFEBOOK.find(x => x.id === want); yield* runTpl(P, t, P.month); }
  else if (id === 'heist') { const t = G.LIFEBOOK.find(x => x.id === 'c_thief_big'); yield* runTpl(P, t, P.month); }
  else if (id === 'site') { const t = G.LIFEBOOK.find(x => x.id === 'c_geo_tomb'); yield* runTpl(P, t, P.month); }
}

// ---------- 내 세력의 한 해 ----------
function forceYear(P) {
  const f = P.force; if (!f) return;
  // 주인의 그릇만큼만 자란다(9-39): 경지·명성·규모로 정한 상한에 가까워질수록 더디다
  const cap = 10 + P.realm * P.realm * 8 + Math.max(stageOf(P.fame), stageOf(P.infamy)) * 60 + (P.force.posts || []).length * 6;
  f.cap = cap;
  const grow = Math.round(f.men * (0.04 + stageOf(P.fame) * 0.02) * Math.max(-0.3, 1 - f.men / cap) + (P.R() < 0.5 && f.men < cap ? 1 : 0));
  f.men = Math.max(3, f.men + grow);
  if (f.men > cap * 1.3) { const d = Math.round((f.men - cap * 1.3) * 0.5); f.men -= d; say(P, `${f.name}에서 ${d}명이 떨어져 나갔다. 주인의 그릇보다 무리가 컸다.`, "muted"); }
  f.avg = Math.min(P.realm, f.avg + (P.R() < 0.2 ? 0.2 : 0));
  if (P.world && f.wid && P.world.F[f.wid]) { const wf = P.world.F[f.wid]; wf.pow = Math.max(wf.pow, groupPow(f.avg, f.men, wuwei(P)) / 10); wf.target = Math.max(wf.target, Math.sqrt(f.men) * 10); }
  if (f.men >= 100) addAch(P, '백인을 거느리다');
  forceGrowth(P);
}

// ---------- 살림(9-37): 한 해 장부. 들어오는 돈과 나가는 돈을 한곳에서 센다 ----------
// 녹봉표: 사다리 단계별 한 해 녹봉(냥). 문파 제자는 집사 전까지 먹고 자는 것만 받는다
const STIPEND = [0, 0, 2, 4, 8, 15, 25, 40, 60, 90, 130, 200];
function economyYear(P, cnt) {
  const led = { in: [], out: [] }, gain = (n, why) => { n = Math.round(n); if (n > 0) { P.wealth += n; led.in.push([why, n]); } }, spend = (n, why) => { n = Math.round(Math.min(n, P.wealth)); if (n > 0) { P.wealth -= n; led.out.push([why, n]); } };
  const tier = (G.WEALTH.slice().reverse().find(w => P.wealth >= w.min) || G.WEALTH[0]);
  const m = P.member, f = m && facDef(m.fid);
  // 수입
  if (P.career) { const c = careerDef(P.career), fr = careerFrame(c), e = slotEff(cnt.생업 || 0); gain(((fr.income || [])[P.rung] || 2) * (0.3 + 0.7 * e), `${c.n} 일`); }
  if (m && f) {
    const pres = 0.5 + (f.prestige || 1) * 0.5;
    if (m.kind === '객경') gain((30 + P.realm * 25) * pres, '객경 녹봉');
    else if (m.kind !== '속가') {
      const lad = f.lad, base = STIPEND[Math.min(STIPEND.length - 1, m.rank)] * pres;
      if (lad === 'sect' && m.rank < 4) {} // 먹고 자는 것만
      else if (lad === 'bandit') gain(base + 5 + m.rank * 4, '산채의 몫');
      else if (lad === 'escort') gain(base + 8 + m.rank * 6, '표국 품삯');
      else if (lad === 'assassin') gain(base + 6, '살막의 몫');
      else gain(base, lad === 'clan' ? '가문의 용돈' : lad === 'guard' ? '관부 녹봉' : '직위 녹봉');
    }
  }
  if (!m && !P.career && P.realm >= 1 && P.age >= 16) gain((3 + P.realm * 5) * (0.5 + P.R()), '품팔이·호위 잡일');
  const pupils = P.bonds.filter(b => b.alive && b.rels.includes('제자') && !(m && f && b.org === f.n));
  if (pupils.length) gain(pupils.length * (2 + stageOf(P.fame) * 4), `제자 ${pupils.length}명의 사례`);
  if (P.biz) gain(P.biz * (P.rung + 1) * 20, '가게 수입');
  if (P.force) { const F = P.force, all = F.men * (F.kind === '상단' ? 3 : F.kind === '산채' ? 2.2 : F.kind === '문파' ? 1.4 : 1.2) * FORCE_INCOME_MUL[forceTierOf(F)]; F.treasury = Math.round((F.treasury || 0) + all * 0.75 - F.men * 0.8); if (F.treasury < 0) { const d = Math.min(F.men - 3, Math.ceil(-F.treasury / 5)); F.men -= Math.max(0, d); F.treasury = 0; if (d > 0) say(P, `${F.name}의 곳간이 비어 ${d}명이 떠났다.`, 'ng'); } F.inc = Math.round(all); gain(all * 0.25, `${F.name}에서 받는 몫`); }
  // 지출
  const fed = m && m.kind !== '속가' && m.disc !== '속가제자' && !(f && f.lad === 'bandit' && m.rank >= 3) ? 0.2 : 1;
  spend(tier.living * 0.6 * fed, '먹고 자는 데');
  if (P.spouse && P.spouse.alive) spend(tier.living * 0.4, '식솔');
  if (P.kids) spend(tier.living * 0.15 * Math.min(P.kids, 6), '자식들');
  if (P.hurt >= 2 || P.illYear || P.poison) spend(P.hurt >= 3 ? 40 : 15, '약값');
  if (P.flags.hidden) {} // 은거하면 쓸 데가 없다
  P.ledger = led; P.ledgerY = P.year;
  if (P.wealth >= 100000) addAch(P, '거부');
  // 큰 변화가 있는 해만 장부를 적는다
  const tin = led.in.reduce((a, x) => a + x[1], 0), tout = led.out.reduce((a, x) => a + x[1], 0);
  if (P.age >= 16 && (Math.abs(tin - tout) >= 200 || P.R() < 0.08)) say(P, `한 해 살림: 들어온 돈 ${num(tin)}냥${led.in.length ? `(${led.in.map(x => x[0]).join(', ')})` : ''}, 나간 돈 ${num(tout)}냥.`, 'muted');
}
LIFE.ledgerOf = P => P.ledger;

// ---------- 전리품(9-38): 꺾은 상대가 지니던 것, 무너뜨린 세력의 곳간 ----------
function loot(P, n, scale = 1, why) {
  const lv = Math.max(0, n.realm || 0), dirty = n.t === '사' || n.t === '마' || /흑도|산적|수적|마적|녹림|채주|두목|마두|교도|살수|자객/.test(n.role || '');
  const got = [];
  const coin = Math.round((5 + lv * lv * 12) * scale * (dirty ? 1.5 : 0.6) * (0.5 + P.R()));
  if (coin > 0) { P.wealth += coin; got.push(`은자 ${coin}냥`); }
  if (P.R() < 0.05 * scale * (1 + lv * 0.3)) { const g = lv >= 4 ? '상품' : lv >= 2 ? '중품' : '하품'; givePill(P, g); got.push(`${g} 영약`); }
  if (P.R() < 0.04 * scale * (1 + lv * 0.25)) { giveWeapon(P, lv >= 4 ? '보검' : '명병'); got.push('병기'); }
  if (P.R() < 0.03 * scale * (1 + lv * 0.25)) { giveArt(P, GRADES[Math.min(4, COMMON_GRADE[lv] || 0)], null, `${n.name}의 품에서 나온 비급으로 익혔다`); got.push('비급'); }
  if (got.length) { say(P, `${why || n.name + '에게서'} 거둔 것: ${got.join(', ')}.`, 'ok'); addAch(P, '전리품'); }
}
function sackForce(P, name, men, avgRealm) {
  const coin = Math.round(men * (8 + avgRealm * 10) * (0.6 + P.R() * 0.8));
  P.wealth += coin;
  const got = [`곳간의 은자 ${num(coin)}냥`];
  for (let i = 0; i < 1 + Math.floor(men / 30); i++) if (P.R() < 0.5) { const g = avgRealm >= 3 ? '상품' : avgRealm >= 1 ? '중품' : '하품'; givePill(P, g); got.push(`${g} 영약`); }
  if (P.R() < 0.5) { giveWeapon(P, avgRealm >= 3 ? '보검' : '명병'); got.push('무구'); }
  if (P.R() < 0.4) { giveArt(P, GRADES[Math.min(4, (COMMON_GRADE[Math.round(avgRealm) + 1] || 1))], null, `${name}의 서고에서 나온 비급으로 익혔다`); got.push('서고의 비급'); }
  say(P, `${name}의 거처를 뒤져 거둔 것: ${got.join(', ')}.`, 'big'); addAch(P, '곳간을 털다');
}
function giveWeapon(P, g) { const lv = { 명병: 1, 보검: 2, 신병이기: 3 }[g] || 1; if (lv > (P.weapon || 0)) { P.weapon = lv; say(P, `${J(g, '을를')} 손에 넣었다.`, 'ok'); } else P.wealth += [0, 200, 1500, 8000][lv]; }
// ---------- 상점(10단계 9-13) ----------
const PRICE = { 하품: 30, 중품: 300, 상품: 3000, 극품: 30000 };
const WPRICE = [0, 400, 6000, 80000], MPRICE = [60, 250, 1200, 9000];
const GENERAL = /약방|의원|표국|도가 문파|기루/;
function shopsHere(P) { return shopsHere2(P); }
LIFE.shopsHere = shopsHere;
function shopStock(P, shop) {
  const rr = rng((P.year * 131 + (G.PLACES2[P.place] ? G.PLACES2[P.place].x * 7 : 0) + shop.length * 977) >>> 0);
  const price = (base) => Math.round(base * ((G.REGIONS[P.region] || {}).price || 1) * (0.7 + rr() * 0.6));
  const mine = P.member && P.member.fid, fName = mine && facDef(mine).n;
  const pills = q => G.PILLS.filter(x => x.q === q && (GENERAL.test(x.src) || shop === '흑점' || shop === '경매' || (fName && x.src.includes(fName.slice(0, 2)))));
  const herbs = q => (G.HERBS || []).flatMap(h => (h.ages || []).filter(a => a[2] === q).map(a => ({ id: h.id, n: a[1], q, qi: a[3] })));
  const it = [];
  const addPill = (x, q) => it.push({ k: 'pill', n: x.n, q, qi: x.qi || 0, side: x.side, price: price(PRICE[q]), big: !!x.big });
  const pick = (a, n) => a.slice().sort(() => rr() - 0.5).slice(0, n);
  if (shop === '장터') { pick(pills('하품'), 3).forEach(x => addPill(x, '하품')); pick(herbs('하품'), 1).forEach(x => addPill(x, '하품')); if (rr() < 0.3) it.push({ k: 'weapon', n: '쓸 만한 칼(명병)', lv: 1, price: price(WPRICE[1]) }); it.push({ k: 'manual', n: '삼류 비급', g: 0, price: price(MPRICE[0]) }); }
  if (shop === '큰 가게') { pick(pills('중품').concat(herbs('중품')), 3).forEach(x => addPill(x, '중품')); it.push({ k: 'weapon', n: '명병', lv: 1, price: price(WPRICE[1]) }); it.push({ k: 'manual', n: '이류 비급', g: 1, price: price(MPRICE[1]) }); if (rr() < 0.4) it.push({ k: 'manual', n: '일류 비급', g: 2, price: price(MPRICE[2]) }); }
  if (shop === '흑점') { pick(pills('상품').concat(herbs('상품')), 3).forEach(x => addPill(x, '상품')); if (rr() < 0.6) it.push({ k: 'weapon', n: '보검', lv: 2, price: price(WPRICE[2]) }); it.push({ k: 'manual', n: '일류 비급', g: 2, price: price(MPRICE[2]) }); if (rr() < 0.4) it.push({ k: 'manual', n: '상승 비급', g: 3, price: price(MPRICE[3]) }); const t = pick((G.TREASURES || []).filter(x => ['renpi', 'bidu', 'yemingzhu'].includes(x.id)), 1)[0]; if (t) it.push({ k: 'treasure', n: t.n, id: t.id, price: price(t.q === '상품' ? 4000 : 800) }); }
  if (shop === '경매') { pick(pills('극품').concat(herbs('극품')), 2).forEach(x => addPill(x, '극품')); if (rr() < 0.5) it.push({ k: 'weapon', n: '신병이기', lv: 3, price: price(WPRICE[3]) }); it.push({ k: 'manual', n: '상승 비급', g: 3, price: price(MPRICE[3]) }); const t = pick((G.TREASURES || []).filter(x => ['tiancansi', 'lengyu'].includes(x.id)), 1)[0]; if (t) it.push({ k: 'treasure', n: t.n, id: t.id, price: price(20000) }); }
  shopStock2(P, shop, it, rr, price, pills, herbs, addPill, pick);
  return it.filter(x => !(P.bought || {})[shop + x.n + P.year]);
}
function* doShop(P) {
  const shops = shopsHere(P); if (!shops.length) { say(P, '이 근처에는 가게가 없다.', 'muted', P.month); return; }
  const si = shops.length > 1 ? yield { ask: '가게', text: `${atText(P)}. 어느 가게에 갈까?`, options: shops.map(s => [s, SHOP_DESC[s] || '']) } : 0;
  const shop = shops[si];
  for (let n = 0; n < 4; n++) {
    const st = shopStock(P, shop);
    if (!st.length) { say(P, '살 만한 것이 더 없다.', 'muted', P.month); return; }
    const ch = yield { ask: shop, text: `${atText(P)}의 ${shop}. 가진 돈 ${Math.round(P.wealth).toLocaleString()}냥.`, options: st.map(x => [x.n + (x.q ? ` (${x.q})` : ''), `${x.price.toLocaleString()}냥${x.price > P.wealth ? ' — 돈이 모자라다' : ''}`]).concat([['슬쩍 훔친다', '정교·순발. 걸리면 큰일'], ['나간다', '']]) };
    if (ch > st.length) return;
    let x = st[ch];
    // 훔치기(9-52): 걸리면 가게 호위와 싸우거나 관아에 끌려간다. 흑점·경매에서 걸리면 목숨이 걸린다
    if (ch === st.length) {
      x = st.slice().sort((a, b) => b.price - a.price)[Math.floor(P.R() * Math.min(2, st.length))];
      const hard = { 흑점: 80, 경매: 90, 골동품점: 65, '큰 가게': 60, '서역 상인': 60 }[shop] || 50;
      const r = check(P, '정교', hard, (baseOf(P, '순발') - 100) / 6 + (P.career === 'thief' ? 20 : 0));
      if (r.ok) { say(P, `${shop}에서 ${J(x.n, '을를')} 슬쩍했다.`, 'act', P.month); x = Object.assign({}, x, { price: 0 }); addFame(P, 15, 'infamy'); P.align = clamp(P.align - 3, -100, 100); addAch(P, '손버릇'); P.deeds.도둑질 = (P.deeds.도둑질 || 0) + 1; }
      else { say(P, `${x.n}에 손을 대다 들켰다.`, 'ng', P.month); if (shop === '흑점' || shop === '경매') { const g = makeNpc(P, shop === '흑점' ? '흑점의 칼잡이' : '경매장 호위대장', [0, 1]); yield* fight(P, g, { lethal: shop === '흑점' }); } else if (P.R() < 0.5) { const g = makeNpc(P, '가게 호위', [-1, 0]); yield* fight(P, g); } else { const fine = Math.min(P.wealth, x.price); P.wealth -= fine; addFame(P, 30, 'infamy'); say(P, `관아에 끌려가 ${fine}냥을 물었다.`, 'ng', P.month); } return; }
    }
    if (x.price > P.wealth) { say(P, `${J(x.n, '을를')} 사기엔 돈이 모자랐다.`, 'muted', P.month); continue; }
    P.wealth -= x.price; P.bought = P.bought || {}; P.bought[shop + x.n + P.year] = 1;
    addAch(P, '돈으로 산 강함');
    if (x.k === 'cure') { P.hurt = Math.max(0, P.hurt - 1); say(P, `${shop}에서 상처를 치료받았다.`, 'act', P.month); continue; }
    if (x.k === 'cure2') { P.poison = 0; say(P, `${shop}에서 해독 탕약을 마셨다.`, 'act', P.month); continue; }
    if (x.k === 'sharpen') { P.wealth += 0; P.flags.sharp = P.year; say(P, '칼날이 다시 섰다. 한동안 손에 착 붙는다.', 'act', P.month); continue; }
    if (x.fake && P.R() < x.fake) { say(P, `${shop}에서 산 ${J(x.n, '이가')} 가짜였다.`, 'ng', P.month); continue; }
    if (x.k === 'pill') {
      if (x.qi) { P.pqi += x.qi; P.pillYear = P.year; }
      if (x.side && x.side.heal) P.hurt = Math.max(0, P.hurt - 1);
      if (x.side && x.side.cure) P.poison = 0;
      if (x.big || x.q === '극품') P.apt.근골 = Math.min(100, P.apt.근골 + 5);
      say(P, `${shop}에서 「${x.n}」${J(x.n, '을를').slice(-1)} ${x.price.toLocaleString()}냥에 사서 먹었다.${x.qi ? ` 약기 ${x.qi}년이 몸에 들었다.` : ''}`, 'act', P.month);
    } else if (x.k === 'weapon') { if (x.lv > P.weapon) P.weapon = x.lv; say(P, `${shop}에서 ${J(x.n, '을를')} 샀다.`, 'act', P.month); }
    else if (x.k === 'manual') { say(P, `${shop}에서 ${J(x.n, '을를')} 샀다.`, 'act', P.month); if (check(P, '학식', 45 + x.g * 8).ok) giveArt(P, GRADES[x.g], null, '산 비급으로 익히기 시작했다'); else say(P, '비급을 펼쳤지만 끝내 해독하지 못했다.', 'ng', P.month); }
    else if (x.k === 'treasure') { P.treasures = (P.treasures || []).concat(x.n); if (x.id === 'tiancansi') P.flags.armor = true; if (x.id === 'lengyu') P.flags.jadeSeat = true; say(P, `${shop}에서 「${x.n}」${J(x.n, '을를').slice(-1)} 손에 넣었다.`, 'act', P.month); }
  }
}

// ---------- 가게 종류(9-47) ----------
// 고을마다 서는 가게가 다르다. 흑점은 장물과 금지된 물건을 다루는 곳이라 흑도에 줄이 있거나 이름난 사람만 들어간다
const SHOP_DESC = { 장터: '흔한 물건', 약방: '탕약과 영약, 상처 치료', 대장간: '병기를 사고 벼린다', 헌책방: '낡은 책 사이에 비급이 섞였다', 행상: '떠도는 장사꾼, 무엇이 나올지 모른다', '큰 가게': '중품 영약·명병', 골동품점: '옛 보물, 진짜인지는 모른다', '서역 상인': '먼 곳의 진귀한 물건', 흑점: '장물과 금지된 물건, 출처는 묻지 않는다', 경매: '천하의 보물' };
function shopsHere2(P) {
  const p = G.PLACES2[P.place]; if (!p || !['성', '진', '관문'].includes(p.t)) return [];
  const fs = Math.max(stageOf(P.fame), stageOf(P.infamy)), lad = ladOf(P);
  const rr = rng((P.year * 977 + (p.x || 0) * 31 + (p.y || 0)) >>> 0);
  const out = ['장터'];
  if (p.t !== '관문') out.push('약방');
  if (p.t === '성' || rr() < 0.5) out.push('대장간');
  if (p.t === '성' && rr() < 0.7) out.push('헌책방');
  if (rr() < 0.35) out.push('행상');
  if (p.t === '성' && rangeLevel(P) >= 1) out.push('큰 가게');
  if (p.t === '성' && rr() < 0.4) out.push('골동품점');
  if ((p.t === '성' || p.t === '관문') && ['서역', '감숙', '섬서', '새외', '대막'].some(k => (p.r || '').includes(k) || (G.REGIONS[p.r] || {}).zone !== '중원') && rr() < 0.6) out.push('서역 상인');
  if (p.t === '성' && (lad === 'bandit' || lad === 'info' || lad === 'assassin' || P.align <= -20 || fs >= 2 || (P.knownBackers || []).length)) out.push('흑점');
  if (LIFE.BIG.has(P.place) && (stageOf(P.fame) >= 3 || P.wealth >= 20000)) out.push('경매');
  return out;
}
function shopStock2(P, shop, it, rr, price, pills, herbs, addPill, pick) {
  if (shop === '약방') { pick(pills('하품').concat(herbs('하품')), 2).forEach(x => addPill(x, '하품')); if (rr() < 0.5) pick(pills('중품'), 1).forEach(x => addPill(x, '중품')); it.push({ k: 'cure', n: '상처 치료', price: price(20) }); it.push({ k: 'cure2', n: '해독 탕약', price: price(40) }); }
  if (shop === '대장간') { it.push({ k: 'weapon', n: '쓸 만한 칼(명병)', lv: 1, price: price(WPRICE[1]) }); if (rr() < 0.25) it.push({ k: 'weapon', n: '잘 벼린 보검', lv: 2, price: price(WPRICE[2] * 1.2) }); if (P.weapon >= 1) it.push({ k: 'sharpen', n: '칼을 다시 벼린다', price: price(60) }); }
  if (shop === '헌책방') { it.push({ k: 'manual', n: '낡은 삼류 비급', g: 0, price: price(MPRICE[0] * 0.6), fake: 0.1 }); if (rr() < 0.5) it.push({ k: 'manual', n: '헌 이류 비급', g: 1, price: price(MPRICE[1] * 0.7), fake: 0.2 }); if (rr() < 0.08) it.push({ k: 'manual', n: '먼지 쌓인 이상한 책', g: 3, price: price(80), fake: 0.6 }); }
  if (shop === '행상') { const r = rr(); if (r < 0.4) pick(herbs('하품').concat(herbs('중품')), 1).forEach(x => addPill(x, x.q)); else if (r < 0.7) it.push({ k: 'manual', n: '행상이 파는 비급', g: rr() < 0.8 ? 0 : 1, price: price(40), fake: 0.45 }); else it.push({ k: 'weapon', n: '행상의 칼', lv: 1, price: price(WPRICE[1] * 0.5), fake: 0.5 }); if (rr() < 0.15) { const t = pk(P, G.TREASURES || []); if (t) it.push({ k: 'treasure', id: t.id, n: t.n, price: price(500), fake: 0.5 }); } }
  if (shop === '골동품점') { for (const t of pick(G.TREASURES || [], 2)) it.push({ k: 'treasure', id: t.id, n: t.n, price: price(1500 + rr() * 3000), fake: 0.35 }); if (rr() < 0.3) it.push({ k: 'weapon', n: '옛 명장의 칼', lv: 2, price: price(WPRICE[2] * 0.8), fake: 0.35 }); }
  if (shop === '서역 상인') { pick(pills('중품').concat(pills('상품')), 2).forEach(x => addPill(x, x.q)); if (rr() < 0.4) it.push({ k: 'manual', n: '서역 무공의 경전', g: 2, price: price(MPRICE[2] * 1.3), fake: 0.15 }); const t = pk(P, G.TREASURES || []); if (t) it.push({ k: 'treasure', id: t.id, n: t.n, price: price(2500) }); }
}
// 비급을 구한다(9-47): 파는 사람이 고을과 처지에 따라 다르다
function* buyManual(P) {
  const p = G.PLACES2[P.place], lad = ladOf(P);
  const sellers = [['헌책방 주인', [['낡은 삼류 비급', 0, 40, 0.1], ['헌 이류 비급', 1, 160, 0.2]], p && p.t === '성' ? 3 : 1], ['떠돌이 책장수', [['삼류 비급', 0, 25, 0.4], ['이류 비급이라는 책', 1, 90, 0.5], ['일류 비급이라는 책', 2, 300, 0.7]], 2]];
  if (p && p.t === '성' && (lad === 'bandit' || lad === 'info' || lad === 'assassin' || P.align <= -20 || P.realm >= 3 || (P.knownBackers || []).length)) sellers.push(['흑점 주인', [['일류 비급', 2, 1000, 0.2], ['상승 비급', 3, 5000, 0.25]], 2]);
  if (P.member && ['sect', 'clan'].includes(lad)) sellers.push(['사문 장경각의 필사승', [['사문의 필사본', Math.min(3, accessGrade(P)), 30 + P.member.rank * 20, 0]], 2]);
  const [who, tiers] = wpick(P, sellers, s => s[2]);
  const can = tiers.filter(t => t[2] <= P.wealth);
  if (!can.length) { say(P, `${who}를 찾아갔지만 살 만한 돈이 없었다.`, 'muted', P.month); return; }
  const ch = yield { ask: who, text: `${who}가 책 몇 권을 늘어놓는다.${who.startsWith('떠돌이') ? ' 진짜인지는 펼쳐 봐야 안다.' : who.startsWith('흑점') ? ' 어디서 나온 물건인지는 묻지 않는 것이 규칙이다.' : ''}`, month: P.month, options: can.map(t => [t[0], `${t[2]}냥`]).concat([['그만둔다', '']]) };
  if (ch >= can.length) return;
  const t = can[ch]; P.wealth -= t[2];
  if (P.R() < t[3]) { say(P, `산 ${J(t[0], '이가')} 가짜였다. ${who}는 이미 자취를 감췄다.`, 'ng', P.month); return; }
  if (check(P, '학식', 40 + t[1] * 8).ok) giveArt(P, GRADES[t[1]], who.includes('사문') ? { fid: P.member.fid } : null, `${who}에게서 산 책으로 익히기 시작했다`); else say(P, '책을 펼쳤지만 끝내 해독하지 못했다.', 'ng', P.month);
}

// ---------- 수소문(9-48): 지금 알아보면 몇 달 뒤 일이 찾아온다 ----------
const LEAD_KINDS = [
  { k: 'master', n: '이름난 스승의 행방', cost: 20, ok: P => !relPeople(P, ['스승']).some(b => b.alive && b.realm > P.realm) && P.age <= 50 },
  { k: 'foe', n: '원수의 행방', cost: 30, ok: P => relPeople(P, ['원수']).length > 0 },
  { k: 'kin', n: '소식 끊긴 사람의 행방', cost: 15, ok: P => P.bonds.some(b => b.alive && b.bond >= 30 && b.home && b.home !== P.place) },
  { k: 'manual', n: '진짜 비급을 파는 곳', cost: 40, ok: P => P.arts.length > 0 },
  { k: 'elixir', n: '영약·영물의 소문', cost: 30, ok: P => P.age >= 15 },
  { k: 'job', n: '큰 돈벌이 자리', cost: 10, ok: P => P.age >= 16 },
  { k: 'backer', n: '이 고을 흑도의 뒷배', cost: 15, ok: P => P.age >= 16 },
  { k: 'love', n: '마음에 둔 사람의 마음', cost: 10, ok: P => relPeople(P, ['마음에 둔 사람']).length > 0 },
];
function leadOffers(P) {
  P.leads = P.leads || [];
  if (P.leads.length >= 1 || P.age < 14 || P.R() < 0.55) return [];
  const l = LEAD_KINDS.filter(x => x.ok(P) && !P.leads.some(y => y.k === x.k) && !(P.leadUsed && P.leadUsed[x.k] >= P.year - 4));
  if (!l.length) return [];
  const x = pk(P, l);
  return [{ n: `수소문한다: ${x.n}`, hint: `${x.cost}냥. 몇 달 뒤 소식이 온다`, go: function* () {
    P.wealth = Math.max(0, P.wealth - x.cost); P.leadUsed = P.leadUsed || {}; P.leadUsed[x.k] = P.year;
    const sk = check(P, '수읽기', 50, (P.knownBackers || []).length * 2 + (ladOf(P) === 'info' || ladOf(P) === 'beggar' ? 15 : 0));
    const at = P.year * 12 + P.month + 2 + Math.floor(P.R() * 6);
    P.leads.push({ k: x.k, at, good: sk.ok, crit: sk.crit });
    say(P, `${pk(P, ['객잔 주인에게', '하오문 꼬마에게', '거지 아이들에게', '표국 쟁자수들에게', '찻집 노인들에게'])} ${x.cost}냥을 쥐여 주고 「${x.n}」을 알아봐 달라 했다.`, 'act', P.month);
  } }];
}
function* leadStep(P) {
  if (!(P.leads || []).length) return;
  const now = P.year * 12 + P.month, due = P.leads.filter(l => l.at <= now);
  if (!due.length) return;
  P.leads = P.leads.filter(l => l.at > now);
  for (const L of due) {
    if (!L.good && P.R() < 0.6) { say(P, `맡겨 둔 수소문(${(LEAD_KINDS.find(x => x.k === L.k) || {}).n})은 헛소문만 물어 왔다.`, 'muted', P.month); continue; }
    if (L.k === 'master') { say(P, '수소문 끝에 은거한 고수가 머무는 곳을 알아냈다.', 'path', P.month); P.flags.masterLuck = Math.max(P.flags.masterLuck || 0, 1); yield* seekMaster(P); }
    else if (L.k === 'foe') { const f = relPeople(P, ['원수'])[0]; if (!f) continue; say(P, `${J(f.name, '이가')} 어디 머무는지 알아냈다. 먼저 칠 수 있다.`, 'path', P.month); f.intel = true; know(P, f, 3); const r = yield* fightAsk(P, f, '원수를 먼저 친다', { lethal: true, pMul: 1.15 }); if (r.win) { f.rels = f.rels.filter(x => x !== '원수'); addAch(P, '원한을 끊다'); } }
    else if (L.k === 'kin') { const b = P.bonds.filter(b => b.alive && b.bond >= 30 && b.home && b.home !== P.place).sort((a, c) => c.bond - a.bond)[0]; if (!b) continue; b.bond += 10; know(P, b); say(P, `${J(b.name, '이가')} ${atText({ place: b.home })}에 있다는 소식을 들었다.${b.title ? ` 이제 ${b.title}라고 한다.` : ''}${b.trouble ? ` 곤경에 빠졌다고 한다 — ${b.trouble.k}.` : ''}`, 'bond', P.month); }
    else if (L.k === 'manual') { say(P, '진짜 비급을 파는 사람을 찾았다.', 'path', P.month); const g = Math.min(3, (mainArt(P) ? gIdx(mainArt(P).def.g) : 0) + (L.crit ? 1 : 0)); const c = MPRICE[g]; const ch = yield { ask: '수소문의 끝', text: `${GRADES[g]} 비급이다. 진본이라는 보증이 붙었다. ${c}냥.`, month: P.month, options: [['산다', `${c}냥`], ['그만둔다', '']] }; if (ch === 0 && P.wealth >= c) { P.wealth -= c; giveArt(P, GRADES[g], null, '수소문 끝에 구한 진본으로 익히기 시작했다'); } else if (ch === 0) say(P, '값을 치를 돈이 모자랐다.', 'muted', P.month); }
    else if (L.k === 'elixir') { const k = pk(P, ['영물', '천년 영초', '신병이기', '비급 출세']); yield* applyFx(P, ['rumor:' + k]); say(P, `「${k}」에 관한 믿을 만한 소식을 얻었다.`, 'rumor', P.month); }
    else if (L.k === 'job') { const w = 40 + Math.floor(P.R() * 80) + P.realm * 30; const ch = yield { ask: '수소문의 끝', text: pk(P, [`부잣집 호위 자리가 났다. 석 달에 ${w}냥.`, `표국에서 한 철 표사를 구한다. ${w}냥.`, `관아에서 도적 잡는 일에 현상금을 걸었다. ${w}냥.`]), month: P.month, options: [['맡는다', ''], ['그만둔다', '']] }; if (ch === 0) { const n = makeNpc(P, pk(P, ['산적 두목', '흉적', '도둑 떼 우두머리']), [-1, 1]); const r = yield* fight(P, n); if (r.win) { P.wealth += w; say(P, `일을 끝내고 ${w}냥을 받았다.`, 'ok', P.month); } } }
    else if (L.k === 'backer') { const bk = G.FACTIONS.filter(f => factionAlive(P, f.id) && (f.t === '사' || f.lad === 'info' || f.lad === 'bandit') && (f.prestige || 0) >= 1); if (!bk.length) continue; const b = pk(P, bk); P.knownBackers = (P.knownBackers || []).concat(b.id); say(P, `이 고을 흑도 뒤에 ${J(b.n, '이가')} 있다는 것을 알아냈다. 흑점에도 줄이 닿았다.`, 'path', P.month); }
    else if (L.k === 'love') { const b = relPeople(P, ['마음에 둔 사람'])[0]; if (!b) continue; const yes = b.heart > 0.4 || L.crit; say(P, yes ? `${J(b.name, '이가')} 나를 마음에 두고 있다는 말을 들었다.` : `${J(b.name, '은는')} 다른 사람을 마음에 두었다고 한다.`, 'bond', P.month); if (yes) b.bond += 15; else b.bond -= 5; }
  }
}

// ---------- 인연(10단계 9-14) ----------
const TEMPER = ['다정하다', '무뚝뚝하다', '당차다', '수줍음이 많다', '고집이 세다', '쾌활하다', '차갑다', '욕심이 많다', '의리가 있다', '허영심이 있다', '속이 깊다', '짓궂다'];
const KNOW = ['이름', '나이와 출신', '성정', '소속과 하는 일', '경지'];
const BOND_STAGE = b => b >= 60 ? '깊은 사이' : b >= 30 ? '가까운 사이' : b >= 10 ? '아는 사이' : '낯선 사이';
LIFE.BOND_STAGE = BOND_STAGE; LIFE.KNOW = KNOW;
// 인물에 알 수 있는 정보를 붙인다(처음 만났을 때 이름만 안다)
function fleshOut(P, n) {
  if (n.age != null) return n;
  const og = pk(P, G.ORIGINS.filter(o => !o.region || o.region === P.region) || G.ORIGINS);
  n.age = clamp(P.age + Math.round((P.R() - 0.5) * 12), 15, 90);
  n.from = og ? og.n : '평범한 집';
  n.temper = pk(P, TEMPER);
  n.job = og && og.career ? careerDef(og.career).n : og && (og.join || og.f) ? (facDef((og.join || [og.f])[0]) || {}).n || '무가' : '집안일';
  n.heart = P.R(); n.know = n.know || 1; n.home = n.home || P.place;
  return n;
}
function know(P, n, k = 1) { n.know = Math.min(5, (n.know || 1) + k); }
LIFE.npcInfo = function (P, n) {
  const rows = [['이름', n.name]];
  rows.push(['나이와 출신', n.know >= 2 && n.age != null ? `${n.age}세, ${n.from}` : '?']);
  rows.push(['성정', n.know >= 3 && n.temper ? n.temper : '?']);
  rows.push(['하는 일', n.know >= 4 ? (n.org || n.job || n.role) : '?']);
  rows.push(['경지', n.know >= 5 ? (n.realm ? REALMS[n.realm] : '무공을 모른다') : '?']);
  return rows;
};
const MEET = [
  ['장터에서 부딪쳐 짐을 쏟은', '장터'], ['등불 축제에서 눈이 마주친', '거리'], ['약방에서 약을 짓던', '약방'], ['객잔 주인의 자식인', '객잔'], ['비를 피하다 처마 밑에서 만난', '거리'], ['나룻배에 함께 탄', '나루'], ['절에 불공을 드리러 온', '사당'],
];
const DATE = [
  ['함께 장을 보며 흥정을 했다', '지략'], ['등불 축제에 함께 갔다', '풍모'], ['비 오는 날 우산을 함께 썼다', '성품'], ['밤늦도록 속 이야기를 나눴다', '정신력'], ['아픈 날 곁을 지켰다', '성품'], ['서툰 솜씨로 선물을 만들어 건넸다', '정교'],
];
function loveOf(P) { return P.bonds.find(b => b.alive && b.rels.some(r => ['마음에 둔 사람', '정인', '혼약'].includes(r))); }
LIFE.loveOf = loveOf;
function* meetSomeone(P) {
  if (P.spouse || loveOf(P) || P.age < 16 || P.age > 45) return;
  const p = 0.1 * (0.5 + P.apt.풍모 / 100) * (1 + stageOf(P.fame) * 0.2);
  if (P.R() >= p) return;
  const sexW = P.sex === 'm' ? 'f' : 'm';
  let n, scene;
  if (P.member && P.R() < 0.35) { n = makeNpc(P, sexW === 'f' ? '사매' : '사형', [-1, 0]); n.org = facDef(P.member.fid).n; scene = ['같은 사문의', '연무장']; }
  else { scene = pk(P, MEET); n = makeNpc(P, sexW === 'f' ? '아가씨' : '젊은이', [-4, -1]); }
  n.sex = sexW; fleshOut(P, n);
  const text = `${atText(P, scene[1])}에서 ${scene[0]} ${n.sex === 'f' ? '여인' : '사내'} ${n.name}. 자꾸 눈길이 간다.`;
  const ch = yield { ask: '눈에 들어온 사람', text, options: [['말을 건다', '풍모'], ['그냥 지나친다', '']], who: n };
  say(P, text, 'love'); say(P, `▸ ${ch ? '그냥 지나친다' : '말을 건다'}`, 'pick');
  if (ch === 1) return;
  const r = check(P, '풍모', 40);
  meet(P, n, '마음에 둔 사람'); n.bond = r.ok ? 12 : 4; know(P, n, r.ok ? 1 : 0);
  say(P, r.ok ? `${n.name}이 웃으며 이름을 알려 주었다.` : '어색하게 몇 마디를 나눴다.', r.ok ? 'ok' : '');
  addAch(P, '첫 만남');
}
function* loveStep(P, sch) {
  const n = loveOf(P); if (!n) return;
  const want = (sch.cnt.연애 || 0) > 0 ? 0.35 : 0.08;
  if (P.R() >= want) return;
  n.met = P.year;
  const [txt, st] = pk(P, DATE);
  const r = check(P, st, 45);
  n.bond += r.crit ? 15 : r.ok ? 9 : r.fum ? -5 : 2;
  if (r.ok) know(P, n);
  say(P, `${J(n.name, '과와')} ${txt}. ${r.ok ? '한 걸음 가까워졌다.' : '어딘가 어긋났다.'}`, 'love', P.month);
  if (n.rels.includes('마음에 둔 사람') && n.bond >= 30) {
    const ch = yield { ask: '고백', text: `${n.name}에게 마음을 털어놓을까? 지금은 ${BOND_STAGE(n.bond)}다.`, month: P.month, options: [['마음을 털어놓는다', '받아 줄지는 모른다'], ['아직이다', '']], who: n };
    if (ch === 0) {
      const ok = n.heart + (P.apt.풍모 - 50) / 200 + (n.bond - 30) / 100 > 0.45;
      if (ok) { n.rels = n.rels.filter(x => x !== '마음에 둔 사람').concat('정인'); n.bond += 10; know(P, n); say(P, `${J(n.name, '이가')} 고개를 끄덕였다. 정인이 되었다.`, 'big', P.month); addAch(P, '정인'); }
      else { n.bond -= 15; say(P, `${J(n.name, '이가')} 고개를 저었다.`, 'ng', P.month); addAch(P, '짝사랑'); if (n.bond < 5) { n.rels = n.rels.filter(x => x !== '마음에 둔 사람'); say(P, '마음을 접었다.', 'muted', P.month); } }
    }
  } else if (n.rels.includes('정인') && n.bond >= 60) {
    const ch = yield { ask: '청혼', text: `${J(n.name, '과와')} 백년가약을 맺을까?`, month: P.month, options: [['청혼한다', ''], ['아직이다', '']], who: n };
    if (ch === 0) {
      const gap = Math.abs(P.align - (n.t === '사' ? -30 : n.t === '마' ? -60 : 10)) > 60 || (P.origin.status === '천민') !== /천민|노비/.test(n.from || '') || n.rels.includes('원수');
      if (gap) { n.rels = n.rels.filter(x => x !== '정인').concat('혼약'); P.flags.loveGap = true; say(P, '청혼을 받아들였다. 그러나 집안의 반대가 거세다.', 'big', P.month); }
      else yield* wed(P, n);
    }
  } else if (n.rels.includes('혼약')) {
    const r2 = check(P, '의지', 60);
    say(P, `혼사를 반대하는 목소리를 설득하려 애썼다. ${r2.ok ? '마침내 허락이 떨어졌다.' : '아직 벽이 높다.'}`, r2.ok ? 'ok' : 'ng', P.month);
    if (r2.ok) yield* wed(P, n);
  }
}
function* wed(P, n) {
  n.rels = n.rels.filter(x => !['정인', '혼약', '마음에 둔 사람'].includes(x)).concat('배우자');
  P.spouse = n; P.married = P.year; know(P, n, 5); ruleBreak(P, '혼인');
  say(P, `${J(n.name, '과와')} 혼례를 올렸다.`, 'big', P.month);
  P.events.push(`${P.age}세에 ${J(n.name, '과와')} 혼인했다`);
  addAch(P, '혼례');
}
// 중매·세가 혼담은 선을 보는 만남으로 시작한다
function* matchmaking(P) {
  if (P.spouse || loveOf(P) || P.age < 18 || P.age > 38) return;
  if (P.R() >= 0.06 * (1 + stageOf(P.fame) * 0.3)) return;
  const rich = stageOf(P.fame) >= 2 && P.R() < 0.5;
  const sexW = P.sex === 'm' ? 'f' : 'm';
  const n = makeNpc(P, rich ? (sexW === 'f' ? '세가의 아가씨' : '세가의 공자') : (sexW === 'f' ? '이웃 처녀' : '이웃 총각'), [-3, -1]);
  n.sex = sexW; fleshOut(P, n); if (rich) { const f = pk(P, G.FACTIONS.filter(x => x.cat === '세가')); n.org = f.n; n.name = (f.sur || '') + n.name.slice(1); }
  const text = rich ? `${n.org}에서 혼담을 넣었다. 선을 보자 한다. 상대는 ${n.name}.` : `중매쟁이가 ${J(n.name, '과와')}의 선 자리를 가져왔다.`;
  const ch = yield { ask: '혼담', text, options: [['선을 본다', '만나서 정한다'], ['거절한다', '']], who: n };
  say(P, text, 'love'); say(P, `▸ ${ch ? '거절한다' : '선을 본다'}`, 'pick');
  if (ch === 1) return;
  meet(P, n, '마음에 둔 사람'); n.bond = 15 + (rich ? 10 : 0); know(P, n, 2);
  say(P, `${J(n.name, '과와')} 마주 앉았다. ${n.temper ? `${n.temper}는 인상이었다.` : ''}`, 'love');
}

// ---------- 관계와 관계도(10단계 9-15) ----------
const REL_COLOR = { 스승: '#a07a1c', 제자: '#33577a', 정인: '#c0507a', 배우자: '#c0507a', 혼약: '#c0507a', '마음에 둔 사람': '#d98aa6', 벗: '#2f6b57', 의형제: '#1f8a5a', 맞수: '#c8473a', 원수: '#8f1d14', 수하: '#7a4f1a', 은인: '#6a8a2f' };
LIFE.REL_COLOR = REL_COLOR;
function facIdByName(P, name) {
  if (!name) return null;
  const f = G.FACTIONS.find(x => x.n === name); if (f) return f.id;
  if (P.world) { const w = P.world.list.find(x => x.n === name); if (w) return w.id; }
  return null;
}
function repAdd(P, fid, v) { if (!fid) return; P.rep[fid] = clamp((P.rep[fid] || 0) + v, -100, 100); }
LIFE.repOf = (P, fid) => P.rep[fid] || 0;
function relPeople(P, rels) { return P.bonds.filter(b => b.alive && b.rels.some(r => rels.includes(r))); }
const TEACH_LINES = ['스승 {who}가 새벽 수련을 지켜보다 손목 각도를 고쳐 주었다.', '{who}가 차를 따르며 옛 싸움 이야기를 들려주었다.', '{who}에게 초식 하나를 열 번 넘게 퇴짜 맞았다.', '{who}가 말없이 나뭇가지로 땅에 검로를 그려 보였다.', '{who}와 밤새 운기의 이치를 두고 이야기를 나눴다.', '{who}가 처음으로 술 한 잔을 따라 주었다.', '{who}에게 꾸지람을 들었다. 마음이 들떠 있다고.', '{who}의 심부름으로 산 아래 마을에 다녀왔다.', '{who}가 내 칼을 받아 들고 한참을 들여다보았다.', '{who}가 아프다. 탕약을 달여 올렸다.'];
// 관계별 발전(칸을 쓴 달에 한 번)
function* bondStep(P, sch) {
  const c = sch.cnt;
  // 스승
  const T = relPeople(P, ['스승'])[0];
  if (T && P.R() < ((c.스승 || 0) ? 0.3 : P.member ? 0.06 : 0.03)) {
    T.bond += Math.round((3 + Math.floor(P.R() * 4)) * bondRate(P)); know(P, T);
    // 해마다 같은 줄이 반복되지 않게: 열 가지 장면 가운데 하나, 그것도 절반만 적는다
    if (P.R() < 0.5) say(P, fill(pk(P, TEACH_LINES), T.name, ''), 'bond', P.month);
    if (T.bond >= 30 && !T.taught1) { T.taught1 = 1; giveArt(P, GRADES[Math.min(5, COMMON_GRADE[T.realm] || 0)], T, `스승 ${T.name}에게서 전수받았다`); }
    if (T.bond >= 85 && T.realm > P.realm && !T.taught2) { T.taught2 = 1; giveArt(P, GRADES[Math.min(5, (COMMON_GRADE[T.realm] || 0) + 1)], T, `스승 ${T.name}의 비전으로 받았다`); addAch(P, '비전을 잇다'); }
  }
  // 벗
  const F = relPeople(P, ['벗', '의형제']);
  if (F.length && P.R() < ((c.벗 || 0) ? 0.3 : 0.02)) {
    const f = pk(P, F); f.met = P.year; f.bond += 3 + Math.floor(P.R() * 5); know(P, f);
    say(P, `${pk(P, [`${J(f.name, '과와')} 술잔을 기울였다`, `${J(f.name, '과와')} 함께 산을 올랐다`, `${J(f.name, '이가')} 찾아와 밤새 이야기를 나눴다`, `${J(f.name, '과와')} 비무로 손을 섞었다`])}.`, 'bond', P.month);
    if (f.rels.includes('벗') && !f.rels.includes('의형제') && f.bond >= 60) {
      const ch = yield { ask: '결의', text: `${J(f.name, '과와')} 의형제를 맺을까? 지금은 ${BOND_STAGE(f.bond)}다.`, month: P.month, options: [['결의형제를 맺는다', '생사를 함께한다'], ['벗으로 남는다', '']], who: f };
      if (ch === 0) { f.rels.push('의형제'); say(P, `${J(f.name, '과와')} 의형제를 맺었다.`, 'big', P.month); addAch(P, '결의형제'); }
    }
  }
  // 제자
  const D = relPeople(P, ['제자']);
  if (D.length && P.R() < ((c.제자 || 0) ? 0.35 : 0.05)) {
    const d = pk(P, D); d.met = P.year; d.bond += 6; know(P, d);
    if (P.realm > d.realm && P.R() < 0.25) { d.realm++; say(P, `제자 ${J(d.name, '이가')} ${REALMS[d.realm]}에 올랐다.`, 'ok', P.month); if (d.realm >= 3) addFame(P, 300 * d.realm); }
    else say(P, `제자 ${d.name}에게 무공을 가르쳤다.`, 'bond', P.month);
    if (d.realm > P.realm && P.realm >= 2) addAch(P, '청출어람(제자)');
  }
}
// 인물의 한 해: 나이·죽음·경지, 원수와 맞수의 재방문
// ---------- 문파 규율(9-28): 세력의 rules를 어기면 경고가 쌓이고, 넘치면 파문이다 ----------
function rivalOf(P) {
  const me = P.member && facDef(P.member.fid); if (!me) return null;
  const ids = (G.RIVALS || []).filter(p => p.includes(me.id)).map(p => p[0] === me.id ? p[1] : p[0]);
  const foes = { 정: ['사', '마'], 사: ['정'], 마: ['정'], 중: ['사'] }[me.t] || [];
  const pool = ids.map(facDef).filter(Boolean).concat(G.FACTIONS.filter(f => foes.includes(f.t) && (f.prestige || 0) >= 1).sort(() => P.R() - 0.5).slice(0, 3));
  return pool.length ? pk(P, pool) : null;
}
function ruleBreak(P, kind, why) {
  const m = P.member; if (!m || m.kind === '객경') return;
  const f = facDef(m.fid), rules = (f && f.rules) || [];
  const hit = { 살생: rules.includes('살생 금지') || (rules.some(r => /사사로운 살생/.test(r)) && P.R() < 0.6), 전수: rules.some(r => /무단 전수|유출 금지/.test(r)), 명예: rules.includes('가문 명예'), 혼인: rules.some(r => /혼인 금지/.test(r)) && (m.kind === '정식'), 음주: rules.includes('음주 금지'), 내통: rules.some(r => /내통 금지|배신 금지/.test(r)), 문규: true }[kind];
  if (!hit) return;
  m.warn = (m.warn || 0) + 1;
  say(P, `${f.n}의 규율(${{ 문규: '문규', 명예: '가문 명예', 전수: '비전 무공 무단 전수 금지' }[kind] || kind + ' 금지'})을 어겼다${why ? ' — ' + why : ''}. 경고 ${m.warn}번째.`, 'ng');
  repAdd(P, m.fid, -10); P.merit = Math.max(0, P.merit - 10);
  if (m.warn >= 2) {
    // 두 번째부터는 공적과 말솜씨로 근신에 그칠 수 있다. 근신을 받고도 또 어기면 파문
    if (!m.confined && P.merit >= 30 && check(P, '풍모', 55, P.merit / 10).ok) { m.confined = true; m.warn = 1; P.merit -= 30; addAch(P, '근신'); say(P, `공적을 참작해 근신 처분에 그쳤다. 한 해 동안 산문 밖을 나가지 못한다.`, 'ng'); P.flags.confinedY = P.year; }
    else expel(P, `${{ 문규: '문규', 명예: '가문의 명예', 전수: '비전 전수 금지' }[kind] || kind + ' 금지'}를 거듭 어겨`);
  }
}
function expel(P, why) {
  const m = P.member; if (!m) return; const f = facDef(m.fid);
  say(P, `${why} <b>${f.n}에서 파문당했다.</b> 무공을 거두겠다는 말까지 나왔다.`, 'big');
  P.events.push(`${P.age}세에 ${f.n}에서 파문당했다`); repAdd(P, m.fid, -40);
  P.member = null; P.flags.ronin = true; P.flags.expelled = f.id;
  const t = acqTrait('낙인'); if (t && !P.traits.some(x => x.n === '낙인')) P.traits.push(t);
  addAch(P, '파문');
}
LIFE.ruleBreak = ruleBreak;
// ---------- 강호 소문(9-31): 내가 없는 곳에서도 세상은 돈다 ----------
const NEWS = [
  '{s1}의 장문인이 폐관에 들었다는 말이 돈다.', '{f1}과 {f2}의 제자들이 {p}에서 칼부림을 벌였다.', '{s1}에서 십 년 만에 산문을 열어 제자를 받는다고 한다.',
  '{p}에 나타난 복면 고수가 한 달 새 표국 셋을 털었다.', '「{ep}」 {n}이 {f1}의 장로를 비무에서 꺾었다.', '{c1} 가주의 칠순 잔치에 강호 명숙들이 모인다.',
  '{f1}의 비전 비급 한 권이 사라졌다는 소문이 돈다.', '{p} 산중에서 밤마다 검광이 솟는다고 한다.', '{f1}과 {f2}가 혼사를 맺는다. 정략이라는 말이 많다.',
  '{c1}의 소가주가 마교 여인과 눈이 맞아 달아났다고 한다.', '녹림 칠십이채의 총채주가 바뀌었다. 새 총채주는 「{ep}」 {n}이다.', '{p} 관아가 무림인의 칼 차는 것을 금했다.',
  '{f1}이 {p}에 분타를 냈다.', '{f1}의 제자 하나가 사문을 배신하고 {f2}로 갔다.', '서역에서 온 고수가 {p}에서 중원 무인 열둘을 꺾었다.',
  '{f1}의 장로 {n}이 독에 당해 쓰러졌다. 범인은 아직 모른다.', '{p}에 역병이 돌아 사람이 많이 죽었다.', '{f2}의 고수 「{ep}」 {n}이 은퇴를 선언했다.',
  '하오문에서 {f1}의 약점을 판다는 말이 돈다.', '{f1}과 {f2} 사이에 오랜 원한이 다시 불붙었다.', '{p}의 큰 상단이 녹림에 통행세를 거부했다가 몰살당했다.',
  '무림맹이 {f1}의 일을 두고 회의를 연다고 한다.', '{n}이라는 젊은 검객이 {p}의 무관 일곱 곳을 하루 만에 깼다.', '{s1}에 천재가 들어왔다는 소문이다. 열두 살에 이류라나.',
  '{p} 근처 폐사에서 강시가 나왔다는 말이 돈다.', '황실이 {p}에 금의위를 풀었다. 누군가를 찾는다.', '{c1}의 가주가 후계를 정하지 못한 채 쓰러졌다.',
  '{p}에서 열린 비무대회에서 무명의 소녀가 우승했다.', '「{ep}」 {n}이 {f1}을 홀로 찾아가 원수를 갚았다고 한다.', '{f1}의 재물이 {p}의 전장에서 몽땅 사라졌다.',
  '마교의 사자가 {p}에 나타났다는 말에 정파가 술렁인다.', '{f1}과 {f2}가 손을 잡고 {p}의 흑도를 쳤다.', '사천당가의 독에 당한 자가 {p}에서 발견되었다.',
  '{p}의 늙은 대장장이가 명검을 벼렸다. 사겠다는 사람이 줄을 섰다.', '개방 방주가 {p}에 거지들을 모았다. 큰일이 있다는 뜻이다.', '{s1}의 장문인이 {s2}의 장문인에게 도전장을 보냈다.',
  '{p} 강에 배 수십 척이 가라앉았다. 수로채 짓이라 한다.', '{f1}에서 파문당한 자가 {p}에서 문파를 세웠다.', '「{ep}」 {n}이 화경에 올랐다는 소문이 강호를 흔든다.', '{p}의 기루에서 이름난 고수 둘이 한 여인을 두고 싸웠다.',
];
function worldNews(P) {
  const n = 1 + (P.R() < 0.6 ? 1 : 0) + (rangeLevel(P) >= 2 ? 1 : 0);
  // 소문에 오르내리는 것은 이름난 문파·세가다(위상 2 이상, 문파·세가 사다리)
  const fs = G.FACTIONS.filter(f => factionAlive(P, f.id) && (f.prestige || 0) >= 2 && ['sect', 'clan'].includes(f.lad));
  if (!fs.length) return;
  const near = placesInRange(P, ['성', '진', '산'], 1);
  for (let i = 0; i < n; i++) {
    const f1 = pk(P, fs), f2 = pk(P, fs.filter(f => f !== f1)) || f1, pl = near.length ? pk(P, near)[0] : P.place;
    const nm = npcName(P, P.R() < 0.2 ? 'f' : 'm');
    const ep = pk(P, ['일검', '철장', '비연', '광풍', '청운', '흑수', '백의', '쾌도', '무영', '독행', '혈수', '천수']) + pk(P, ['객', '검', '수', '도', '신룡', '호', '랑', '서생']);
    const PJ = { 이: '이가', 가: '이가', 과: '과와', 와: '과와', 을: '을를', 를: '을를', 은: '은는', 는: '은는', 로: '으로' };
    const sub = (w, p) => !p ? w : PJ[p] ? J(w, PJ[p]) : w + p;
    const sects = fs.filter(f => f.lad === 'sect'), clans = fs.filter(f => f.lad === 'clan');
    const s1 = pk(P, sects) || f1, s2 = pk(P, sects.filter(f => f !== s1)) || s1, c1 = pk(P, clans) || f1;
    let t = pk(P, NEWS).replace(/\{s1\}(이|가|과|와|을|를|은|는|의|에|로)?/g, (_, p) => sub(s1.n, p)).replace(/\{s2\}(이|가|과|와|을|를|은|는|의|에|로)?/g, (_, p) => sub(s2.n, p)).replace(/\{c1\}(이|가|과|와|을|를|은|는|의|에|로)?/g, (_, p) => sub(c1.n, p)).replace(/\{f1\}(이|가|과|와|을|를|은|는|의|에|로)?/g, (_, p) => sub(f1.n, p)).replace(/\{f2\}(이|가|과|와|을|를|은|는|의|에|로)?/g, (_, p) => sub(f2.n, p))
      .replace(/\{n\}(이|가|을|를|은|는)?/g, (_, p) => sub(nm, p)).replace(/\{ep\}/g, ep).replace(/\{p\}/g, atText({ place: pl }));
    say(P, `강호 소문: ${t}`, 'world', 1 + Math.floor(P.R() * 12));
  }
}
// ---------- 인연 인물의 삶(9-27): 아는 사람들도 해마다 자라고, 자리에 오르고, 혼인하고, 곤경에 빠진다 ----------
const CLOSE = ['스승', '벗', '의형제', '제자', '정인', '배우자', '맞수', '원수', '수하', '은인'];
const TITLES = { 3: ['표국의 표두', '무관의 관주', '문파의 당주', '세가의 무사장'], 4: ['문파의 장로', '세가의 총관', '표국의 국주', '산채의 채주'], 5: ['문파의 장문인', '세가의 가주', '무림맹의 호법'] };
function newsOf(P, n, txt) { if ((P.news || 0) >= 3) return; P.news = (P.news || 0) + 1; say(P, `소식: ${n.rels[0] ? n.rels[0] + ' ' : ''}${J(n.name, '이가')} ${txt}`, 'bond'); (n.log = n.log || []).push(`${P.year}년 ${txt}`); }
function npcLife(P, n) {
  if (!n.rels.some(r => CLOSE.includes(r))) return;
  if (n.tal == null) n.tal = 0.3 + P.R() * 0.9;
  // 경지: 젊고 재능 있을수록 오른다. 화경은 드물고 현경은 없다
  if (n.age < 60 && n.realm < 6 && P.R() < (0.015 + 0.05 * n.tal) * (n.realm < 3 ? 1 : n.realm < 5 ? 0.45 : 0.12)) { n.realm++; n.shown = Math.max(n.shown || 0, n.realm); newsOf(P, n, `${REALMS[n.realm]}에 올랐다고 한다.`); }
  // 자리
  const tl = TITLES[Math.min(5, n.realm)];
  if (tl && n.age >= 28 && (!n.title || (n.titleLv || 0) < Math.min(5, n.realm)) && P.R() < 0.08) { n.title = pk(P, tl); n.titleLv = Math.min(5, n.realm); newsOf(P, n, `${n.title}가 되었다.`); }
  // 별호
  if (n.realm >= 4 && !n.epithet && P.R() < 0.1) { n.epithet = pk(P, ['일검', '철장', '비연', '광풍', '청운', '흑수', '백의', '쾌도', '무영', '독행']) + pk(P, ['객', '검', '수', '도', '신룡', '호', '랑']); newsOf(P, n, `「${n.epithet}」라 불리기 시작했다.`); }
  // 혼인과 자식
  if (!n.married && n.age >= 20 && n.age <= 40 && !n.rels.some(r => r === '정인' || r === '배우자' || r === '마음에 둔 사람') && P.R() < 0.07) { n.married = P.year; if (n.bond >= 30) newsOf(P, n, '혼례를 올렸다. 청첩장이 왔다.'); }
  // 곤경: 가까운 사람이면 도움을 청한다(bondOffers)
  if (!n.trouble && n.bond >= 25 && n.rels.some(r => ['벗', '의형제', '제자', '스승', '은인'].includes(r)) && P.R() < 0.04) n.trouble = { y: P.year, k: pk(P, ['원수에게 쫓긴다', '빚에 몰렸다', '누명을 썼다', '문파에서 쫓겨날 처지다', '식솔이 납치되었다']) };
  if (n.trouble && P.year - n.trouble.y > 2) { if (P.R() < 0.4) { n.alive = false; say(P, `${J(n.name, '이가')} 끝내 화를 면치 못하고 세상을 떠났다는 소식이 들렸다.`, 'ng'); } n.trouble = null; n.bond -= 10; }
  // 원수의 원한은 대를 잇는다
  if (n.rels.includes('원수') && !n.alive) n.heir = true;
}
// 인연이 여는 기회(9-27)
function bondOffers(P) {
  const out = [];
  for (const n of P.bonds) {
    if (!n.alive) continue;
    if (n.trouble) { const t = n.trouble; out.push({ n: `${n.rels[0] || ''} ${n.name}의 부탁`, hint: `${t.k}. 도움을 청한다`, go: function* () {
      n.trouble = null; say(P, `${J(n.name, '을를')} 도우러 나섰다.`, 'act', P.month);
      let ok;
      if (/쫓긴다|납치/.test(t.k)) { const e = makeNpc(P, pk(P, ['흑도 두목', '복면 살수', '산적 두목']), [0, 1]); const r = yield* fightAsk(P, e, `${n.name}의 부탁`, { lethal: true }); ok = r.win; }
      else if (/빚/.test(t.k)) { ok = P.wealth >= 50; if (ok) P.wealth -= 50; }
      else ok = check(P, /누명/.test(t.k) ? '수읽기' : '풍모', 60).ok;
      if (!P.alive) return;
      if (ok) { n.bond += 30; addFame(P, 50); say(P, `${n.name}의 일을 풀었다. 은혜를 잊지 않겠다 한다.`, 'ok', P.month); if (!n.rels.includes('은인') && n.bond >= 70 && n.rels.includes('벗')) { n.rels.push('의형제'); say(P, `${J(n.name, '과와')} 의형제를 맺었다.`, 'bond', P.month); addAch(P, '결의형제'); } }
      else { n.bond -= 5; say(P, '힘이 닿지 않았다.', 'ng', P.month); }
    } }); continue; }
    if (n.rels.includes('벗') && !n.rels.includes('의형제') && n.bond >= 70) out.push({ n: `${J(n.name, '과와')} 의형제를 맺는다`, hint: '같은 날 죽기를 맹세한다', go: function* () { n.rels.push('의형제'); n.bond += 10; say(P, `${J(n.name, '과와')} 술잔을 깨고 의형제를 맺었다.`, 'bond', P.month); addAch(P, '결의형제'); } });
    if (n.rels.includes('맞수') && !n.rels.includes('벗') && n.bond >= 35) out.push({ n: `맞수 ${J(n.name, '과와')} 술잔을 나눈다`, hint: '칼을 섞던 사이가 벗이 될지도', go: function* () { if (check(P, '성품', 50).ok) { n.rels.push('벗'); n.bond += 15; say(P, `밤새 술을 마셨다. ${J(n.name, '과와')} 벗이 되었다.`, 'bond', P.month); } else { n.bond += 5; say(P, '서로 말이 없었다. 그래도 술은 달았다.', 'muted', P.month); } } });
    if (n.rels.includes('원수') && P.age >= 50 && (n.age || 0) >= 50 && n.bond > -60) out.push({ n: `원수 ${J(n.name, '과와')} 묵은 원한을 푼다`, hint: '둘 다 늙었다', go: function* () { if (check(P, '성품', 60).ok) { n.rels = n.rels.filter(r => r !== '원수'); n.bond = 10; say(P, `${J(n.name, '과와')} 마주 앉아 지난 일을 털었다.`, 'bond', P.month); addAch(P, '원한을 끊다'); } else say(P, '끝내 서로 등을 돌렸다.', 'ng', P.month); } });
    if (n.rels.includes('제자') && n.realm >= 3 && !n.sentDown && n.realm >= P.realm - 1) out.push({ n: `제자 ${J(n.name, '을를')} 하산시킨다`, hint: '이제 제 길을 가게 한다', go: function* () { n.sentDown = true; n.bond += 15; addFame(P, 300); say(P, `${J(n.name, '이가')} 큰절을 올리고 산을 내려갔다.`, 'bond', P.month); addAch(P, '청출어람(제자)'); } });
    if (CLOSE.slice(0, 6).some(r => n.rels.includes(r)) && n.home && n.home !== P.place && P.year - (n.visited || 0) >= 4 && n.bond >= 20) out.push({ n: `${n.rels[0]} ${J(n.name, '을를')} 찾아간다`, hint: `${atText({ place: n.home })}`, go: function* () {
      n.visited = P.year; moveTo(P, n.home); n.bond += 12; know(P, n);
      say(P, `${J(atText(P), '으로')} ${J(n.name, '을를')} 찾아갔다.${n.title ? ` 이제 ${n.title}다.` : ''}`, 'bond', P.month);
      if (n.realm > P.realm && P.R() < 0.4) giveArt(P, '견식', n);
      if (P.R() < 0.35) { const m = makeNpc(P, pk(P, ['벗의 벗', '젊은 무사', '그 집 식객']), [-1, 1]); meet(P, m, '벗'); m.bond = 15; say(P, `그 집에서 ${J(m.name, '을를')} 알게 되었다.`, 'bond', P.month); }
    } });
  }
  return out;
}
function* npcYear(P) {
  P.news = 0;
  for (const n of P.bonds) {
    if (!n.alive) continue;
    n.age = (n.age || P.age) + 1;
    const q = 0.002 + 0.0003 * Math.exp(0.09 * (n.age - 20 - (n.realm || 0) * 6));
    if (P.R() < q) {
      n.alive = false;
      const close = n.bond >= 30 || n.rels.some(r => ['스승', '배우자', '의형제', '제자', '정인'].includes(r));
      if (close) say(P, `${J(n.name, '이가')} 세상을 떠났다.`, 'big');
      if (n.rels.includes('스승')) { P.trigger = 2; say(P, '스승의 임종을 지켰다. 마지막 가르침이 가슴에 남았다.', 'bond'); if (n.bond >= 40 && !n.taught2) giveArt(P, GRADES[Math.min(5, COMMON_GRADE[n.realm] || 0)], n, '스승의 유품 비급으로 익히기 시작했다'); }
      if (n === P.spouse) { say(P, '홀로 남았다.', 'muted'); }
      continue;
    }
    npcLife(P, n);
    if (n.rels.includes('정인') || n.rels.includes('마음에 둔 사람')) continue;
    if (n.met != null && n.met < P.year - 3 && n.bond > 10 && !n.rels.includes('배우자')) n.bond -= 2;
  }
  const foe = relPeople(P, ['원수'])[0];
  if (foe && P.age >= 15 && P.R() < 0.1) {
    say(P, `원수 ${J(foe.name, '이가')} 다시 나타났다.`, 'big');
    const r = yield* fightAsk(P, foe, '원수', { lethal: true });
    if (r.win) { foe.rels = foe.rels.filter(x => x !== '원수'); if (P.R() < 0.5) foe.alive = false; say(P, foe.alive ? '원수가 꺾여 물러났다.' : '원수를 베었다.', 'ok'); addAch(P, '원한을 끊다'); }
    return;
  }
  const rv = relPeople(P, ['맞수'])[0];
  if (rv && P.age >= 12 && P.R() < 0.15) {
    say(P, `맞수 ${J(rv.name, '이가')} 다시 겨루자며 찾아왔다.`, 'bond');
    const r = yield* fight(P, rv, { spar: true });
    rv.bond += 5; know(P, rv);
    say(P, r.win ? '이번에는 이겼다.' : '이번에도 졌다.', r.win ? 'ok' : 'ng');
  }
}
// 스승을 찾는다(행동)
function* seekMaster(P) {
  const lv = rangeLevel(P);
  const n = makeNpc(P, pk(P, P.realm >= 3 ? ['은거한 고수', '산사의 노승', '도관의 도사', '이름 없는 노고수'] : ['은거한 고수', '떠돌이 검객', '산사의 노승', '도관의 도사', '무관의 노사부']), [1, 2 + Math.min(1, lv)], { keep: true });
  if (n.realm <= P.realm) n.realm = Math.min(7, P.realm + 1);
  n.age = 50 + Math.floor(P.R() * 30); fleshOut(P, n); n.know = 1;
  const text = `수소문 끝에 ${atText(P)} 근처에 산다는 ${n.role} ${J(n.name, '을를')} 찾아갔다. ${perceive(P, n).txt}.`;
  const ch = yield { ask: '스승을 찾는다', text, month: P.month, options: [['제자로 받아 달라 청한다', '시험이 있다'], ['돌아선다', '']], who: n };
  say(P, text.replace('을(를)', J(n.name, '을를').slice(-1)), 'bond', P.month);
  if (ch === 1) return;
  const r = check(P, P.R() < 0.5 ? '성품' : '이해', 55);
  if (r.ok) { meet(P, n, '스승'); relHook(P, n, '스승'); n.bond = 15; say(P, `${J(n.name, '이가')} 고개를 끄덕였다. 스승을 모시게 되었다.`, 'big', P.month); if (P.plan === '무학 정진') P.plan = '사제와 함께'; }
  else say(P, '받아 주지 않았다. 사흘 밤낮 문 앞에 꿇어앉았지만 문은 열리지 않았다.', 'ng', P.month);
}
// 관계도에 쓰는 자료
LIFE.graph = function (P) {
  const people = P.bonds.filter(b => b.rels.length).map(b => ({ id: b.id, name: b.name, rels: b.rels, bond: b.bond, alive: b.alive, stage: BOND_STAGE(b.bond), info: LIFE.npcInfo(P, b), log: (b.log || []).slice(-6), epithet: b.intel ? b.epithet : null, color: REL_COLOR[b.rels[b.rels.length - 1]] || '#8b7e69' }));
  const fids = new Set(Object.keys(P.rep).filter(k => Math.abs(P.rep[k]) >= 10));
  if (P.member) fids.add(P.member.fid);
  const myW = P.world && ((P.force && P.force.wid && P.world.F[P.force.wid]) || (P.member && P.world.F[P.member.fid]));
  const worldRel = {};
  if (myW && myW.rels) { const ent = Object.entries(myW.rels).filter(([id]) => P.world.F[id] && P.world.F[id].alive).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1])).slice(0, 4); for (const [id, v] of ent) { fids.add(id); worldRel[id] = v; } }
  const factions = [...fids].slice(0, 10).map(id => { const f = facDef(id) || (P.world && P.world.F[id]) || { n: id }; const rep = P.rep[id] || 0; return { id, n: f.n, rep, mine: P.member && P.member.fid === id, world: worldRel[id], stance: rep >= 30 || (P.member && P.member.fid === id) ? '우호' : rep <= -30 ? '적대' : '중립' }; });
  return { people, factions, force: P.force ? P.force.name : null };
};

// ---------- 기회·모집·이동(10단계 9-16) ----------
const KIND_NAME = { 정식: null, 속가: '속가제자', 직계: '직계', 방계: '방계', 객경: '객경', 고용: null };
function nearFactions(P, pred, dmax) {
  const me = G.PLACES2[P.place], d = dmax || Math.max(80, RANGE_DIST[rangeLevel(P)]);
  return G.FACTIONS.filter(f => factionAlive(P, f.id) && pred(f) && G.PLACES2[f.at] && (!me || Math.hypot(G.PLACES2[f.at].x - me.x, G.PLACES2[f.at].y - me.y) <= d));
}
// 모집 공고: [{n, hint, go}] — go는 고르면 도는 생성기
function recruitOffers(P) {
  const out = [], age = P.age, mem = P.member;
  const fee = f => [0, 50, 200, 800][f.prestige] || 200;
  // 스카우트(9-23): 나보다 높은 스승이 없으면 재목을 알아본 고수가 먼저 찾아온다. 자질·명성이 높을수록 잦다
  if (age >= 8 && age <= 45 && !relPeople(P, ['스승']).some(b => b.alive && b.realm > P.realm)) {
    const p = (0.06 + Math.max(0, P.apt.근골 + P.apt.오성 - 110) / 400 + stageOf(P.fame) * 0.04) * (P.flags.masterLuck ? 2 : 1);
    if (P.R() < p) {
      const role = pk(P, P.realm >= 3 ? ['은거한 고수', '이름 없는 노고수', '산사의 노승', '도관의 도사'] : ['떠돌이 검객', '무관의 노사부', '은거한 고수', '산사의 노승']);
      const n = makeNpc(P, role, [1, 2], { keep: true }); if (n.realm <= P.realm) n.realm = Math.min(7, P.realm + 1);
      n.age = 45 + Math.floor(P.R() * 35); fleshOut(P, n);
      const why = P.realm === 0 ? '뼈대를 한 번 짚어 보더니' : P.realm < 3 ? '싸우는 것을 지켜보다가' : '소문을 듣고 찾아와';
      out.push({ n: `${role} ${n.name}의 제안`, hint: `${why} 제자로 삼고 싶다 한다. ${perceive(P, n).txt}`, go: function* () { addAch(P, '스승의 부름'); meet(P, n, '스승'); relHook(P, n, '스승'); n.bond = 20; say(P, `${role} ${J(n.name, '을를')} 스승으로 모셨다.`, 'big', P.month); if (P.R() < 0.6) giveArt(P, P.arts.length ? '다음 등급' : '삼류', n, `${n.name}에게서 배웠다`); } });
    }
  }
  // 문파의 눈: 소속 없는 재목에게 문파가 먼저 손을 내민다
  if (!mem && age >= 8 && age <= 25 && P.apt.근골 + P.apt.오성 >= 120 && P.R() < 0.12) {
    const l = nearFactions(P, f => ['sect', 'clan'].includes(f.lad) && (!f.entry || !f.entry.sex || f.entry.sex === P.sex) && (f.prestige || 0) <= 2 + (P.apt.근골 + P.apt.오성 >= 140 ? 1 : 0), 300);
    if (l.length) { const f = pk(P, l); out.push({ n: `${f.n}에서 사람이 왔다`, hint: '재목을 알아보고 시험 없이 들이겠다 한다', go: function* () { addAch(P, '문파가 먼저 찾아오다'); join(P, f.id, '먼저 찾아온 손을 잡고 ', 0, f.lad === 'sect' ? '입문제자' : null, f.lad === 'sect' ? '정식' : '방계'); } }); }
  }
  if (!mem && age >= 7 && age <= 15) {
    if (P.month <= 4) { const l = nearFactions(P, f => f.lad === 'sect' && (f.prestige || 0) <= 2 && f.entry && (f.entry.via || []).includes('산문 시험') && (!f.entry.sex || f.entry.sex === P.sex));
    if (l.length) { const f = pk(P, l); out.push({ n: `${f.n} 입문 시험`, hint: '근골·오성을 본다', go: function* () { const r = check(P, null, 40 + f.prestige * 10 + (P.origin.status === '천민' ? 15 : 0), (P.apt.근골 + P.apt.오성 - 100) / 4 + (P.apt.심성 - 50) / 8, '입문'); if (r.ok) join(P, f.id, '시험을 통과해 ', 0, r.crit ? '내문제자' : '입문제자', '정식'); else say(P, `${f.n} 입문 시험에서 떨어졌다.`, 'ng', P.month); } }); } }
  }
  if (!mem && age >= 10 && age <= 30 && P.R() < 0.6) {
    const l = nearFactions(P, f => f.lad === 'sect' && f.t === '정' && (!f.entry || !f.entry.sex || f.entry.sex === P.sex));
    if (l.length) { const f = pk(P, l), c = fee(f); if (P.wealth >= c) out.push({ n: `${f.n} 속가 입문`, hint: `입문비 ${c}냥, 밖에서 살며 배운다`, go: function* () { P.wealth -= c; join(P, f.id, `입문비 ${c}냥을 내고 `, 0, '속가제자', '속가'); } }); }
  }
  if (!mem && !P.arts.length && age >= 8 && age <= 25 && P.wealth >= 10 && P.R() < 0.6) out.push({ n: '동네 무관에 다닌다', hint: '해마다 10냥, 삼류 무공', go: function* () { P.wealth -= 10; P.flags.dojoMember = true; giveArt(P, '삼류', null, '무관에서 배우기 시작했다'); if (!heartArt(P)) learn(P, pk(P, LIFE.FREE_HEART), '무관에서 배웠다'); } });
  // 표행 일감(9-43): 표국 소속이 아니어도 한 번씩 호위로 따라갈 수 있다
  if (P.realm >= 1 && age >= 16 && age <= 55 && ladOf(P) !== 'escort' && P.R() < 0.35) out.push({ n: '표국이 표행 호위를 구한다', hint: '한 번 따라가는 일. 품삯 30~80냥', go: function* () { const t = pickTpl(P, '표행'); P.deeds.표행 = (P.deeds.표행 || 0) + 1; if (t) yield* runTpl(P, t, P.month); else { const g = foeGroup(P, '녹림 산적 두목', [Math.max(1, P.realm - 1), P.realm + 1], 8); const r = yield* squadFight(P, 4, g); if (!P.alive) return; } if (P.alive) { const w = 30 + Math.floor(P.R() * 50); P.wealth += w; say(P, `표행을 마치고 품삯 ${w}냥을 받았다.`, 'ok', P.month); } } });
  if (!mem && age >= 16 && age <= 45) {
    const l = nearFactions(P, f => f.lad === 'escort' || f.id === 'escortunion', 200);
    out.push({ n: '표국이 사람을 구한다', hint: P.realm >= 1 ? '표사 자리' : '쟁자수 자리', go: function* () { if (l.length) join(P, l[0].id, '', P.realm >= 1 ? 1 : 0, null, '고용'); else setCareer(P, 'military', '표국 쟁자수로 '); P.plan = '의뢰'; } });
  }
  if (!mem && age >= 16 && age <= 35 && P.career !== 'military') out.push({ n: '관부의 모병', hint: '군졸이 된다', go: function* () { setCareer(P, 'military', '모병에 응해 '); } });
  if (!mem && P.align <= 10 && age >= 14 && age <= 40) {
    const l = nearFactions(P, f => f.t === '사' && ['bandit', 'info'].includes(f.lad));
    if (l.length) { const f = pk(P, l); out.push({ n: `${f.n}의 영입`, hint: '뒷골목의 일', go: function* () { join(P, f.id, '연줄을 타고 ', 0, null, '고용'); P.align = clamp(P.align - 10, -100, 100); } }); }
  }
  // 용병: 삼류 이상, 전란이 짙을 때, 3년에 한 번만 나온다
  if (P.realm >= 1 && !(P.flags.mercY > P.year - 3) && age >= 16 && age <= 55 && (P.era.dz.war >= 0.3 || P.era.label === '정마대전의 한가운데' || P.era.label === '문파들이 다투는 어지러운 시기')) {
    const side = pk(P, nearFactions(P, f => ['정', '사', '마'].includes(f.t) && f.prestige >= 1, 200)) || null;
    if (side) out.push({ n: `${J(side.n, '이가')} 용병을 모은다`, hint: side.t === '정' ? '낭인으로 지원, 싸움 셋' : '낭인으로 지원, 싸움 셋, 악명', go: function* () { P.flags.mercY = P.year; yield* mercenary(P, side); } });
  }
  // 소속이 있어도 길은 열린다(9-23): 사문의 명으로 강호행, 더 큰 곳의 초빙
  if (mem && mem.kind === '정식' && facDef(mem.fid).lad === 'sect' && P.realm >= 2 && age >= 18 && age <= 45 && !(P.flags.roamUntil > P.year - 4)) {
    const f = facDef(mem.fid), to = pk(P, placesInRange(P, ['성', '진', '산'], 1));
    if (to) out.push({ n: '사문의 명으로 강호에 나간다', hint: '두 해 동안 떠돈다. 공적과 견문', go: function* () { P.flags.roamUntil = P.year + 2; P.flags.roamBack = P.plan; P.plan = '강호 유람'; P.merit += 10; moveTo(P, to[0]); say(P, `${f.n}의 명을 받고 ${J(atText(P), '으로')} 떠났다.`, 'act', P.month); addAch(P, '길 떠나기'); } });
  }
  if (mem && P.realm >= 3 && age >= 20) {
    const cur = facDef(mem.fid), l = nearFactions(P, f => f.id !== mem.fid && (f.prestige || 0) > (cur.prestige || 0) && ['sect', 'clan', 'alliance'].includes(f.lad) && (f.t === cur.t || f.t === '중'), 300);
    if (l.length && P.R() < 0.5) { const f = pk(P, l); out.push({ n: `${f.n}의 초빙`, hint: `${cur.n}을 떠나 객경으로 간다`, go: function* () { join(P, f.id, `${cur.n}을 떠나 `, 0, null, '객경'); repAdd(P, cur.id, -15); } }); }
  }
  if (!mem && P.realm >= 2 && stageOf(P.fame) >= 1) {
    const l = nearFactions(P, f => f.cat === '세가', 200);
    if (l.length) { const f = pk(P, l); out.push({ n: `${f.n}의 식객 자리`, hint: '객경으로 대우받는다', go: function* () { join(P, f.id, '식객으로 ', 0, null, '객경'); } }); }
  }
  return out;
}
function* mercenary(P, f) {
  say(P, `${f.n} 쪽에 낭인으로 지원했다.`, 'act', P.month);
  let w = 0;
  for (let i = 0; i < 3 && P.alive; i++) { const n = makeNpc(P, pk(P, ['적의 무사', '적의 낭인', '적의 조장']), [-1, 0]); const r = yield* fight(P, n, { lethal: i === 2 }); if (r.win) w++; else if (P.hurt >= 2) { say(P, '크게 다쳐 싸움터에서 물러났다.', 'ng', P.month); break; } }
  if (!P.alive) return;
  P.wealth += 30 + w * 40; P.real = Math.min(1000, P.real + 80); P.flags.ronin = true;
  if (f.t === '정') addFame(P, w * 120); else addFame(P, w * 120, 'infamy');
  say(P, `${w}번 이겼다. 삯 ${30 + w * 40}냥을 받았다.`, w >= 2 ? 'ok' : '', P.month);
  addAch(P, '용병');
  if (w >= 2 && !P.member && P.R() < 0.5) {
    const ch = yield { ask: '영입 제안', text: `${f.n}에서 아예 들어오라 한다.`, month: P.month, options: [['받아들인다', ''], ['사양한다', '']] };
    if (ch === 0) join(P, f.id, '용병으로 공을 세워 ', 1, null, '고용');
  }
}
// 이동의 계기(9-16): 이유가 붙은 갈 곳
function travelOffers(P) {
  const out = [], seen = new Set([P.place]);
  const add = (pid, why) => { if (!pid || seen.has(pid) || !G.PLACES2[pid]) return; seen.add(pid); out.push({ n: `${J(atText({ place: pid }), '으로')} 떠난다`, hint: why, go: function* () { moveTo(P, pid); say(P, `${why} — ${J(atText(P), '으로')} 떠났다.`, 'act', P.month); P.era = eraOf(P); for (const x of P.era.local) say(P, x + '.', 'world', P.month); addAch(P, '길 떠나기'); } }); };
  const rq = P.rumorQueue[0]; if (rq) add(rq.place, `「${rq.kind}」 소문을 들은 곳`);
  const th = P.threads.find(t => t.place); if (th) add(th.place, `쫓던 「${th.kind || th.k}」의 자취`);
  const cities = placesInRange(P, ['성']);
  if (cities.length) { const [pid] = pk(P, cities); add(pid, P.realm >= 1 ? '무림대회가 열린다는 도시' : '일거리가 많다는 큰 도시'); }
  const fr = relPeople(P, ['스승', '벗', '의형제', '정인']).find(b => b.home && b.home !== P.place); if (fr) add(fr.home, `${J(fr.name, '이가')} 있는 곳`);
  if (P.era.dz.war >= 0.5 || P.era.dz.bandit >= 0.6) { const far = placesInRange(P, ['성', '진']).sort(() => P.R() - 0.5)[0]; if (far) add(far[0], '난리를 피할 곳'); }
  if (P.career) { const c = placesInRange(P, ['성', '진']).sort(() => P.R() - 0.5)[0]; if (c) add(c[0], `${careerDef(P.career).n} 일이 잘된다는 고을`); }
  return out;
}
// 기회(9-16): 넉 달마다. 할 수 있는 일·모집·이동 중 둘~넷
const OPP_SKIP = new Set(['travel', 'seclude']);
const OPP_LEAD = ['몇 가지 일이 눈에 들어온다.', '머무는 사이 할 만한 일이 생겼다.', '객잔에서 주워들은 이야기 가운데 마음이 가는 것이 있다.', '아는 얼굴이 찾아와 이런저런 말을 전한다.', '장터 벽에 방이 몇 장 붙었다.', '한동안 조용하더니 일이 몰려온다.', '무엇을 할지 정할 때다.', '할 일이 여럿이다. 다 할 수는 없다.'];
const OPP_TRAVEL = ['떠날 까닭도 생겼다.', '다른 고을 소식도 들린다.', '길이 부른다.'];
function* opportunity(P, withTravel) {
  if (P.age < 10) return;
  P.actUsed = P.actUsed || {};
  const acts = LIFE.actions(P).filter(a => a.ok && !OPP_SKIP.has(a.id) && !(a.id === 'shop' && (P.wealth < 100 || P.R() < 0.6)) && !(a.id === 'manual' && P.R() < 0.6) && !(P.actUsed[a.id] >= P.year - 2)).map(a => ({ n: a.n, hint: a.desc, go: function* () { P.actUsed[a.id] = P.year; yield* doAction(P, a.id); } }));
  // 옮긴 지 두 해가 안 됐으면 떠날 곳은 덜 나온다
  const recs = recruitOffers(P), trav = withTravel && (P.year - (P.movedY || -99) >= 2 || P.R() < 0.25) ? travelOffers(P) : [];
  const pool = [];
  const take = (l, n) => { for (const x of l.sort(() => P.R() - 0.5).slice(0, n)) pool.push(x); };
  take(recs, 2); take(bondOffers(P), 1); take(leadOffers(P), 1); take(memberOffers(P), 1); take(investOffers(P), 1); take(allianceOffers(P), 1); take(projectOffers(P), 1); take(forceOffers(P), 2); take(trav, withTravel ? 2 : 0); take(acts, 4 - Math.min(3, pool.length));
  if (!pool.length) return;
  // 여러 갈래에서 모인 일을 섞어 넷만 보인다
  const opts = pool.sort(() => P.R() - 0.5).slice(0, 4);
  const ch = yield { ask: withTravel ? '길과 기회' : '기회', text: `${P.month}월, ${atText(P)}. ${sceneOf(P, P.month)}${pk(P, OPP_LEAD)}${withTravel ? ' ' + pk(P, OPP_TRAVEL) : ''}`, month: P.month, options: opts.map(o => [o.n, o.hint || '']).concat([['하던 대로 지낸다', '']]) };
  if (ch >= opts.length) return;
  say(P, `▸ ${opts[ch].n}`, 'pick', P.month);
  yield* opts[ch].go();
}
// ---------- 소속의 일(9-33): 녹림은 털고, 살수는 청부를 받고, 표사는 표행을 이끈다 ----------
const WATER = ['river', 'dongting18', 'haisha'];
// 내 무리: 직위가 거느리는 수(UNIT)와 사다리 단계로 정한 조. 싸움 뒤 잃은 만큼만 내 수하에서 빠진다
function* squadFight(P, squad, enemy) {
  const before = P.men || 0; P.men = before + squad;
  const r = yield* groupFight(P, enemy);
  P.men = Math.min(before, P.men || 0);
  return r;
}
function squadOf(P) { const m = P.member; return Math.max(unitSize(P), 3 + (m ? m.rank : 0) * 4); }
function foeGroup(P, role, band, men) { const leader = makeNpc(P, role, [band[0] - P.realm, band[1] - P.realm], { band, keep: true }); leader.men = men; return { men, avg: Math.max(0, band[0] - 1), leader }; }
function memberOffers(P) {
  const m = P.member; if (!m || m.kind === '객경' || m.kind === '속가') return [];
  const f = facDef(m.fid), lad = f.lad === 'escort' || m.fid === 'escortunion' ? 'escort' : f.lad, out = [], r = m.rank, sq = squadOf(P);
  P.actUsed = P.actUsed || {};
  const add = (id, n, hint, go, cond = true) => { if (cond && !(P.actUsed['m_' + id] >= P.year - 1)) out.push({ n, hint, go: function* () { P.actUsed['m_' + id] = P.year; yield* go(); } }); };
  const water = WATER.includes(m.fid);
  if (lad === 'bandit') {
    add('raid', water ? '강에서 상선을 턴다' : '상단 습격을 이끈다', `수하 ${sq}명을 이끈다. 성공하면 재물과 악명`, function* () {
      const g = foeGroup(P, water ? '상선 호위대장' : '상단 호위대장', [Math.max(1, P.realm - 1), Math.min(4, P.realm + 1)], 6 + Math.floor(P.R() * 14));
      say(P, `${f.n}의 형제 ${sq}명을 이끌고 ${water ? '물길목에 배를 띄웠다' : '고갯길에 매복했다'}.`, 'act', P.month);
      const res = yield* squadFight(P, sq, g); if (!P.alive) return;
      if (res.win) { const w = 20 + sq * 6; P.wealth += w; addFame(P, 60, 'infamy'); P.merit += 10; P.deeds.약탈 = (P.deeds.약탈 || 0) + 1; say(P, `${w}냥어치를 챙겼다.`, 'ok', P.month); }
      else P.merit = Math.max(0, P.merit - 5);
    }, r >= 1 || P.age >= 18);
    add('toll', water ? '나루에서 뱃삯을 걷는다' : '길목에서 통행세를 걷는다', '말로 받아 내거나, 칼로 받아 낸다', function* () {
      const c = check(P, '풍모', 50, stageOf(P.infamy) * 10);
      if (c.ok) { P.wealth += 15 + r * 5; addFame(P, 10, 'infamy'); P.merit += 3; say(P, '행인들이 군말 없이 통행세를 냈다.', 'ok', P.month); }
      else { const n = makeNpc(P, '표사', [-1, 1]); say(P, '버티는 표사가 칼을 뽑았다.', 'act', P.month); const x = yield* fight(P, n); if (x.win) { P.wealth += 25; P.merit += 5; } }
    });
    add('turf', water ? '다른 수채와 물길을 다툰다' : '다른 산채와 구역을 다툰다', `${sq}명 대 비슷한 무리`, function* () {
      const g = foeGroup(P, water ? '다른 수채 두목' : '다른 산채 두목', [Math.max(1, P.realm - 1), P.realm + 1], Math.round(sq * (0.8 + P.R() * 0.6)));
      const res = yield* squadFight(P, sq, g); if (!P.alive) return;
      if (res.win) { P.merit += 20; addFame(P, 120, 'infamy'); gainMen(P, Math.ceil(g.men * 0.2), '꺾은 무리 가운데'); } else P.merit = Math.max(0, P.merit - 10);
    }, r >= 3);
    add('ransom', '인질의 몸값을 받아 낸다', '부잣집 자식을 잡아 두었다', function* () {
      const c = check(P, '지략', 55);
      if (c.ok) { P.wealth += 80; P.align = clamp(P.align - 4, -100, 100); P.merit += 8; say(P, '몸값을 받고 인질을 돌려보냈다.', 'ok', P.month); }
      else { say(P, '관군이 냄새를 맡았다.', 'ng', P.month); const g = foeGroup(P, '관군 장수', [P.realm, P.realm + 1], 15); yield* squadFight(P, sq, g); }
    }, r >= 2);
  } else if (lad === 'assassin') {
    add('contract', '청부를 받는다', `표적은 ${['삼류', '이류', '일류', '절정'][Math.min(3, r)]} 언저리. 값은 표적에 따라`, function* () {
      const n = makeNpc(P, '표적', [0, 1]); n.realm = clamp(Math.min(r + 1, P.realm + 1), 0, 6);
      const x = yield* fight(P, n, { lethal: true }); if (!P.alive) return;
      if (x.win) { const w = 40 + n.realm * 40; P.wealth += w; addFame(P, 40, 'infamy'); P.merit += 8; P.deeds.청부 = (P.deeds.청부 || 0) + 1; say(P, `일을 끝냈다. ${w}냥.`, 'ok', P.month); }
    });
    add('cell', '조원들과 한 가문을 친다', `살수 ${sq}명`, function* () { const g = foeGroup(P, '가문의 호위대장', [P.realm, P.realm + 1], sq + 4); const res = yield* squadFight(P, sq, g); if (res.win) { P.wealth += 150; P.merit += 20; addFame(P, 200, 'infamy'); } }, r >= 3);
  } else if (lad === 'info') {
    add('sell', '정보를 판다', '누가 무엇을 사려는지 먼저 읽어야 한다', function* () { const c = check(P, '수읽기', 55); if (c.ok) { P.wealth += 30 + r * 15; P.merit += 6; say(P, '비싼 값에 팔았다.', 'ok', P.month); } else { say(P, '판 정보가 엉뚱한 사람 손에 들어갔다.', 'ng', P.month); P.merit = Math.max(0, P.merit - 5); } });
    add('alley', '뒷골목을 휘어잡는다', `수하 ${sq}명`, function* () { const g = foeGroup(P, '왈패 두목', [0, 2], sq + 2); const res = yield* squadFight(P, sq, g); if (res.win) { P.merit += 15; addFame(P, 40, 'infamy'); gainMen(P, 2, '골목 아이들'); } }, r >= 2);
  } else if (lad === 'demon' || lad === 'shadow') {
    add('strike', '정파 분타를 친다', `교도 ${sq}명`, function* () { const g = foeGroup(P, '정파 무사대주', [Math.max(1, P.realm - 1), P.realm + 1], sq); const res = yield* squadFight(P, sq, g); if (!P.alive) return; if (res.win) { P.merit += 20; addFame(P, 200, 'infamy'); } else P.merit = Math.max(0, P.merit - 10); }, r >= 2);
    add('tribute', '공물을 거둔다', '고을 유지들에게서', function* () { P.wealth += 20 + r * 10; P.merit += 5; addFame(P, 30, 'infamy'); P.align = clamp(P.align - 2, -100, 100); say(P, '유지들이 고개를 숙이고 공물을 바쳤다.', 'act', P.month); });
    add('traitor', '교의 배신자를 쫓는다', '목을 가져오라는 명', function* () { const n = makeNpc(P, '배신한 교도', [-1, 1]); const x = yield* fight(P, n, { lethal: P.R() < 0.5 }); if (x.win) { P.merit += 15; addFame(P, 50, 'infamy'); } }, P.realm >= 2);
  } else if (lad === 'escort') {
    add('lead', r >= 3 ? '표행을 이끈다' : '표행에 따라간다', r >= 3 ? `표사 ${sq}명을 이끈다` : '표두를 따라 표물을 지킨다', function* () {
      const g = foeGroup(P, '녹림 산적 두목', [Math.max(1, P.realm - 1), P.realm + 1], 6 + Math.floor(P.R() * 12));
      say(P, `${f.n}의 표기를 꽂고 길을 나섰다.`, 'act', P.month);
      let res = { win: true, quiet: true };
      if (P.R() < 0.55) res = yield* squadFight(P, r >= 3 ? sq : 3, g);
      if (!P.alive) return;
      P.deeds.표행 = (P.deeds.표행 || 0) + 1;
      if (res.quiet) say(P, '무사히 표물을 넘겼다.', 'ok', P.month);
      if (res.win) { P.wealth += 20 + r * 15; P.merit += 8; addFame(P, 40); } else { P.wealth = Math.max(0, P.wealth - 30); P.merit = Math.max(0, P.merit - 8); say(P, '표물을 빼앗겼다. 표국이 물어 줘야 한다.', 'ng', P.month); }
    });
  } else if (lad === 'beggar') {
    add('ears', '거지들을 풀어 소문을 모은다', '매듭이 높을수록 많이 모인다', function* () { yield* applyFx(P, ['rumor:any']); P.merit += 5 + r; say(P, '성 안 거지들이 들은 것을 모아 왔다.', 'act', P.month); });
    add('guard', '개방 구역을 지킨다', `거지 ${sq}명`, function* () { const g = foeGroup(P, '왈패 두목', [0, 2], sq); const res = yield* squadFight(P, sq, g); if (res.win) { P.merit += 12; addFame(P, 40); } }, r >= 2);
  } else if (lad === 'guard') {
    add('arrest', '역도를 잡는다', '수배 문서가 내려왔다', function* () { const n = makeNpc(P, '수배된 역도', [0, 1]); const x = yield* fight(P, n); if (x.win) { P.merit += 12; P.wealth += 30; addFame(P, 40); } });
    add('search', '부하들을 이끌고 수색한다', `관병 ${sq}명`, function* () { const g = foeGroup(P, '산적 두목', [Math.max(1, P.realm - 1), P.realm + 1], sq); const res = yield* squadFight(P, sq, g); if (res.win) { P.merit += 15; addFame(P, 80); } }, r >= 2);
  } else if (lad === 'sect' || lad === 'clan' || lad === 'league') {
    add('patrol', '분타 순찰대를 이끈다', `제자 ${sq}명`, function* () { const g = foeGroup(P, '산적 두목', [Math.max(1, P.realm - 1), P.realm + 1], sq + 3); const res = yield* squadFight(P, sq, g); if (!P.alive) return; if (res.win) { P.merit += 15; addFame(P, 100); P.deeds.협행 = (P.deeds.협행 || 0) + 1; } }, r >= 4);
    add('hunt', '사문의 이름으로 마두를 쫓는다', '사문의 명. 위험하다', function* () { const n = makeNpc(P, '마두', [-1, 1]); const x = yield* fight(P, n, { lethal: true }); if (!P.alive) return; if (x.win) { P.merit += 25; addFame(P, 400); } }, P.realm >= 3);
    add('teach', '후배들을 가르친다', '사문의 어린 제자들', function* () { const d = makeNpc(P, '사문의 어린 제자', [-9, -9]); d.realm = Math.max(0, P.realm - 3); d.org = f.n; meet(P, d, '제자'); d.bond = 15; P.merit += 8; say(P, `어린 제자들 가운데 ${J(d.name, '이가')} 유난히 따른다.`, 'bond', P.month); }, r >= 3);
  }
  return out;
}

// 이긴 상대가 충성을 맹세할 수 있다(사용자 검토 2026-11-25)
function* oath(P, n) {
  if (!n || n.men || !n.alive || n.rels.includes('수하') || n.legend) return;
  const p = 0.12 + Math.max(stageOf(P.fame), stageOf(P.infamy)) * 0.05 + (P.apt.풍모 - 50) / 300 + (P.realm - n.realm) * 0.04;
  if (P.R() >= p) return;
  const text = `${J(n.name, '이가')} 무릎을 꿇었다. "목숨을 거두지 않으신다면 평생 모시겠습니다." 충성을 맹세한다.`;
  const ch = P.auto ? (P.R() < 0.5 ? 0 : 1) : yield { ask: '충성의 맹세', text, month: P.month, options: [['받아들인다', '수하가 된다'], ['돌려보낸다', '']] };
  say(P, text, 'bond', P.month);
  if (ch === 0) { meet(P, n, '수하'); n.bond = Math.max(n.bond, 25); gainMen(P, 1); say(P, `${J(n.name, '이가')} 수하가 되었다.`, 'ok', P.month); addAch(P, '충성의 맹세'); }
  else { addFame(P, 30); say(P, '돌려보냈다.', 'muted', P.month); }
}

// 세력이 있을 때의 기회: 제자 모집, 토벌·습격으로 하위 세력 거두기(사용자 검토 2026-11-25)
function forceOffers(P) {
  const f = P.force, out = []; if (!f || P.year - (P.forceOfferY || -9) < 2) return out;
  P.forceOfferY = P.year;
  out.push({ n: f.kind === '문파' ? '제자를 모집한다' : f.kind === '상단' ? '사람을 모은다' : '수하를 모은다', hint: `${f.name}의 문을 연다`, go: function* () {
    const r = check(P, '풍모', 45, stageOf(P.fame) * 8); const n = r.crit ? 15 : r.ok ? 6 + Math.floor(P.R() * 6) : 2;
    f.men += n; say(P, `${f.name}에 ${n}명이 새로 들었다.`, 'act', P.month);
    if (r.ok && f.kind === '문파' && P.R() < 0.4) { const d = makeNpc(P, '눈빛이 맑은 아이', [-9, -9]); d.realm = 0; meet(P, d, '제자'); relHook(P, d, '제자'); say(P, `그 가운데 ${J(d.name, '을를')} 제자로 삼았다.`, 'bond', P.month); }
    addAch(P, '제자 모집');
  } });
  if (P.world) {
    const me = G.PLACES2[P.place], d = Math.max(90, RANGE_DIST[rangeLevel(P)]);
    const cand = P.world.list.filter(w => w.alive && w.state !== '잠적' && w.id !== f.wid && w.prestige <= 1 && w.t !== '관' && w.home && G.PLACES2[w.home] && me && Math.hypot(G.PLACES2[w.home].x - me.x, G.PLACES2[w.home].y - me.y) <= d);
    const good = P.align >= 0;
    const pool = good ? cand.filter(w => w.t === '사' || w.t === '마' || w.t === '암') : cand;
    const tgt = pool.length ? pk(P, pool) : null;
    if (tgt) {
      const men = Math.max(5, Math.round(Math.sqrt(tgt.def.size || 60) * 4));
      out.push({ n: good ? `${tgt.n} 토벌` : `${J(tgt.n, '을를')} 쳐서 거둔다`, hint: `${atText({ place: tgt.home })}, 무리 약 ${men}명`, go: function* () {
        const leader = makeNpc(P, `${tgt.n}의 우두머리`, [-1, 1]); leader.org = tgt.n; leader.men = men;
        say(P, `${J(f.name, '을를')} 이끌고 ${atText({ place: tgt.home })}의 ${J(tgt.n, '을를')} 쳤다.`, 'act', P.month);
        const r = yield* groupFight(P, { men, avg: Math.max(0, leader.realm - 1), leader });
        if (r.win) {
          if (G.WORLDSIM.subjugate) G.WORLDSIM.subjugate(P.world, tgt.id, f.wid, P.year);
          sackForce(P, tgt.n, men, Math.max(0, leader.realm - 1));
          if (good) { addFame(P, 300 + men * 10); P.align = clamp(P.align + 5, -100, 100); say(P, `${J(tgt.n, '이가')} 무너졌다. 고을 사람들이 반겼다.`, 'big', P.month); addAch(P, '사파 토벌'); }
          else { addFame(P, 200 + men * 10, 'infamy'); f.subs = (f.subs || []).concat(tgt.n); gainMen(P, Math.round(men * 0.5), `${tgt.n}의 무리 가운데`); say(P, `${J(tgt.n, '이가')} ${f.name}의 하위 세력이 되었다.`, 'big', P.month); addAch(P, '하위 세력'); }
        }
      } });
    }
  }
  return out;
}

// ---------- 후천 특성(9-22): 살아온 길이 몸과 마음에 남고, 어떤 것은 다시 지워진다 ----------
function acqTrait(n) { return (G.TRAITS_ACQ || []).concat(G.TRAITS_LIFE || []).find(t => t.n === n); }
function gainTrait(P, n, why) {
  if (P.traits.some(t => t.n === n)) return false;
  const t = acqTrait(n); if (!t) return false;
  P.traits.push(t); say(P, `${why} <b>「${n}」</b>${J(n, '이가').slice(-1)} 몸에 붙었다.`, 'big'); P.events.push(`${P.age}세에 「${n}」을 얻었다`); return true;
}
function loseTrait(P, n, why) {
  if (!P.traits.some(t => t.n === n)) return false;
  P.traits = P.traits.filter(t => t.n !== n); say(P, `${why} 「${n}」${J(n, '이가').slice(-1)} 사라졌다.`, 'ok'); return true;
}
function acqYear(P, sch) {
  const c = P.cnt || (P.cnt = {}), has = n => P.traits.some(t => t.n === n);
  if (!P.deeds) P.deeds = {};
  const yr1 = k => (c[k] = (c[k] || 0) + 1);
  if (P.closed) yr1('폐관'); if (sch.cnt.유람 || sch.cnt.탐색) yr1('유람'); if (P.flags.hidden) yr1('은거');
  if (P.career) { c['업:' + P.career] = (c['업:' + P.career] || 0) + ((sch.cnt.생업 || 0) ? 1 : 0); }
  if (P.wealth < 1 && !P.member) { yr1('굶주림'); c.배부름 = 0; } else { c.굶주림 = 0; c.배부름 = (c.배부름 || 0) + 1; }
  if (P.pur < 60) yr1('탁기'); else if (P.pur >= 80) c.탁기 = 0;
  if (P.fame >= 5e5) yr1('명성'); else c.명성 = 0;
  // 얻기
  if ((P.kills || 0) >= 5) gainTrait(P, '피에 익숙함', '손에 피를 묻힌 것이 다섯 번을 넘었다.');
  if ((P.kills || 0) >= 25 && !check(P, '성품', 60).ok) gainTrait(P, '살기', '베어 넘긴 사람이 스물을 넘었다. 눈빛이 달라졌다.');
  if ((c.생사결 || 0) >= 3) gainTrait(P, '담력', '생사를 건 싸움에서 세 번 살아남았다.');
  if ((c.생사결 || 0) >= 15) gainTrait(P, '백전노장', '열다섯 번의 생사결을 넘겼다.');
  if (P.real >= 500 && baseOf(P, '근질') > baseOf(P, '근력')) gainTrait(P, '실전 근육', '싸움으로 다져진 몸이다.');
  if (P.realm >= 3 && baseOf(P, '강골') >= 160 && P.arts.some(a => a.def.role === '방어') && !has('금강불괴') && P.R() < 0.2 && check(P, '자질:근골', 75).ok) gainTrait(P, '금강불괴', '쇠처럼 단련된 몸이 마침내 칼을 튕겨 낸다.');
  if (has('금강불괴') && P.realm >= 5) gainTrait(P, '도검불침', '초절정의 기운이 금강불괴의 몸을 감쌌다.');
  if ((c.폐관 || 0) >= 10) { gainTrait(P, '고요한 마음', '십 년 폐관 끝에 마음이 가라앉았다.'); gainTrait(P, '세상 물정 모름', '문을 열고 나오니 세상이 낯설다.'); }
  if ((c.유람 || 0) >= 4) gainTrait(P, '강호 견문', '네 해를 떠돌며 강호의 물정을 익혔다.');
  if ((c['업:cook'] || 0) >= 12) gainTrait(P, '손맛', '열두 해 부엌을 지켰다.');
  if ((c['업:smith'] || 0) >= 12) gainTrait(P, '쇳소리를 듣는 귀', '열두 해 망치를 들었다.');
  if ((c['업:doctor'] || 0) >= 10) gainTrait(P, '맥 짚는 손', '십 년 병자를 보았다.');
  if ((c.굶주림 || 0) >= 2 && !check(P, '자질:근골', 60).ok) gainTrait(P, '허약해진 몸', '두 해를 굶주렸다.');
  if ((P.used.st_betrayal || 0) >= 2) { gainTrait(P, '의심의 눈', '두 번 배신당했다.'); c.배신 = P.year; }
  if (relPeople(P, ['원수']).length) gainTrait(P, '원한', '갚아야 할 원수가 있다.');
  if ((c.명성 || 0) >= 10 && !check(P, '성품', 65).ok) gainTrait(P, '교만', '천하가 내 이름을 안 지 십 년이다.');
  if ((c.은거 || 0) >= 10) gainTrait(P, '은둔 기질', '산중에서 십 년을 살았다.');
  if (P.realm >= 6 && P.fameMax < 1000) gainTrait(P, '무명의 고수', '화경에 이르렀으나 세상은 이름조차 모른다.');
  if ((c.탁기 || 0) >= 10) gainTrait(P, '탁기', '탁한 기운이 십 년 동안 단전에 쌓였다.');
  if ((P.deeds.청부 || 0) >= 10) addAch(P, '청부 열 번');
  if ((P.deeds.표행 || 0) >= 20) addAch(P, '표행 스무 번');
  if (P.wealth >= 10000) addAch(P, '부자');
  if (P.age >= 200) addAch(P, '이백 세');
  // 살아온 길(9-26)
  const T = n => P.traits.some(t => t.n === n);
  const masters = relPeople(P, ['스승']);
  if (masters.some(b => b.alive && b.bond >= 60 && P.year - (b.since || b.met || P.year) >= 5)) gainTrait(P, '스승의 그늘', '스승을 모신 지 다섯 해, 스승의 그림자가 몸에 배었다.');
  if (T('스승의 그늘') && !masters.some(b => b.alive)) { loseTrait(P, '스승의 그늘', '스승이 세상을 떠났다.'); gainTrait(P, '스승의 유지', '스승의 뜻을 이어 가기로 했다.'); }
  if (P.member && P.member.kind === '정식') { c.사문 = (c.사문 || 0) + 1; if (c.사문 >= 10) gainTrait(P, '사문의 긍지', '사문에서 십 년을 보냈다.'); } else { c.사문 = 0; if (T('사문의 긍지')) loseTrait(P, '사문의 긍지', '사문을 떠났다.'); }
  if (!P.member && (sch.cnt.유람 || sch.cnt.탐색)) { c.떠돌이 = (c.떠돌이 || 0) + 1; if (c.떠돌이 >= 6) gainTrait(P, '떠돌이 근성', '어디에도 매이지 않고 여섯 해를 떠돌았다.'); }
  if (P.member) { c.매임 = (c.매임 || 0) + 1; if (c.매임 >= 5 && T('떠돌이 근성')) loseTrait(P, '떠돌이 근성', '한곳에 뿌리를 내렸다.'); } else c.매임 = 0;
  const lovers = P.bonds.filter(b => b.rels.some(r => r === '정인' || r === '배우자'));
  if (lovers.some(b => !b.alive && !b.mourned)) { for (const b of lovers) if (!b.alive) b.mourned = true; gainTrait(P, '그리움', '사랑하던 사람을 잃었다.'); c.그리움 = P.year; }
  if (T('그리움') && (P.year - (c.그리움 || P.year) >= 10 || lovers.some(b => b.alive && b.met > (c.그리움 || 0)))) loseTrait(P, '그리움', '세월이 그리움을 덮었다.');
  if (P.kids >= 3) gainTrait(P, '가장의 무게', '자식이 셋이 되었다.');
  if (P.regions.size >= 10) gainTrait(P, '천하를 본 눈', '열 개 지역을 밟았다.');
  if ([...P.ach].filter(a => a.endsWith('우승')).length >= 2) gainTrait(P, '승부사', '대회에서 두 번 우승했다.');
  if ((c.대패들 || []).length >= 3) { gainTrait(P, '패배의 쓴맛', '다섯 해 사이 세 번 크게 졌다.'); c.쓴맛 = c.생사승 || 0; }
  if (T('패배의 쓴맛') && (c.생사승 || 0) - (c.쓴맛 || 0) >= 3) loseTrait(P, '패배의 쓴맛', '세 번을 이기고 나서야 쓴맛이 가셨다.');
  if (c.겁 === P.year) { gainTrait(P, '겁먹은 마음', '크게 진 뒤로 칼을 쥔 손이 떨린다.'); c.겁승 = c.생사승 || 0; }
  if (T('겁먹은 마음') && (c.생사승 || 0) > (c.겁승 || 0)) loseTrait(P, '겁먹은 마음', '목숨을 건 싸움에서 이기고 떨림이 멎었다.');
  if (P.fame >= 5e5) gainTrait(P, '이름의 무게', '천하가 이름을 안다. 가는 곳마다 일이 따라온다.');
  if (relPeople(P, ['은인']).length >= 3) gainTrait(P, '은혜를 아는 사람', '은혜를 입은 사람이 셋이다.');
  if (['수련', '폐관'].includes(P.plan)) { c.무공바보 = (c.무공바보 || 0) + 1; c.사람 = 0; if (c.무공바보 >= 15) gainTrait(P, '무공 바보', '열다섯 해를 무공만 보고 살았다.'); }
  if (P.plan === '사람과 함께') { c.사람 = (c.사람 || 0) + 1; if (c.사람 >= 5 && T('무공 바보')) { c.무공바보 = 0; loseTrait(P, '무공 바보', '사람들 틈에서 다섯 해를 살았다.'); } }
  if ((c['업:merchant'] || 0) >= 10) gainTrait(P, '장사꾼의 셈', '열 해 장사를 했다.');
  if (P.age >= 60 && baseOf(P, '지략') >= 120) gainTrait(P, '늙은 여우', '예순을 넘기며 세상 이치가 훤히 보인다.');
  if (stageOf(P.infamy) >= 2) gainTrait(P, '피 묻은 이름', '이름만 들어도 사람들이 피한다.'); else if (T('피 묻은 이름') && stageOf(P.infamy) < 1) loseTrait(P, '피 묻은 이름', '악명이 잊혔다.');
  if ((P.deeds.협행 || 0) >= 10) gainTrait(P, '협객의 마음', '의로운 일에 열 번 나섰다.'); if (T('협객의 마음') && P.align < -20) loseTrait(P, '협객의 마음', '마음이 어두워졌다.');
  if ((P.deeds.표행 || 0) >= 10) gainTrait(P, '표사의 감', '열 번 표물을 지켰다.');
  if (P.enl >= 4) gainTrait(P, '깨친 마음', '깨달음이 깊어 기혈이 흔들리지 않는다.');
  if ((c.중상 || 0) >= 14) gainTrait(P, '상처투성이 몸', '크게 다친 것이 열네 번이다.');
  if ((c.중독 || 0) >= 3) gainTrait(P, '독에 익은 몸', '세 번 독에 당하고 살아남았다.');
  if (P.realm >= 5 && P.bonds.some(b => b.rels.some(r => r === '벗' || r === '의형제')) && !relPeople(P, ['벗', '의형제']).some(b => b.alive)) gainTrait(P, '높은 곳의 고독', '함께 웃던 벗들이 모두 떠났다.');
  if (T('높은 곳의 고독') && relPeople(P, ['벗', '의형제']).some(b => b.alive && b.met >= P.year - 1)) loseTrait(P, '높은 곳의 고독', '늘그막에 새 벗을 얻었다.');
  if (relPeople(P, ['제자']).length >= 3) gainTrait(P, '가르치는 기쁨', '제자가 셋이 되었다.');
  if (c.위중 === P.year && P.hurt >= 2 && P.R() < 0.35 && !check(P, '회복', 60).ok) gainTrait(P, '묵은 내상', '위중한 상처가 끝내 다 낫지 않았다.');
  if (T('묵은 내상') && (P.pillYear === P.year || P.traits.some(t => /환골탈태/.test(t.n)))) loseTrait(P, '묵은 내상', '묵은 내상이 씻겨 나갔다.');
  // 소속과 직업(9-34)
  const ld = ladOf(P), yrs = k => (c[k] = (c[k] || 0) + 1);
  for (const k of ['bandit', 'assassin', 'info', 'demon', 'shadow', 'escort', 'beggar', 'guard', 'clan']) if (ld !== k) c['소속:' + k + ':밖'] = (c['소속:' + k + ':밖'] || 0) + 1;
  if (ld) { yrs('소속:' + ld); c['소속:' + ld + ':밖'] = 0; }
  if (ld === 'bandit' && c['소속:bandit'] >= 5) gainTrait(P, WATER.includes(P.member.fid) ? '물길의 사내' : '녹림의 의리', '산채의 밥을 먹은 지 다섯 해다.');
  if (T('녹림의 의리') && (c['소속:bandit:밖'] || 0) >= 10) loseTrait(P, '녹림의 의리', '산채를 떠난 지 십 년, 녹림의 물이 빠졌다.');
  if ((P.deeds.청부 || 0) >= 5) gainTrait(P, '살수의 눈', '청부를 다섯 번 끝냈다.');
  if (ld === 'info' && c['소속:info'] >= 5) gainTrait(P, '열린 귀', '다섯 해를 남의 말 속에서 살았다.');
  if ((ld === 'demon' || ld === 'shadow') && (c['소속:' + ld] || 0) >= 3) gainTrait(P, '교의 낙인', '교의 표식이 몸과 이름에 남았다.');
  if (T('교의 낙인') && (c['소속:demon:밖'] || 0) >= 10 && (c['소속:shadow:밖'] || 0) >= 10) loseTrait(P, '교의 낙인', '교를 떠난 지 십 년, 낙인이 흐려졌다.');
  if ((ld === 'demon' || ld === 'shadow') && P.align <= -40) gainTrait(P, '광신', '교의 가르침이 피가 되었다.');
  if (T('광신') && ld !== 'demon' && ld !== 'shadow') loseTrait(P, '광신', '교를 떠나자 열기가 식었다.');
  if ((P.deeds.표행 || 0) >= 20) gainTrait(P, '표사의 어깨', '스무 번 표물을 지고 길을 걸었다.');
  if (ld === 'beggar' && c['소속:beggar'] >= 5) gainTrait(P, '거지의 넉살', '다섯 해를 거지들과 섞여 살았다.');
  if (ld === 'guard' && c['소속:guard'] >= 5) gainTrait(P, '관복의 무게', '다섯 해 관복을 입었다.');
  if (T('관복의 무게') && (c['소속:guard:밖'] || 0) >= 5) loseTrait(P, '관복의 무게', '관복을 벗은 지 다섯 해다.');
  if (ld === 'sect' && P.member.rank >= 6) gainTrait(P, '사문의 기둥', '사문의 한 축을 맡았다.');
  if (T('사문의 기둥') && ld !== 'sect') loseTrait(P, '사문의 기둥', '사문을 떠났다.');
  if (ld === 'clan' && P.member.kind === '방계') { if (c['소속:clan'] >= 10) gainTrait(P, '방계의 설움', '방계로 십 년, 본가의 문턱은 높았다.'); if (P.member.rank >= 5) loseTrait(P, '방계의 설움', '총관에 올라 설움을 씻었다.'); }
  if ((P.men || 0) + (P.force ? P.force.men : 0) >= 30) gainTrait(P, '무리를 이끄는 자', '따르는 사람이 서른을 넘었다.');
  if ((P.men || 0) + (P.force ? P.force.men : 0) >= 100) gainTrait(P, '백인장의 위엄', '따르는 사람이 백을 넘었다.');
  if (P.flags.expelled && !P.flags.expelHealed) { gainTrait(P, '파문의 상처', '파문당한 날을 잊지 못한다.'); if (P.member && P.member.rank >= 3) { P.flags.expelHealed = 1; loseTrait(P, '파문의 상처', '새 자리에서 이름을 다시 세웠다.'); } }
  if (P.flags.turncoat) { if (P.year - P.flags.turncoat < 15) gainTrait(P, '배신자의 이름', '옛 동문들이 등을 돌렸다.'); else loseTrait(P, '배신자의 이름', '세월이 흘러 배신의 이야기도 잊혔다.'); }
  // 삶의 굴곡(9-34)
  if (P.flags.lateBloom) gainTrait(P, '늦게 핀 꽃', '마흔을 넘겨 벽을 넘었다.');
  if (P.realm >= 3 && P.age < 20 && !c.오만판정) { c.오만판정 = 1; if (!check(P, '성품', 55).ok) gainTrait(P, '어린 고수의 오만', '스무 살도 안 되어 일류가 되자 눈에 보이는 것이 없다.'); }
  if (T('어린 고수의 오만') && P.age >= 30) loseTrait(P, '어린 고수의 오만', '서른이 되어 세상이 넓다는 것을 알았다.');
  if (P.age >= 55 && P.realm >= 3) gainTrait(P, '노강호', '강호에서 늙었다.');
  if (P.flags.parentDeathAge != null && P.flags.parentDeathAge < 15) gainTrait(P, '부모 없는 설움', '어려서 부모를 잃었다.');
  if (T('부모 없는 설움') && P.spouse) loseTrait(P, '부모 없는 설움', '제 식구를 꾸렸다.');
  if (P.wealth >= 10000) gainTrait(P, '부자의 여유', '재산이 만 냥을 넘었다.'); else if (T('부자의 여유') && P.wealth < 1000) loseTrait(P, '부자의 여유', '재산이 바닥났다.');
  if ((P.deeds.도박 || 0) >= 3) { if (!T('노름꾼')) c.노름Y = P.year; gainTrait(P, '노름꾼', '노름판을 떠나지 못한다.'); }
  if ((P.deeds.술 || 0) >= 3) gainTrait(P, '술꾼', '술 없이는 잠이 오지 않는다.');
  if (relPeople(P, ['의형제']).length >= 2) gainTrait(P, '의리의 사나이', '의형제가 둘이 되었다.');
  if (T('원한')) { yrs('원한년'); if (c.원한년 >= 10) gainTrait(P, '복수귀', '십 년을 원수만 생각하며 살았다.'); } else if (T('복수귀')) loseTrait(P, '복수귀', '원수가 사라지자 살아갈 까닭이 흐려졌다.');
  if (P.region !== regionOf(P.home)) { yrs('타향'); if (c.타향 >= 15) gainTrait(P, '고향을 등진 자', '고향을 떠난 지 열다섯 해다.'); } else { c.타향 = 0; if (T('고향을 등진 자')) loseTrait(P, '고향을 등진 자', '고향 땅을 다시 밟았다.'); }
  if (P.closed && P.age >= 50) { yrs('노폐관'); if (c.노폐관 >= 5) gainTrait(P, '은자의 마음', '늘그막에 다섯 해를 문 닫고 보냈다.'); }
  if (P.ach.has('용병') || P.ach.has('정마대전')) gainTrait(P, '전장의 감', '전장의 피비린내를 안다.');
  if ((P.kiyon || 0) >= 3) gainTrait(P, '기연의 아이', '하늘이 세 번 손을 내밀었다.');
  if ((c.영약 || 0) >= 3) gainTrait(P, '영약이 밴 몸', '영약 세 알이 몸에 배었다.');
  if ((c.위중n || 0) >= 2) gainTrait(P, '다친 손', '두 번 사경을 헤매며 손이 예전 같지 않다.');
  if (T('다친 손') && P.traits.some(t => /환골탈태/.test(t.n))) loseTrait(P, '다친 손', '환골탈태로 손이 되살아났다.');
  if (stageOf(P.fame) >= 2 && P.align >= 30) gainTrait(P, '이름을 아끼는 사람', '이름에 부끄럽지 않게 살았다.'); if (T('이름을 아끼는 사람') && P.align < 0) loseTrait(P, '이름을 아끼는 사람', '이름에 먹칠을 했다.');
  if (stageOf(P.infamy) >= 3) gainTrait(P, '악명의 그림자', '이름만 들어도 아이가 울음을 그친다.'); else if (T('악명의 그림자') && stageOf(P.infamy) < 2) loseTrait(P, '악명의 그림자', '악명이 잊혔다.');
  if (P.bonds.some(b => b.passed)) gainTrait(P, '스승을 넘은 자', '스승의 경지를 넘어섰다.');
  if (P.bonds.filter(b => b.rels.includes('제자')).length >= 8) gainTrait(P, '문하가 넓은 사람', '제자가 여섯을 넘었다.');
  if (P.spouse && P.spouse.alive && P.married && P.year - P.married >= 20) gainTrait(P, '오랜 해로', '혼인한 지 스무 해다.');
  if (P.spouse && !P.spouse.alive) { loseTrait(P, '오랜 해로', '짝을 잃었다.'); gainTrait(P, '홀로 남은 사람', '짝을 먼저 보냈다.'); }
  if (T('홀로 남은 사람') && P.spouse && P.spouse.alive) loseTrait(P, '홀로 남은 사람', '다시 짝을 만났다.');
  if (P.age >= 40 && P.kids >= 1) gainTrait(P, '아비·어미의 이름', '자식이 커 가는 것을 본다.');
  if (c.사경 && P.hurt < 3) { c.사경 = 0; if (P.R() < 0.4) gainTrait(P, '죽다 살아난 몸', '사경을 헤매다 돌아왔다.'); }
  if (!P.member && P.flags.ronin) { yrs('낭인'); if (c.낭인 >= 10) gainTrait(P, '떠돌이 검', '열 해를 칼 한 자루로 떠돌았다.'); } else if (P.member) { yrs('매임2'); if (c.매임2 >= 5 && T('떠돌이 검')) loseTrait(P, '떠돌이 검', '한곳에 몸을 묶었다.'); }
  if (baseOf(P, '학식') >= 130 && P.realm >= 3) gainTrait(P, '문무겸전', '글과 칼을 함께 닦았다.');
  // 잃기(해결)
  if (has('피에 익숙함') && c.lastKill != null && P.year - c.lastKill >= 10) loseTrait(P, '피에 익숙함', '십 년 동안 칼에 피를 묻히지 않았다.');
  if (has('세상 물정 모름') && (sch.cnt.유람 || 0) && (c.유람 || 0) >= ((c.폐관유람 = c.폐관유람 ?? c.유람) + 3)) loseTrait(P, '세상 물정 모름', '세 해를 떠돌자 세상 물정이 몸에 붙었다.');
  if (has('허약해진 몸') && (c.배부름 || 0) >= 3) loseTrait(P, '허약해진 몸', '세 해를 배불리 먹었다.');
  if (has('의심의 눈') && P.year - (c.배신 || P.year) >= 10) loseTrait(P, '의심의 눈', '십 년 동안 배신이 없었다.');
  if (has('원한') && !relPeople(P, ['원수']).length) loseTrait(P, '원한', '원수가 사라졌다. 맺힌 것이 풀렸다.');
  if (has('교만') && c.대패 === P.year) loseTrait(P, '교만', '크게 지고 나서야 고개를 숙였다.');
  if (has('무명의 고수') && P.fame >= 1000) loseTrait(P, '무명의 고수', '이름이 세상에 알려졌다.');
  if (has('탁기') && P.pur >= 80) loseTrait(P, '탁기', '정순한 심법으로 탁기를 걸러 냈다.');
  if (has('심마') && relPeople(P, ['스승']).some(b => /승|도사|진인/.test(b.role)) && P.R() < 0.3) loseTrait(P, '심마', '스승의 가르침으로 마음의 마귀를 눌렀다.');
}

// ---------- 내 세력의 성장(9-39): 머릿수에 따라 다섯 단계, 단계마다 자리가 열린다 ----------
const FORCE_TIER_MEN = [0, 30, 100, 300, 1000];
const FORCE_TIERS = {
  문파: { n: ['무관', '소문파', '중소 문파', '중형 문파', '대문파'], posts: [['사부'], ['대제자', '교두'], ['총관', '당주'], ['장로', '장로', '당주', '집사'], ['장로', '장로', '각주', '각주']] },
  산채: { n: ['도적 떼', '산채', '큰 산채', '녹림 대채', '녹림 총채'], posts: [['부두목'], ['조장', '조장'], ['군사', '두목'], ['부채주', '두목', '두목'], ['부채주', '향주', '향주']] },
  상단: { n: ['행상단', '상단', '큰 상단', '대상단', '천하 상단'], posts: [['행수'], ['점원 우두머리', '호위대장'], ['총관', '분점장'], ['분점장', '분점장', '장부 담당'], ['대행수', '대행수', '총호위']] },
  방회: { n: ['패거리', '방회', '큰 방회', '대방회', '흑도 대방'], posts: [['오른팔'], ['조장', '조장'], ['향주', '군사'], ['당주', '당주', '향주'], ['장로', '장로', '당주']] },
};
const FORCE_INCOME_MUL = [1, 1.3, 1.7, 2.2, 3];
function forceTierOf(f) { let t = 0; for (let i = 0; i < FORCE_TIER_MEN.length; i++) if (f.men >= FORCE_TIER_MEN[i]) t = i; return t; }
// 직함(9-42): 낭인도 이름값에 따라 부르는 말이 다르고, 세력의 주인은 규모에 맞는 자리 이름을 갖는다
// 낭인의 칭호(9-42): 해 온 일·성향·경지가 바탕 이름을, 이름값이 머리말을 정한다
LIFE.roninTitle = P => {
  const d = P.deeds || {}, st = Math.max(stageOf(P.fame), stageOf(P.infamy)), dark = P.infamy > P.fame || P.align <= -30;
  const top = Object.entries({ 표행: d.표행 || 0, 청부: d.청부 || 0, 협행: d.협행 || 0, 약탈: d.약탈 || 0, 현상금: (P.ach.has('소문의 끝: 흉적 현상금') ? 3 : 0), 은거: P.flags.hidden ? 5 : 0, 용병: P.ach.has('용병') ? 3 : 0 }).sort((a, b) => b[1] - a[1])[0];
  let base;
  if (top[1] >= 3) base = { 표행: '떠돌이 표사', 청부: dark ? '살수' : '청부업자', 협행: dark ? '복수귀' : '협객', 약탈: '도적', 현상금: '현상금 사냥꾼', 은거: '은자', 용병: '용병' }[top[0]];
  else base = P.realm >= 6 ? (dark ? '마두' : '기인') : P.realm >= 4 ? (dark ? '흉객' : '고수') : P.realm >= 3 ? (dark ? '칼잡이' : '검객') : P.realm >= 1 ? (dark ? '무뢰배' : '낭인') : '떠돌이';
  if (base === '협객' && st >= 3) base = P.realm >= 5 ? '대협' : '의협';
  if (base === '살수' && st >= 3) base = '살성';
  const pre = st >= 4 ? (dark ? '천하가 두려워하는 ' : '천하가 우러르는 ') : st >= 3 ? '천하의 ' : st >= 2 ? '이름난 ' : st >= 1 ? '고을에서 소문난 ' : '';
  return pre + base;
};
LIFE.forceTitle = P => { const f = P.force; if (!f) return null; const t = forceTierOf(f); return ({ 문파: ['관주', '문주', '문주', '장문인', '장문인'], 산채: ['두목', '채주', '채주', '대채주', '총채주'], 상단: ['행수', '단주', '단주', '대단주', '대단주'], 방회: ['우두머리', '방주', '방주', '회주', '대방주'] }[f.kind] || ['주인'])[t] || '주인'; };
LIFE.forceTierName = f => (FORCE_TIERS[f.kind] || FORCE_TIERS.방회).n[forceTierOf(f)];
function fillPosts(P, f, tier) {
  const T = FORCE_TIERS[f.kind] || FORCE_TIERS.방회;
  f.posts = f.posts || [];
  for (const post of T.posts[tier] || []) {
    const used = new Set(f.posts.map(x => x.id));
    let cand = P.bonds.filter(b => b.alive && !used.has(b.id) && b.rels.some(r => ['제자', '수하', '의형제', '벗'].includes(r))).sort((a, b) => (b.realm - a.realm) || (b.bond - a.bond))[0];
    if (!cand) { cand = makeNpc(P, f.kind === '문파' ? '찾아온 무인' : f.kind === '상단' ? '수완 좋은 장사꾼' : '거친 사내', [-2, -1]); meet(P, cand, f.kind === '문파' ? '제자' : '수하'); cand.bond = 25; }
    cand.title = `${f.name}의 ${post}`; f.posts.push({ id: cand.id, post });
    say(P, `${J(cand.name, '을를')} ${J(post, '으로')} 앉혔다.`, 'bond');
  }
}
// 세력의 구성(9-45): 무사는 경지별로, 그 밖에 식객·인부. 전투력은 경지 기준값(1단계 6장)의 합
const REALM_BASE = [1, 4, 10, 30, 120, 600, 3600, 27000];
function forceComp(P, f) {
  const share = { 문파: [0.15, 0.05], 산채: [0.1, 0.05], 상단: [0.5, 0.05], 방회: [0.2, 0.1] }[f.kind] || [0.2, 0.05];
  const labor = Math.round(f.men * share[0]), guests = Math.max(f.posts && f.posts.length ? 1 : 0, Math.round(f.men * share[1])), war = Math.max(0, f.men - labor - guests);
  const top = Math.max(1, Math.min(6, P.realm - 1)), avg = Math.min(top, f.avg || 1), w = [];
  for (let r = 0; r <= 6; r++) w.push(r > top ? 0 : Math.exp(-((r - avg + 0.6) ** 2) / 1.1));
  const tw = w.reduce((a, b) => a + b, 0), cnt = w.map(x => Math.floor(war * x / tw));
  cnt[Math.round(avg)] += war - cnt.reduce((a, b) => a + b, 0);
  for (const x of f.posts || []) { const b = P.bonds.find(y => y.id === x.id); if (b && b.alive && b.realm > top) cnt[Math.min(6, b.realm)]++; }
  f.comp = { 무사: cnt, 식객: guests, 인부: labor };
  f.power = Math.round(cnt.reduce((a, c, r) => a + c * REALM_BASE[r], 0) + guests * REALM_BASE[Math.min(6, top)] + wuwei(P));
  return f.comp;
}
LIFE.forceComp = forceComp;
function forceGrowth(P) {
  const f = P.force; if (!f) return;
  forceComp(P, f);
  f.fame = Math.round((f.fame || 0) * 0.97 + f.men * (1 + (f.tier || 0)) * 0.5);
  const t = forceTierOf(f);
  if (f.tier == null) { f.tier = 0; fillPosts(P, f, 0); }
  while (f.tier < t) {
    f.tier++;
    const T = FORCE_TIERS[f.kind] || FORCE_TIERS.방회;
    say(P, `<b>${f.name}</b>${J(f.name, '이가').slice(-1)} ${J(T.n[f.tier], '으로')} 자랐다. 머릿수 ${f.men}명.`, 'big');
    P.events.push(`${P.age}세에 ${f.name}이 ${T.n[f.tier]}가 되었다`);
    addFame(P, [0, 300, 3000, 30000, 200000][f.tier]);
    fillPosts(P, f, f.tier);
    if (f.tier >= 3) addAch(P, '큰 세력의 주인');
    if (f.tier >= 4 && f.kind === '문파') addAch(P, '대문파를 세우다');
  }
  // 세대: 문파는 열두 해마다 한 대가 더 내려간다(개파조사 = 1대)
  if (f.kind === '문파') { const gen = Math.min(8, 2 + Math.floor((P.year - f.since) / 12)); if (gen > (f.gen || 2)) { f.gen = gen; if (gen >= 3) addAch(P, '삼대 제자'); if (gen >= 5) addAch(P, '오대 제자'); say(P, `${f.name}에 ${gen}대 제자가 들어왔다.`, 'muted'); } else f.gen = f.gen || 2; }
  // 이름: 단계마다 해마다 이름이 퍼진다
  if (f.tier >= 1) addFame(P, f.tier * 60);
}

// ---------- 뒷배(9-40): 무리 뒤에는 봐주는 세력이 있을 수 있다 ----------
function backerFor(P, n) {
  if (n.backer !== undefined) return n.backer;
  n.backer = null;
  if (!(n.men || /두목|채주|우두머리|관주|대주|호위대장/.test(n.role || '')) || P.R() > 0.3) return null;
  const dirty = n.t === '사' || n.t === '마' || /산적|흑도|왈패|수적|마적|녹림|채주/.test(n.role || '');
  const pool = G.FACTIONS.filter(f => factionAlive(P, f.id) && (f.prestige || 0) >= 1 && (dirty ? (f.t === '사' || f.lad === 'info' || f.lad === 'bandit' || f.t === '관') : (f.t === '정' || f.t === '중' || f.t === '관')));
  const b = pool.length ? pk(P, pool) : null;
  if (b) { n.backer = b.id; n.backerKnown = P.R() < 0.35 || (P.knownBackers || []).includes(b.id); }
  return n.backer;
}
function backerText(P, n) { const b = backerFor(P, n); return b && n.backerKnown ? ` 뒤에 ${facDef(b).n}${J(facDef(b).n, '이가').slice(-1)} 있다는 것은 다 아는 이야기다.` : ''; }
function afterBeatBacked(P, n) {
  const b = backerFor(P, n); if (!b) return;
  const f = facDef(b); if (!f || (P.member && (P.member.fid === b))) return;
  repAdd(P, b, -15);
  if (P.R() < 0.45) (P.threats = P.threats || []).push({ fid: b, y: P.year + 1 + Math.floor(P.R() * 3), who: n.name });
  if (n.backerKnown) say(P, `${n.name} 뒤에는 ${f.n}${J(f.n, '이가').slice(-1)} 있다. 그냥 넘어가지 않을 것이다.`, 'ng');
}
function* threatYear(P) {
  const due = (P.threats || []).filter(t => t.y <= P.year); if (!due.length) return;
  P.threats = P.threats.filter(t => t.y > P.year);
  for (const t of due.slice(0, 1)) {
    const f = facDef(t.fid); if (!f || !factionAlive(P, f.id)) continue;
    if (P.force && (P.force.allies || []).length && P.R() < 0.3 * P.force.allies.length) { say(P, `${f.n}이 보복을 벼르다가 동맹들의 눈치를 보고 물러났다.`, 'muted'); continue; }
    const g = foeGroup(P, `${f.n}의 보복대장`, [Math.max(1, P.realm - 1), Math.min(6, P.realm + 1)], 6 + (f.prestige || 1) * 6);
    g.leader.org = f.n; g.leader.fid = f.id;
    const ch = yield { ask: '뒷배의 보복', text: `${t.who}의 일로 ${f.n}에서 사람을 보냈다. ${g.men}명이 문 앞에 섰다.`, month: P.month, options: [['맞서 싸운다', '무리 싸움'], ['배상금을 낸다', `${100 + (f.prestige || 1) * 100}냥`], ['자리를 피한다', '다른 고을로 떠난다']] };
    if (ch === 0) { const r = (P.men || 0) + (P.force ? P.force.men : 0) > 0 ? yield* groupFight(P, g) : yield* fight(P, g.leader, { lethal: true }); if (r.win) { addFame(P, 150); say(P, `${f.n}의 보복을 물리쳤다.`, 'ok'); addAch(P, '뒷배를 꺾다'); } }
    else if (ch === 1) { const c = 100 + (f.prestige || 1) * 100; P.wealth = Math.max(0, P.wealth - c); repAdd(P, f.id, 10); say(P, `${c}냥을 물어 주고 일을 덮었다.`, 'muted'); addAch(P, '배상금'); }
    else { moveTo(P, nearPlace(P, 140)); say(P, `${J(atText(P), '으로')} 몸을 피했다.`, 'muted'); }
  }
}

// ---------- 투자(9-49): 돈을 맡기면 몇 해 뒤 불어나거나 날아간다 ----------
const INVEST = [
  { n: '서역 대상단에 돈을 댄다', yrs: [2, 4], risk: 0.35, mul: [2, 3.5], war: 1 },
  { n: '표국 지분을 산다', yrs: [2, 3], risk: 0.2, mul: [1.4, 2], bandit: 1 },
  { n: '객잔을 하나 사들인다', yrs: [3, 5], risk: 0.15, mul: [1.4, 2.2] },
  { n: '광산에 돈을 묻는다', yrs: [3, 6], risk: 0.45, mul: [2.5, 5] },
  { n: '염전 지분을 산다', yrs: [2, 4], risk: 0.25, mul: [1.6, 2.6], official: 1 },
  { n: '전장에 돈을 맡겨 이자를 받는다', yrs: [3, 3], risk: 0.06, mul: [1.25, 1.35] },
  { n: '조선소에 배 한 척 값을 댄다', yrs: [2, 4], risk: 0.3, mul: [1.8, 3] },
];
function investOffers(P) {
  if (P.age < 18 || P.wealth < 200 || (P.invests || []).length >= 2 || P.year - (P.investY || -9) < 4 || P.R() < 0.75) return [];
  const friend = relPeople(P, ['벗', '의형제']).find(b => b.bond >= 40 && P.R() < 0.4);
  const x = friend ? { n: `${friend.name}의 장사에 돈을 댄다`, yrs: [2, 4], risk: 0.3, mul: [1.6, 2.8], friend } : pk(P, INVEST);
  const amt = Math.round(P.wealth * (0.2 + P.R() * 0.3) / 10) * 10;
  return [{ n: x.n, hint: `${amt}냥, ${x.yrs[0]}~${x.yrs[1]}년. 잘되면 ${x.mul[0]}~${x.mul[1]}배, 망하면 날린다`, go: function* () {
    P.investY = P.year; P.wealth -= amt;
    const yrs = x.yrs[0] + Math.floor(P.R() * (x.yrs[1] - x.yrs[0] + 1));
    (P.invests = P.invests || []).push({ n: x.n, amt, due: P.year + yrs, risk: x.risk, mul: x.mul, war: x.war, bandit: x.bandit, friend: x.friend && x.friend.id });
    say(P, `${amt}냥을 맡겼다 — ${x.n}. ${yrs}년 뒤에 결판이 난다.`, 'act', P.month);
  } }];
}
function investYear(P) {
  for (const v of (P.invests || []).filter(v => v.due <= P.year)) {
    let risk = v.risk * (P.career === 'merchant' ? 0.75 : 1) * (hasTrait(P, '행운아') ? 0.7 : 1) * (hasTrait(P, '불운') ? 1.4 : 1);
    if (P.era && P.era.dz) risk += (v.war ? P.era.dz.war * 0.3 : 0) + (v.bandit ? P.era.dz.bandit * 0.3 : 0);
    const fr = v.friend && P.bonds.find(b => b.id === v.friend);
    if (P.R() < risk) {
      const back = P.R() < 0.4 ? Math.round(v.amt * 0.3) : 0; P.wealth += back;
      say(P, `${v.n} — 일이 틀어졌다. ${back ? `${back}냥만 건졌다.` : '한 푼도 건지지 못했다.'}`, 'ng');
      if (fr) fr.bond -= 15;
      P.cnt = P.cnt || {}; P.cnt.투자실패 = (P.cnt.투자실패 || 0) + 1;
    } else {
      const got = Math.round(v.amt * (v.mul[0] + P.R() * (v.mul[1] - v.mul[0]))); P.wealth += got;
      say(P, `${v.n} — 잘되었다. ${v.amt}냥이 ${got.toLocaleString()}냥이 되어 돌아왔다.`, 'ok');
      if (fr) fr.bond += 15;
      P.cnt = P.cnt || {}; P.cnt.투자성공 = (P.cnt.투자성공 || 0) + 1; if (P.cnt.투자성공 >= 3) addAch(P, '투자의 귀재');
    }
  }
  P.invests = (P.invests || []).filter(v => v.due > P.year);
}

// ---------- 동맹·연맹 제의(9-50): 세력이 있으면 이웃이 손을 내민다 ----------
function allianceOffers(P) {
  const f = P.force; if (!f || P.year - (f.allyY || f.since) < 5 || (f.allies || []).length >= 4 || P.R() < 0.6) return [];
  f.allies = f.allies || [];
  const good = P.align >= 0, kinds = [];
  const nearF = G.FACTIONS.filter(x => factionAlive(P, x.id) && (x.prestige || 0) <= Math.max(1, (f.tier || 0)) + 1 && (good ? ['정', '중'] : ['사', '중', '암']).includes(x.t) && !f.allies.some(a => a.fid === x.id));
  const other = nearF.length ? pk(P, nearF) : null;
  if (other) kinds.push({ k: '동맹', n: `${other.n}이(가) 동맹을 청한다`, hint: '서로 원군을 보낸다. 부름에 응해야 한다', fid: other.id, name: other.n });
  if ((f.tier || 0) >= 1 && !f.allies.some(a => a.k === '연맹')) { const lg = good ? facDef('league') : facDef('sado'); if (lg && factionAlive(P, lg.id)) kinds.push({ k: '연맹', n: `${lg.n}에서 연맹에 들라 한다`, hint: '큰 연맹의 비호. 해마다 분담금, 연맹의 전쟁에 사람을 보낸다', fid: lg.id, name: lg.n }); }
  if (other && !P.spouse && P.age <= 40) kinds.push({ k: '혼인', n: `${other.n}이(가) 혼인으로 맺자고 한다`, hint: '그 집 사람과 혼인하고 동맹이 된다', fid: other.id, name: other.n });
  if (other) kinds.push({ k: '불가침', n: `${other.n}이(가) 서로 건드리지 말자 한다`, hint: '싸우지 않기로 한다. 부름은 없다', fid: other.id, name: other.n });
  if (!kinds.length) return [];
  const x = pk(P, kinds);
  return [{ n: x.n.replace(/이\(가\)/, J(x.name, '이가').slice(x.name.length)), hint: x.hint, go: function* () {
    f.allyY = P.year;
    f.allies.push({ k: x.k, fid: x.fid, n: x.name, y: P.year });
    repAdd(P, x.fid, 20);
    if (x.k === '혼인') { const sp = makeNpc(P, P.sex === 'm' ? '그 집 규수' : '그 집 공자', [-2, 0]); sp.org = x.name; meet(P, sp, '배우자'); sp.bond = 20; say(P, `${x.name}의 ${J(sp.name, '과와')} 혼례를 올렸다. 두 세력이 사돈이 되었다.`, 'big', P.month); }
    else say(P, `${J(x.name, '과와')} ${{ 동맹: '동맹을 맺었다', 연맹: '연맹에 들었다', 불가침: '서로 건드리지 않기로 했다' }[x.k]}.`, 'big', P.month);
    addAch(P, x.k === '연맹' ? '연맹에 들다' : '동맹');
  } }];
}
// 동맹의 원군과 부름
function allyHelp(P) { const f = P.force; if (!f || !f.allies) return 0; return f.allies.filter(a => a.k !== '불가침' && factionAlive(P, a.fid)).reduce((s, a) => s + (a.k === '연맹' ? 15 : 8), 0); }
function* allyYear(P) {
  const f = P.force; if (!f || !(f.allies || []).length) return;
  for (const a of f.allies.filter(a => a.k === '연맹')) { const fee = Math.round(f.men * 0.5); f.treasury = Math.max(0, (f.treasury || 0) - fee); }
  const call = f.allies.filter(a => a.k !== '불가침' && factionAlive(P, a.fid));
  if (!call.length || P.R() > 0.2) return;
  const a = pk(P, call);
  const ch = yield { ask: '동맹의 부름', text: `${a.n}에서 사람이 왔다. 적이 쳐들어왔으니 원군을 보내 달라고.`, month: P.month, options: [['사람을 이끌고 간다', '무리 싸움'], ['사람만 보낸다', '머릿수가 줄 수 있다'], ['못 들은 척한다', '동맹이 깨진다']] };
  if (ch === 0) { const g = foeGroup(P, `${a.n}의 적 두목`, [Math.max(1, P.realm - 1), P.realm + 1], 10 + Math.floor(P.R() * 20)); const r = yield* groupFight(P, g); if (r.win) { repAdd(P, a.fid, 15); addFame(P, 200); } }
  else if (ch === 1) { const lost = Math.round(f.men * (0.03 + P.R() * 0.07)); f.men -= lost; repAdd(P, a.fid, 8); say(P, `${lost}명이 돌아오지 못했다.`, 'muted', P.month); }
  else { f.allies = f.allies.filter(x => x !== a); repAdd(P, a.fid, -30); say(P, `${J(a.n, '과와')}의 맹약이 깨졌다.`, 'ng', P.month); }
}

// ---------- 장기 과업(9-51): 몇 해에 걸쳐 진행되는 일 ----------
const PROJECTS = {
  decode: { n: '잔결 비급 해독', yrs: 4, ok: P => P.arts.length && P.realm >= 2, step: P => check(P, '이해', 60, P.enl * 4).ok, done: P => { giveArt(P, '상승', null, '여러 해 끝에 해독한 비급으로 익히기 시작했다'); addFame(P, 200); }, lines: ['잔결 비급의 한 쪽을 더 풀었다.', '막힌 구절 앞에서 한 해를 보냈다.', '빠진 장을 다른 무공의 이치로 메웠다.'] },
  manor: { n: '장원을 짓는다', yrs: 3, ok: P => P.wealth >= 800 && P.age >= 25, cost: 250, step: P => true, done: P => { P.biz = (P.biz || 0) + 1; addFame(P, 300); P.flags.manor = 1; addAch(P, '장원의 주인'); }, lines: ['주춧돌을 놓았다.', '기와를 올렸다. 일꾼들이 늘었다.', '담장을 두르고 현판을 걸 날을 받았다.'] },
  revenge: { n: '원수를 쫓는 길', yrs: 5, ok: P => relPeople(P, ['원수']).length && P.realm >= 1, step: P => check(P, '수읽기', 55).ok, done: function* (P) { const f = relPeople(P, ['원수'])[0]; if (!f) return; say(P, `다섯 해를 쫓은 끝에 ${J(f.name, '을를')} 막다른 곳으로 몰았다.`, 'big'); const r = yield* fight(P, f, { lethal: true, pMul: 1.2 }); if (r.win) { f.rels = f.rels.filter(x => x !== '원수'); f.alive = false; addAch(P, '원수를 갚다'); } }, lines: ['원수가 머물던 객잔을 찾았다. 사흘 늦었다.', '원수의 옛 동료를 만나 행방을 들었다.', '원수의 그림자를 쫓아 강을 건넜다.', '원수가 남긴 흔적이 짙어진다.'] },
  pupil: { n: '아이 하나를 길러 낸다', yrs: 8, ok: P => P.realm >= 3 && P.age >= 30, step: P => true, start: P => { const d = makeNpc(P, '거둔 아이', [-9, -9]); d.realm = 0; d.age = 8; d.tal = 0.8 + P.R() * 0.7; meet(P, d, '제자'); d.bond = 40; P.projectPupil = d.id; say(P, `${J(d.name, '을를')} 거두어 직접 기르기로 했다.`, 'bond'); }, each: P => { const d = P.bonds.find(b => b.id === P.projectPupil); if (d && d.alive && d.realm < P.realm - 1 && P.R() < 0.4) { d.realm++; say(P, `기르는 아이 ${J(d.name, '이가')} ${REALMS[d.realm]}에 올랐다.`, 'bond'); } }, done: P => { const d = P.bonds.find(b => b.id === P.projectPupil); if (d && d.alive) { d.realm = Math.max(d.realm, P.realm - 1); d.bond += 30; addFame(P, 500); say(P, `${J(d.name, '이가')} ${REALMS[d.realm]}의 무인으로 자라 큰절을 올렸다.`, 'big'); addAch(P, '청출어람(제자)'); } }, lines: ['아이에게 마보를 세웠다.', '아이가 처음으로 초식을 이어 펼쳤다.', '아이가 열병을 앓아 밤을 새웠다.', '아이가 사형제들과 비무를 했다.'] },
  journey: { n: '천하를 한 바퀴 돈다', yrs: 5, ok: P => P.age >= 18 && P.realm >= 1, step: P => { moveTo(P, nearPlace(P, 300)); return true; }, done: P => { addFame(P, 400); addAch(P, '천하를 돌다'); P.real = Math.min(1000, P.real + 100); }, lines: ['새 고을에 닿았다. 말도 음식도 다르다.', '사막을 건넜다.', '바다를 처음 보았다.', '이름 모를 고수와 하룻밤 술을 나눴다.'] },
  create: { n: '평생의 무공을 짓는다', yrs: 6, ok: P => P.realm >= 4 && P.enl >= 2 && mainArt(P), step: P => check(P, '이해', 65, P.enl * 5).ok, done: P => { const m = mainArt(P); const gi = Math.min(5, gIdx(m.def.g) + 1); giveArt(P, GRADES[gi], null, '여섯 해를 바쳐 지은 무공으로 익히기 시작했다'); addAch(P, '무공 창안'); addFame(P, 5000); }, lines: ['초식의 뼈대를 세웠다.', '심법과 초식이 서로 어긋나 처음부터 다시 했다.', '꿈에서 마지막 초식을 보았다.', '제자에게 시연하며 고쳤다.'] },
};
function projectOffers(P) {
  if (P.project || P.age < 18 || P.year - (P.projectEndY || -9) < 3 || P.R() < 0.8) return [];
  const l = Object.entries(PROJECTS).filter(([k, x]) => x.ok(P) && !(P.projDone || []).includes(k));
  if (!l.length) return [];
  const [k, x] = pk(P, l);
  return [{ n: `여러 해의 일: ${x.n}`, hint: `${x.yrs}년쯤 걸린다${x.cost ? `, 해마다 ${x.cost}냥` : ''}. 해마다 조금씩 나아간다`, go: function* () {
    P.project = { k, prog: 0, y: P.year, fail: 0 }; if (x.start) x.start(P);
    say(P, `${x.n}을(를) 시작했다. 몇 해가 걸릴 것이다.`.replace('을(를)', J(x.n, '을를').slice(x.n.length)), 'big', P.month);
  } }];
}
function* projectYear(P) {
  const pj = P.project; if (!pj) return;
  const x = PROJECTS[pj.k]; if (!x) { P.project = null; return; }
  if (x.cost) { if (P.wealth < x.cost) { say(P, `돈이 모자라 ${x.n}이 한 해 멈췄다.`, 'muted'); return; } P.wealth -= x.cost; }
  if (x.each) x.each(P);
  if (x.step(P)) { pj.prog++; say(P, `「${x.n}」 ${pk(P, x.lines)} (${pj.prog}/${x.yrs})`, 'thread'); }
  else { pj.fail++; say(P, `「${x.n}」 이번 해는 나아간 것이 없다.`, 'muted'); if (pj.fail >= 4) { say(P, `${x.n}을 끝내 접었다.`, 'ng'); P.project = null; return; } }
  if (pj.prog >= x.yrs) { P.project = null; P.projectEndY = P.year; P.projDone = (P.projDone || []).concat(pj.k); say(P, `여러 해에 걸친 「${x.n}」을 마쳤다.`, 'big'); P.events.push(`${P.age}세에 「${x.n}」을 마쳤다`); const r = x.done(P); if (r && r.next) yield* r; }
}


// ---------- 화면용 함수(9-56): 지도·이동·소지품·변화량 ----------
// 지도: 모든 지명과 내 위치, 갈 수 있는 곳, 소문·쫓는 일·인연·소속이 있는 곳
LIFE.mapData = function (P) {
  const reach = new Set(placesInRange(P, null, 0).map(([id]) => id));
  const mark = {};
  const add = (id, k, t) => { if (!id || !G.PLACES2[id]) return; (mark[id] = mark[id] || []).push({ k, t }); };
  for (const r of P.rumorQueue || []) add(r.place, '소문', r.kind);
  for (const t of P.threads || []) if (t.place) add(t.place, '쫓는 일', t.kind || t.k);
  for (const b of P.bonds || []) if (b.alive && b.home && b.rels.length) add(b.home, '인연', `${b.name}(${b.rels[0]})`);
  if (P.member) { const f = facDef(P.member.fid); if (f && f.at) add(f.at, '사문', f.n); }
  if (P.force) add(P.force.home, '내 세력', P.force.name);
  add(P.home, '고향', '태어난 곳');
  return { here: P.place, home: P.home, pending: P.pendingTravel || null, range: RANGE_NAME[rangeLevel(P)], places: Object.entries(G.PLACES2).map(([id, p]) => ({ id, n: p.n, x: p.x, y: p.y, t: p.t, r: p.r, reach: reach.has(id), mark: mark[id] || null })) };
};
// 이동: 다음 달에 떠난다. 거리만큼 노잣돈이 든다
LIFE.travelCost = function (P, pid) { const a = G.PLACES2[P.place], b = G.PLACES2[pid]; if (!a || !b) return 0; return Math.round(Math.hypot(a.x - b.x, a.y - b.y) / 6); };
LIFE.travelTo = function (P, pid) { if (!G.PLACES2[pid] || pid === P.place) return false; P.pendingTravel = pid; return true; };
function* travelStep(P) {
  const pid = P.pendingTravel; P.pendingTravel = null; if (!pid || !G.PLACES2[pid]) return;
  const cost = LIFE.travelCost(P, pid);
  if (P.wealth < cost) { say(P, `노잣돈 ${cost}냥이 없어 떠나지 못했다.`, 'muted', P.month); return; }
  P.wealth -= cost; moveTo(P, pid); P.era = eraOf(P);
  say(P, `${J(atText(P), '으로')} 길을 떠났다${cost ? ` (노잣돈 ${cost}냥)` : ''}.`, 'act', P.month);
  for (const x of P.era.local) say(P, x + '.', 'world', P.month);
  addAch(P, '길 떠나기');
}
// 소지품
LIFE.inventory = function (P) {
  const out = [];
  if (P.weapon) out.push({ k: '병기', n: ['', '명병', '보검', '신병이기'][P.weapon], d: '싸움에서 무위를 더한다' });
  for (const t of P.treasures || []) out.push({ k: '보물', n: t, d: '' });
  if (P.pqi > 1) out.push({ k: '약기', n: `몸에 든 약기 ${Math.round(P.pqi)}년`, d: '해마다 내공으로 녹는다' });
  for (const a of P.arts.filter(a => /비급|책|필사본|서고|무덤/.test(a.from || ''))) out.push({ k: '비급', n: a.def.n, d: a.from });
  if (P.biz) out.push({ k: '가게', n: `가게 ${P.biz}곳`, d: '해마다 수입' });
  if (P.flags.manor) out.push({ k: '장원', n: '내 장원', d: '' });
  for (const v of P.invests || []) out.push({ k: '투자', n: v.n, d: `${v.amt}냥 · ${v.due}년에 결판` });
  for (const x of P.dishes || []) out.push({ k: '요리', n: x, d: '이름난 요리' });
  for (const x of P.forged || []) out.push({ k: '벼린 칼', n: x, d: '' });
  return out;
};
// 선택 전후의 변화량
LIFE.snapshot = function (P) { const m = P.member; return { fame: P.fame, infamy: P.infamy, wealth: P.wealth, realm: P.realm, ww: wuwei(P), hurt: P.hurt, poison: P.poison, arts: P.arts.map(a => a.def.n), bonds: P.bonds.map(b => b.id + ':' + b.rels.join(',')), traits: P.traits.map(t => t.n), rank: m ? m.fid + ':' + m.rank : '', men: myMen(P), place: P.place, alive: P.alive, st: Object.fromEntries(Object.keys(P.st).map(k => [k, baseOf(P, k)])), real: P.real, qi: effQi(P) }; };
LIFE.diff = function (P, a) {
  const b = LIFE.snapshot(P), d = [];
  const num = (k, v, unit = '', good = true) => { const x = Math.round(v); if (x) d.push({ k, v: (x > 0 ? '+' : '') + x.toLocaleString() + unit, good: good ? x > 0 : x < 0 }); };
  num('명성', b.fame - a.fame); num('악명', b.infamy - a.infamy, '', false); num('재산', b.wealth - a.wealth, '냥');
  if (b.realm > a.realm) d.push({ k: '경지', v: REALMS[b.realm], good: true });
  if (b.hurt > a.hurt) d.push({ k: '부상', v: ['', '경상', '중상', '위중'][b.hurt], good: false }); else if (b.hurt < a.hurt) d.push({ k: '부상', v: '나음', good: true });
  if (b.poison && !a.poison) d.push({ k: '중독', v: '독', good: false });
  for (const n of b.arts.filter(x => !a.arts.includes(x))) d.push({ k: '무공', v: n, good: true });
  for (const n of b.traits.filter(x => !a.traits.includes(x))) d.push({ k: '특성', v: n, good: true });
  for (const n of a.traits.filter(x => !b.traits.includes(x))) d.push({ k: '특성 사라짐', v: n, good: false });
  const nb = b.bonds.filter(x => !a.bonds.includes(x));
  for (const x of nb) { const [id, rels] = x.split(':'); const bd = P.bonds.find(y => String(y.id) === id); if (bd && rels) d.push({ k: '인연', v: `${bd.name} · ${rels.split(',').pop()}`, good: !/원수|맞수/.test(rels) }); }
  if (b.rank !== a.rank && P.member) d.push({ k: '직위', v: rankName(P), good: true });
  num('수하', b.men - a.men, '명');
  num('내공', b.qi - a.qi, '년'); num('실전', b.real - a.real);
  for (const k of Object.keys(b.st)) if (a.st && b.realm === a.realm && Math.abs(b.st[k] - a.st[k]) >= 0.5) num(k, b.st[k] - a.st[k]);
  if (b.place !== a.place) d.push({ k: '이동', v: atText(P), good: true });
  if (!b.alive) d.push({ k: '죽음', v: P.cause || '', good: false });
  return d;
};

// ---------- 한 해(달 단위, 10단계 9-1) ----------
function* year(P) {
  P.flags.tierUp = false; P.flags.bigWin = false; P.flags.timeUsed = 0;
  card(P);
  if (P.world) yield* worldYear(P);
  if (!P.alive) return;
  const prevEra = P.era; P.era = eraOf(P);
  if (prevEra && prevEra.label !== P.era.label) say(P, `세상의 기운이 바뀌었다: <b>${P.era.label}</b>.`, 'world');
  fixPlan(P);
  const sch = scheduleOf(P);
  // 폐관(9-20): 생로병사와 세계의 큰일 말고는 사건이 오지 않는다
  const closed = P.closed = P.plan === '폐관' && !!sch.cnt.폐관;
  if (closed) { P.closedYears = (P.closedYears || 0) + 1; if (P.closedYears >= 3) addAch(P, '폐관 수련'); } else P.closedYears = 0;
  // 그해의 큰 일들을 달에 나눠 놓는다
  const plan = {}; const put = (m, f) => { if (!closed) (plan[m] = plan[m] || []).push(f); };
  const closedTpl = {}; const put0 = (m, t) => { closedTpl[m] = t; };
  put(1 + Math.floor(P.R() * 12), 'path'); put(1 + Math.floor(P.R() * 12), 'incident');
  if (P.age >= 15) { put(1 + Math.floor(P.R() * 12), 'invite'); put(9, 'tourney'); }
  if (P.age >= 7) put(1 + Math.floor(P.R() * 12), 'single');
  if (P.age >= 6 && P.R() < (P.age < 15 ? 0.6 : 0.3)) put(1 + Math.floor(P.R() * 12), 'life');
  if (P.age >= 15 && P.R() < 0.15) put(1 + Math.floor(P.R() * 12), 'state');
  if (P.age >= 16) { put(1 + Math.floor(P.R() * 12), 'meet'); put(1 + Math.floor(P.R() * 12), 'match'); }
  if (P.age >= 10 && !closed) yield* rumorYear(P);
  if (closed && P.R() < 0.12) { const t = LIFE.TPL.find(x => x.id === 'st_deviation'); if (t && tplOk(P, t)) put0(1 + Math.floor(P.R() * 12), t); }
  const lv = rangeLevel(P);
  const dz = P.era.dz, mulF = mulOf(P, 'eventRate') * Math.pow(1.15, Math.max(stageOf(P.fame), stageOf(P.infamy))) * Math.pow(1.1, Math.max(0, P.realm - 1)) * (hasTrait(P, '행운아') || hasTrait(P, '불운') ? 1.2 : 1) * (1 + 0.4 * Math.max(dz.bandit, dz.demon, dz.war));
  const months = []; for (const a of sch.list) for (let k = 0; k < 3; k++) months.push(a);
  const n12 = months.length / 12;
  let got = 0;
  for (let mo = 1; mo <= 12; mo++) {
    P.month = mo;
    // 행동(플레이어가 고른 것)
    if (P.pending) { const a = P.pending; P.pending = null; yield* doAction(P, a); if (!P.alive) return; }
    // 기회는 넉 달마다(3·7·11월), 이동은 해마다 7월에 한 번 + 다른 달에 가끔 섞인다(9-16, 9-18)
    else if (!closed && (mo === 3 || mo === 7 || mo === 11)) { yield* opportunity(P, mo === 7 || P.R() < 0.25); if (!P.alive) return; }
    if (mo === 2 && !closed && (P.threats || []).length) { yield* threatYear(P); if (!P.alive) return; }
    if (mo === 5 && !closed && P.force) { yield* allyYear(P); if (!P.alive) return; }
    if (mo === 1) { mortality(P); if (!P.alive) return; if (!closed) { yield* npcYear(P); if (P.age >= 8) worldNews(P); } if (!P.alive) return; }
    if (closedTpl[mo]) { yield* runTpl(P, closedTpl[mo], mo); if (!P.alive) return; }
    for (const f of plan[mo] || []) {
      if (f === 'path') yield* pathEvents(P);
      else if (f === 'incident') yield* incident(P);
      else if (f === 'invite') yield* invitations(P);
      else if (f === 'tourney') yield* tourneyYear(P);
      else if (f === 'single') yield* singleYear(P);
      else if (f === 'life') { const t = pickTpl(P, '생애'); if (t) yield* runTpl(P, t, mo); }
      else if (f === 'state') { const t = pickTpl(P, '상태'); if (t) yield* runTpl(P, t, mo); }
      else if (f === 'meet') yield* meetSomeone(P);
      else if (f === 'match') yield* matchmaking(P);
      if (!P.alive) return;
    }
    if (P.pendingTravel) { yield* travelStep(P); if (!P.alive) return; }
    if (!closed) { yield* leadStep(P); if (!P.alive) return; }
    // 소문
    for (const r of P.rumorQueue.filter(x => x.month === mo)) { P.rumorQueue.splice(P.rumorQueue.indexOf(r), 1); yield* rumorHear(P, r); if (!P.alive) return; }
    // 사슬·소문 쫓기(달마다 조금씩)
    for (const th of closed ? [] : P.threads.slice()) {
      if (th.k.startsWith('소문:')) { if (P.R() < 0.25) { const res = yield* rumorStep(P, th); if (res !== 'go') P.threads.splice(P.threads.indexOf(th), 1); if (!P.alive) return; } }
    }
    if (!closed && (mo === 6 || mo === 12)) { yield* threadYear(P); if (!P.alive) return; }
    if (mo % 4 === 0) recover(P);
    if (P.age >= 16 && !closed) { yield* loveStep(P, sch); if (!P.alive) return; }
    if (P.age >= 8 && !closed) { yield* bondStep(P, sch); if (!P.alive) return; }
    // 달의 칸 사건
    if (P.age >= 6 && got < 5 && !closed) {
      const act = months[Math.floor((mo - 1) * n12) % months.length];
      let [p, src] = ACT_EV[act] || [0, null];
      if (src && P.R() < p / 3 * mulF) {
        let s = src;
        if (act === '탐색' && P.R() < 0.3) s = '기연';
        if (P.plan === '소속의 일' && ladOf(P) === 'escort' && src === '의뢰') s = '표행';
        const lad = P.member && facDef(P.member.fid).lad;
        if (src === '의뢰' && (lad === 'escort' || P.career === 'merchant' || P.career === 'military') && P.R() < 0.6) s = '표행';
        if (src === '의뢰' && lad === 'bandit' && P.R() < 0.7) s = '약탈';
        if (src === '유람' && P.flags.ronin && P.R() < 0.35) s = '낭인';
        if ((src === '유람' || src === '협행') && lv >= 1 && P.R() < 0.12 * lv) s = '강호';
        if ((src === '유람' || src === '협행' || src === '놀이') && P.R() < 0.05 * (0.5 + P.apt.기연 / 100)) s = '기연';
        if (src === '생업' && P.career && P.R() < 0.6) s = '생업';
        const t = pickTpl(P, s) || pickTpl(P, src);
        if (t) { got++; if (src === '협행') P.deeds.협행 = (P.deeds.협행 || 0) + 1; if (s === '표행') P.deeds.표행 = (P.deeds.표행 || 0) + 1; if (s === '약탈') P.deeds.약탈 = (P.deeds.약탈 || 0) + 1; yield* runTpl(P, t, mo); if (!P.alive) return; }
      }
      if (P.force && P.R() < 0.025) { const t = pickTpl(P, '세력'); if (t) { yield* runTpl(P, t, mo); if (!P.alive) return; } }
    }
    yield { tick: 'month' };
  }
  // 12월 결산
  if ((sch.cnt.유람 || 0) >= 2 && P.R() < 0.5) moveTo(P, nearPlace(P, RANGE_DIST[lv] > 200 ? 160 : RANGE_DIST[lv]));
  trainYear(P, sch.cnt); if (!P.alive) return;
  acqYear(P, sch);
  yield* careerYear(P, sch.cnt);
  economyYear(P, sch.cnt);
  investYear(P);
  yield* projectYear(P); if (!P.alive) return;
  if (P.plan === '생업' && SHOP_CAREERS.includes(P.career) && P.wealth >= 400 * ((P.biz || 0) + 1) && P.R() < 0.2) { P.wealth -= 200 * ((P.biz || 0) + 1); P.biz = (P.biz || 0) + 1; say(P, `가게를 하나 더 냈다(${P.biz}곳).`, 'ok'); if (P.biz >= 2) addAch(P, '분점'); }
  if (P.member) { P.merit += 3 + (sch.cnt.의뢰 || 0) * 2 + (sch.cnt.사문 || 0) * 3; promote(P); artFromMerit(P); }
  forceYear(P);
  if (P.flags.tierUp && !P.epithet && stageOf(Math.max(P.fame, P.infamy)) >= 1) makeEpithet(P, 'tier');
  else if (P.flags.tierUp && P.epithet && P.R() < 0.5) makeEpithet(P, 'tier');
  if (P.age >= 5 && P.age <= 15 && P.R() < 0.12) revealTraits(P, '맥');
  if (P.age === 16) revealTraits(P, '운명'); if (P.age === 18) revealTraits(P, '몸');
  if (P.age === 12) revealTraits(P, '지능');
  recover(P);
  if (!P.flags.hidden) { P.fame = Math.max(P.fameMax * 0.3, P.fame * 0.98); P.infamy = Math.max(P.infamyMax * 0.3, P.infamy * 0.99); }
  if (P.spouse && P.married && P.year - P.married >= 40) addAch(P, '백년해로');
  { const lv = loveOf(P); if (lv && lv.met < P.year) lv.bond -= 5; }
  if (P.spouse && P.age >= 19 && P.age <= 45 && P.R() < 0.18) { P.kids++; say(P, `자식이 태어났다. (${P.kids}째)`); if (P.kids >= 5) addAch(P, '다복'); }
  if (stageOf(P.fame) >= 2 && P.R() < 0.15) gainMen(P, 1 + Math.floor(P.R() * 4), '이름을 듣고 찾아온 사람');
  if (P.real >= 900) addAch(P, '백전노장');
  if (P.flags.bloodYear && P.year > P.flags.bloodYear) { addAch(P, '혈겁의 생존자'); P.flags.bloodYear = null; }
  if (P.teacher && P.realm > (P.teacher.realm || 0) && P.realm >= 3) addAch(P, '청출어람');
  if (P.age >= 100) addAch(P, P.realm === 0 ? '무공 없이 백 세' : '백세');
  // 이해의 한 줄(이야기의 이음새)
  const yl = yearLine(P, sch); if (yl) say(P, yl, 'muted');
}
function yearLine(P, sch) {
  if (P.age < 6) return null;
  const top = Object.entries(sch.cnt).sort((a, b) => b[1] - a[1])[0]; if (!top) return null;
  // 하던 일이 그대로면 다섯 해에 한 번만 적는다(같은 줄이 해마다 반복되지 않게)
  const key = top[0] + (mainArt(P) ? mainArt(P).def.n : '');
  if (P.lastYearLine === key && P.year - (P.lastYearLineY || 0) < 5) return null;
  P.lastYearLine = key; P.lastYearLineY = P.year;
  const m = mainArt(P), c = P.career && careerDef(P.career);
  const t = { 수련: m ? `이해에는 「${m.def.n}」 수련에 매달렸다.` : '이해에는 몸을 단련했다.', 운기: '이해에는 운기조식으로 기를 다스렸다.', 폐관: '문을 걸어 잠그고 폐관했다.', 생업: c ? `이해에는 ${c.n} 일에 힘썼다.` : null, 유람: '이해에는 강호를 떠돌았다.', 협행: '이해에는 어려운 사람들을 도우며 다녔다.', 의뢰: '이해에는 의뢰를 맡아 길 위에서 보냈다.', 글공부: '이해에는 글을 읽었다.', 가족: P.age < 15 ? null : '이해에는 가족과 함께 지냈다.', 놀이: null, 세력: P.force ? `이해에는 ${J(P.force.name, '을를')} 돌보았다.` : null }[top[0]];
  return t || null;
}

// ---------- 엔딩(9단계, 개정 2) ----------
const LEADER_END = { sect: '장문인', clan: '가주', league: '무림맹주', demon: '천마', bandit: '녹림왕', beggar: '개방 방주', info: '하오문주', assassin: '살막주', guard: '지휘사', escort: '국주', shadow: '흑막의 수뇌' };
function ending(P) {
  const f = P.flags.leader && facDef(P.flags.leader);
  const rungTop = id => P.flags['rung_' + id] != null ? P.flags['rung_' + id] : -1;
  const careers = G.CAREERS.filter(c => c.id !== 'scholar');
  const rows = [
    ['神', '천하제일 전설', P.peak >= 7 && P.flags.tianxiaWin],
    ['神', '우화등선', P.peak >= 7 && P.enl >= 5 && P.age >= 90 && P.causeKind === 'age'],
    ['神', '현경의 경지', P.peak >= 7],
    ['天', '천하제일인', P.flags.tianxiaWin],
    ['天', '마도천하', f && (f.t === '마' || f.t === '사') && P.infamyMax >= 5e6],
    ['天', '무림지존', f && f.t === '정' && f.prestige >= 3 && P.fameMax >= 5e6],
    ['天', '개파조사', P.force && P.force.kind === '문파' && P.force.men >= 300 && P.fameMax >= 5e5],
    ['天', '무명의 절대고수', P.peak >= 6 && P.fameMax < 1000],
    ['天', '화경의 고수', P.peak >= 6],
    ...careers.filter(c => careerFrame(c).rungs === 6).map(c => ['天', c.lad[5], rungTop(c.id) >= 5]),
    ['天', '재상', rungTop('scholar') >= 6],
    ...(f ? [[f.prestige >= 3 ? '天' : f.prestige >= 2 ? '地' : '玄', `${f.n}의 ${LEADER_END[f.lad] || '수장'}`, true]] : []),
    ['地', '일대종사', P.peak >= 4 && P.bonds.filter(b => b.rels.includes('제자') && b.realm >= 3).length >= 2],
    ['地', '세력의 주인', P.force && P.force.men >= 300 && P.fameMax >= 5e4],
    ['地', '무공의 창시자', (P.created || []).length && P.peak >= 4 && P.arts.some(a => a.def.f === 'own' && gIdx(a.def.g) >= 3)],
    ['地', '초절정 고수', P.peak >= 5],
    ['地', '명진강호', P.fameMax >= 5e5],
    ['地', '대마두', P.infamyMax >= 5e5],
    ['地', '협객', (P.deeds.협행 || 0) >= 10 && P.fameMax >= 5e4],
    ['地', '명검의 주인', P.weapon >= 3],
    ['玄', '천하를 누빈 자', P.regions.size >= 15],
    ...careers.filter(c => careerFrame(c).rungs === 6).map(c => ['地', c.lad[4], rungTop(c.id) >= 4]),
    ...careers.filter(c => careerFrame(c).rungs === 5).map(c => ['地', c.lad[4], rungTop(c.id) >= 4]),
    ['地', '진사', rungTop('scholar') >= 5],
    ['玄', '절정 고수', P.peak >= 4],
    ['玄', '작은 세력의 주인', !!P.force],
    ['玄', '수하를 거느린 자', (P.men || 0) + (P.force ? P.force.men : 0) >= 50],
    ['玄', '장로', P.member && P.member.rank >= Math.ceil(ladderOf(facDef(P.member.fid)).length * 0.6)],
    ['玄', '무공을 지은 자', (P.created || []).length],
    ['玄', '명동일방', P.fameMax >= 5e4],
    ['玄', '흉명원양', P.infamyMax >= 5e4],
    ['玄', '복수귀', P.ach.has('원수를 갚다')],
    ['玄', '보물 사냥꾼', [...P.ach].filter(a => a.startsWith('소문의 끝')).length >= 4],
    ['玄', '거인', rungTop('scholar') >= 4],
    ['玄', '은거기인', P.peak >= 3 && P.fameMax < 1000],
    ...careers.filter(c => careerFrame(c).rungs === 6).map(c => ['玄', c.lad[3], rungTop(c.id) >= 3]),
    ...careers.filter(c => careerFrame(c).rungs === 5).map(c => ['玄', c.lad[3], rungTop(c.id) >= 3]),
    ['黃', '일류 무사', P.peak >= 3],
    ['黃', '백세 장수', P.age >= 100],
    ['黃', '주화입마', P.causeKind === 'qi'],
    ['黃', '요절', P.age < 20],
    ['黃', '비명횡사', P.causeKind === 'combat'],
    ['黃', '산적', P.member && facDef(P.member.fid).lad === 'bandit'],
    ['黃', '표사의 일생', P.member && facDef(P.member.fid).lad === 'escort'],
    ['黃', '강호의 낭인', P.peak >= 1 && P.flags.ronin],
    ['黃', '문파의 제자', P.member],
    ['黃', '삼류 무사', P.peak >= 1],
    ...G.CAREERS.map(c => ['黃', `${c.n}의 일생`, P.career === c.id && P.rung >= 1]),
    ['黃', '범부의 일생', true],
  ];
  const r = rows.find(x => x[2]);
  return { grade: r[0], name: r[1] };
}
LIFE.ending = ending;
LIFE.ENDING_COUNT = 90;
const BASE_ACHS = ['첫걸음', '벽을 넘다', '늦깎이', '소년고수', '대성', '박학', '신공', '갑자', '둔재의 노력', '약골의 집념', '무공 없이 백 세', '주화입마를 넘다',
  '첫 승', '하극상', '백전노장', '숨은 고수를 만나다', '동귀어진', '용봉지회 입상', '용봉지회 우승', '고을 비무대회 입상', '고을 비무대회 우승', '무림대회 입상', '무림대회 우승', '천하제일 비무', '천하제일 비무대회 우승', '혈겁의 생존자',
  '사부님', '청출어람', '결의형제', '원수를 갚다', '백년해로', '다복', '사제의 연', '배신당하다',
  '별호', '명동천하', '문풍상담', '거부', '장원급제', '가업을 잇다', '기연', '세 번의 기연', '천무지체', '세상이 바뀌다', '정마대전', '유랑', '백세',
  '소문을 쫓다', '정보는 힘', '전설의 무덤', '전생과 마주치다', '도장 깨기', '개파', '세력을 세우다', '무공 창안', '은거',
  '수하 열 명', '수하 쉰 명', '백인을 거느리다', '오백 무리', '천인을 거느리다',
  '신메뉴', '분점', '상단주', '명검을 벼리다', '땅부자', '돈으로 산 강함', '첫 만남', '정인', '짝사랑', '혼례', '비전을 잇다', '청출어람(제자)', '생사지교', '원한을 끊다', '파문', '근신', '투자의 귀재', '동맹', '연맹에 들다', '장원의 주인', '천하를 돌다', '손버릇', '큰 세력의 주인', '대문파를 세우다', '삼대 제자', '오대 제자', '이름을 짓다', '전리품', '곳간을 털다', '뒷배를 꺾다', '배상금', '청부 열 번', '표행 스무 번', '수장의 자리', '부자', '이백 세', '역병을 이겨 내다', '스승의 부름', '문파가 먼저 찾아오다', '용병', '대문파의 산문', '장로의 후인', '절대고수의 후인', '폐관 수련', '길 떠나기', '충성의 맹세', '제자 모집', '사파 토벌', '하위 세력', '표행 열 번', '약탈 열 번', '협행 열 번', '어린 날의 모험', '신동'];
LIFE.ACHS = BASE_ACHS
  .concat(Object.keys((G.RUMORS || {})).map(k => '소문의 끝: ' + k))
  .concat(['구파일방', '세가', '연합', '사교', '흑도', '암중', '관부', '오악도불', '새외', '생업'].map(c => c + '에 들다'))
  .concat((G.CAREERS || []).map(c => `${c.n} 명인`))
  .concat(Object.keys(G.REGIONS || {}).map(r => J(r, '을를') + ' 밟다'));
// 업적 판정(생이 끝날 때 한 번 더 훑는다)
function finalAchs(P) {
  if (P.member) addAch(P, facDef(P.member.fid).cat + '에 들다');
  for (const r of P.regions) addAch(P, J(r, '을를') + ' 밟다');
  for (const c of G.CAREERS) if ((P.flags['rung_' + c.id] || -1) >= 3) addAch(P, `${c.n} 명인`);
  if ((P.deeds.표행 || 0) >= 10) addAch(P, '표행 열 번');
  if ((P.deeds.약탈 || 0) >= 10) addAch(P, '약탈 열 번');
  if ((P.deeds.협행 || 0) >= 10) addAch(P, '협행 열 번');
  if ((P.used.k_prodigy || 0) && P.fameMax >= 1000) addAch(P, '신동');
  if (Object.keys(P.used).filter(k => k.startsWith('k_')).length >= 6) addAch(P, '어린 날의 모험');
}

// ---------- 일생 ----------
LIFE.run = function* (P) {
  P.rumorQueue = []; P.seenRumors = new Set(); P.rumorSeen = {}; P.legendsMet = new Set(); P.month = 1;
  yield* birth(P);
  while (P.alive && P.age < 400) {
    yield* year(P);
    if (!P.alive) break;
    P.age++; P.year++;
    yield { tick: 'year' };
  }
  if (P.flags.bloodYear) addAch(P, '혈겁의 생존자');
  finalAchs(P);
  const e = ending(P); P.end = e;
  say(P, `${P.age}세, ${P.cause}.`, 'big');
  return e;
};
// 일대기: 어린 날·젊은 날·중년·말년으로 나눈 이야기
LIFE.summary = function (P) {
  const s = [], m = mainArt(P);
  s.push(`${yr(P.start.y)}, ${atText({ place: P.home })}의 ${P.origin.n}에서 ${P.sex === 'm' ? '사내아이' : '계집아이'}로 태어났다. 때는 ${P.startEra ? P.startEra.chapter + ', ' + P.startEra.label : '어지러운 세상'}이었다.`);
  const ev = P.events.map(e => ({ age: +e.match(/^(\d+)세/)?.[1] || 0, t: e }));
  const part = (a, b, head) => { const l = ev.filter(e => e.age >= a && e.age < b).map(e => e.t.replace(/^\d+세에 /, '')); if (l.length) s.push(`${head} ${l.slice(0, 4).join(', ')}.`); };
  part(0, 20, '어린 날과 젊은 날에는'); part(20, 40, '한창때에는'); part(40, 60, '중년에는'); part(60, 200, '말년에는');
  if (P.peak > 0) s.push(`이른 경지는 ${REALMS[P.peak]}${m ? `, 손에 익은 무공은 「${m.def.n}」` : ''}이었다.`); else s.push('무공의 문턱은 끝내 넘지 못했다.');
  if (P.force) s.push(`${J(P.force.name, '을를')} 세워 ${P.force.men}명을 거느렸다.`);
  else if (P.member) s.push(`${facDef(P.member.fid).n}의 ${rankName(P)}로 살았다.`);
  if (P.career) s.push(`${careerDef(P.career).n} 일로 ${careerDef(P.career).lad[P.rung]}에 이르렀다${(P.dishes || []).length ? `. 「${P.dishes[0]}」 같은 요리를 남겼다` : ''}${(P.forged || []).length ? `. 「${P.forged[0]}」 같은 병기를 벼렸다` : ''}.`);
  if (P.epithet) s.push(`강호는 그를 「${P.epithet}」이라 불렀다.`);
  if (P.spouse) s.push(`${J(P.spouse.name, '과와')} 혼인해 ${P.kids ? '자식 ' + P.kids + '명을 두었다' : '자식 없이 살았다'}.`);
  s.push(`${P.age}세에 ${P.cause}.`);
  return s.join(' ');
};
// 전설로 남길 기록(9-8)
LIFE.birthInfo = function (P) {
  const og = P.origin; if (!og) return null;
  const w = [3, 30, 300, 3000, 30000, 300000][og.wealth || 0], wl = (G.WEALTH.slice().reverse().find(x => w >= x.min) || G.WEALTH[0]).n;
  return { home: atText({ place: P.home }), origin: og.n, status: og.status || '양민', wealth: wl, trade: og.career ? careerDef(og.career).n : null, year: P.start ? P.start.y : P.year, era: P.startEra ? `${P.startEra.chapter}, ${P.startEra.label}` : '' };
};
// 지난 생의 요약: 해금이 고르는 대신 지난 생을 따라간다(9-25 보충)
LIFE.lastOf = function (P) {
  const lad = ladOf(P) || (P.flags.expelled && facDef(P.flags.expelled) ? facDef(P.flags.expelled).lad : null);
  const lean = ['bandit', 'info', 'assassin', 'demon', 'shadow'].includes(lad) ? '흑도' : lad === 'clan' ? '세가' : P.career === 'merchant' || P.wealth >= 3000 ? '상인' : lad === 'guard' || P.career === 'scholar' || P.career === 'military' ? '관부' : P.wealth < 30 && !P.member ? '고아' : null;
  return { region: regionOf(P.home), originId: P.origin && P.origin.id, year: P.start ? P.start.y : P.year, lean, traits: P.traits.filter(t => !LIFE.MINOR_IDS.has(t.id) && t.good !== 0 && G.TRAITS.some(x => x.id === t.id) && t.tier !== '천품').map(t => t.id) };
};
LIFE.legendOf = function (P) {
  const m = mainArt(P);
  return { name: P.dharma || P.name, ep: P.epithet, born: P.start.y, died: P.start.y + P.age, realm: P.peak, place: P.home, art: m ? m.def.n : null, artDef: m && m.def.f === 'own' ? m.def : null, force: P.force ? { n: P.force.name, kind: P.force.kind, at: P.force.home, y: P.force.since, men: P.force.men } : null, end: P.end && P.end.name, grade: P.end && P.end.grade };
};

// ---------- 내보내기 ----------
LIFE.REALMS = REALMS; LIFE.GRADES = GRADES; LIFE.ENL = ENL; LIFE.STAGES = STAGES; LIFE.BRANCH = BRANCH;
LIFE.s12 = s12; LIFE.sungCap = sungCap; LIFE.mainArt = mainArt; LIFE.heartArt = heartArt; LIFE.baseOf = baseOf; LIFE.branchBase = branchBase; LIFE.statCap = statCap;
LIFE.effQi = effQi; LIFE.careerDef = careerDef; LIFE.facDef = facDef; LIFE.atText = atText; LIFE.stageOf = stageOf; LIFE.perceive = perceive;
LIFE.init = function () {
  if (LIFE.ready) return;
  LIFE.MINOR_IDS = new Set((G.TRAITS_MINOR || []).map(t => t.id));
  LIFE.TPL = (G.EVENT_TEMPLATES || []).concat(G.LIFEBOOK || [], G.MURIMBOOK || [], G.MURIMBOOK2 || [], G.FACTIONBOOK || [], G.MURIMBOOK3 || [], G.MURIMBOOK4 || []);
  LIFE.CLAN_SUR = new Set(G.FACTIONS.filter(f => f.sur).map(f => f.sur));
  LIFE.BIG = new Set(G.BIG_CITIES || []);
  LIFE.ARTS_BY_F = {}; LIFE.ARTS_BY_G = [[], [], [], [], [], []];
  for (const a of G.ARTS) { (LIFE.ARTS_BY_F[a.f] = LIFE.ARTS_BY_F[a.f] || []).push(a); const gi = GRADES.indexOf(a.g); if (gi >= 0) LIFE.ARTS_BY_G[gi].push(a); }
  LIFE.FREE_HEART = (LIFE.ARTS_BY_F.free || []).filter(a => a.role === '심법' && a.g === '삼류');
  if (!LIFE.FREE_HEART.length) LIFE.FREE_HEART = LIFE.ARTS_BY_G[0].filter(a => a.role === '심법');
  LIFE.FOUNDERS = G.FOUNDERS || { shaolin: '발타', wudang: '장삼봉', huashan: '청허자', gaibang: '연무백', qingcheng: '송학도인', zhongnan: '운허진인', emei: '정연 사태', diancang: '단목휘', kunlun: '백운자', kongtong: '철벽진인', bailian: '모자원', quanzhen: '왕중양' };
  LIFE.ready = true;
};
G.LIFE = LIFE;
})(typeof window !== 'undefined' ? window : globalThis);
