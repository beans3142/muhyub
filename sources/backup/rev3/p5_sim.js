// 5단계 생업 사다리 검산 (엔진 아님). node tools/p5_sim.js [생 수]
// 무공 없이 한 생업만 하는 사람의 일생을 해마다 굴려 마지막 단의 분포를 본다.
'use strict';
const N = +process.argv[2] || 100000;
let seed = 11;
function rnd() { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }
const d6 = () => 1 + Math.floor(rnd() * 6);
const d100 = () => 1 + Math.floor(rnd() * 100);
const stat = () => 5 * (d6() + d6() + d6());

// 숙련(0~1000): 상한 = 주 자질 × 8 + 부 자질 × 4 (+ 재주 특성), 해마다 (상한 − 현재) × 0.08 × 적성
// 승급: 숙련 ≥ 문턱이고 관문(있으면)이 열린 해에 d100 + (숙련 − 문턱) / 10 + 인맥 ≥ DC
// 문턱 = 800 × (단 / (단 수 − 2)) ^ 1.25, DC = 50 + 단 × 10. 마지막 단(정점)은 숙련 960 이상 + 그해 정점 다툼(경연·발탁)에 이겨야 한다.
const RULE = { capMain: 8, capSub: 4, rate: 0.08, top: 800, pow: 1.25, dc0: 50, dcStep: 10, apexSkill: 960, apexWin: 0.03 };
// gate: 그 단에 오르려면 그해 관문 사건이 있어야 함(확률/년). 과거는 3년에 한 번
const CAREERS = {
  상인: { rungs: 6, gate: [1, 0.6, 0.3, 0.12, 0.06, 1], start: 15 },
  숙수: { rungs: 6, gate: [1, 0.6, 0.3, 0.12, 0.06, 1], start: 12 },
  의원: { rungs: 6, gate: [1, 0.6, 0.3, 0.12, 0.06, 1], start: 14 },
  대장장이: { rungs: 6, gate: [1, 0.6, 0.3, 0.12, 0.06, 1], start: 12 },
  학자관료: { rungs: 7, gate: [1, 1 / 3, 1 / 3, 1 / 3, 0.15, 0.06, 1], start: 8, th: [0, 260, 430, 600, 720, 850], dc: [0, 100, 97, 100, 90, 100], mg: 20 },   // 수재·거인·진사는 시험 DC
  농부: { rungs: 5, gate: [1, 0.3, 0.12, 0.06, 1], start: 10 },
};
function life(c, talent) {
  // 재주 특성 「생업 ×n」: 숙련 성장 ×n, 숙련 상한 + (n − 1) × 300
  const n = talent || 1;
  const main = stat(), sub = stat();
  const cap = Math.min(1000, main * RULE.capMain + sub * RULE.capSub + (n - 1) * 300);
  const apt = n;
  let skill = 0, rung = 0;
  const death = 45 + Math.floor(rnd() * 30);
  for (let age = c.start; age < death; age++) {
    skill += (cap - skill) * RULE.rate * apt;
    const next = rung + 1;
    if (next >= c.rungs) continue;
    const apex = next === c.rungs - 1;
    const need = apex ? RULE.apexSkill : c.th ? c.th[next] : Math.round(RULE.top * Math.pow(next / (c.rungs - 2), RULE.pow));
    if (skill < need) continue;
    if (rnd() > c.gate[next]) continue;
    if (c.dc && next <= 3 && age > 45) continue;   // 과거는 마흔다섯이 넘으면 그만둔다
    if (apex) { if (rnd() < RULE.apexWin) rung = next; continue; }
    const dc = c.dc ? c.dc[next] : RULE.dc0 + next * RULE.dcStep;
    if (d100() + (skill - need) / (c.mg || 10) >= dc) rung = next;
  }
  return rung;
}
for (const [name, c] of Object.entries(CAREERS)) {
  for (const talent of [0, 1.3, 1.5]) {
    const cnt = new Array(c.rungs).fill(0);
    const n = talent ? N / 5 : N;
    for (let i = 0; i < n; i++) cnt[life(c, talent)]++;
    const at = cnt.map((_, i) => cnt.slice(i).reduce((a, b) => a + b, 0) / n);
    console.log(`${name}${talent ? '(재주 ×' + talent + ')' : ''}`.padEnd(14), at.map((x, i) => `${i}단+ ${(x * 100).toFixed(i >= c.rungs - 2 ? 3 : 1)}%`).join('  '));
  }
}
