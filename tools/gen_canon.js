// 정본 세계와 시작점을 만든다. 규칙: docs/p8-world.md 2장·5장.
// 실행: node tools/gen_canon.js  → data/canon.js, data/starts.js
// 정본 세계는 CANON_SEED 하나로 돌리고 모든 닻을 정본 갈래(out[0])로 강제한다.
// 게임은 시작점 연도까지 같은 seed·canon 옵션으로 세계를 다시 돌려 같은 상태를 얻는다(스냅숏은 저장하지 않는다).
const fs = require('fs'), path = require('path');
global.window = global;
for (const f of ['data/factions.js', 'data/places.js', 'data/names.js', 'data/anchors.js', 'engine/world.js']) require(path.join(__dirname, '..', f));
const WS = global.WORLDSIM;
const CANON_SEED = 20261124, VERSION = 1;
// lore.md 4장에서 이름을 정한 개파조사
const FOUNDERS = { shaolin: '발타', wudang: '장삼봉', huashan: '청허자', gaibang: '연무백', qingcheng: '송학도인', zhongnan: '운허진인', emei: '정연 사태', diancang: '단목휘', kunlun: '백운자', kongtong: '철벽진인', bailian: '모자원', quanzhen: '왕중양' };
const CHAPTERS = [
  [-500, -222, '검의 시대'], [-221, 219, '제국과 유협'], [220, 588, '산문의 시작'], [589, 906, '승병과 이교'], [907, 1126, '문파의 태동'],
  [1127, 1278, '구파 정립'], [1279, 1367, '명교와 홍건'], [1368, 1449, '마교의 굴기'], [1450, 1549, '강호의 전성기'], [1550, 1643, '왜구와 동영'],
  [1644, 1779, '반청'], [1780, 1840, '황혼']];
const chapterOf = y => CHAPTERS.find(c => y >= c[0] && y <= c[1]);
const yr = y => (y < 0 ? `기원전 ${-y}년` : `${y}년`);

function run(seed, canon) {
  const ctx = WS.create({ seed, canon, founders: FOUNDERS });
  WS.runTo(ctx, WS.END);
  return ctx;
}
const ctx = run(CANON_SEED, true);
const again = run(CANON_SEED, true);
const same = JSON.stringify(ctx.ev) === JSON.stringify(again.ev);

// ---------- 시작점 ----------
const MAX_START = 1830;
const starts = new Map(); // year -> {y, kind, title, pri}
function add(y, kind, title, pri) {
  if (y < WS.START || y > MAX_START) return;
  const cur = starts.get(y); if (cur && cur.pri >= pri) return;
  starts.set(y, { y, kind, title, pri });
}
const anchorEv = ctx.ev.filter(e => e.k === '닻' && global.ANCHORS.find(a => a.id === e.a).y !== 'any');
const firstSentence = t => t.split(/(?<=다\.)/)[0].trim();
for (const e of anchorEv) {
  const s = firstSentence(e.t);
  add(e.y - 10, '닻 전', `${yr(e.y - 10)} · 10년 뒤 「${s}」`, 2);
  add(e.y - 5, '닻 전', `${yr(e.y - 5)} · 5년 뒤 「${s}」`, 2);
  add(e.y, '닻', `${yr(e.y)} · 「${s}」`, 3);
  add(e.y + 5, '닻 뒤', `${yr(e.y + 5)} · 5년 전 「${s}」`, 2);
}
for (const e of ctx.ev.filter(e => ['개파', '멸문', '분열'].includes(e.k))) {
  const f = ctx.F[e.f]; if (!f || f.prestige < (e.y >= 1000 ? 1 : 2)) continue;
  add(e.y, '세력', `${yr(e.y)} · ${e.t}`, 1);
  if (e.y >= 1000) add(e.y + 3, '세력 뒤', `${yr(e.y + 3)} · 3년 전, ${e.t}`, 1);
}
const anchorYears = anchorEv.map(e => e.y);
// 평시: 문파 이전 시대는 성기게, 강호가 무르익은 명·청대는 촘촘하게
const step = y => (y < 907 ? 25 : y < 1368 ? 10 : 5), gap = y => (y < 907 ? 15 : y < 1368 ? 10 : 4);
for (let y = -500; y <= MAX_START; y += step(y)) {
  if (anchorYears.some(a => Math.abs(a - y) < gap(y))) continue;
  const ch = chapterOf(y);
  add(y, '평시', `${yr(y)} · ${ch[2]}의 고요한 해`, 0);
}
// 평시 제목에 그해 판도를 붙인다(세계를 한 번 더 돌리며 해당 연도 상태를 본다)
const list = [...starts.values()].sort((a, b) => a.y - b.y);
{
  const c2 = WS.create({ seed: CANON_SEED, canon: true, founders: FOUNDERS });
  for (const s of list) {
    WS.runTo(c2, s.y);
    const snap = WS.snapshot(c2);
    const top = t => snap.filter(f => f.t === t && f.state !== '잠적').sort((a, b) => b.pow - a.pow)[0];
    s.top = ['정', '사', '마'].map(t => top(t)).filter(Boolean).map(f => f.n);
    s.n = snap.length;
    if (s.kind === '평시' && s.top.length) s.title = `${yr(s.y)} · ${chapterOf(s.y)[2]}, ${s.top.join('·')}의 강호`;
    delete s.pri;
  }
}

