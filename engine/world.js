// 세계 시뮬레이션. 규칙: docs/p8-world.md, docs/p8-lineage.md, lore.md 5장.
// DOM을 쓰지 않는다. 같은 seed와 같은 데이터면 같은 세계가 나온다.
// 필요 데이터: FACTIONS, RIVALS, ALLIES, ALLIANCE_MEMBERS(data/factions.js), ANCHORS(data/anchors.js), NAME_STYLE·SURNAME_*(data/names.js),
// PLACES2(data/places.js), REGIONS(data/regions.js). 영역 규칙: docs/p8-geography.md 4장
(function (G) {
const WS = {};
const START = -500, END = 1840;

function rng(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
// 받침에 따라 조사를 고른다: J('화산파','이가') → '화산파가'
function J(w, p) {
  const c = w.charCodeAt(w.length - 1), has = c >= 0xAC00 && c <= 0xD7A3 && (c - 0xAC00) % 28 !== 0;
  const m = { 이가: ['이', '가'], 을를: ['을', '를'], 은는: ['은', '는'], 과와: ['과', '와'] }[p];
  return w + (has ? m[0] : m[1]);
}

// ---------- 이름 ----------
function makeName(ctx, f) {
  const R = ctx.R, pk = a => a[Math.floor(R() * a.length)], NS = G.NAME_STYLE;
  if (f.rel === '불') return pk(NS.monk.dharma) + pk(NS.monk.second) + ' 대사';
  if (f.rel === '도') return pk(NS.taoist.dao) + pk(NS.taoist.second) + pk(NS.taoist.suf);
  const sur = f.sur || (R() < 0.15 ? pk(G.SURNAME_RARE) : pk(G.SURNAME_COMMON));
  const m = NS.martial.m;
  return sur + (R() < 0.4 ? pk(m[0]) : pk(m[1]) + pk(m[2]));
}
const GEN_SYL1 = '혈 천 흑 백 광 무 암 귀 신 현 음 적 청 자'.split(' ');
const GEN_SYL2 = '영 월 마 화 련 심 해 극 령 운 사 명'.split(' ');
const GEN_SUF = { 마: ['교', '마교', '신교'], 암: ['회', '문', '교'], 사: ['방', '채', '련'], 정: ['문', '파', '검문'], 중: ['궁', '문'], 관: ['위'] };

// ---------- 세력 상태 ----------
function baseRel(a, b) {
  const t = [a.t, b.t].sort().join('');
  const tbl = { 정정: 20, 사사: 10, 마마: 0, 암암: -10, 관관: 10, 중중: 10, 마정: -65, 암정: -70, 사정: -30, 마사: -20, 마암: -40, 사암: -20, 관정: -5, 관사: -30, 관마: -40, 관암: -30 };
  return t in tbl ? tbl[t] : 0;
}
function newFaction(ctx, def, year) {
  const pr = def.prestige || 1, size = def.size || 100;
  const f = {
    id: def.id, n: def.n, t: def.t, cat: def.cat, rel: def.rel, sur: def.sur, prestige: pr, def,
    alive: false, state: '정상', pow: 0, wealth: 1, coh: 60, fame: pr * 20, land: 0,
    leader: null, gen: 0, war: null, foundY: null, fallY: null, endY: null, sealUntil: 0, generated: !def.from,
    home: def.at || null, places: [], mode: landMode(def),
  };
  if (f.mode === 'none') f.land = pr;
  f.target = Math.sqrt(size) * pr * 10;
  return f;
}
function activate(ctx, f, year, how) {
  if (f.alive && f.state !== '멸문') return;
  f.alive = true; f.state = '정상'; f.foundY = f.foundY ?? year; f.gen = f.gen || 0;
  f.pow = f.pow > 0 ? f.pow : f.target * 0.5; f.coh = 60;
  if (!f.home) f.home = freeSpot(ctx, null, f.t);
  settle(ctx, f);
  newLeader(ctx, f, year, true);
  ctx.ev.push({ y: year, k: '개파', f: f.id, t: `${J(f.n, '이가')} ${how === 'revive' ? '다시 일어섰다' : '섰다'}.` });
}
function newLeader(ctx, f, year, founder) {
  const R = ctx.R; f.gen += 1;
  // 네임드(docs/p11-cast.md 2-3): 개파조사·수장 자리에 그 해 살아 있고 아직 앉지 않은 네임드가 있으면 그 사람이 앉는다
  const named = ctx.opts.named || [], used = ctx.namedUsed = ctx.namedUsed || {};
  const fits = n => n.fid === f.id && year >= n.born + 20 && year <= n.died - 3 && !used[n.id];
  let fixed = founder && ((ctx.opts.founders && ctx.opts.founders[f.id]) || f.def.founder);
  const fn = fixed && named.find(n => n.name === fixed && n.fid === f.id);
  if (fn && !fits(fn)) fixed = null;
  const nm = fixed ? (fn || null) : named.find(n => n.rank === 'head' && fits(n) && year >= n.born + 25);
  if (nm) used[nm.id] = true;
  const name = fixed || (nm && nm.name) || makeName(ctx, f), age = Math.floor(35 + R() * 25);
  f.leader = { name, age: nm ? year - nm.born : age, from: year, gen: f.gen, dies: nm ? nm.died : null };
  (ctx.leaders[f.id] = ctx.leaders[f.id] || []).push({ gen: f.gen, name, from: year, to: null });
}
function kill(ctx, f, year, why, kind) {
  if (!f.alive) return;
  f.alive = false; f.state = '멸문'; f.war = null; releaseAll(ctx, f);
  if (f.fallY != null && year >= f.fallY) f.fallY = null;
  if (f.endY != null && year >= f.endY) f.endY = null;
  const L = ctx.leaders[f.id]; if (L && L.length) L[L.length - 1].to = year;
  ctx.ev.push({ y: year, k: kind || '멸문', f: f.id, t: `${J(f.n, '이가')} ${why || '무너졌다'}.` });
}
const alive = ctx => ctx.list.filter(f => f.alive);
const visible = ctx => ctx.list.filter(f => f.alive && f.state !== '잠적');
function power(ctx, f) {
  // 연합은 소속 세력 무력의 일부를 더한다
  let p = f.pow; const mem = (G.ALLIANCE_MEMBERS || {})[f.id];
  if (mem) for (const id of mem) { const m = ctx.F[id]; if (m && m.alive && m.state === '정상') p += m.pow * 0.3; }
  return p;
}

// ---------- 영역(지명) ----------
const NO_LAND_CAT = new Set(['관부', '암중', '생업']), NO_LAND_ID = new Set(['haomun', 'heidian', 'escortunion']);
function landMode(def) {
  if (NO_LAND_CAT.has(def.cat) || NO_LAND_ID.has(def.id)) return 'none';
  if (def.cat === '연합' || def.t === '암') return 'home';
  return 'full';
}
const P = id => G.PLACES2[id];
const zoneOf = id => G.REGIONS[P(id).r].zone;
const dist = (a, b) => { const p = P(a), q = P(b); return Math.hypot(p.x - q.x, p.y - q.y); };
// 근거지를 같이 쓰는 세력(개봉의 무림맹·하오문·세가들처럼)이 그곳을 장악했으면, 나머지도 근거지 값을 영역으로 친다
let CTX = null;
function seatV(f) { if (!CTX || !f.home || !P(f.home)) return 0; const o = CTX.owner[f.home]; if (!o || o === f.id) return 0; return CTX.F[o].home === f.home ? P(f.home).v : 0; }
const valOf = f => f.places.reduce((s, id) => s + P(id).v, 0) + seatV(f);
const hasLand = f => f.places.length > 0 || seatV(f) > 0;
function sync(f) { if (f.mode !== 'none') f.land = valOf(f) / 2; }
function claim(ctx, f, id) {
  const o = ctx.owner[id]; if (o === f.id) return;
  if (o) { const g = ctx.F[o]; g.places = g.places.filter(x => x !== id); sync(g); }
  ctx.owner[id] = f.id; f.places.push(id); sync(f);
  for (const g of ctx.homeOf[id] || []) if (g !== f) sync(g);
}
function release(ctx, f, id) { if (ctx.owner[id] === f.id) delete ctx.owner[id]; f.places = f.places.filter(x => x !== id); sync(f); for (const g of ctx.homeOf[id] || []) if (g !== f) sync(g); }
function releaseAll(ctx, f) { for (const id of [...f.places]) release(ctx, f, id); }
// 아직 서지 않았거나 살아 있는 데이터 세력의 근거지는 남이 잡지 못한다
function reserved(ctx, id, f) {
  for (const g of ctx.homeOf[id] || []) if (g !== f && (g.alive || g.foundY == null)) return true;
  return false;
}
// 근거지 c에서 가까운 빈 지명(같은 권역, 거리 maxD 이내, 영역 값 > 0, 남의 근거지 예약 제외)
function freeNear(ctx, c, maxD, f, anyZone) {
  const z = zoneOf(c), out = [];
  for (const id in G.PLACES2) { if (ctx.owner[id] || P(id).v <= 0 || (!anyZone && zoneOf(id) !== z) || reserved(ctx, id, f)) continue; const d = dist(c, id); if (d <= maxD) out.push([d, id]); }
  return out.sort((a, b) => a[0] - b[0]).map(x => x[1]);
}
// 개파·재기: 근거지를 잡고 영역 값이 2 × 위상이 될 때까지 가까운 빈 땅을 더한다
function settle(ctx, f) {
  if (f.mode === 'none' || !f.home || !P(f.home)) return;
  // 근거지는 개파하면 되찾는다(남의 근거지이기도 하면 먼저 선 쪽이 갖는다)
  const o = ctx.owner[f.home] && ctx.F[ctx.owner[f.home]];
  if (P(f.home).v > 0 && (!o || o.home !== f.home)) claim(ctx, f, f.home);
  if (f.mode === 'home') { sync(f); return; }
  for (const id of freeNear(ctx, f.home, 60, f)) { if (valOf(f) >= 2 * f.prestige) break; claim(ctx, f, id); }
  sync(f);
}
// 근거지에서 먼 순서(근거지는 맨 뒤)
const farFirst = f => [...f.places].sort((a, b) => (a === f.home) - (b === f.home) || dist(f.home, b) - dist(f.home, a));
// 닻 효과 land ×k (k > 1): 빈 땅을 먼저, 모자라면 다른 세력의 근거지 아닌 지명을 뺏는다(거리 160 이내, 권역을 가리지 않는다)
function grow(ctx, f, k) {
  if (f.mode !== 'full' || !f.home || !P(f.home)) return;
  const want = Math.max(valOf(f) * k, valOf(f) + 2);
  for (const id of freeNear(ctx, f.home, 160, f, true)) { if (valOf(f) >= want) return; claim(ctx, f, id); }
  const cand = [];
  for (const id in ctx.owner) { const o = ctx.F[ctx.owner[id]]; if (o === f || o.home === id) continue; const d = dist(f.home, id); if (d <= 160) cand.push([d, id]); }
  for (const [, id] of cand.sort((a, b) => a[0] - b[0])) { if (valOf(f) >= want) return; claim(ctx, f, id); }
}
function shrink(ctx, f, k) { if (!f.home || !P(f.home)) return; const n = Math.floor(f.places.length * (1 - k)); for (const id of farFirst(f).slice(0, n)) if (id !== f.home) release(ctx, f, id); }
// 빈 땅 하나(군소 문파·근거지 없는 새 세력용): 중원의 성·진·산·물
function freeSpot(ctx, types) {
  const ok = [];
  for (const id in G.PLACES2) { const p = P(id); if (ctx.owner[id] || p.v <= 0 || zoneOf(id) !== '중원' || reserved(ctx, id, null)) continue; if (types && !types.includes(p.t)) continue; ok.push(id); }
  return ok.length ? ok[Math.floor(ctx.R() * ok.length)] : null;
}
const MINOR = { 성: [['무관', '정'], ['검문', '정'], ['도문', '정'], ['표국', '중'], ['방', '사'], ['회', '사']], 진: [['무관', '정'], ['권문', '정'], ['방', '사']], 산: [['검문', '정'], ['도관', '정'], ['사', '정'], ['채', '사']], 물: [['방', '사'], ['채', '사']] };
function spawnMinor(ctx, year) {
  const id = freeSpot(ctx, ['성', '진', '산', '물']); if (!id) return;
  const p = P(id), [suf, t] = MINOR[p.t][Math.floor(ctx.R() * MINOR[p.t].length)];
  const n = p.n.slice(0, 2) + suf;
  if (ctx.list.some(f => f.alive && f.n === n)) return;
  const def = { id: 'gen' + (ctx.list.length + 1), n, t, cat: '군소', rel: suf === '사' ? '불' : suf === '도관' ? '도' : '없음', prestige: 1, size: 60, at: id };
  const f = newFaction(ctx, def, year); f.generated = true; ctx.F[f.id] = f; ctx.list.push(f); f.rels = {};
  activate(ctx, f, year);
}

// ---------- 선택자 ----------
function pickTop(ctx, pred) {
  let best = null, bp = -1;
  for (const f of visible(ctx)) if (pred(f)) { const p = power(ctx, f); if (p > bp) { bp = p; best = f; } }
  return best;
}
function resolve(ctx, s, year, forCreate) {
  if (s === 'all') return alive(ctx);
  if (ctx.F[s]) return (ctx.F[s].alive || forCreate) ? [ctx.F[s]] : [];
  const [k, v] = s.split(':');
  if (k === 'top') { const f = pickTop(ctx, f => f.t === v && f.cat !== '새외'); return f ? [f] : []; }
  if (k === 'cat') { const f = pickTop(ctx, f => f.cat === v); return f ? [f] : []; }
  if (k === 'all') return alive(ctx).filter(f => f.t === v);
  if (k === 'vanguard') { const f = ctx.vanguard[v]; return f && f.alive ? [f] : []; }
  if (k === 'new') return forCreate ? [genFaction(ctx, v, year, ctx.curAt)] : [];
  return [];
}
function genFaction(ctx, t, year, home) {
  const R = ctx.R, pk = a => a[Math.floor(R() * a.length)];
  const n = pk(GEN_SYL1) + pk(GEN_SYL2) + pk(GEN_SUF[t] || ['문']);
  const def = { id: 'gen' + (ctx.list.length + 1), n, t, cat: '신생', rel: t === '마' ? '마' : '없음', prestige: 1, size: 300, at: home || null };
  const f = newFaction(ctx, def, year); f.generated = true;
  ctx.F[f.id] = f; ctx.list.push(f); f.rels = {};
  return f;
}
function rel(ctx, a, b) { return (a.rels[b.id] ?? baseRel(a, b)); }
function setRel(a, b, v) { a.rels[b.id] = clamp(v, -100, 100); b.rels[a.id] = clamp(v, -100, 100); }

// ---------- 닻 ----------
function condOk(ctx, a, year) {
  for (const c of a.cond || []) {
    if (c.has && !resolve(ctx, c.has, year).length) return false;
    if (c.no && resolve(ctx, c.no, year).length) return false;
    if (c.flag) { const v = ctx.flags[c.flag]; if ('is' in c && v !== c.is) return false; if ('not' in c && v === c.not) return false; }
    if (c.pow) { const [A] = resolve(ctx, c.pow[0], year), [B] = resolve(ctx, c.pow[1], year); if (!A || !B) return false; const r = power(ctx, A) / Math.max(1, power(ctx, B)); if ('gte' in c && r < c.gte) return false; if ('lte' in c && r > c.lte) return false; }
    if (c.rel) { const [A] = resolve(ctx, c.rel[0], year), [B] = resolve(ctx, c.rel[1], year); if (!A || !B) return false; const r = rel(ctx, A, B); if ('gte' in c && r < c.gte) return false; if ('lte' in c && r > c.lte) return false; }
    if (c.share) { const [A] = resolve(ctx, c.share, year); if (!A) return false; const tot = alive(ctx).reduce((s, f) => s + f.land, 0) || 1; if (A.land / tot < c.gte) return false; }
    if (c.state) { const [A] = c.state[0].startsWith('top:') ? [pickTopAny(ctx, c.state[0].slice(4))] : [ctx.F[c.state[0]]]; if (!A || A.state !== c.state[1]) return false; }
  }
  return true;
}
function pickTopAny(ctx, t) { let b = null; for (const f of ctx.list) if (f.t === t && f.foundY != null && (!b || f.target > b.target)) b = f; return b; }
function chooseOut(ctx, a, year) {
  const forced = ctx.opts.forced && ctx.opts.forced[a.id];
  if (forced) return a.out.find(o => o.id === forced) || a.out[0];
  if (ctx.opts.canon) return a.out[0];
  const ws = a.out.map(o => {
    let w = o.w;
    if (o.by && o.by.pow) { const [A] = resolve(ctx, o.by.pow[0], year), [B] = resolve(ctx, o.by.pow[1], year); if (A && B) w *= Math.pow(power(ctx, A) / Math.max(1, power(ctx, B)), 0.85); }
    return w;
  });
  let r = ctx.R() * ws.reduce((s, w) => s + w, 0);
  for (let i = 0; i < ws.length; i++) if ((r -= ws[i]) <= 0) return a.out[i];
  return a.out[a.out.length - 1];
}
function handOver(ctx, A, B) { for (const id of [...A.places]) { if (B.mode === 'full') claim(ctx, B, id); else release(ctx, A, id); } }
// 갈라져 나간 세력이 원래 세력 지명의 30%를 근거지에서 먼 것부터 가져간다. 새 세력의 근거지는 그중 가장 먼 곳
function splitLand(ctx, A, B) {
  const take = A.home && P(A.home) ? farFirst(A).filter(id => id !== A.home).slice(0, Math.max(1, Math.round(A.places.length * 0.3))) : [];
  if (take.length && B.mode === 'full') { if (!B.home || ctx.owner[B.home]) B.home = take[0]; for (const id of take) claim(ctx, B, id); }
  else if (!B.home) B.home = A.home;
}
function applyFx(ctx, fx, year, a) {
  for (const x of fx || []) {
    if (x.found) for (const f of resolve(ctx, x.found, year, true)) activate(ctx, f, year);
    if (x.revive) for (const f of resolve(ctx, x.revive, year, true)) { if (!f.alive) activate(ctx, f, year, 'revive'); else if (f.state !== '정상') { f.state = '정상'; } }
    if (x.merge) { const [A] = resolve(ctx, x.merge[0], year), B = ctx.F[x.merge[1]]; if (A && B) { activate(ctx, B, year); B.pow += A.pow * 0.7; handOver(ctx, A, B); kill(ctx, A, year, `${B.n}에 흡수되었다`); } }
    if (x.split) { const [A] = resolve(ctx, x.split[0], year), B = ctx.F[x.split[1]]; if (!A && B) activate(ctx, B, year); if (A && B) { splitLand(ctx, A, B); activate(ctx, B, year); B.pow = A.pow * 0.3; A.pow *= 0.7; setRel(A, B, -60); } }
    if (x.promote) {
      const [A] = resolve(ctx, x.promote, year); const B = ctx.F[x.as];
      if (B) { activate(ctx, B, year); if (A && A !== B) { B.pow += A.pow * 0.8; handOver(ctx, A, B); kill(ctx, A, year, `${J(B.n, '이가')} 되었다`); } }
    }
    if (x.grow) ctx.grow.push({ t: x.grow.t, x: x.grow.x, until: year + x.grow.yrs });
    if (x.relic) { const hold = pickTop(ctx, () => ctx.R() < 0.5) || pickTop(ctx, () => true); ctx.relics.push({ y: year, kind: x.relic, from: a.id, holder: hold ? hold.id : null }); }
    if (x.rel) { const As = resolve(ctx, x.rel[0], year), Bs = resolve(ctx, x.rel[1], year); for (const A of As) for (const B of Bs) if (A !== B) setRel(A, B, rel(ctx, A, B) + x.rel[2]); }
    if (x.f) for (const f of resolve(ctx, x.f, year)) {
      if (x.pow != null) f.pow *= x.pow;
      if (x.wealth != null) f.wealth = x.wealth === 0 ? 0.05 : f.wealth * x.wealth;
      if (x.coh) f.coh = clamp(f.coh + x.coh, 0, 100);
      if (x.fame) f.fame = Math.max(0, f.fame + x.fame);
      if (x.land != null) { if (x.land < 1) shrink(ctx, f, x.land); else grow(ctx, f, x.land); }
      if (x.lost) f.lostArts = (f.lostArts || 0) + 1;
      if (x.state) { if (x.state === '멸문') kill(ctx, f, year); else f.state = x.state; if (x.state === '봉문') f.sealUntil = year + 10; if (x.state === '잠적') releaseAll(ctx, f); }
    }
  }
}
function fire(ctx, a, year) {
  // 선봉: 전쟁형 닻이면 발동 직전에 정한다(성향마다 구파일방·세가 중 무력 비례로)
  for (const t of ['정', '마', '사']) {
    const cands = visible(ctx).filter(f => f.t === t && f.cat !== '연합');
    if (cands.length) { let r = ctx.R() * cands.reduce((s, f) => s + f.pow, 0); for (const f of cands) if ((r -= f.pow) <= 0) { ctx.vanguard[t] = f; break; } }
  }
  const o = chooseOut(ctx, a, year);
  ctx.fired[a.id] = { y: year, out: o.id };
  if (a.y === 'any') ctx.cool[a.id] = year + a.rep.cd;
  Object.assign(ctx.flags, o.flags || {});
  if (o.route) ctx.routes.push({ y: year, route: o.route, from: a.id });
  for (const id of o.open || []) ctx.opened[id] = year;
  for (const id of o.close || []) ctx.closed[id] = true;
  ctx.curAt = a.at && G.PLACES2[a.at] ? a.at : null;
  applyFx(ctx, o.fx, year, a);
  ctx.curAt = null;
  ctx.ev.push({ y: year, k: '닻', a: a.id, out: o.id, t: a.t + (o.t ? ' ' + o.t : '') });
}
function stepAnchors(ctx, year) {
  for (const a of G.ANCHORS) {
    if (ctx.closed[a.id]) continue;
    if (a.y === 'any') {
      if ((ctx.cool[a.id] || -1e9) > year || (a.rep.from != null && year < a.rep.from)) continue;
      if (ctx.gated.has(a.id) && ctx.opened[a.id] == null) continue;
      if (condOk(ctx, a, year) && ctx.R() * 100 < a.rep.p) fire(ctx, a, year);
      continue;
    }
    if (ctx.fired[a.id] || ctx.skipped[a.id]) continue;
    if (ctx.gated.has(a.id) && ctx.opened[a.id] == null) continue;
    let [lo, hi] = Array.isArray(a.y) ? a.y : [a.y, a.y];
    if (ctx.opened[a.id] != null) { lo = Math.max(lo, ctx.opened[a.id]); if (hi < lo) hi = lo + 5; }
    if (year < lo || year > hi) continue;
    // 정본 세계는 lore.md를 따른다: 메인 서사 닻은 조건을 보지 않고 시기 창 안에서 반드시 일어난다(docs/p8-world.md 2장)
    const ok = (ctx.opts.canon && a.k === '메인') || condOk(ctx, a, year);
    if (ok && (year === hi || ctx.R() < 1 / (hi - year + 1))) fire(ctx, a, year);
    else if (!ok && year === hi) {
      ctx.skipped[a.id] = year; ctx.ev.push({ y: year, k: '빗나감', a: a.id, t: `(${a.id} 조건 불충족)` });
      if (a.alt) ctx.opened[a.alt] = year;
    }
  }
}

// ---------- 해마다 ----------
// 맞수·동맹 쌍(data/factions.js RIVALS, ALLIES)을 한 번만 펼쳐 둔다. 둘 다 있으면 동맹이 이긴다(기존 순서와 같다)
const PAIR = new Map();
for (const [x, y] of G.RIVALS || []) { PAIR.set(x + '|' + y, -70); PAIR.set(y + '|' + x, -70); }
for (const [x, y] of G.ALLIES || []) { PAIR.set(x + '|' + y, 60); PAIR.set(y + '|' + x, 60); }
const SMALL = [
  ['비급 도난', f => { f.pow *= 0.95; f.lostArts = (f.lostArts || 0) + 1; }],
  ['장로 반란', f => { f.coh -= 15; }],
  ['신예 등장', f => { f.pow *= 1.06; f.fame += 5; }],
  ['기근', f => { f.wealth *= 0.85; }],
  ['협객 출현', f => { f.fame += 8; }],
  ['배신자', f => { f.coh -= 10; f.pow *= 0.97; }],
  ['상단 습격', f => { f.wealth *= 0.9; }],
  ['보물 발견', f => { f.wealth *= 1.2; }],
];
function stepFactions(ctx, year) {
  const R = ctx.R;
  // 데이터 일정에 따른 개파·멸문
  for (const f of ctx.list) {
    if (!f.alive && f.foundY == null && f.sched != null && year === f.sched) activate(ctx, f, year);
    if (f.alive && f.endY != null && year >= f.endY) kill(ctx, f, year, '역사 속으로 사라졌다');
    if (f.alive && f.fallY != null && year >= f.fallY) kill(ctx, f, year, '멸문했다');
  }
  const tot = alive(ctx).reduce((s, f) => s + f.land, 0) || 1;
  for (const f of alive(ctx)) {
    // 성장
    let g = 1; for (const m of ctx.grow) if (m.until >= year && (m.t === 'all' || m.t === f.t)) g *= m.x;
    if (f.state === '봉문' && year >= f.sealUntil) { f.state = '정상'; ctx.ev.push({ y: year, k: '봉문해제', f: f.id, t: `${J(f.n, '이가')} 봉문을 풀었다.` }); }
    const landF = Math.min(1.5, Math.sqrt(Math.max(0.3, f.land) / f.prestige));
    const target = f.target * landF * (f.coh / 60) * Math.min(1.5, Math.max(0.3, f.wealth));
    f.pow += (target - f.pow) * 0.05 * g + f.pow * (R() - 0.5) * 0.04;
    // 암약 세력은 숨은 채 힘을 쌓고(혈겁·흑막 닻으로만 드러남), 나머지는 힘을 되찾으면 다시 나온다
    if (f.state === '잠적') { f.pow *= f.t === '암' ? 1.03 : 1.01; if (f.t !== '암' && f.pow > f.target * 0.6 && R() < 0.05) { f.state = '정상'; settle(ctx, f); ctx.ev.push({ y: year, k: '재기', f: f.id, t: `${J(f.n, '이가')} 다시 모습을 드러냈다.` }); } }
    if (f.state === '몰락') { f.pow *= 0.99; if (R() < 0.03) { f.state = '정상'; f.coh = Math.max(f.coh, 50); ctx.ev.push({ y: year, k: '재건', f: f.id, t: `${J(f.n, '이가')} 몰락을 딛고 다시 일어섰다.` }); } }
    f.pow = Math.max(1, f.pow);
    f.wealth += (1 - f.wealth) * 0.05; f.coh += (60 - f.coh) * 0.05 + (R() - 0.5) * 4; f.coh = clamp(f.coh, 0, 100);
    f.fame += (f.prestige * 20 - f.fame) * 0.02;
    // 1위 견제: 영역이 25%를 넘으면 모두의 경계를 받는다
    if (f.land / tot > 0.25) for (const o of alive(ctx)) if (o !== f) setRel(o, f, rel(ctx, o, f) - 2);
    // 수장
    const L = f.leader; L.age++;
    const dp = L.age < 60 ? 0.012 : 0.012 * Math.pow(1.11, L.age - 60);
    if (R() < dp || (L.dies != null && year >= L.dies)) {
      const old = ctx.leaders[f.id]; old[old.length - 1].to = year;
      const roll = R() * 100;
      if (roll < f.coh + 25) newLeader(ctx, f, year);
      else if (f.coh < 35 && R() < 0.4 && f.cat !== '연합') {
        const nf = genFaction(ctx, f.t, year); splitLand(ctx, f, nf); activate(ctx, nf, year); nf.pow = f.pow * 0.3; f.pow *= 0.7; setRel(f, nf, -70);
        ctx.ev.push({ y: year, k: '분열', f: f.id, t: `${f.n}의 후계 다툼 끝에 ${J(nf.n, '이가')} 갈라져 나갔다.` });
        newLeader(ctx, f, year);
      } else { f.coh -= 20; newLeader(ctx, f, year); ctx.ev.push({ y: year, k: '후계분쟁', f: f.id, t: `${f.n}에 후계 다툼이 일었다.` }); }
    }
    // 영역: 힘이 남으면 가까운 빈 땅을 잡고, 힘이 빠지면 먼 땅을 내놓는다
    // 근거지를 잃었으면 비는 대로 되찾고, 남의 손에 있으면 그쪽보다 강할 때 해마다 10% 확률로 되찾는다
    if (f.mode !== 'none' && f.state !== '잠적' && f.home && P(f.home) && P(f.home).v > 0 && ctx.owner[f.home] !== f.id) {
      const o = ctx.owner[f.home] && ctx.F[ctx.owner[f.home]];
      if (!o) claim(ctx, f, f.home);
      else if (o.home !== f.home && power(ctx, f) > power(ctx, o) && R() < 0.1) { claim(ctx, f, f.home); ctx.ev.push({ y: year, k: '탈환', f: f.id, t: `${J(f.n, '이가')} ${o.n}에게서 ${J(P(f.home).n, '을를')} 되찾았다.` }); }
    }
    if (f.mode === 'full' && f.state === '정상' && f.home && P(f.home)) {
      if (f.pow >= f.target * 0.9 && valOf(f) < 4 * f.prestige && R() < 0.04) { const [id] = freeNear(ctx, f.home, 60, f); if (id) claim(ctx, f, id); }
      else if (f.pow < f.target * 0.3 && f.places.length > 1 && R() < 0.05) { const [id] = farFirst(f); if (id !== f.home) release(ctx, f, id); }
    }
    // 군소 문파는 해마다 1% 확률로 문을 닫는다
    if (f.cat === '군소' && R() < 0.01) { kill(ctx, f, year, '문을 닫았다', '폐문'); continue; }
    // 작은 사건
    if (R() < (f.prestige >= 2 ? 0.04 : 0.02)) { const [nm, fn] = SMALL[Math.floor(R() * SMALL.length)]; fn(f); if (f.prestige >= 2) ctx.ev.push({ y: year, k: '작은사건', f: f.id, t: `${f.n}: ${nm}` }); }
  }
  // 외교와 전쟁
  const V = visible(ctx).filter(f => f.state !== '봉문');
  for (let i = 0; i < V.length; i++) for (let j = i + 1; j < V.length; j++) {
    const a = V[i], b = V[j]; let base = baseRel(a, b);
    const sp = PAIR.get(a.id + '|' + b.id); if (sp != null) base = sp;
    const r = rel(ctx, a, b); setRel(a, b, r + (base - r) * 0.05 + (R() - 0.5) * 6);
    if (!a.war && !b.war && rel(ctx, a, b) <= -60 && a.t !== '관' && b.t !== '관') {
      const pa = power(ctx, a), pb = power(ctx, b), ratio = Math.max(pa, pb) / Math.max(1, Math.min(pa, pb));
      if (ratio >= 1.3 && R() < 0.03) { a.war = { with: b.id, since: year, start: a.pow }; b.war = { with: a.id, since: year, start: b.pow }; ctx.ev.push({ y: year, k: '전쟁', t: `${J(a.n, '과와')} ${b.n} 사이에 싸움이 붙었다.` }); }
    }
  }
  for (const a of alive(ctx)) {
    if (!a.war) continue; const b = ctx.F[a.war.with];
    if (!b || !b.alive) { a.war = null; continue; }
    if (a.id > b.id) continue; // 한 쌍은 한 번만
    const sa = power(ctx, a) * (0.7 + R() * 0.6), sb = power(ctx, b) * (0.7 + R() * 0.6);
    const [w, l] = sa >= sb ? [a, b] : [b, a];
    l.pow *= 0.9; w.pow *= 0.97;
    // 진 쪽은 해마다 40% 확률로 지명 하나를 잃는다. 근거지는 마지막 남은 땅일 때 이웃(거리 120 이내)에게만 빼앗긴다
    if (l.places.length && R() < 0.4) {
      const wh = w.home && P(w.home) ? w.home : null, near = id => (wh ? dist(wh, id) : 0);
      const rest = l.places.filter(id => id !== l.home).sort((p, q) => near(p) - near(q));
      const id = rest.length ? rest[0] : (wh && near(l.places[0]) <= 120 ? l.places[0] : null);
      if (id) { if (w.mode === 'full' && wh && near(id) <= 120) claim(ctx, w, id); else release(ctx, l, id); }
    }
    const yrs = year - a.war.since;
    if ((l.mode === 'none' ? l.pow < l.target * 0.05 : !hasLand(l)) && l.pow < l.target * 0.15) {
      if ((l.def.fall || 0) === 0 || R() < 0.5) { l.state = '잠적'; releaseAll(ctx, l); l.war = w.war = null; ctx.ev.push({ y: year, k: '잠적', f: l.id, t: `${J(l.n, '이가')} 흩어져 숨었다.` }); continue; }
      kill(ctx, l, year, `${w.n}에게 멸문당했다`); w.war = null; continue;
    }
    if (yrs >= 3 && R() < 0.35) {
      ctx.ev.push({ y: year, k: '종전', t: `${J(w.n, '이가')} ${J(l.n, '과와')}의 싸움에서 이겼다.` });
      if (l.pow < l.war.start * 0.5 && R() < 0.3) { l.state = '봉문'; l.sealUntil = year + 5 + Math.floor(R() * 10); ctx.ev.push({ y: year, k: '봉문', f: l.id, t: `${J(l.n, '이가')} 봉문했다.` }); }
      a.war = b.war = null;
    }
  }
}

// ---------- 재해와 군소 문파 ----------
function stepRegions(ctx, year) {
  const R = ctx.R;
  for (const [rn, r] of Object.entries(G.REGIONS)) for (const h of r.hz || []) {
    if (h.y && (year < h.y[0] || year > h.y[1])) continue;
    if (R() * 100 >= h.p) continue;
    ctx.hz.push([year, rn, h.k]);
    for (const f of alive(ctx)) {
      const here = f.places.some(id => P(id).r === rn) || (!f.places.length && f.home && P(f.home) && P(f.home).r === rn);
      if (!here) continue;
      if (h.k === '홍수' || h.k === '가뭄') { f.wealth *= 0.9; f.coh = clamp(f.coh - 3, 0, 100); }
      else if (h.k === '역병') f.pow *= 0.97;
      else if (h.k === '왜구') f.wealth *= 0.92;
      else if (h.k === '마적') f.wealth *= 0.95;
    }
  }
  // 중원 빈 땅이 20%를 넘으면 군소 문파가 선다(동시에 40곳까지)
  if (year >= 0) {
    let tot = 0, free = 0;
    for (const id in G.PLACES2) { const p = P(id); if (p.v <= 0 || zoneOf(id) !== '중원') continue; tot += p.v; if (!ctx.owner[id]) free += p.v; }
    const minors = ctx.list.filter(f => f.alive && f.cat === '군소').length;
    if (free / tot > 0.2 && minors < 40 && R() < 0.04) spawnMinor(ctx, year);
  }
}

// ---------- 공개 함수 ----------
WS.create = function (opts) {
  const ctx = CTX = { opts, R: rng(opts.seed), year: START, owner: {}, hz: [], F: {}, list: [], flags: {}, fired: {}, skipped: {}, opened: {}, closed: {}, cool: {}, grow: [], relics: [], routes: [], ev: [], leaders: {}, vanguard: {} };
  const anchorFound = new Set();
  ctx.homeOf = {};
  ctx.gated = new Set();
  for (const a of G.ANCHORS) for (const o of a.out) { for (const x of o.fx || []) for (const k of ['found', 'split', 'merge', 'promote']) { const v = x[k]; if (!v) continue; if (k === 'found') anchorFound.add(v); if (k === 'split') anchorFound.add(v[1]); if (k === 'merge') anchorFound.add(v[1]); if (k === 'promote') anchorFound.add(x.as); } for (const id of o.open || []) ctx.gated.add(id); }
  for (const a of G.ANCHORS) if (a.alt) ctx.gated.add(a.alt);
  const R = ctx.R;
  for (const def of G.FACTIONS.concat(opts.extra || [])) {
    const f = newFaction(ctx, def); f.rels = {}; ctx.F[f.id] = f; ctx.list.push(f);
    if (def.at) (ctx.homeOf[def.at] = ctx.homeOf[def.at] || []).push(f);
    const [lo, hi] = def.from || [START, START];
    f.sched = anchorFound.has(f.id) ? null : Math.round(lo + R() * (hi - lo));
    if (def.to) f.endY = Math.round(def.to[0] + R() * (def.to[1] - def.to[0]));
    if (!opts.canon && R() * 100 < (def.fall || 0)) f.fallY = Math.round(Math.max(lo, hi) + 60 + R() * Math.max(0, END - Math.max(lo, hi) - 60));
  }
  return ctx;
};
WS.step = function (ctx) { CTX = ctx; const y = ctx.year; stepAnchors(ctx, y); stepFactions(ctx, y); stepRegions(ctx, y); ctx.year++; };
WS.runTo = function (ctx, year) { while (ctx.year <= year) WS.step(ctx); return ctx; };
WS.snapshot = function (ctx) {
  return alive(ctx).map(f => ({ id: f.id, n: f.n, t: f.t, state: f.state, pow: Math.round(power(ctx, f)), land: +f.land.toFixed(2), home: f.home, places: f.places.slice(), coh: Math.round(f.coh), fame: Math.round(f.fame), leader: f.leader && `${f.gen}대 ${f.leader.name}`, war: f.war && f.war.with }));
};
// 생 도중에 세력을 더한다(주인공이 세운 세력, docs/p10-engine.md 9-5)
WS.addFaction = function (ctx, def, year) {
  const d = Object.assign({ id: 'pf' + (ctx.list.length + 1), cat: '신생', rel: '없음', fall: 30, prestige: 1, size: 60 }, def);
  const f = newFaction(ctx, d, year); f.rels = {}; f.generated = true; ctx.F[f.id] = f; ctx.list.push(f);
  activate(ctx, f, year); return f.id;
};
// 주인공 세력이 다른 세력을 꺾어 거둔다: 지명을 넘겨받고 진 세력은 무너진다(docs/p10-engine.md 9-16)
WS.subjugate = function (ctx, loserId, winnerId, year) {
  const l = ctx.F[loserId], w = winnerId && ctx.F[winnerId]; if (!l || !l.alive) return;
  if (w && w.alive) { for (const id of [...l.places]) claim(ctx, w, id); w.pow += l.pow * 0.5; }
  kill(ctx, l, year, w ? `${w.n}에게 꺾였다` : '꺾였다');
};
WS.START = START; WS.END = END;
G.WORLDSIM = WS;
})(typeof window !== 'undefined' ? window : globalThis);
