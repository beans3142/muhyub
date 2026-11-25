// 엔진을 화면 없이 N생 돌려 엔딩·경지 분포를 센다. 규칙: docs/p9-endings.md 6장.
// 실행: node tools/sim_lives.js [생 수] [--world] [--log]
//   --world  세계 시뮬레이션까지 돌린다(한 생에 약 1초 더 든다). 없으면 세계 사건 없이 돈다.
//   --log    첫 생의 기록을 출력한다.
global.window = global;
const path = require('path');
for (const f of ['factions', 'places', 'regions', 'names', 'anchors', 'traits', 'arts', 'careers', 'origins', 'items', 'eventbook', 'lifebook', 'events', 'starts', 'canon'])
  require(path.join(__dirname, '..', 'data', f + '.js'));
require(path.join(__dirname, '..', 'engine', 'world.js'));
require(path.join(__dirname, '..', 'engine', 'life.js'));
const LIFE = global.LIFE; LIFE.init();
const args = process.argv.slice(2), N = +(args.find(a => /^\d+$/.test(a)) || 200), WORLD = args.includes('--world'), LOG = args.includes('--log');
const PERSONA = ['무공 전념', '무공과 생업', '생업 전념', '강호 유람', '협행'];

function live(seed) {
  const P = LIFE.create({ seed, noWorld: !WORLD });
  P.auto = true;
  const R = P.R;
  const persona = PERSONA[Math.floor(R() * PERSONA.length)];
  const gen = LIFE.run(P);
  let r = gen.next(), guard = 0;
  while (!r.done && guard++ < 100000) {
    let ans;
    if (r.value && r.value.ask) {
      const o = r.value.options;
      // 무작위로 고르되 "지나친다/사양한다"류는 조금 덜 고른다
      const w = o.map(x => /사양|남는다|그만|홀로|숨|피한다|지나/.test(x[0]) ? 0.5 : 1);
      let t = R() * w.reduce((a, b) => a + b, 0); ans = 0; for (let i = 0; i < w.length; i++) if ((t -= w[i]) <= 0) { ans = i; break; }
    }
    if (P.age === 16 && !P.flags.persona) { P.flags.persona = 1; if (P.arts.length || persona.startsWith('생업')) P.plan = persona; }
    r = gen.next(ans);
  }
  return P;
}

const t0 = Date.now();
const grade = {}, names = {}, peak = {}, ach = {}, ages = [], causes = {}, ccause = {};
let first;
for (let i = 0; i < N; i++) {
  const P = live(1000 + i * 7919);
  if (!first) first = P;
  grade[P.end.grade] = (grade[P.end.grade] || 0) + 1;
  names[P.end.name] = (names[P.end.name] || 0) + 1;
  peak[P.peak] = (peak[P.peak] || 0) + 1;
  for (const a of P.ach) ach[a] = (ach[a] || 0) + 1;
  ages.push(P.age); causes[P.causeKind || '?'] = (causes[P.causeKind || '?'] || 0) + 1; if (P.causeKind === 'combat') { const k = (P.cause || '').replace(/^.*의 손에/, '손에').replace(/[가-힣]+의 칼/, '산적 칼').slice(0, 14); ccause[k] = (ccause[k] || 0) + 1; }
}
const pct = (o, k) => Object.entries(o).sort((a, b) => (k ? k(a, b) : b[1] - a[1])).map(([x, v]) => `${x} ${(100 * v / N).toFixed(2)}%`).join(', ');
console.log(`${N}생, ${((Date.now() - t0) / 1000).toFixed(1)}초${WORLD ? ' (세계 포함)' : ''}`);
console.log('등급:', ['神', '天', '地', '玄', '黃'].map(g => `${g} ${(100 * (grade[g] || 0) / N).toFixed(2)}%`).join(', '));
console.log('최고 경지:', LIFE.REALMS.map((r, i) => `${r} ${(100 * (peak[i] || 0) / N).toFixed(2)}%`).join(', '));
console.log('엔딩:', pct(names));
ages.sort((a, b) => a - b); console.log(`향년 중앙 ${ages[N >> 1]}, 사인:`, pct(causes));
console.log('업적:', pct(ach));
console.log('싸움 사인:', pct(ccause));
if (LOG) for (const c of first.log) { console.log(`\n[${c.year}년 ${c.age}세 ${c.place}]`); for (const l of c.lines) console.log(' ', (l.m ? l.m + '월 ' : '') + l.t.replace(/<[^>]+>/g, '')); }
