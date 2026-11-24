// 1단계 개정 3 검산: 무학항(무공 등급 x 성취)과 내공항(유효 내공 / 경지 기준 내공)을 내실에서 떼어 곱한다.
// 경지 기준값을 키워 경지가 높을수록 한 단계 차이가 더 벌어지게 했다.
const R = ['범인','삼류','이류','일류','절정','초절정','화경','현경'];
const BASE = [1,4,10,30,120,600,3600,27000];
const ST = { 초입:1, 완숙:1.35, 극:1.7 };
const KQ = [1,1,1,1,0.95,0.9,0.85,0.8];
const KO = [1,1,1,0.9,0.8,0.7,0.5,0.35];
const S  = [2,2,2.2,2.5,2.8,3.2,4,5];
const NEED = [0,1,10,20,40,60,90,120];          // 경지 조건 유효 내공(년)
const CAPA = [10,20,40,70,120,200,360,Infinity]; // 단전 용량(년)
const G = { 삼류:1, 이류:1.5, 일류:2.2, 상승:4, 절세:8, 신공:15 };
const P_ART = 1.4, P_NG = 0.4;
const STANCE = { 평상:{s:1,m:1}, 사생결단:{s:0.8,m:1.1}, 동귀어진:{s:0.6,m:1.25} };

const art = (g, sung) => G[g] * Math.pow(sung/12, P_ART) * (sung >= 12 ? 1.15 : 1);
const ng = (ri, years) => { const y = Math.min(years, CAPA[ri]); return Math.min(2.5, Math.max(0.6, Math.pow(y / Math.max(1, NEED[ri]), P_NG))); };
const pw = (r, st, a, n, q=1, o=1) => { const i = R.indexOf(r); return BASE[i]*ST[st]*a*n*Math.pow(q,KQ[i])*Math.pow(o,KO[i]); };
const pwin = (A, ra, B, rb, stance='평상') => { const k = STANCE[stance]; const s = S[Math.max(R.indexOf(ra), R.indexOf(rb))]*k.s; return 1/(1+Math.pow(B/(A*k.m), s)); };
const pct = x => (x*100).toFixed(x < 0.001 ? 3 : 1) + '%';
const line = (label, A, ra, B, rb) => console.log(label.padEnd(64), String(Math.round(A)).padStart(7), String(Math.round(B)).padStart(7), pct(pwin(A,ra,B,rb)).padStart(8), pct(pwin(A,ra,B,rb,'동귀어진')).padStart(8));

console.log('무학항: 등급 x 성');
for (const g of Object.keys(G)) console.log(g.padEnd(4), [1,3,4,6,8,9,10,11,12].map(s => `${s}성 ${art(g,s).toFixed(2)}`).join('  '));
console.log('');
console.log('대결'.padEnd(64), '  A무위', '  B무위', '  평상', ' 동귀어진');

// 같은 경지, 무공만 다름
line('절정 완숙: 신공 6성 vs 일류 대성', pw('절정','완숙',art('신공',6),1), '절정', pw('절정','완숙',art('일류',12),1), '절정');
line('절정 완숙: 절세 8성 vs 일류 대성', pw('절정','완숙',art('절세',8),1), '절정', pw('절정','완숙',art('일류',12),1), '절정');
line('초절정 완숙: 신공 8성 vs 상승 대성', pw('초절정','완숙',art('신공',8),1), '초절정', pw('초절정','완숙',art('상승',12),1), '초절정');
line('화경 완숙: 신공 11성 vs 상승 대성', pw('화경','완숙',art('신공',11),1), '화경', pw('화경','완숙',art('상승',12),1), '화경');
line('현경 완숙: 신공 대성 vs 절세 대성', pw('현경','완숙',art('신공',12),1), '현경', pw('현경','완숙',art('절세',12),1), '현경');
console.log('');
// 한 경지 차이 (보통 = 그 경지에 흔한 무공)
const typical = { 삼류:['삼류',9], 이류:['이류',9], 일류:['일류',10], 절정:['상승',9], 초절정:['상승',12], 화경:['절세',11], 현경:['절세',12] };
for (let i = 1; i < R.length-1; i++) {
  const a = R[i], b = R[i+1];
  const ta = art(...typical[a]), tb = art(...typical[b]);
  line(`${a} 극 보통 vs ${b} 초입 보통`, pw(a,'극',ta,1), a, pw(b,'초입',tb,1), b);
}
console.log('');
// 신공·영약으로 한 경지 위를 상대
line('절정 극 신공 6성 vs 초절정 초입 상승 대성', pw('절정','극',art('신공',6),1), '절정', pw('초절정','초입',art('상승',12),1), '초절정');
line('절정 극 신공 6성 vs 초절정 초입 일류 대성', pw('절정','극',art('신공',6),1), '절정', pw('초절정','초입',art('일류',12),1), '초절정');
line('초절정 극 신공 8성 vs 화경 초입 절세 11성', pw('초절정','극',art('신공',8),1), '초절정', pw('화경','초입',art('절세',11),1), '화경');
line('화경 극 신공 11성 vs 현경 초입 절세 대성', pw('화경','극',art('신공',11),1), '화경', pw('현경','초입',art('절세',12),1), '현경');
console.log('');
// 영약: 같은 사람이 영약을 먹기 전·후
const n0 = ng(3, 20), n1 = ng(3, 20+60);
line(`일류 극 일류대성 내공20년(${n0.toFixed(2)}) vs 대환단 뒤 80년(${n1.toFixed(2)})`, pw('일류','극',art('일류',12),n1), '일류', pw('일류','극',art('일류',12),n0), '일류');
line('일류 극 일류대성 + 대환단(80년) vs 절정 초입 상승 9성', pw('일류','극',art('일류',12),n1), '일류', pw('절정','초입',art('상승',9),1), '절정');
const m0 = ng(4, 40), m1 = ng(4, 40+120);
line(`절정 완숙 상승9성 40년 vs 공청석유 뒤 160년(${m1.toFixed(2)})`, pw('절정','완숙',art('상승',9),m1), '절정', pw('절정','완숙',art('상승',9),m0), '절정');
line('절정 극 신공6성 + 160년 vs 초절정 초입 상승 대성', pw('절정','극',art('신공',6),m1), '절정', pw('초절정','초입',art('상승',12),1), '초절정');
console.log('');
// 두 경지 차이는 무엇을 해도 안 된다
line('절정 극 신공6성 160년 내실1.4 vs 화경 초입 상승 대성', pw('절정','극',art('신공',6),m1,1.4,1.3), '절정', pw('화경','초입',art('상승',12),1), '화경');
line('일류 극 일류대성 70년 내실1.4 vs 초절정 초입 상승 대성', pw('일류','극',art('일류',12),ng(3,70),1.4,1.3), '일류', pw('초절정','초입',art('상승',12),1), '초절정');
console.log('');
console.log('경지별 보통 무위:', R.slice(1).map(r => `${r} ${Math.round(pw(r,'완숙',art(...typical[r]),1))}`).join(', '));