// ---------- 출력 ----------
const foundings = {}, falls = {};
for (const e of ctx.ev) { if (e.k === '개파' && !(e.f in foundings)) foundings[e.f] = e.y; if (e.k === '멸문') falls[e.f] = e.y; }
const canon = {
  version: VERSION, seed: CANON_SEED, generated: new Date().toISOString().slice(0, 10),
  anchors: ctx.ev.filter(e => e.k === '닻').map(e => ({ y: e.y, id: e.a, out: e.out })),
  missed: Object.entries(ctx.skipped).map(([id, y]) => ({ id, y })),
  foundings, falls,
  leaders: ctx.leaders,
  generated_factions: ctx.list.filter(f => f.generated).map(f => ({ id: f.id, n: f.n, t: f.t, y: f.foundY })),
  routes: ctx.routes, relics: ctx.relics,
  chronicle: ctx.ev.filter(e => e.k !== '작은사건'),
};
const hdr = '// 자동 생성: node tools/gen_canon.js. 손으로 고치지 않는다.\n';
fs.writeFileSync(path.join(__dirname, '..', 'data', 'canon.js'), hdr + '(function(G){G.CANON=' + JSON.stringify(canon) + ';})(typeof window!=="undefined"?window:globalThis);\n');
fs.writeFileSync(path.join(__dirname, '..', 'data', 'starts.js'), hdr + '(function(G){G.STARTS=' + JSON.stringify(list) + ';})(typeof window!=="undefined"?window:globalThis);\n');

// ---------- 요약 ----------
const kinds = {}; list.forEach(s => kinds[s.kind] = (kinds[s.kind] || 0) + 1);
console.log(`재현성: ${same ? '같은 seed → 같은 세계' : '다름(오류)'}`);
console.log(`사건 ${ctx.ev.length}개, 닻 발동 ${canon.anchors.length}, 빗나감 ${canon.missed.length}: ${canon.missed.map(m => m.id).join(' ')}`);
console.log(`시작점 ${list.length}개`, JSON.stringify(kinds));
const byCh = CHAPTERS.map(c => `${c[2]} ${list.filter(s => s.y >= c[0] && s.y <= c[1]).length}`); console.log('장별 시작점:', byCh.join(', '));
console.log(`생성 세력 ${canon.generated_factions.length}, 멸문 ${Object.keys(falls).length}, 신물 출세 ${ctx.relics.length}, 세계 갈래 ${ctx.routes.map(r => r.y + ' ' + r.route).join(', ') || '없음'}`);
for (const y of [-300, 300, 800, 1100, 1300, 1450, 1550, 1700, 1840]) {
  const c2 = WS.create({ seed: CANON_SEED, canon: true, founders: FOUNDERS }); WS.runTo(c2, y);
  const sn = WS.snapshot(c2).sort((a, b) => b.pow - a.pow);
  console.log(`${yr(y)}: 세력 ${sn.length} | 상위 ${sn.slice(0, 5).map(f => `${f.n}(${f.t},${f.pow},${f.leader})`).join(' ')}`);
}
console.log('주요 세력 개파:', ['shaolin', 'gaibang', 'huashan', 'wudang', 'league', 'mingjiao', 'riyue', 'demon', 'blood', 'sado', 'nokrim'].map(id => `${ctx.F[id].n} ${foundings[id] ?? '-'}${falls[id] ? '~' + falls[id] : ''}`).join(', '));
console.log('예시 시작점:', list.filter((s, i) => i % Math.ceil(list.length / 8) === 0).map(s => s.title).join(' / '));
