// data/anchors.js 검사: 참조(세력·장소·닻), 표기, 시기 창, 갈래 수를 확인하고 요약을 찍는다.
// 실행: node tools/check_anchors.js
global.window = global;
require('../data/factions.js'); require('../data/places.js'); require('../data/anchors.js');
const F = new Set(FACTIONS.map(f => f.id)), P = new Set(Object.keys(PLACES2)), A = ANCHORS;
const ids = new Set(A.map(a => a.id));
const K = ['정사', '메인', '계통', '혈겁', '연합', '흑막', '유산', '일통', '통제'], SRC = ['정사', '전설', '창작'];
const T = ['정', '사', '마', '암', '관', '중'];
const TOP = new Set(['id', 'k', 'src', 'y', 'rep', 'at', 'cond', 'alt', 't', 'out', 'hero']);
const OUTK = new Set(['id', 't', 'w', 'by', 'flags', 'fx', 'open', 'close', 'route']);
const err = []; const e = (a, m) => err.push(`${a.id}: ${m}`);
function sel(a, s, where) {
  if (typeof s !== 'string') return e(a, `${where} 선택자 아님 ${JSON.stringify(s)}`);
  if (s === 'all' || F.has(s)) return;
  const m = s.match(/^(top|all|vanguard|new|cat):(.+)$/);
  if (!m) return e(a, `${where} 모르는 선택자 ${s}`);
  if (m[1] === 'cat') { if (!FACTIONS.some(f => f.cat === m[2])) e(a, `${where} 없는 범주 ${m[2]}`); return; }
  if (!T.includes(m[2])) e(a, `${where} 모르는 성향 ${m[2]}`);
}
const seen = new Set();
for (const a of A) {
  if (seen.has(a.id)) e(a, '중복 id'); seen.add(a.id);
  for (const k of Object.keys(a)) if (!TOP.has(k)) e(a, `모르는 항목 ${k}`);
  if (!K.includes(a.k)) e(a, `종류 ${a.k}`);
  if (!SRC.includes(a.src)) e(a, `구분 ${a.src}`);
  if (!P.has(a.at)) e(a, `장소 없음 ${a.at}`);
  if (!a.t) e(a, '연표 문장 없음');
  if (a.y === 'any') { if (!a.rep) e(a, '반복 닻인데 rep 없음'); }
  else {
    const [lo, hi] = Array.isArray(a.y) ? a.y : [a.y, a.y];
    if (lo > hi || lo < -520 || hi > 1840) e(a, `시기 ${a.y}`);
    if (a.k === '정사' && Array.isArray(a.y) && hi - lo > 10) e(a, '정사 시기 창이 너무 넓음');
  }
  if (a.alt && !ids.has(a.alt)) e(a, `alt 없음 ${a.alt}`);
  for (const c of a.cond || []) {
    if (c.has) sel(a, c.has, 'cond.has'); if (c.no) sel(a, c.no, 'cond.no');
    if (c.pow) c.pow.forEach(s => sel(a, s, 'cond.pow')); if (c.rel) c.rel.forEach(s => sel(a, s, 'cond.rel'));
    if (c.share) sel(a, c.share, 'cond.share'); if (c.state) sel(a, c.state[0], 'cond.state');
    if (c.flag && !('is' in c || 'not' in c)) e(a, 'flag 조건에 is/not 없음');
  }
  if (!Array.isArray(a.out) || !a.out.length) e(a, '갈래 없음');
  else {
    if (a.out.length > 3) e(a, '갈래 3개 초과');
    if (a.k === '정사' && a.out.length !== 1) e(a, '정사는 갈래 하나');
    for (const o of a.out) {
      for (const k of Object.keys(o)) if (!OUTK.has(k)) e(a, `갈래 ${o.id} 모르는 항목 ${k}`);
      if (!(o.w > 0)) e(a, `갈래 ${o.id} 가중치`);
      if (o.by && o.by.pow) o.by.pow.forEach(s => sel(a, s, 'by'));
      for (const r of [...(o.open || []), ...(o.close || [])]) if (!ids.has(r)) e(a, `open/close 없음 ${r}`);
      for (const x of o.fx || []) {
        if (x.f) sel(a, x.f, 'fx.f');
        for (const k of ['found', 'revive', 'lost']) if (x[k]) sel(a, x[k], 'fx.' + k);
        if (x.merge) x.merge.forEach(s => sel(a, s, 'fx.merge'));
        if (x.split) x.split.forEach(s => sel(a, s, 'fx.split'));
        if (x.promote) { sel(a, x.promote, 'fx.promote'); sel(a, x.as, 'fx.as'); }
        if (x.rel) { sel(a, x.rel[0], 'fx.rel'); sel(a, x.rel[1], 'fx.rel'); }
        if (x.state && !['정상', '몰락', '봉문', '잠적', '멸문'].includes(x.state)) e(a, `상태 ${x.state}`);
      }
    }
  }
}
// 닻이 참조하지 않는데 개파 연도가 닻으로 처리되어야 하는 세력은 없는지(참고용)
const founded = new Set(); A.forEach(a => (a.out || []).forEach(o => (o.fx || []).forEach(x => x.found && founded.add(x.found))));
console.log(`닻 ${A.length}개`);
const byK = {}; A.forEach(a => byK[a.k] = (byK[a.k] || 0) + 1); console.log('종류별', JSON.stringify(byK));
const bySrc = {}; A.forEach(a => bySrc[a.src] = (bySrc[a.src] || 0) + 1); console.log('구분별', JSON.stringify(bySrc));
console.log('갈래 있는 닻', A.filter(a => a.out && a.out.length > 1).length, '/ 갈래 합', A.reduce((s, a) => s + (a.out ? a.out.length : 0), 0));
console.log('주인공 개입 닻', A.filter(a => a.hero).length, '/ 반복 닻', A.filter(a => a.y === 'any').length);
console.log('닻으로 개파하는 세력', founded.size, '/ 전체 세력', F.size);
console.log(err.length ? '오류 ' + err.length + '\n' + err.join('\n') : '오류 없음');
process.exitCode = err.length ? 1 : 0;
