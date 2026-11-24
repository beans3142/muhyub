// 시드마다 세계가 얼마나 달라지는지 본다(정본 강제 없이). 실행: node tools/world_variety.js [판 수]
global.window = global;
for (const f of ['data/factions.js', 'data/places.js', 'data/names.js', 'data/anchors.js', 'engine/world.js']) require('../' + f);
const WS = global.WORLDSIM, N = +process.argv[2] || 200;
const KEY = ['heroes_meet', 'zhangsanfeng', 'guangming', 'zhengmo1', 'tianmo', 'zhengmo2', 'blood_calamity1', 'blood_calamity2', 'jiutian_coup', 'anti_qing'];
const out = {}, routes = {}, alive1500 = {}, count1500 = [], topMa = {};
const FAC = ['huashan', 'wudang', 'league', 'riyue', 'demon', 'blood', 'sado', 'tang', 'namgung'];
for (let s = 1; s <= N; s++) {
  const c = WS.create({ seed: s * 7919, canon: false });
  WS.runTo(c, 1500);
  const snap = WS.snapshot(c); count1500.push(snap.length);
  for (const id of FAC) if (c.F[id].alive) alive1500[id] = (alive1500[id] || 0) + 1;
  const tm = snap.filter(f => f.t === '마').sort((a, b) => b.pow - a.pow)[0]; const k = tm ? tm.n : '없음'; topMa[k] = (topMa[k] || 0) + 1;
  WS.runTo(c, WS.END);
  for (const id of KEY) { const r = c.fired[id] ? c.fired[id].out : (c.skipped[id] ? '빗나감' : '안 열림'); (out[id] = out[id] || {})[r] = (out[id][r] || 0) + 1; }
  const rs = [...new Set(c.routes.map(r => r.route))].join('+') || '없음'; routes[rs] = (routes[rs] || 0) + 1;
}
const pct = (o) => Object.entries(o).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${(100 * v / N).toFixed(0)}%`).join(', ');
console.log(`${N}판`);
for (const id of KEY) console.log(`  ${id}: ${pct(out[id])}`);
console.log('세계 갈래 조합:', pct(routes));
console.log('1500년 생존:', FAC.map(id => `${global.FACTIONS.find(f => f.id === id).n} ${(100 * (alive1500[id] || 0) / N).toFixed(0)}%`).join(', '));
count1500.sort((a, b) => a - b); console.log(`1500년 세력 수: 최소 ${count1500[0]}, 중앙 ${count1500[N >> 1]}, 최대 ${count1500[N - 1]}`);
console.log('1500년 마도 1위:', pct(topMa));
