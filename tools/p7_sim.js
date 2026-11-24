// 7단계 사건 다양성 검산 (엔진 아님). node tools/p7_sim.js [생 수]
// 같은 출신(강남 어부의 집)으로 여러 생을 돌려, 사건 틀이 나온 순서가 얼마나 겹치는지 본다.
// 겹침 기준(docs/p7-events.md 7장): 두 생의 앞 30개 사건 틀 열의 최장 공통 부분열(LCS)이 30의 절반(15) 이상이면 "겹친다".
'use strict';
require('../data/eventbook.js');
const T = globalThis.EVENT_TEMPLATES, TW = globalThis.EVENT_TWISTS, TH = globalThis.EVENT_THREADS, RULE = globalThis.EVENT_RULES;
const N = +process.argv[2] || 100;
let seed = 2024;
function rnd() { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }
const pick = a => a[Math.floor(rnd() * a.length)];
const d6 = () => 1 + Math.floor(rnd() * 6);

const SLOTS = [4, 4, 4, 5, 6, 7, 8, 10];
const RATE = { 유람: 0.35, 협행: 0.5, 의뢰: 0.6, 생업: 0.05, 가족: 0.05, 벗: 0.2, 스승: 0.1, 연애: 0.3, 쉼: 0.05, 숨기: 0.05 };
const PERSONA = [   // 플레이어 성향별 칸 배분(무작위로 하나를 고르고 해마다 조금씩 흔든다)
  { 수련: 3, 유람: 2, 협행: 1, 가족: 1, 벗: 1 },
  { 생업: 3, 가족: 2, 벗: 1, 유람: 1 },
  { 수련: 2, 의뢰: 2, 유람: 2, 연애: 1 },
  { 수련: 4, 스승: 2, 쉼: 1 },
  { 생업: 2, 수련: 2, 가족: 1, 숨기: 1 },
];
function life() {
  const apt = { 기연: 5 * (d6() + d6() + d6()) };
  const persona = pick(PERSONA);
  const sect = rnd() < 0.25;                       // 문파에 들어간 생
  const career = rnd() < 0.6 ? 'fisher' : pick(['cook', 'merchant', 'doctor', 'smith', 'scholar']);
  const rel = new Set(['가족']);
  let realm = 0, fameTier = 0;
  const seq = [], lastAt = {}, threads = [], cnt = {};
  const death = 40 + Math.floor(rnd() * 40);
  const ok = (t, age) => {
    const n = t.need || {};
    if (n.tierUp || n.bigWin) return false;
    if (n.age && (age < n.age[0] || age > n.age[1])) return false;
    if (n.realm && (realm < n.realm[0] || realm > n.realm[1])) return false;
    if (n.tag && n.tag.includes('문파') && !sect) return false;
    if (n.tag && n.tag.includes('절맥')) return false;
    if (n.career && n.career !== career) return false;
    if (n.rel && !rel.has(n.rel)) return false;
    if (n.fame && fameTier < n.fame) return false;
    if (n.infamy) return false;
    if (lastAt[t.id] !== undefined && age - lastAt[t.id] < RULE.recentBlock) return false;
    if (n.max && (cnt[t.id] || 0) >= n.max) return false;
    return true;
  };
  const fire = (pool, age) => {
    const c = pool.filter(t => ok(t, age)); if (!c.length) return;
    let s = 0; for (const t of c) s += t.w; let u = rnd() * s;
    for (const t of c) { u -= t.w; if (u <= 0) { run(t, age); return; } }
  };
  const run = (t, age) => {
    seq.push(t.id); lastAt[t.id] = age; cnt[t.id] = (cnt[t.id] || 0) + 1;
    const ch = pick(t.ch); const good = rnd() < 0.55;
    const eff = good ? ch.ok : ch.bad;
    for (const e of eff) {
      if (e.startsWith('rel:')) rel.add(e.slice(4));
      if (e.startsWith('thread:') && TH[e.slice(7)]) threads.push({ k: e.slice(7), i: 0 });
      if (e.startsWith('fame+')) { const v = +e.slice(5); if (v >= 1000 && fameTier < 4 && rnd() < 0.3) fameTier++; }
    }
    if (t.tw.length && rnd() < RULE.twistBase) seq.push('반전:' + pick(t.tw));
  };
  for (let age = 5; age < death; age++) {
    if (age >= 15 && rnd() < 0.08 && realm < 7) realm += rnd() < 0.6 ? 1 : 0;   // 간이 경지 진행
    // 사슬 먼저
    for (const th of threads.slice()) if (rnd() < TH[th.k].p) { seq.push(`사슬:${th.k}:${th.i}`); if (++th.i >= TH[th.k].steps.length) threads.splice(threads.indexOf(th), 1); }
    // 생애
    if (rnd() < 0.3) fire(T.filter(t => t.src === '생애'), age);
    if (age < 15) continue;
    // 칸
    const slots = SLOTS[realm];
    const acts = Object.entries(persona);
    const tot = acts.reduce((a, [, v]) => a + v, 0);
    for (const [act, v] of acts) {
      const k = Math.max(0, Math.round(slots * v / tot + (rnd() - 0.5)));
      for (let i = 0; i < k; i++) {
        if (!RATE[act] || rnd() >= RATE[act]) continue;
        if ((act === '유람' || act === '협행') && rnd() < 0.05 * (0.5 + apt.기연 / 100)) { fire(T.filter(t => t.src === '기연'), age); continue; }
        fire(T.filter(t => t.src === act || (act === '생업' && t.src === '관문' && t.need.career)), age);
      }
    }
    if (rnd() < 0.15) fire(T.filter(t => t.src === '상태' || t.src === '관문'), age);
    if (rnd() < 0.05) fire(T.filter(t => t.src === '세계'), age);
    if (rnd() < 0.03) fire(T.filter(t => t.src === '큰'), age);
  }
  return seq;
}
function lcs(a, b) {
  const m = a.length, n = b.length, d = Array.from({ length: m + 1 }, () => new Int16Array(n + 1));
  for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) d[i][j] = a[i - 1] === b[j - 1] ? d[i - 1][j - 1] + 1 : Math.max(d[i - 1][j], d[i][j - 1]);
  return d[m][n];
}
const lives = []; for (let i = 0; i < N; i++) lives.push(life());
const K = 30;
let pairs = 0, over = 0, maxR = 0, sumR = 0, same10 = 0;
for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) {
  const a = lives[i].slice(0, K), b = lives[j].slice(0, K);
  const r = lcs(a, b) / K; pairs++; sumR += r; if (r > maxR) maxR = r; if (r >= 0.5) over++;
  if (a.slice(0, 10).join() === b.slice(0, 10).join()) same10++;
}
const lens = lives.map(l => l.length).sort((a, b) => a - b);
const used = new Set(lives.flat().filter(x => !x.includes(':')));
console.log(`생 ${N}개, 사건 수 중앙값 ${lens[N >> 1]}(최소 ${lens[0]}, 최대 ${lens[N - 1]}), 쓰인 틀 ${used.size}/${T.length}`);
console.log(`쌍 ${pairs}개: 앞 ${K}개 LCS 비율 평균 ${(sumR / pairs).toFixed(3)}, 최대 ${maxR.toFixed(3)}, 겹치는 쌍(≥0.5) ${over}개 (${(over / pairs * 100).toFixed(2)}%), 앞 10개가 같은 쌍 ${same10}개`);
console.log('예시 생 하나(앞 15개):', lives[0].slice(0, 15).join(' → '));
