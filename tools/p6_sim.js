// 6단계 명성·악명·일정 검산 (엔진 아님). node tools/p6_sim.js [생 수]
// 다섯 갈래의 삶(원형)을 해마다 굴려 명성·악명이 어디까지 오르는지, 별호가 몇 살에 붙는지 본다.
// 경지 진행은 원형마다 정해 둔 나이표를 쓴다(2단계 분포의 대표값). 사건은 칸마다 확률로 일어난다.
'use strict';
const N = +process.argv[2] || 20000;
let seed = 7;
function rnd() { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }

const REALMS = ['범인', '삼류', '이류', '일류', '절정', '초절정', '화경', '현경'];
const SLOTS = [4, 4, 4, 5, 6, 7, 8, 10];          // 경지별 한 해 칸 수
const DEED = [0.5, 1, 1.5, 2, 3, 4, 6, 8];        // 경지별 행적 배율(같은 일도 고수가 하면 더 알려진다)
// 명성·악명 = 이름을 아는 사람 수(개정 2). 단계 문턱(1 고을, 2 한 지역, 3 중원, 4 천하)
const TIER = [1000, 50000, 500000, 5000000];
const DECAY = { fame: 0.02, infamy: 0.01 };        // 행적 없는 해의 감소율
const CAP = [3000, 8000, 30000, 150000, 600000, 2000000, 6000000, 30000000]; // 경지별 이름이 닿는 끝
// 행적 하나의 증가 = (기본 사람 수 × 경지 배율 + 지금 값 × 퍼짐) × (1 − 지금 값 / 끝): 알려진 사람의 소문이 더 빨리 퍼진다
const SPREAD = 0.06;
const BREAK = [0, 0, 0, 0, 20000, 100000, 500000, 2000000]; // 경지 돌파가 알려짐(절정·초절정·화경·현경)
// 칸 종류별: 사건 확률, 사건이 나면 명성·악명 기본 증가
const ACT = {
  협행: { p: 0.3, fame: 50 },
  유람: { p: 0.2, fame: 20 },
  비무: { p: 0.4, fame: 30 },
  청부: { p: 0.4, infamy: 60 },
  약탈: { p: 0.3, infamy: 40 },
  생업: { p: 0.05, fame: 20 },
  수련: { p: 0, fame: 0 },
  가족: { p: 0, fame: 0 },
};
// 원형: 나이별 경지, 칸 배분(비율), 큰 사건
const TYPES = {
  '명문 후기지수(정파 대문파, 절정까지)': { realm: [[15, 2], [22, 3], [38, 4]], mix: { 수련: 0.5, 비무: 0.15, 협행: 0.15, 유람: 0.05, 가족: 0.15 }, big: [{ age: [18, 24], p: 0.15, fame: 30000, n: '용봉지회 입상' }] },
  '떠돌이 협객(낭인, 일류)': { realm: [[18, 1], [25, 2], [35, 3]], mix: { 수련: 0.3, 협행: 0.4, 유람: 0.2, 가족: 0.1 }, big: [{ age: [25, 60], p: 0.03, fame: 10000, n: '마두 처단' }] },
  '사파 살수(이류~일류)': { realm: [[16, 1], [22, 2], [32, 3]], mix: { 수련: 0.35, 청부: 0.45, 약탈: 0.1, 가족: 0.1 }, big: [{ age: [25, 55], p: 0.02, infamy: 10000, n: '정파 고수 암살' }] },
  '화경 은거 고수(숨김)': { realm: [[15, 2], [25, 3], [35, 4], [45, 5], [55, 6]], mix: { 수련: 0.6, 생업: 0.3, 가족: 0.1 }, hide: 0.1, big: [] },
  '천하제일을 노린 고수(현경)': { realm: [[15, 2], [22, 3], [30, 4], [40, 5], [50, 6], [62, 7]], mix: { 수련: 0.45, 비무: 0.2, 협행: 0.2, 유람: 0.05, 가족: 0.1 }, big: [{ age: [45, 70], p: 0.05, fame: 2000000, n: '천하제일 비무대회 우승' }] },
  '숙수(생업 4단, 무공 없음)': { realm: [[0, 0]], mix: { 생업: 0.8, 가족: 0.2 }, big: [{ age: [40, 65], p: 0.04, fame: 20000, n: '명숙수(생업 4단)' }] },
};
function realmAt(t, age) { let r = 0; for (const [a, k] of t.realm) if (age >= a) r = k; return r; }
function life(t) {
  let fame = 0, infamy = 0, epi = null;
  const death = 55 + Math.floor(rnd() * 25);
  let prev = realmAt(t, 15);
  for (let age = 15; age < death; age++) {
    const r = realmAt(t, age), slots = SLOTS[r];
    if (r > prev) { if (!t.hide) fame += BREAK[r]; prev = r; }   // 숨어 지내면 돌파가 알려지지 않는다
    let deed = false;
    for (const [act, share] of Object.entries(t.mix)) {
      const k = Math.round(slots * share);
      const a = ACT[act];
      for (let i = 0; i < k; i++) if (a.p && rnd() < a.p) {
        deed = true;
        if (a.fame) fame += (a.fame * DEED[r] + fame * SPREAD) * (t.hide || 1) * Math.max(0, 1 - fame / CAP[r]);
        if (a.infamy) infamy += (a.infamy * DEED[r] + infamy * SPREAD) * (t.hide ? 0.3 : 1) * Math.max(0, 1 - infamy / CAP[r]);
      }
    }
    for (const b of t.big) if (age >= b.age[0] && age <= b.age[1] && rnd() < b.p) { deed = true; fame += b.fame || 0; infamy += b.infamy || 0; }
    if (!deed) { fame *= 1 - DECAY.fame; infamy *= 1 - DECAY.infamy; }
    fame = Math.min(1e8, fame); infamy = Math.min(1e8, infamy);
    if (epi === null && Math.max(fame, infamy) >= TIER[0]) epi = age;
  }
  return { fame, infamy, epi, tier: TIER.filter(x => Math.max(fame, infamy) >= x).length };
}
for (const [name, t] of Object.entries(TYPES)) {
  const res = []; for (let i = 0; i < N; i++) res.push(life(t));
  const med = a => { const s = a.slice().sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
  const tiers = [0, 1, 2, 3, 4].map(k => (res.filter(x => x.tier === k).length / N * 100).toFixed(1) + '%');
  const ep = res.filter(x => x.epi !== null).map(x => x.epi);
  console.log(name);
  console.log(`  마지막 명성 중앙값 ${Math.round(med(res.map(x => x.fame))).toLocaleString()}명, 악명 ${Math.round(med(res.map(x => x.infamy))).toLocaleString()}명 | 명성 단계 0~4: ${tiers.join(' ')} | 별호(1,000명 이상) ${(ep.length / N * 100).toFixed(0)}%, 처음 붙는 나이 중앙값 ${ep.length ? med(ep) : '-'}`);
}
