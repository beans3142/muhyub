// 생업 데이터 생성기. 실행: node tools/gen_careers.js → data/careers.js
// 정본은 docs/p5-careers.md다. 문서의 표(사다리 틀, 재산, 생업 목록, 무림 접점, 과거, 신분)를 읽어 만든다.
// 문서를 고치면 이 생성기를 다시 돌린다.
'use strict';
const fs = require('fs');
const path = require('path');
const DOC = path.join(__dirname, '..', 'docs', 'p5-careers.md');
const OUT = path.join(__dirname, '..', 'data', 'careers.js');
const doc = fs.readFileSync(DOC, 'utf8').replace(/\r/g, '');

function section(start, end) {
  const i = doc.indexOf(start);
  if (i < 0) throw new Error('절 없음: ' + start);
  const j = end ? doc.indexOf(end, i + start.length) : -1;
  return doc.slice(i, j < 0 ? undefined : j);
}
function tables(text) {
  const out = []; let cur = null;
  for (const line of text.split('\n')) {
    if (line.startsWith('|')) {
      const cells = line.split('|').slice(1, -1).map(c => c.trim());
      if (cells.every(c => /^-+$/.test(c))) continue;
      if (!cur) { cur = { head: cells, rows: [] }; out.push(cur); } else cur.rows.push(cells);
    } else cur = null;
  }
  return out;
}
const num = s => { const m = String(s).replace(/,/g, '').match(/-?\d+(\.\d+)?/); return m ? +m[0] : null; };
const pct = s => /늘/.test(s) ? 1 : /3년에 한 번/.test(s) ? 1 / 3 : num(s) / 100;
const STATS = ['근력', '근질', '발경', '순발', '지속', '반응', '체력', '강골', '회복', '정교', '유연', '수읽기', '이해', '지략', '학식', '정신력', '의지', '성품'];

// 사다리 틀
const FRAMES = {};
{
  const t = tables(section('**여섯 단 사다리(0~5단)**', '**다섯 단 사다리'))[0];
  FRAMES.six = { rungs: 6, th: [], gate: [], dc: [], meaning: [] };
  for (const [단, 문턱, 관문, dc, 뜻] of t.rows) {
    FRAMES.six.th.push(num(문턱) || 0); FRAMES.six.gate.push(관문 === '-' ? 0 : pct(관문)); FRAMES.six.dc.push(num(dc) || 0); FRAMES.six.meaning.push(뜻);
  }
  const five = section('**다섯 단 사다리(0~4단)**', '**과거 사다리').split('\n')[0];
  const th = five.match(/문턱 ([\d /]+),/)[1].split('/').map(num);
  const gate = five.match(/관문 ([^,]+),/)[1].split('/').map(s => pct(s.trim()));
  const dc = five.match(/DC ([\d /]+)\./)[1].split('/').map(num);
  FRAMES.five = { rungs: 5, th: [0, ...th], gate: [0, ...gate], dc: [0, ...dc, 0] };
  const ex = tables(section('## 6. 과거와 관직', '**매관과 군공.**'))[0];
  FRAMES.exam = { rungs: 7, th: [], gate: [], dc: [], route: [] };
  for (const [, , 길, 문턱, 관문, dc] of ex.rows) {
    FRAMES.exam.th.push(num(문턱) || 0); FRAMES.exam.gate.push(관문 === '-' ? 0 : pct(관문)); FRAMES.exam.dc.push(num(dc) || 0); FRAMES.exam.route.push(길);
  }
  for (const f of Object.values(FRAMES)) { f.apexSkill = 960; f.apexWin = 0.03; }
  FRAMES.six.margin = 10; FRAMES.five.margin = 10; FRAMES.exam.margin = 20; FRAMES.exam.examAgeMax = 45; FRAMES.exam.examRungs = [1, 2, 3];
}

// 재산과 수입
const WEALTH = [];
{
  const s3 = section('## 3. 재산과 수입', '## 4. 생업 목록');
  const [wt, inc] = tables(s3);
  for (const [단계, 냥, 뜻] of wt.rows) WEALTH.push({ lv: num(단계), min: 단계 === '0' ? 0 : num(냥), n: 뜻 });
  const living = s3.match(/생활비는[^0-9]*([\d ,/]+)냥/)[1].split('/').map(num);
  WEALTH.forEach((w, i) => { w.living = living[i]; });
  FRAMES.six.income = inc.rows[0].slice(1).map(num);
  FRAMES.five.income = s3.match(/다섯 단 사다리는 ([\d ,/]+)냥/)[1].split('/').map(num);
  FRAMES.exam.income = s3.match(/과거 사다리\(학자관료\)는 ([\d ,/]+)냥/)[1].split('/').map(num);
}

