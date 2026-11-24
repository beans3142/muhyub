// 특성 데이터 생성기. 정본은 docs/p2-traits-realms.md 3장 표다. 실행: node tools/gen_traits.js → data/traits.js
// 문서를 고치면 이 스크립트를 다시 돌린다. 데이터를 손으로 고치지 않는다.
'use strict';
const fs = require('fs');
const path = require('path');
const DOC = fs.readFileSync(path.join(__dirname, '..', 'docs', 'p2-traits-realms.md'), 'utf8').replace(/\r\n/g, '\n');

// ---------- 표 읽기 ----------
function section(title) {
  const i = DOC.indexOf('### ' + title);
  if (i < 0) throw new Error('절 없음: ' + title);
  const j = DOC.indexOf('\n### ', i + 4);
  const k = DOC.indexOf('\n## ', i + 4);
  const end = Math.min(j < 0 ? DOC.length : j, k < 0 ? DOC.length : k);
  return DOC.slice(i, end);
}
function rows(text) {
  const out = [];
  let header = null;
  for (const line of text.split('\n')) {
    if (!line.startsWith('|')) { header = line.startsWith('**') ? header : header; continue; }
    const cells = line.slice(1, line.endsWith('|') ? -1 : undefined).split('|').map(c => c.trim());
    if (cells.every(c => /^-+$/.test(c))) continue;
    if (cells[0] === '이름' || cells[0] === '등급' || cells[0] === '갈래') { header = cells; continue; }
    if (header) out.push(Object.fromEntries(header.map((h, i) => [h, cells[i] || ''])));
  }
  return out;
}

