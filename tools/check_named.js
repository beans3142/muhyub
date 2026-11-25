// data/named.js 검사: 소속 세력·장소·주무공이 있는지, 정본 세계에서 그 세력이 생전에 살아 있는지 확인한다.
// 실행: node tools/check_named.js
global.window = global;
for (const f of ['factions', 'places', 'arts', 'canon', 'named']) require(`../data/${f}.js`);
const F = new Map(FACTIONS.map(f => [f.id, f])), ARTN = new Set(ARTS.map(a => a.n));
const err = [], warn = [];
// 정본 세계의 세력 생존 구간: 역대 수장 기록의 처음과 끝(끝이 null이면 1840년까지 살아 있다)
const life = {};
for (const [fid, L] of Object.entries(CANON.leaders || {})) if (L.length) life[fid] = [[L[0].from, L[L.length - 1].to ?? 1840]];
const ids = new Set();
for (const n of NAMED) {
  if (ids.has(n.id)) err.push(`${n.id}: id 중복`); ids.add(n.id);
  if (!PLACES2[n.place]) err.push(`${n.id} ${n.name}: 장소 ${n.place} 없음`);
  if (n.art && !ARTN.has(n.art)) err.push(`${n.id} ${n.name}: 무공 ${n.art} 없음`);
  if (n.born >= n.died) err.push(`${n.id} ${n.name}: 생몰 순서`);
  if (!n.fid) continue;
  const f = F.get(n.fid);
  if (!f) { err.push(`${n.id} ${n.name}: 세력 ${n.fid} 없음`); continue; }
  if (f.entry && f.entry.sex && f.entry.sex !== n.sex) err.push(`${n.id} ${n.name}: ${f.n}은 ${f.entry.sex}만 받는다`);
  const span = life[n.fid];
  const active = [n.born + 16, n.died];
  if (!span) warn.push(`${n.id} ${n.name}: 정본 세계에 ${f.n} 개파 기록 없음`);
  else if (!span.some(([a, b]) => a <= active[1] && b >= active[0])) warn.push(`${n.id} ${n.name}: 정본 세계의 ${f.n}(${span.map(s => s.join('~')).join(', ')})이 생전(${active.join('~')})에 없다`);
}
console.log(`네임드 ${NAMED.length}명 (실존 ${NAMED.filter(n => n.kind === 'real').length}, 창작 ${NAMED.filter(n => n.kind === 'made').length}, 여 ${NAMED.filter(n => n.sex === 'f').length})`);
for (const w of warn) console.log('경고', w);
for (const e of err) console.log('오류', e);
process.exit(err.length ? 1 : 0);
