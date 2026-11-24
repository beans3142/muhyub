// 5단계 생업 사다리 검산 (엔진 아님). node tools/p5_sim.js [생 수]
// 무공 없이 한 생업만 하는 사람의 일생을 해마다 굴려 각 단 이상에 닿은 비율을 본다.
// 개정 2(2026-11-24): 숙련 상한을 자질 대신 스탯 바탕값으로 정한다(docs/stats.md 7장).
'use strict';
const N = +process.argv[2] || 100000;
let seed = 11;
function rnd() { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }
const d6 = () => 1 + Math.floor(rnd() * 6);
const d100 = () => 1 + Math.floor(rnd() * 100);
const apt3d6 = () => 5 * (d6() + d6() + d6());

// 스탯의 그릇 자질(1단계 2-1). 바탕 상한 = 그릇 × 2
const VESSEL = {
  근력: ['근골'], 근질: ['근골'], 순발: ['근골'], 지속: ['근골'], 체력: ['근골'], 강골: ['근골'],
  반응: ['근골', '오성'], 유연: ['근골', '오성'],
  정교: ['오성'], 수읽기: ['오성'], 이해: ['오성'], 지략: ['오성'], 학식: ['오성'],
  정신력: ['심성'], 의지: ['심성'], 성품: ['심성'],
};
// 숙련 상한 = 주 스탯 바탕값 × 4 + 부 스탯 바탕값 × 2 (최대 1000) + 재주 (n − 1) × 300
// 스탯: 생업 시작 때 바탕 상한의 30%(어린 시절), 해마다 주 스탯은 (상한 − 현재) × 0.12, 부 스탯은 × 0.06 (생업이 곧 그 스탯의 단련)
// 숙련: 해마다 (숙련 상한 − 현재) × 0.08 × 적성
// 승급: 숙련 ≥ 문턱이고 관문이 열린 해에 d100 + (숙련 − 문턱) / 10 ≥ DC
// 문턱 = 800 × (단 / (단 수 − 2)) ^ 1.25, DC = 50 + 단 × 10. 정점은 숙련 960 이상 + 다툼 3%.
const RULE = { main: 4, sub: 2, statInit: 0.3, statMain: 0.12, statSub: 0.06, rate: 0.08, top: 800, pow: 1.25, dc0: 50, dcStep: 10, apexSkill: 960, apexWin: 0.03 };
const G6 = [1, 0.6, 0.3, 0.12, 0.06, 1], G5 = [1, 0.3, 0.12, 0.06, 1];
const EXAM = { gate: [1, 1 / 3, 1 / 3, 1 / 3, 0.15, 0.06, 1], th: [0, 260, 430, 600, 720, 850], dc: [0, 100, 97, 100, 90, 100], mg: 20 };
const CAREERS = {
  상인: { st: ['지략', '학식'], rungs: 6, gate: G6, start: 15 },
  숙수: { st: ['정교', '체력'], rungs: 6, gate: G6, start: 12 },
  의원: { st: ['학식', '정교'], rungs: 6, gate: G6, start: 14 },
  대장장이: { st: ['근력', '정교'], rungs: 6, gate: G6, start: 12 },
  장인: { st: ['정교', '지략'], rungs: 6, gate: G6, start: 12 },
  기예인: { st: ['정교', '유연'], rungs: 6, gate: G6, start: 10 },
  도둑: { st: ['반응', '정교'], rungs: 6, gate: G6, start: 10 },
  무관: { st: ['근력', '지략'], rungs: 6, gate: G6, start: 16 },
  환관: { st: ['지략', '의지'], rungs: 6, gate: G6, start: 10 },
  학자관료: { st: ['학식', '지략'], rungs: 7, start: 8, ...EXAM },
  농부: { st: ['근력', '체력'], rungs: 5, gate: G5, start: 10 },
  어부: { st: ['체력', '지속'], rungs: 5, gate: G5, start: 10 },
  사냥꾼: { st: ['순발', '수읽기'], rungs: 5, gate: G5, start: 12 },
  약초꾼: { st: ['학식', '지속'], rungs: 5, gate: G5, start: 10 },
  광대: { st: ['유연', '반응'], rungs: 5, gate: G5, start: 8 },
  풍수가: { st: ['학식', '지략'], rungs: 5, gate: G5, start: 14 },
};
function life(c, n) {
  const apt = { 근골: apt3d6(), 오성: apt3d6(), 심성: apt3d6() };
  const capOf = s => 2 * VESSEL[s].reduce((a, k) => a + apt[k], 0) / VESSEL[s].length;
  const capM = capOf(c.st[0]), capS = capOf(c.st[1]);
  let m = capM * RULE.statInit, s = capS * RULE.statInit;
  let skill = 0, rung = 0;
  const death = 45 + Math.floor(rnd() * 30);
  for (let age = c.start; age < death; age++) {
    const lim = age < 15 ? 0.6 : 1;   // 15세까지 상한의 60%
    m += Math.max(0, capM * lim - m) * RULE.statMain;
    s += Math.max(0, capS * lim - s) * RULE.statSub;
    const cap = Math.min(1000, m * RULE.main + s * RULE.sub + (n - 1) * 300);
    skill += Math.max(0, cap - skill) * RULE.rate * n;
    const next = rung + 1;
    if (next >= c.rungs) continue;
    const apex = next === c.rungs - 1;
    const need = apex ? RULE.apexSkill : c.th ? c.th[next] : Math.round(RULE.top * Math.pow(next / (c.rungs - 2), RULE.pow));
    if (skill < need) continue;
    if (rnd() > c.gate[next]) continue;
    if (c.th && next <= 3 && age > 45) continue;   // 과거는 마흔다섯이 넘으면 그만둔다
    if (apex) { if (rnd() < RULE.apexWin) rung = next; continue; }
    const dc = c.dc ? c.dc[next] : RULE.dc0 + next * RULE.dcStep;
    if (d100() + (skill - need) / (c.mg || 10) >= dc) rung = next;
  }
  return rung;
}
for (const [name, c] of Object.entries(CAREERS)) {
  for (const n of [1, 1.3, 1.5]) {
    const cnt = new Array(c.rungs).fill(0);
    const lives = n > 1 ? N / 5 : N;
    for (let i = 0; i < lives; i++) cnt[life(c, n)]++;
    const at = cnt.map((_, i) => cnt.slice(i).reduce((a, b) => a + b, 0) / lives);
    console.log(`${name}${n > 1 ? '(재주 ×' + n + ')' : ''}`.padEnd(14), at.slice(1).map((x, i) => `${i + 1}단+ ${(x * 100).toFixed(i + 1 >= c.rungs - 2 ? 3 : 1)}%`).join('  '));
  }
}
