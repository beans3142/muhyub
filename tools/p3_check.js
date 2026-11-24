// 3단계 개정 2 검산: 무공 교체(계보 승계), 역할 배합, 고유 효과가 무위에 주는 영향. node tools/p3_check.js
'use strict';
const G = { 삼류: 1, 이류: 1.5, 일류: 2.2, 상승: 4, 절세: 8, 신공: 15 };
const GI = { 삼류: 0, 이류: 1, 일류: 2, 상승: 3, 절세: 4, 신공: 5 };
const art = (g, s) => s <= 0 ? 0 : G[g] * Math.pow(Math.min(12, s) / 12, 1.4) * (s >= 12 ? 1.15 : 1);
// 성취 속도(p3 3-3): 보통 사람(이해 100, 근골 52), 그 무공을 수련 중점으로(×1.4)
const speed = g => 0.45 * 1.0 * (0.7 + 52 / 150) * 1.4 / (1 + GI[g] * 0.35);

// ---------- 1. 계보 승계 ----------
// 선행 무공 대성(12성) 뒤 후속 무공으로 갈아탄다. 엔진은 무학이 큰 쪽을 주무공으로 쓴다.
// 승계: 시작 성 = 선행 성 × 0.4 / 등급 차, 선행 성에 닿을 때까지 성취 속도 × 1.5
function swap(from, to, lineage, cap = 12) {
  const old = art(from, 12);
  const gap = Math.max(1, GI[to] - GI[from]);
  let s = lineage ? 12 * 0.4 / gap : 0, y = 0, lost = 0, over = null;
  while (y < 80) {
    const cur = art(to, s);
    if (cur < old) lost += 1; else if (over === null) over = y;
    if (s >= cap) break;
    s = Math.min(cap, s + speed(to) * (lineage && s < 12 ? 1.5 : 1)); y++;
  }
  return { start: lineage ? 4.8 / gap : 0, over, end: art(to, cap).toFixed(2), gain: (art(to, cap) / old).toFixed(2) };
}
console.log('1. 무공 교체: 앞서는 데 걸리는 해(성 상한 12 가정)');
for (const [a, b] of [['삼류', '이류'], ['이류', '일류'], ['일류', '상승'], ['일류', '신공'], ['상승', '절세'], ['절세', '신공']]) {
  const L = swap(a, b, true), O = swap(a, b, false);
  console.log(`  ${a} 대성 → ${b}: 계보 승계 ${L.over}년, 계보 밖(비급) ${O.over}년, 다 익히면 ${L.end} (기존의 ${L.gain}배)`);
}

// ---------- 2. 역할 배합 ----------
// 무학 = 공격 무학 × 심법 보정 × 경신 보정 × 방어 보정
// 역할 보정: r = 그 역할 무공의 무학 / 공격 무학. r ≤ 1이면 lo + (1 − lo) × r^0.5, r > 1이면 1 + (hi − 1) × min(1, r − 1)
const ROLE = { 심법: [0.6, 1.2], 경신: [0.85, 1.1], 방어: [0.9, 1.08] };
const roleF = (role, r) => { const [lo, hi] = ROLE[role]; return r <= 1 ? lo + (1 - lo) * Math.sqrt(Math.max(0, r)) : 1 + (hi - 1) * Math.min(1, r - 1); };
function mix(atk, sim, move, guard, seen = 0) {
  const a = art(...atk);
  const f = roleF('심법', sim ? art(...sim) / a : 0) * roleF('경신', move ? art(...move) / a : 0) * roleF('방어', guard ? art(...guard) / a : 0);
  const kyeon = 1 + Math.min(0.1, 0.02 * seen);   // 견식: 대성한 다른 공격 무공 하나마다 +2%, 최대 +10%
  return { a, f, total: a * f * kyeon };
}
console.log('\n2. 역할 배합 (절정 고수, 상승 검법 대성 기준)');
const cases = [
  ['검법만(심법·경신·방어 없음)', [['상승', 12]]],
  ['검법 + 일류 심법 대성', [['상승', 12], ['일류', 12]]],
  ['검법 + 상승 심법 대성', [['상승', 12], ['상승', 12]]],
  ['검법 + 상승 심법 + 상승 경공', [['상승', 12], ['상승', 12], ['상승', 12]]],
  ['고루 갖춤(심법·경공·외공 모두 상승 대성)', [['상승', 12], ['상승', 12], ['상승', 12], ['상승', 12]]],
  ['고루 갖춤 + 다른 검법 다섯 대성(견식)', [['상승', 12], ['상승', 12], ['상승', 12], ['상승', 12]], 5],
  ['검법 + 절세 심법 대성(심법이 더 높음)', [['상승', 12], ['절세', 12], ['상승', 12], ['상승', 12]]],
  ['검법 + 삼류 심법·삼류 경공(얕은 기초)', [['상승', 12], ['삼류', 12], ['삼류', 12]]],
];
for (const [label, kit, seen] of cases) { const m = mix(kit[0], kit[1], kit[2], kit[3], seen || 0); console.log(`  ${label.padEnd(34)} 보정 ×${m.f.toFixed(2)}  무학 ${m.total.toFixed(2)}`); }

// ---------- 3. 고유 효과가 승률에 주는 것 ----------
const pwin = (A, B, S) => 1 / (1 + Math.pow(B / A, S));
console.log('\n3. 고유 효과');
// 사일검법: 경지가 높은 상대에게 첫 합 결판 외물 ×1.25, 그리고 승률 곡선 기울기 S × 0.85
{ const A = 120 * 1.7 * art('절세', 8), B = 600 * art('상승', 12);
  console.log(`  절정 극 사일검법 8성 대 초절정 초입 상승 대성: 보통 ${(pwin(A, B, 3.2) * 100).toFixed(1)}%, 사일검법 효과 ${(pwin(A * Math.pow(1.25, 0.8), B, 3.2 * 0.85) * 100).toFixed(1)}%`); }
// 타구봉법: 내공 항이 1 미만이어도 1로 친다
{ const ng = Math.pow(25 / 40, 0.4); const A = 120 * 1.35 * art('신공', 6) * 1, A0 = 120 * 1.35 * art('신공', 6) * ng, B = 120 * 1.35 * art('상승', 9);
  console.log(`  절정 완숙 타구봉법 6성, 내공 25년(내공 항 ${ng.toFixed(2)}) 대 절정 완숙 상승 9성: 보통 규칙 ${(pwin(A0, B, 2.8) * 100).toFixed(1)}%, 타구봉법 ${(pwin(A, B, 2.8) * 100).toFixed(1)}%`); }
// 밀종대수인: 무학에 내공 항 ^ 0.5를 한 번 더 곱한다
{ const ng = 1.6; const A = 600 * 1.35 * art('신공', 8) * ng, A2 = A * Math.sqrt(ng), B = 600 * 1.35 * art('신공', 8) * ng;
  console.log(`  초절정 완숙 밀종대수인 8성 내공 항 1.6 대 같은 조건 다른 신공: ${(pwin(A2, B, 3.2) * 100).toFixed(1)}%`); }
// 자하신공 + 이십사수매화검법: 무학 ×1.15
{ const A = 3600 * 1.35 * art('신공', 11) * 1.15, B = 3600 * 1.35 * art('신공', 11);
  console.log(`  화경 완숙 자하신공+이십사수매화 11성 대 같은 경지 다른 신공 11성: ${(pwin(A, B, 4) * 100).toFixed(1)}%`); }
