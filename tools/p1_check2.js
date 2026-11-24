// 1단계 개정 검산: 내실(무 자체)과 외물(병기·상태)을 나누고, 결단 선택지는 승률 곡선 기울기를 낮춘다.
const R = ['범인','삼류','이류','일류','절정','초절정','화경','현경','생사경'];
const BASE = [1,4,10,25,70,220,900,4500,30000];
const ST = { 초입:1, 완숙:1.35, 극:1.7 };
const KQ = [1,1,1,1,0.95,0.9,0.85,0.8,0.75];   // 내실 반영 지수
const KO = [1,1,1,0.9,0.8,0.7,0.5,0.35,0.25];    // 외물 반영 지수
const S  = [2,2,2.2,2.5,2.8,3.2,4,5,6];
const STANCE = { 신중:{s:1.15,m:0.95}, 평상:{s:1,m:1}, 사생결단:{s:0.8,m:1.1}, 동귀어진:{s:0.6,m:1.25} };
const pw = (r,st,q,o) => { const i=R.indexOf(r); return BASE[i]*ST[st]*Math.pow(q,KQ[i])*Math.pow(o,KO[i]); };
function pwin(a,ra,b,rb,stance='평상'){ const k=STANCE[stance]; const s=S[Math.max(R.indexOf(ra),R.indexOf(rb))]*k.s; return 1/(1+Math.pow(b/(a*k.m),s)); }
const row=(l,a,ra,b,rb,st)=>console.log(l.padEnd(58),Math.round(a).toString().padStart(6),Math.round(b).toString().padStart(6),(pwin(a,ra,b,rb,st)*100).toFixed(1)+'%');
// 내실 = 내공여분 × 기술(등급×성취) × 실전 × 깨달음여분 × 특성
const q = (ng,tech,real,enl,tr=1)=>ng*tech*real*enl*tr;
const strong = Math.min(1.6, q(1.5, 1.45, 1.3, 1.2, 1.1)); // 내실 상한 1.6
const weak = Math.max(0.7, q(1.0, 0.84, 0.85, 1.0));
const avg    = q(1.0, 1.0, 1.0, 1.0);
console.log('내실 strong',strong.toFixed(2),'weak',weak.toFixed(2));
for (let i=1;i<R.length-1;i++){
  const a=pw(R[i],'극',strong,1.3), b=pw(R[i+1],'초입',weak,0.9), c=pw(R[i+1],'초입',avg,1);
  for (const st of ['평상','사생결단','동귀어진']) row(`${R[i]} 극(내실 최상) vs ${R[i+1]} 초입(내실 약) [${st}]`,a,R[i],b,R[i+1],st);
  row(`${R[i]} 극(내실 최상) vs ${R[i+1]} 초입(보통) [평상]`,a,R[i],c,R[i+1]);
  row(`${R[i]} 극(보통) vs ${R[i+1]} 초입(보통) [평상]`,pw(R[i],'극',1,1),R[i],c,R[i+1]);
  console.log('');
}
// 실전 차이만: 같은 경지
row('절정 완숙 사파(실전 1.3) vs 절정 완숙 정파 후기지수(실전 0.85)',pw('절정','완숙',1.3,1),'절정',pw('절정','완숙',0.85,1),'절정');
row('일류 극 사파 낭인(실전1.3,삼류무공 대성0.7) vs 절정 초입 명문(실전0.85,일류9성0.85)',pw('일류','극',1.3*0.7/1,1),'일류',pw('절정','초입',0.85*0.85,1),'절정');