// ---------- 효과 해석 ----------
const num = v => {
  v = v.trim().replace(/−/g, '-').replace(/＋/g, '+');
  if (/^×/.test(v)) return { mul: +v.slice(1) };
  if (/^[+-]?\d+(\.\d+)?%?$/.test(v)) return +v.replace('%', '');
  return v;
};
function parseKey(src) {
  src = src.trim();
  let m = src.match(/^([a-zA-Z]+)\s*\{(.*)\}$/);
  if (m) {
    const body = m[2];
    if (!body.includes(':')) return [m[1], body.split(',').map(x => num(x))];
    const o = {};
    for (const part of body.split(',')) { const [k, v] = part.split(':'); if (v !== undefined) o[k.trim()] = num(v); }
    return [m[1], o];
  }
  m = src.match(/^([a-zA-Z]+)\s*\[(.*)\]$/);
  if (m) return [m[1], m[2].split(/[·,]/).map(x => x.trim()).filter(Boolean)];
  m = src.match(/^([a-zA-Z]+)\s*([×+−\-]?)\s*([\d.]+)$/);
  if (m) return [m[1], m[2] === '×' ? { mul: +m[3] } : +((m[2] === '−' || m[2] === '-' ? '-' : '') + m[3])];
  return null;
}
// 산문 효과에서 흔한 꼴만 뽑는다: "○○ 판정 +2", "○○ +3", "○○ 생업 ×1.2", "○○ ×1.4"
const CAREERS = ['숙수', '대장장이', '의원', '상인', '기예', '학자', '농부', '표행'];
function parseProse(text) {
  const fx = {};
  const segs = [];
  for (const seg of text.split(/[,，]/)) {
    const pieces = seg.split('·');
    if (pieces.length > 1 && pieces.every(x => /[+−\-×]\s*[\d.]+|불가|면제|절반|두 배/.test(x))) segs.push(...pieces); else segs.push(seg);
  }
  for (const seg of segs) {
    const s = seg.trim().replace(/−/g, '-');
    if (!s) continue;
    let m;
    if ((m = s.match(/^(.*?)인연 생성 ×\s*([\d.]+)$/))) { fx.bond = Object.assign(fx.bond || {}, { rate: +m[2] }); if (m[1].trim()) fx.bond.when = m[1].trim(); continue; }
    if ((m = s.match(/^인연 호감(?: 시작)? ([+-]\d+)$/))) { fx.bond = Object.assign(fx.bond || {}, { start: +m[1] }); continue; }
    if ((m = s.match(/^(.+?)\s*(?:생업\s*)?×\s*([\d.]+)$/)) && CAREERS.some(c => m[1].includes(c))) { (fx.career = fx.career || {})[m[1].replace(/ 생업$/, '').trim()] = { mul: +m[2] }; continue; }
    if ((m = s.match(/^(.+?) 사건 ×\s*([\d.]+)$/))) { (fx.eventRate = fx.eventRate || {})[m[1].trim()] = +m[2]; continue; }
    if ((m = s.match(/^(.*?)외물 ×\s*([\d.]+)$/))) { (fx.outer = fx.outer || []).push({ when: m[1].trim() || '항상', mul: +m[2] }); continue; }
    if ((m = s.match(/^(.+?) ×\s*([\d.]+)$/))) { (fx.mul = fx.mul || {})[m[1].trim()] = +m[2]; continue; }
    if ((m = s.match(/^(.+?)\s*(?:판정\s*)?([+-]\d+)$/))) { (fx.check = fx.check || {})[m[1].replace(/ 판정$/, '').trim()] = +m[2]; continue; }
    if ((m = s.match(/^(.+?) 면제$/))) { (fx.immune = fx.immune || []).push(m[1].trim()); continue; }
    if ((m = s.match(/^(.+?) 불가$/))) { (fx.ban = fx.ban || []).push(m[1].trim()); continue; }
    if ((m = s.match(/^(.+?) 절반$/))) { (fx.mul = fx.mul || {})[m[1].trim()] = 0.5; continue; }
    if ((m = s.match(/^(.+?) 두 배$/))) { (fx.mul = fx.mul || {})[m[1].trim()] = 2; continue; }
    if ((m = s.match(/^(.+?)(?:과|와) 같다$/))) { fx.sameAs = m[1].replace(/ 성정$/, '').trim(); continue; }
    if ((m = s.match(/^(.+?)의 반대$/))) { fx.mirrorOf = m[1].trim(); continue; }
  }
  return fx;
}
function parseEffect(text) {
  const fx = {};
  const ticks = [...text.matchAll(/`([^`]+)`/g)].map(m => m[1]);
  for (const t of ticks) { const kv = parseKey(t); if (kv) { const [k, v] = kv; if (fx[k] && typeof fx[k] === 'object' && typeof v === 'object' && !Array.isArray(v)) Object.assign(fx[k], v); else fx[k] = v; } }
  const prose = text.replace(/`[^`]+`/g, '').replace(/\s*\([^)]*\)/g, '').trim();   // 괄호 속 설명은 효과가 아니다
  const p = parseProse(prose);
  for (const [k, v] of Object.entries(p)) fx[k] = Array.isArray(v) ? (fx[k] || []).concat(v) : (typeof v === 'object' ? Object.assign(fx[k] || {}, v) : v);
  if (!Object.keys(fx).length && text.trim()) fx.special = text.trim();   // 엔진이 id로 따로 처리한다
  return fx;
}
// ± / ∓ 를 짝의 첫째·둘째로 나눈다
function splitPm(text, idx) {
  return text.replace(/±/g, idx === 0 ? '+' : '−').replace(/∓/g, idx === 0 ? '−' : '+');
}
const GOOD = { '○': 1, '×': 0, '△': 2 };

// ---------- 등급 ----------
function tierOf(p, name) {
  if (name === '천무지체') return '천품';
  if (p >= 100000) return '하품';
  if (p >= 10000) return '중품';
  if (p >= 1000) return '상품';
  return '극품';
}
const cleanName = n => n.replace(/\s*\(천품, 유일\)/, '').trim();
function sexOf(n) { return /\(여\)/.test(n) ? 'f' : /\(남\)/.test(n) ? 'm' : undefined; }
const strip = n => n.replace(/\((여|남)\)/, '').trim();

