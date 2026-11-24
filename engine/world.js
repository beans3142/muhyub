// 세계 시뮬레이션. 규칙: docs/p8-world.md, docs/p8-lineage.md, lore.md 5장.
// DOM을 쓰지 않는다. 같은 seed와 같은 데이터면 같은 세계가 나온다.
// 필요 데이터: FACTIONS, RIVALS, ALLIES, ALLIANCE_MEMBERS(data/factions.js), ANCHORS(data/anchors.js), NAME_STYLE·SURNAME_*(data/names.js)
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
  };
  f.target = Math.sqrt(size) * pr * 10;
  return f;
}
function activate(ctx, f, year, how) {
  if (f.alive && f.state !== '멸문') return;
  f.alive = true; f.state = '정상'; f.foundY = f.foundY ?? year; f.gen = f.gen || 0;
  f.pow = f.pow > 0 ? f.pow : f.target * 0.5; f.land = Math.max(f.land, f.prestige); f.coh = 60;
  newLeader(ctx, f, year, true);
  ctx.ev.push({ y: year, k: '개파', f: f.id, t: `${J(f.n, '이가')} ${how === 'revive' ? '다시 일어섰다' : '섰다'}.` });
}
function newLeader(ctx, f, year, founder) {
  const R = ctx.R; f.gen += 1;
  const fixed = ctx.opts.founders && founder && ctx.opts.founders[f.id];
  const name = fixed || makeName(ctx, f);
  f.leader = { name, age: Math.floor(35 + R() * 25), from: year, gen: f.gen };
  (ctx.leaders[f.id] = ctx.leaders[f.id] || []).push({ gen: f.gen, name, from: year, to: null });
}
function kill(ctx, f, year, why) {
  if (!f.alive) return;
  f.alive = false; f.state = '멸문'; f.war = null;
  if (f.fallY != null && year >= f.fallY) f.fallY = null;
  if (f.endY != null && year >= f.endY) f.endY = null;
  const L = ctx.leaders[f.id]; if (L && L.length) L[L.length - 1].to = year;
  ctx.ev.push({ y: year, k: '멸문', f: f.id, t: `${J(f.n, '이가')} ${why || '무너졌다'}.` });
}
const alive = ctx => ctx.list.filter(f => f.alive);
const visible = ctx => ctx.list.filter(f => f.alive && f.state !== '잠적');
function power(ctx, f) {
  // 연합은 소속 세력 무력의 일부를 더한다
  let p = f.pow; const mem = (G.ALLIANCE_MEMBERS || {})[f.id];
  if (mem) for (const id of mem) { const m = ctx.F[id]; if (m && m.alive && m.state === '정상') p += m.pow * 0.3; }
  return p;
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
  if (k === 'new') return forCreate ? [genFaction(ctx, v, year)] : [];
  return [];
}
function genFaction(ctx, t, year) {
  const R = ctx.R, pk = a => a[Math.floor(R() * a.length)];
  const n = pk(GEN_SYL1) + pk(GEN_SYL2) + pk(GEN_SUF[t] || ['문']);
  const def = { id: 'gen' + (ctx.list.length + 1), n, t, cat: '신생', rel: t === '마' ? '마' : '없음', prestige: 1, size: 300 };
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
function applyFx(ctx, fx, year, a) {
  for (const x of fx || []) {
    if (x.found) for (const f of resolve(ctx, x.found, year, true)) activate(ctx, f, year);
    if (x.revive) for (const f of resolve(ctx, x.revive, year, true)) { if (!f.alive) activate(ctx, f, year, 'revive'); else if (f.state !== '정상') { f.state = '정상'; } }
    if (x.merge) { const [A] = resolve(ctx, x.merge[0], year), B = ctx.F[x.merge[1]]; if (A && B) { activate(ctx, B, year); B.pow += A.pow * 0.7; B.land += A.land; kill(ctx, A, year, `${B.n}에 흡수되었다`); } }
    if (x.split) { const [A] = resolve(ctx, x.split[0], year), B = ctx.F[x.split[1]]; if (!A && B) activate(ctx, B, year); if (A && B) { activate(ctx, B, year); B.pow = A.pow * 0.3; A.pow *= 0.7; B.land = Math.max(1, A.land * 0.3); A.land *= 0.7; setRel(A, B, -60); } }
    if (x.promote) {
      const [A] = resolve(ctx, x.promote, year); const B = ctx.F[x.as];
      if (B) { activate(ctx, B, year); if (A && A !== B) { B.pow += A.pow * 0.8; B.land += A.land; kill(ctx, A, year, `${J(B.n, '이가')} 되었다`); } }
    }
    if (x.grow) ctx.grow.push({ t: x.grow.t, x: x.grow.x, until: year + x.grow.yrs });
    if (x.relic) { const hold = pickTop(ctx, () => ctx.R() < 0.5) || pickTop(ctx, () => true); ctx.relics.push({ y: year, kind: x.relic, from: a.id, holder: hold ? hold.id : null }); }
    if (x.rel) { const As = resolve(ctx, x.rel[0], year), Bs = resolve(ctx, x.rel[1], year); for (const A of As) for (const B of Bs) if (A !== B) setRel(A, B, rel(ctx, A, B) + x.rel[2]); }
    if (x.f) for (const f of resolve(ctx, x.f, year)) {
      if (x.pow != null) f.pow *= x.pow;
      if (x.wealth != null) f.wealth = x.wealth === 0 ? 0.05 : f.wealth * x.wealth;
      if (x.coh) f.coh = clamp(f.coh + x.coh, 0, 100);
      if (x.fame) f.fame = Math.max(0, f.fame + x.fame);
      if (x.land != null) f.land = Math.max(0, f.land * x.land);
      if (x.lost) f.lostArts = (f.lostArts || 0) + 1;
      if (x.state) { if (x.state === '멸문') kill(ctx, f, year); else f.state = x.state; if (x.state === '봉문') f.sealUntil = year + 10; }
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
  applyFx(ctx, o.fx, year, a);
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
    const ok = condOk(ctx, a, year);
    if (ok && (year === hi || ctx.R() < 1 / (hi - year + 1))) fire(ctx, a, year);
    else if (!ok && year === hi) {
      ctx.skipped[a.id] = year; ctx.ev.push({ y: year, k: '빗나감', a: a.id, t: `(${a.id} 조건 불충족)` });
      if (a.alt) ctx.opened[a.alt] = year;
    }
  }
}

// ---------- 해마다 ----------
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
    if (f.state === '잠적') { f.pow *= f.t === '암' ? 1.03 : 1.01; if (f.t !== '암' && f.pow > f.target * 0.6 && R() < 0.05) { f.state = '정상'; f.land = Math.max(f.land, 0.5 * f.prestige); ctx.ev.push({ y: year, k: '재기', f: f.id, t: `${J(f.n, '이가')} 다시 모습을 드러냈다.` }); } }
    if (f.state === '몰락') { f.pow *= 0.99; if (R() < 0.03) { f.state = '정상'; f.coh = Math.max(f.coh, 50); ctx.ev.push({ y: year, k: '재건', f: f.id, t: `${J(f.n, '이가')} 몰락을 딛고 다시 일어섰다.` }); } }
    f.pow = Math.max(1, f.pow);
    f.wealth += (1 - f.wealth) * 0.05; f.coh += (60 - f.coh) * 0.05 + (R() - 0.5) * 4; f.coh = clamp(f.coh, 0, 100);
    f.fame += (f.prestige * 20 - f.fame) * 0.02;
    // 1위 견제: 영역이 25%를 넘으면 모두의 경계를 받는다
    if (f.land / tot > 0.25) for (const o of alive(ctx)) if (o !== f) setRel(o, f, rel(ctx, o, f) - 2);
    // 수장
    const L = f.leader; L.age++;
    const dp = L.age < 60 ? 0.012 : 0.012 * Math.pow(1.11, L.age - 60);
    if (R() < dp) {
      const old = ctx.leaders[f.id]; old[old.length - 1].to = year;
      const roll = R() * 100;
      if (roll < f.coh + 25) newLeader(ctx, f, year);
      else if (f.coh < 35 && R() < 0.4 && f.cat !== '연합') {
        const nf = genFaction(ctx, f.t, year); activate(ctx, nf, year); nf.pow = f.pow * 0.3; f.pow *= 0.7; nf.land = Math.max(0.5, f.land * 0.3); f.land *= 0.7; setRel(f, nf, -70);
        ctx.ev.push({ y: year, k: '분열', f: f.id, t: `${f.n}의 후계 다툼 끝에 ${J(nf.n, '이가')} 갈라져 나갔다.` });
        newLeader(ctx, f, year);
      } else { f.coh -= 20; newLeader(ctx, f, year); ctx.ev.push({ y: year, k: '후계분쟁', f: f.id, t: `${f.n}에 후계 다툼이 일었다.` }); }
    }
    // 작은 사건
    if (R() < (f.prestige >= 2 ? 0.04 : 0.02)) { const [nm, fn] = SMALL[Math.floor(R() * SMALL.length)]; fn(f); if (f.prestige >= 2) ctx.ev.push({ y: year, k: '작은사건', f: f.id, t: `${f.n}: ${nm}` }); }
  }
  // 외교와 전쟁
  const V = visible(ctx).filter(f => f.state !== '봉문');
  for (let i = 0; i < V.length; i++) for (let j = i + 1; j < V.length; j++) {
    const a = V[i], b = V[j]; let base = baseRel(a, b);
    if ((G.RIVALS || []).some(([x, y]) => (x === a.id && y === b.id) || (x === b.id && y === a.id))) base = -70;
    if ((G.ALLIES || []).some(([x, y]) => (x === a.id && y === b.id) || (x === b.id && y === a.id))) base = 60;
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
    l.pow *= 0.9; w.pow *= 0.97; const dl = l.land * 0.15; l.land -= dl; w.land += dl;
    const yrs = year - a.war.since;
    if (l.land < 0.15 * l.prestige && l.pow < l.target * 0.15) {
      if ((l.def.fall || 0) === 0 || R() < 0.5) { l.state = '잠적'; l.war = w.war = null; ctx.ev.push({ y: year, k: '잠적', f: l.id, t: `${J(l.n, '이가')} 흩어져 숨었다.` }); continue; }
      kill(ctx, l, year, `${w.n}에게 멸문당했다`); w.war = null; continue;
    }
    if (yrs >= 3 && R() < 0.35) {
      ctx.ev.push({ y: year, k: '종전', t: `${J(w.n, '이가')} ${J(l.n, '과와')}의 싸움에서 이겼다.` });
      if (l.pow < l.war.start * 0.5 && R() < 0.3) { l.state = '봉문'; l.sealUntil = year + 5 + Math.floor(R() * 10); ctx.ev.push({ y: year, k: '봉문', f: l.id, t: `${J(l.n, '이가')} 봉문했다.` }); }
      a.war = b.war = null;
    }
  }
}