// 생업 목록
const CAREERS = [];
const FRAME_OF = { '### 4-1.': 'six', '### 4-2.': 'five', '### 4-3.': 'exam' };
for (const [head, frame] of Object.entries(FRAME_OF)) {
  const t = tables(section(head, '###'))[0];
  for (const [이름, 스탯, 사다리, 키] of t.rows) {
    const st = 스탯.split('/').map(s => s.trim());
    for (const s of st) if (!STATS.includes(s)) throw new Error(`${이름}: 스탯 이름 오류 ${s}`);
    const lad = 사다리.split(',').map(s => s.trim());
    if (lad.length !== FRAMES[frame].rungs) throw new Error(`${이름}: 사다리 ${lad.length}단, 틀 ${FRAMES[frame].rungs}단`);
    CAREERS.push({ id: 키.replace(/`/g, ''), n: 이름.replace(/\(.*\)/, '').trim(), full: 이름, st, frame, lad, near: [], meets: null, comes: null });
  }
}
const byName = n => CAREERS.find(c => c.n === n || c.full.startsWith(n));

// 가까운 생업
{
  const row = tables(section('### 2-3.', '### 2-4.'))[0].rows[0][0];
  for (const pair of row.split(',')) {
    const [a, b] = pair.split('↔').map(s => s.replace(/\(.*\)/, '').trim());
    const A = byName(a), B = byName(b);
    if (!A || !B) throw new Error('가까운 생업 이름 오류: ' + pair);
    A.near.push(B.id); B.near.push(A.id);
  }
}

// 무림과 만나는 곳
{
  const t = tables(section('## 5. 생업이 무림과 만나는 곳', '## 6.'))[0];
  for (const [이름, 내놓는, 찾아오는] of t.rows) {
    const names = 이름 === '농부·어부' ? ['농부', '어부'] : [이름];
    for (const n of names) { const c = byName(n); if (!c) throw new Error('접점 생업 이름 오류: ' + n); c.meets = 내놓는; c.comes = 찾아오는; }
  }
}

// 세력 사다리를 쓰는 생업
const FACTION_CAREERS = [];
{
  const t = tables(section('### 4-4.', '## 5.'))[0];
  for (const [이름, 사다리, 곳] of t.rows) {
    const m = 사다리.match(/^(\w+):\s*(.+)$/);
    FACTION_CAREERS.push({ n: 이름, ladder: m[1], span: m[2], where: 곳 });
  }
}

// 신분
const STATUS = [];
for (const [신분, 누구, 막힘, 열림] of tables(section('## 7. 신분', '**신분이 바뀌는 길.**'))[0].rows) STATUS.push({ n: 신분, who: 누구, block: 막힘, open: 열림 });

// 검사
require('../data/factions.js');
for (const f of FACTION_CAREERS) if (!globalThis.LADDERS[f.ladder]) throw new Error('세력 사다리 없음: ' + f.ladder);
for (const [k, f] of Object.entries(FRAMES)) for (const a of ['th', 'gate', 'dc', 'income']) if (f[a].length !== f.rungs) throw new Error(`${k}.${a} 길이 ${f[a].length} ≠ ${f.rungs}`);
for (const c of CAREERS) if (!c.meets) console.warn('무림 접점 없음:', c.n);
const ids = new Set(CAREERS.map(c => c.id)); if (ids.size !== CAREERS.length) throw new Error('출신 키 중복');
if (CAREERS.length < 15) throw new Error('생업 15개 미만');

const NL = String.fromCharCode(10);
const body = [
  '// 자동 생성: node tools/gen_careers.js (정본 docs/p5-careers.md). 손으로 고치지 않는다.',
  '// CAREER_RULE: 숙련 상한 = 주 스탯 바탕값 × 4 + 부 스탯 바탕값 × 2 (최대 1000), 재주 「생업 ×n」은 적성 ×n·상한 +(n−1)×300',
  '// 승급: 숙련 ≥ th[단] 이고 그해 gate[단] 확률로 관문이 열리면 d100 + (숙련 − th) / margin ≥ dc[단]. 정점은 숙련 apexSkill 이상 + apexWin',
  '(function (G) {',
  'G.CAREER_RULE = ' + JSON.stringify({ capMain: 4, capSub: 2, capMax: 1000, statMain: 0.12, statSub: 0.06, rate: 0.08, talentCap: 300, startAge: 10, chooseAge: 15, decay: 0.02, nearStart: 0.5, split: { 무공: [1, 0.2], 반반: [0.6, 0.6], 생업: [0.2, 1] } }) + ';',
  'G.CAREER_FRAMES = ' + JSON.stringify(FRAMES) + ';',
  'G.WEALTH = ' + JSON.stringify(WEALTH) + ';',
  'G.CAREERS = [',
  ...CAREERS.map(c => '  ' + JSON.stringify(c) + ','),
  '];',
  'G.FACTION_CAREERS = ' + JSON.stringify(FACTION_CAREERS) + ';',
  'G.STATUS = ' + JSON.stringify(STATUS) + ';',
  "})(typeof globalThis !== 'undefined' ? globalThis : window);",
].join(NL) + NL;
fs.writeFileSync(OUT, body);
console.log(`생업 ${CAREERS.length}개(여섯 단 ${CAREERS.filter(c => c.frame === 'six').length}, 다섯 단 ${CAREERS.filter(c => c.frame === 'five').length}, 과거 ${CAREERS.filter(c => c.frame === 'exam').length}), 세력 사다리 생업 ${FACTION_CAREERS.length}, 재산 단계 ${WEALTH.length}, 신분 ${STATUS.length}`);