// ---------- 소소한 특성 ----------
const MINOR = [];
const PAIRS = [];
for (const r of rows(section('3-0.'))) {
  const names = r['이름'].split('↔').map(s => s.trim());
  const goods = r['좋음'].split('/').map(s => s.trim());
  const weights = r['가중'].split('/').map(s => +s.trim());
  let effs = r['효과'].includes(' / ') && names.length > 1 ? r['효과'].split(' / ') : names.map(() => r['효과']);
  if (effs.length === 2) {
    const [a, b] = effs.map(x => x.trim());
    if (!/[\d×]/.test(a)) { const m = b.match(/^(\S+)(.*)$/); effs = [a + m[2], b]; }          // "북방·겨울 / 남방·여름 사건 판정 −1"
    else if (/^[+−\-×]/.test(b)) { const subj = a.replace(/[+−\-×][\d.]+[^,]*$/, ''); effs = [a, subj + b]; }  // "물속 판정 −3 / +3"
  }
  names.forEach((n, i) => {
    const e = splitPm(effs[i] || effs[0], i);
    MINOR.push({ id: 'm_' + MINOR.length, n, c: '소소', tier: '범품', good: GOOD[goods[i] || goods[0]], w: weights[i] || weights[0], e, fx: parseEffect(e) });
  });
  if (names.length > 1) PAIRS.push(names);
}
// 성정·재주는 소소한 특성 뽑기에 가중 6으로 들어간다
for (const [sec, c] of [['3-7.', '성정'], ['3-8.', '재주']]) for (const r of rows(section(sec))) {
  MINOR.push({ id: 'm_' + MINOR.length, n: r['이름'], c, tier: '범품', good: GOOD[r['좋음']], w: 6, e: r['효과'], fx: parseEffect(r['효과']) });
}

// ---------- 큰 특성 ----------
const BIG = [];
const GROUP = {};
const BIG_SECS = [['3-1.', '지체'], ['3-2.', '맥'], ['3-3.', '몸'], ['3-4.', '지능'], ['3-5.', '재능'], ['3-6.', '운명'], ['3-9.', '기이']];
for (const [sec, c] of BIG_SECS) for (const r of rows(section(sec))) {
  const raw = r['이름'];
  let pStr = r['확률'];
  const expand = /^오행 지체/.test(raw) ? ['목', '화', '토', '금', '수'].map(x => `${x}행지체`) : [cleanName(raw)];
  const each = /^각\s*/.test(pStr);
  const p = pStr === '해금 후' ? 0 : +pStr.replace(/^각\s*/, '').replace(/,/g, '');
  for (const nm of expand) {
    let e = r['효과'];
    if (expand.length > 1) e = e.replace('해당 오행', nm[0]);
    const o = { id: 'b_' + BIG.length, n: strip(nm), c, tier: tierOf(p, strip(nm)), good: GOOD[r['좋음']], p, e, fx: parseEffect(e) };
    const sx = sexOf(nm); if (sx) o.sex = sx;
    if (o.n === '천무지체') o.unique = true;
    const note = r['치료·비고'];
    if (note) { o.note = note; const g = note.match(/(하단전|중단전|상단전) 묶음/); if (g) o.group = g[1]; }
    if (!o.group) {
      if (c === '지체') o.group = '지체';
      else if (c === '맥') o.group = '맥';
      else if (['장대한 체구', '왜소한 체구'].includes(o.n)) o.group = '체구';
      else if (['타고난 속근', '타고난 지근'].includes(o.n)) o.group = '근섬유';
      else if (['천재', '똑똑함', '멍청함', '경계선 지능'].includes(o.n)) o.group = '지능';
      else if (['행운아', '불운'].includes(o.n)) o.group = '운';
    }
    if (p === 0) o.unlockOnly = true;
    BIG.push(o);
  }
}

// ---------- 조건부·후천·사건·경지 ----------
const COND = rows(section('3-11.')).map((r, i) => ({ id: 'c_' + i, n: r['이름'], when: r['켜지는 조건'], e: r['효과'], fx: parseEffect(r['효과']) }));
const ACQ = rows(section('3-12.')).map((r, i) => ({ id: 'a_' + i, n: r['이름'], counter: r['계수기 문턱'], check: r['판정'], e: r['효과'], fx: parseEffect(r['효과']), lose: r['사라지는 길'] }));
const EVENT = rows(section('3-13.')).map((r, i) => ({ id: 'e_' + i, n: r['이름'], by: r['생기는 사건'], e: r['효과'], fx: parseEffect(r['효과']) }));
const REALM = rows(section('3-14.')).map((r, i) => ({ id: 'r_' + i, n: r['이름'], realm: r['경지'], e: r['효과'], fx: parseEffect(r['효과']) }));