// ---------- 공개 함수 ----------
WS.create = function (opts) {
  const ctx = { opts, R: rng(opts.seed), year: START, F: {}, list: [], flags: {}, fired: {}, skipped: {}, opened: {}, closed: {}, cool: {}, grow: [], relics: [], routes: [], ev: [], leaders: {}, vanguard: {} };
  const anchorFound = new Set();
  ctx.gated = new Set();
  for (const a of G.ANCHORS) for (const o of a.out) { for (const x of o.fx || []) for (const k of ['found', 'split', 'merge', 'promote']) { const v = x[k]; if (!v) continue; if (k === 'found') anchorFound.add(v); if (k === 'split') anchorFound.add(v[1]); if (k === 'merge') anchorFound.add(v[1]); if (k === 'promote') anchorFound.add(x.as); } for (const id of o.open || []) ctx.gated.add(id); }
  for (const a of G.ANCHORS) if (a.alt) ctx.gated.add(a.alt);
  const R = ctx.R;
  for (const def of G.FACTIONS) {
    const f = newFaction(ctx, def); f.rels = {}; ctx.F[f.id] = f; ctx.list.push(f);
    const [lo, hi] = def.from || [START, START];
    f.sched = anchorFound.has(f.id) ? null : Math.round(lo + R() * (hi - lo));
    if (def.to) f.endY = Math.round(def.to[0] + R() * (def.to[1] - def.to[0]));
    if (!opts.canon && R() * 100 < (def.fall || 0)) f.fallY = Math.round(Math.max(lo, hi) + 60 + R() * Math.max(0, END - Math.max(lo, hi) - 60));
  }
  return ctx;
};
WS.step = function (ctx) { const y = ctx.year; stepAnchors(ctx, y); stepFactions(ctx, y); ctx.year++; };
WS.runTo = function (ctx, year) { while (ctx.year <= year) WS.step(ctx); return ctx; };
WS.snapshot = function (ctx) {
  return alive(ctx).map(f => ({ id: f.id, n: f.n, t: f.t, state: f.state, pow: Math.round(power(ctx, f)), land: +f.land.toFixed(2), coh: Math.round(f.coh), fame: Math.round(f.fame), leader: f.leader && `${f.gen}대 ${f.leader.name}`, war: f.war && f.war.with }));
};
WS.START = START; WS.END = END;
G.WORLDSIM = WS;
})(typeof window !== 'undefined' ? window : globalThis);