// ---------- 반대 짝 (4장) ----------
const OPP = [['겁', '담력'], ['병약', '철골'], ['병약', '무골'], ['멍청함', '똑똑함'], ['게으름', '근면'], ['냉체', '열체'], ['길치', '길눈'], ['겁', '호승심'], ['피공포증', '비위가 좋음'], ['피공포증', '피에 익숙함'], ['새가슴', '큰 무대 체질'], ['새가슴', '위기에 강함'], ['유리몸', '철골'], ['유리몸', '피부가 두꺼움'], ['유리몸', '금강불괴'], ...PAIRS];

// ---------- 등급 표 (2-6) ----------
const TIERS = rows(section('2-6.')).map(r => ({ tier: r['등급'], covers: r['해당'], size: r['효과 크기'], prob: r['출생 확률(특성 하나)'], cost: r['선택 모드 값'] }));

// ---------- 점검 ----------
const all = [...MINOR, ...BIG, ...COND, ...ACQ, ...EVENT, ...REALM];
const unparsed = all.filter(t => t.e && /`/.test(t.e) && Object.keys(t.fx).length === 0).map(t => t.n);
const empty = all.filter(t => t.fx.special && Object.keys(t.fx).length === 1).map(t => t.n);
let none = 1, exp = 0;
for (const t of BIG) { if (!t.p) continue; const q = t.p / 1e7 * (t.sex ? 0.5 : 1); none *= 1 - q; exp += q; }
const tierCount = {}; for (const t of BIG) tierCount[t.tier] = (tierCount[t.tier] || 0) + 1;

const NL = '\n';
const head = [
  '// 특성 데이터 (자동 생성: node tools/gen_traits.js). 정본: docs/p2-traits-realms.md 3장. 손으로 고치지 말고 문서를 고친 뒤 다시 생성한다.',
  '// MINOR 소소한 특성(범품, 누구나 2d3개를 w 가중치로 뽑음), BIG 큰 특성(p 천만 분율로 따로 굴림, tier 하품~극품, 천무지체만 천품·유일)',
  '// COND 조건부, ACQ 후천(counter 문턱, check 판정, lose 사라지는 길), EVENT 사건, REALM 경지',
  '// good 1 이로움·0 해로움·2 양면, group 같은 묶음에서 하나만, sex 성별 한정, e 문서의 효과 원문, fx 해석한 효과 키(docs/p2 2-5)',
  `// 소소 ${MINOR.length}, 큰 ${BIG.length}(등급 ${JSON.stringify(tierCount)}), 조건부 ${COND.length}, 후천 ${ACQ.length}, 사건 ${EVENT.length}, 경지 ${REALM.length}. 큰 특성 평균 ${exp.toFixed(2)}개, 하나도 없는 생 ${(none * 100).toFixed(0)}%`,
];
fs.writeFileSync(path.join(__dirname, '..', 'data', 'traits.js'), [...head,
  '(function (G) {',
  'G.TRAIT_TIERS = ' + JSON.stringify(TIERS) + ';',
  'G.TRAITS_MINOR = [', MINOR.map(o => '  ' + JSON.stringify(o)).join(',' + NL), '];',
  'G.TRAITS = [', BIG.map(o => '  ' + JSON.stringify(o)).join(',' + NL), '];',
  'G.TRAITS_COND = [', COND.map(o => '  ' + JSON.stringify(o)).join(',' + NL), '];',
  'G.TRAITS_ACQ = [', ACQ.map(o => '  ' + JSON.stringify(o)).join(',' + NL), '];',
  'G.TRAITS_EVENT = [', EVENT.map(o => '  ' + JSON.stringify(o)).join(',' + NL), '];',
  'G.TRAITS_REALM = [', REALM.map(o => '  ' + JSON.stringify(o)).join(',' + NL), '];',
  'G.TRAIT_OPPOSITES = ' + JSON.stringify(OPP) + ';',
  '})(typeof window !== "undefined" ? window : globalThis);', ''].join(NL));
console.log(head[4].slice(3));
console.log('효과 키 해석 실패(백틱 있음):', unparsed.length, unparsed.slice(0, 10).join(', '));
console.log('산문뿐이라 엔진이 따로 처리할 것(special):', empty.length, empty.join(', '));
