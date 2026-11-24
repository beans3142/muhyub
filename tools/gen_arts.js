// 무공 데이터 생성기 (3단계 문서 docs/p3-arts.md 기준). 실행: node tools/gen_arts.js
// 산출: data/arts.js (ART_RULES + ARTS), data/signature.js (세력별 대표 무공 15개 이상)
// 이름은 뜻 음절의 조합이고, 효과는 그 음절에서 계산한다. 같은 시드면 같은 결과.
'use strict';
const fs = require('fs');
const path = require('path');
require('../data/factions.js');   // 세력 정본(무공 생성 설정은 style)

// ---------- 난수 (mulberry32) ----------
let seed = 20261124;
function rnd() { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }
const pick = a => a[Math.floor(rnd() * a.length)];
function wpick(obj) { const ks = Object.keys(obj); let s = 0; for (const k of ks) s += obj[k]; let r = rnd() * s; for (const k of ks) { r -= obj[k]; if (r <= 0) return k; } return ks[ks.length - 1]; }

// ---------- 등급 ----------
const GRADES = ['삼류', '이류', '일류', '상승', '절세', '신공'];   // 신공: 천하에 이름난 절학. 고정 목록만
const GM = [0.5, 0.75, 1, 1.25, 1.5, 1.75];                 // 음절 효과 크기 배율
const TECH = [1, 1.5, 2.2, 4, 8, 15];                     // 무학 등급 위력 (p1 개정 3 5-2): 무학 = TECH × (성/12)^1.4, 대성 ×1.15
const NG = [0.5, 0.8, 1.0, 1.5, 2.0, 2.5];                 // 심법 축기 기준 (p1 4-2)
const COST = ['낮음', '보통', '보통', '높음', '극심', '극심'];
// 신공급: 장르에서 진짜 유명한 것만, 문파당 많아야 둘
const LEGEND = new Set(['역근경', '금강불괴신공', '태극신공', '태극혜검', '자하신공', '이십사수매화검법', '타구봉법', '창궁무애검법', '오호단문도', '만천화우', '천마신공', '천마군림보', '빙백신공', '운룡대팔식', '밀종대수인', '혈영대법']);

// ---------- 종류 (p3 2장) ----------
const W_SWORD = { 기술: .4, 속도: .3, 힘: .15, 맷집: .05, 지능: .1 };
const W_FIST = { 힘: .3, 맷집: .25, 속도: .2, 기술: .2, 지능: .05 };
const W_PALM = { 기술: .4, 속도: .2, 힘: .15, 맷집: .1, 지능: .15 };
const W_POLE = { 기술: .35, 힘: .25, 속도: .2, 맷집: .15, 지능: .05 };
const KIND = {
  심법: { suf: ['심법', '신공', '공', '기공', '진경', '심결', '진기', '공법', '보전'], grow: ['운용', '회복', '이해'], w: null },
  검: { suf: ['검법', '검', '검결', '검식', '검공', '검술'], grow: ['정교', '유연', '반응'], w: W_SWORD, move: '수' },
  도: { suf: ['도법', '도', '도결', '도공', '도술'], grow: ['근력', '근질', '발경'], w: { 힘: .35, 속도: .25, 기술: .25, 맷집: .1, 지능: .05 }, move: '식' },
  권: { suf: ['권', '권법', '신권', '권공'], grow: ['근력', '체력', '강골'], w: W_FIST, move: '로' },
  각: { suf: ['각', '퇴', '각법', '퇴법'], grow: ['순발', '근력', '체력'], w: W_FIST, move: '식' },
  장: { suf: ['장', '장법', '신장', '장공', '장력'], grow: ['발경', '유연', '정교'], w: W_PALM, move: '식' },
  지: { suf: ['지', '지법', '신지', '지공'], grow: ['정교', '수읽기', '발경'], w: W_PALM, move: '식' },
  조: { suf: ['조', '조법', '수', '금나수', '수법'], grow: ['근력', '정교', '근질'], w: W_PALM, move: '식' },
  창: { suf: ['창법', '창', '창술'], grow: ['근력', '유연', '체력'], w: W_POLE, move: '식' },
  봉: { suf: ['봉법', '곤법', '봉'], grow: ['근력', '유연', '체력'], w: W_POLE, move: '식' },
  편: { suf: ['편법', '편'], grow: ['유연', '정교'], w: { 기술: .45, 속도: .25, 힘: .1, 맷집: .05, 지능: .15 }, move: '식' },
  암기: { suf: ['침', '표', '비도술', '암기술', '비침'], grow: ['반응', '정교', '수읽기'], w: { 기술: .4, 속도: .35, 힘: .05, 맷집: 0, 지능: .2 } },
  보법: { suf: ['보', '보법', '보공'], grow: ['순발', '반응'], w: null },
  신법: { suf: ['신법', '신행', '환위'], grow: ['반응', '유연'], w: null },
  경공: { suf: ['경공', '표', '비행'], grow: ['지속', '순발'], w: null },
  외공: { suf: ['강체공', '금종', '철포', '갑공'], grow: ['강골', '근력', '근질'], w: null },
  진법: { suf: ['진', '검진', '진법', '대진'], grow: ['지략', '수읽기'], w: { 지능: .4, 기술: .3, 힘: .1, 속도: .1, 맷집: .1 } },
  독공: { suf: ['독공', '독장', '독수', '독지'], grow: ['학식', '정교'], w: { 지능: .35, 기술: .3, 속도: .15, 맷집: .15, 힘: .05 } },
  음공: { suf: ['음공', '후', '음', '곡'], grow: ['체력', '발경'], w: { 지능: .3, 맷집: .3, 기술: .2, 힘: .1, 속도: .1 } },
  잡술: { suf: ['술', '대법', '비술'], grow: [], w: null },
};
const SHIN_SUF = new Set(['신공', '신권', '신장', '신지']);   // 상승 이상에만
const MOVES = ['삼', '오', '칠', '구', '십삼', '십팔', '이십사', '삼십육', '칠십이', '팔십일', '백팔'];

// ---------- 뜻 음절 사전 (p3 4-1). min: 쓸 수 있는 가장 낮은 등급 인덱스 ----------
// eff: 갈래 배율(일류 기준, 등급 배율로 키움), fx: 특수효과, yy: 음양, wx: 오행, sp: 특수 속성, my: 묘리, tag, grow: 더 오르는 스탯
const SYL = [
  { s: ['중', '패'], min: 0, eff: { 힘: 1.2 }, my: '중', grow: '근력' },
  { s: ['강', '철', '석'], min: 0, eff: { 맷집: 1.2 }, my: '강', grow: '강골' },
  { s: ['쾌', '속', '질'], min: 0, eff: { 속도: 1.2 }, my: '쾌', grow: '순발' },
  { s: ['풍', '비'], min: 0, eff: { 속도: 1.1 }, fx: ['회피'], grow: '반응' },
  { s: ['유', '운'], min: 0, eff: { 기술: 1.1 }, my: '유', grow: '유연' },
  { s: ['정', '명', '심'], min: 1, eff: { 기술: 1.2 }, grow: '정교' },
  { s: ['장', '원'], min: 1, fx: ['선수'], grow: '지속' },
  { s: ['연'], min: 1, fx: ['연환'], grow: '반응' },
  { s: ['섬', '일'], min: 1, fx: ['일격'], grow: '순발' },
  { s: ['환', '영', '몽'], min: 1, fx: ['환영'], my: '환', grow: '유연' },
  { s: ['빙', '한', '설'], min: 1, yy: '음', wx: '수', fx: ['둔화'], grow: '체력' },
  { s: ['월'], min: 1, yy: '음', fx: ['둔화'], grow: '체력' },
  { s: ['화', '염', '열'], min: 1, yy: '양', wx: '화', fx: ['화상'], grow: '발경' },
  { s: ['양'], min: 1, yy: '양', fx: ['화상'], grow: '발경' },
  { s: ['목'], min: 1, wx: '목', fx: ['회복'], grow: '회복' },
  { s: ['토'], min: 1, wx: '토', eff: { 맷집: 1.1 }, grow: '강골' },
  { s: ['금'], min: 1, wx: '금', eff: { 기술: 1.1 }, grow: '정교' },
  { s: ['벽력', '뇌', '뢰', '전'], min: 2, sp: '뇌', fx: ['마비'], grow: '순발' },
  { s: ['오독', '독', '사'], min: 2, sp: '독', fx: ['중독'], grow: '학식' },
  { s: ['혈'], min: 2, sp: '혈', tag: '마공', fx: ['출혈'], grow: '근질' },
  { s: ['파', '단', '절'], min: 2, fx: ['파갑'], my: '절', grow: '발경' },
  { s: ['탄', '반'], min: 2, fx: ['반탄'], grow: '강골' },
  { s: ['흡', '탈'], min: 3, fx: ['흡기'], grow: '운용' },
  { s: ['탈혼', '섭', '혼'], min: 3, fx: ['탈혼'], grow: '이해' },
  { s: ['금강', '불괴'], min: 3, fx: ['호신'], grow: '강골' },
  { s: ['태극', '양의', '혼원'], min: 3, yy: '중화', fx: ['상극면제'], grow: '운용' },
  { s: ['천', '제', '왕'], min: 3, fx: ['위압'] },
  { s: ['마'], min: 3, tag: '마공', eff: { 힘: 1.15, 속도: 1.15 }, grow: '근질' },
  { s: ['신'], min: 4, eff: { 힘: 1.05, 속도: 1.05, 맷집: 1.05, 기술: 1.05, 지능: 1.05 } },
  { s: ['멸', '겁'], min: 4, fx: ['파갑', '위압'], grow: '발경' },
];
const SYLMAP = new Map();
for (const e of SYL) for (const s of e.s) SYLMAP.set(s, e);
const SYLKEYS = [...SYLMAP.keys()].sort((a, b) => b.length - a.length);
// 형상어 (p3 4-2)
const IMG = {
  룡: { eff: { 힘: 1.05, 속도: 1.05 } }, 호: { eff: { 힘: 1.1 } }, 학: { eff: { 기술: 1.05, 속도: 1.05 } },
  응: { read: 5 }, 봉: { yy: '양', my: '유' }, 랑: { fx: ['연환'] }, 망: { my: '변' },
};
// 뜻 없는 꾸밈 음절(색·꽃·자연): 세력 어근이 없을 때 이름에 결을 준다
const FILLER = '청백홍자현옥은송죽매난국송학우산강하해성진태소대남북동서낙추춘'.split('');
const MODERN = new Set('운명 자극 사진 만성 상호 제철 정서 자성 성인 성공 안정 평안 순정 정상 상태 사태 연기 기초 소비 동서 남북 강남 강북 수석 목수 석유 연주 단순 순수 수정 정기 재수 재산 산수 수학 경제 진공 공기 기호 회사 사회 화학 회화 상회 도서 산화 화장 장관 관리 기사 사기 사망 명령 영화 화상 상영 영상 상장 장비 비상 상승 승진 진출 석방 방송 별명 명절 절망 원망 원한 한정 정원 원정 변명 명백 백성 성질 질서 성적 적자 자석 석양 양성 분석 석탄 탄생 생명 명성 성명 운동 동경 극장 마술 술수 비명 패륜 혼수 진정 정진 경비 학원 수련 연수 신경 공부 사장 장사 관광 의료 경매 녹화 서명 표현 연극 월급 화폐 은행 우주 우산 하수 동창 상술 독서 사업 신사 강사 무상 상무 화성 성화 금성 성장 장성 전화 전기 전산 전력 전단 단속 속도 도장 장단 단전 전문 문화 화폐 수면 면장 장수 수사 사형 형사 반장 장반 정반 반정 탈수 수탈 혼란 영양 양심 심장 장원 원장'.split(' '));

// ---------- 세력 설정 합치기 ----------
const KIND_MAP = { 수: '조', 잡기: '잡술' };
const FIXED_KIND = {
  금종조: '외공', 철포삼: '외공', 천근추: '외공', 사자후: '음공', 무형지독: '독공', '당문 독공': '독공', 당가해독술: '잡술', '당가 해독술': '잡술',
  기관진식: '잡술', 제갈신산: '잡술', 운룡대팔식: '신법', 연대구품: '경공', 일위도강: '경공', 금강부동신법: '신법', 취팔선보: '보법',
  암향표: '경공', 니추공: '신법', 제운종: '경공', 천마군림보: '보법', 무영보: '보법', 수상비: '경공', 야행술: '경공', 허공답보: '경공',
  이형환위: '신법', 궁신탄영: '신법', 나려타곤: '신법', 분근착골: '조', 오독신공: '독공', 천주독수: '독공', 당가암기술: '암기',
};
function normKinds(k) {
  const o = {};
  for (const [key, v] of Object.entries(k)) {
    if (key === '보신') { o.보법 = (o.보법 || 0) + v * 0.4; o.신법 = (o.신법 || 0) + v * 0.3; o.경공 = (o.경공 || 0) + v * 0.3; continue; }
    const kk = KIND_MAP[key] || key; o[kk] = (o[kk] || 0) + v;
  }
  if (!o.심법) o.심법 = 1;
  if (!o.보법 && !o.신법 && !o.경공) { o.보법 = 0.5; o.경공 = 0.5; }
  if (!o.외공) o.외공 = 0.3;
  return o;
}
const FAC = {};
const FACINFO = {};
for (const f of globalThis.FACTIONS) {
  FACINFO[f.id] = f;
  const st = f.style;
  FAC[f.id] = { n: st.n, attr: st.attr, prestige: st.prestige, roots: st.roots, kinds: normKinds(st.kinds), fixed: st.fixed };
}
// 무소속(산공·전설 유산) 설정
FAC.free = { n: 900, attr: null, prestige: 2, roots: [], kinds: normKinds({ 검: 6, 도: 4, 권: 4, 장: 4, 지: 2, 수: 2, 각: 2, 창: 2, 봉: 1, 편: 1, 암기: 2, 보신: 3, 심법: 5, 잡기: 1 }), fixed: [['삼재검법', '검', '삼류'], ['삼재공', '심법', '삼류'], ['오행신공', '심법', '일류'], ['양생공', '심법', '삼류'], ['동자공', '심법', '이류'], ['벽공장', '장', '이류'], ['탄지신통', '지', '상승'], ['허공답보', '보신', '절세'], ['이형환위', '보신', '상승'], ['궁신탄영', '보신', '일류'], ['나려타곤', '보신', '삼류'], ['천근추', '잡기', '이류'], ['전음입밀', '잡기', '일류'], ['천리지청술', '잡기', '일류'], ['분근착골', '수', '이류'], ['주안술', '잡기', '일류'], ['양가창법', '창', '일류'], ['악가창법', '창', '상승'], ['팔극권', '권', '이류'], ['형의권', '권', '이류'], ['팔괘장', '장', '이류'], ['응조권', '권', '이류'], ['금나수', '수', '삼류'], ['호신강기', '잡기', '상승'], ['검기점혈', '지', '상승']] };
// 독공·음공은 세력 성질에 맞춰 더한다
for (const [id, c] of Object.entries(FAC)) {
  if (c.attr === '독') c.kinds.독공 = (c.kinds.독공 || 0) + 3;
  if (['shaolin', 'potala', 'leiyin', 'demon', 'gaibang', 'tianzhu'].includes(id)) c.kinds.음공 = (c.kinds.음공 || 0) + 0.6;
  if (id === 'free') { c.kinds.독공 = 1; c.kinds.음공 = 0.6; }
}
const ALIGN = id => (FACINFO[id] && FACINFO[id].t) || '중';
const DEMONIC = id => ['마', '암'].includes(ALIGN(id)) || ['demon', 'blood', 'salmun', 'mingjiao', 'sado'].includes(id);
const CLAN = id => FACINFO[id] && FACINFO[id].lad === 'clan';

// 세력 성질이 고르는 음절에 주는 가중치
const AFFINITY = {
  음: { 빙: 4, 한: 4, 설: 4, 월: 3 }, 양: { 화: 4, 염: 4, 열: 4, 양: 3 }, 독: { 독: 5, 오독: 3, 사: 3 },
  마: { 혈: 4, 마: 3, 탈혼: 3, 섭: 2, 흡: 2 }, 불: { 금강: 4, 불괴: 3, 정: 2, 강: 2 }, 도가: { 태극: 4, 양의: 3, 유: 3, 운: 3, 정: 2 }, 중립: {},
};
const GRADE_W = { 1: [55, 30, 13, 2, 0], 2: [45, 32, 18, 4.5, 0.5], 3: [40, 32, 20, 7, 1] };
// 세력별 절세 상한(고정 무공 포함). 절세는 세상에 몇십 개뿐이다
const TOP_CAP = { 1: 0, 2: 1, 3: 2 };   // 절세 상한: 큰 문파만
const BIG = id => FACINFO[id] && ['sect', 'clan', 'demon', 'beggar'].includes(FACINFO[id].lad);
const topCap = (id, cfg) => BIG(id) ? Math.max(0, TOP_CAP[cfg.prestige] - (cfg.fixed || []).filter(x => LEGEND.has(x[0])).length) : 0;   // 신공급을 가진 문파는 그만큼 절세가 적다
const FREE_TOP = 4;   // 무소속(전설 고수의 유산·실전 무공) 절세 수
const topCount = {};

// ---------- 효과 계산 ----------
function blank() { return { eff: {}, fx: [], yy: null, wx: null, sp: null, my: [], tags: [], grow: [], read: 0 }; }
function applyEntry(acc, e, gi, scale = 1) {
  const m = GM[gi] * scale;
  if (e.eff) for (const [k, v] of Object.entries(e.eff)) acc.eff[k] = +((acc.eff[k] || 1) * (1 + (v - 1) * m)).toFixed(3);
  if (e.fx) for (const x of e.fx) if (!acc.fx.includes(x)) acc.fx.push(x);
  if (e.yy && !acc.yy) acc.yy = e.yy;
  if (e.wx && !acc.wx) acc.wx = e.wx;
  if (e.sp && !acc.sp) acc.sp = e.sp;
  if (e.my && !acc.my.includes(e.my)) acc.my.push(e.my);
  if (e.tag && !acc.tags.includes(e.tag)) acc.tags.push(e.tag);
  if (e.grow && !acc.grow.includes(e.grow)) acc.grow.push(e.grow);
  if (e.read) acc.read += e.read;
}
// 고정 이름 해석: 세력 어근·고유명을 지우고 가장 긴 음절부터 사전과 맞춘다
const PROPER = ['나한', '매화', '달마', '여래', '반야', '아미', '곤륜', '청성', '종남', '점창', '공동', '화산', '무당', '남궁', '모용', '제갈', '팽가', '당가', '당문', '소림', '개방', '하오', '녹림', '타구', '취팔선', '양가', '악가', '팔극', '형의', '팔괘', '응조', '삼재', '육합', '오호', '단문', '창궁', '무애', '천하', '사일', '분광', '낙일', '칠상', '복마', '불광', '난화', '복호', '금정', '청운', '적하', '태을', '자하', '암향', '연대', '구품', '일위', '부동', '아라한', '대력', '백보', '천수', '용조', '현허', '제운', '면', '십단', '만천', '이화', '수춘', '월녀', '밀종', '대수인', '진언', '야수', '유가', '발도', '역근', '세수', '여래', '취', '연환', '판관', '칠현', '기관', '신산', '성화', '광명', '좌사', '군림', '화공', '소수', '사혼', '개산', '분수', '수상', '귀식', '축골', '역용', '미혼', '야행', '무영', '일살', '필살', '은잠', '구천', '현기', '홍', '양생', '동자', '벽공', '탄지', '허공', '답보', '이형', '환위', '궁신', '탄영', '나려', '타곤', '천근', '전음', '입밀', '천리', '지청', '분근', '착골', '주안', '호신', '강기', '검기', '점혈', '단목', '분운', '무류', '창천', '대연', '혼원일기', '화우', '국화', '연화', '산화', '낙화', '도화', '화원', '배화', '화령', '사도', '사왕', '사천', '사자', '수미', '수라', '금의', '금사', '수춘', '비어', '설역', '설봉', '반청', '복명', '남소림', '천주', '혈수', '조의', '선인', '정충', '보국', '일관', '축융', '남악', '현공', '숭양', '청량', '구곡', '부구', '해남', '좌수', '역수', '검각', '촉도', '천험', '전진', '현문', '천강', '북두', '상청', '오뢰', '도목', '관음', '자항', '지장', '천축', '범천', '뇌음', '아수라', '태양', '금오', '적염', '광풍', '유사', '마상', '이도', '음류', '해동', '어림', '육선', '포쾌', '추종', '쇄사', '음풍', '귀원', '잠룡'];
function parseName(name, kind) {
  let core = name.replace(/ /g, '');
  const sufs = ((KIND[kind] || {}).suf || []).concat(['신공', '심법', '공', '법', '술', '대법', '결', '식']).sort((a, b) => b.length - a.length);
  for (const x of sufs) if (core.endsWith(x) && core.length > x.length) { core = core.slice(0, -x.length); break; }
  for (const m of MOVES.slice().sort((a, b) => b.length - a.length)) for (const mk of ['수', '식', '로', '']) if (mk && core.startsWith(m + mk)) { core = core.slice((m + mk).length); break; }
  for (const r of PROPER.slice().sort((a, b) => b.length - a.length)) if (r.length >= 2 || ['면', '홍', '취'].includes(r)) core = core.split(r).join('·');
  const found = [];
  let i = 0;
  while (i < core.length) {
    let hit = null;
    for (const k of SYLKEYS) if (core.startsWith(k, i)) { hit = k; break; }
    if (hit) { found.push(hit); i += hit.length; } else i++;
  }
  return found;
}
function effectsOf(sylls, gi, kind, imgs) {
  const acc = blank();
  if (kind === '독공') applyEntry(acc, SYLMAP.get('독'), gi);
  for (const s of sylls) { const e = SYLMAP.get(s); if (e && e.min <= gi + 1) applyEntry(acc, e, gi); }
  for (const im of imgs || []) applyEntry(acc, IMG[im], gi);
  if (kind === '심법' && !acc.yy) acc.yy = '중화';
  return acc;
}

// ---------- 무공 하나 만들기 ----------
const out = [];
const seen = new Set();
function finalize(o, acc, gi, fac) {
  const tags = acc.tags.slice();
  if (DEMONIC(fac) && (o.k === '심법' || /혈|마/.test(o.n)) && !tags.includes('마공')) tags.push('마공');
  if (ALIGN(fac) === '사' && !tags.includes('마공') && rnd() < 0.4) tags.push('사공');
  if (CLAN(fac) && gi >= 2 && rnd() < 0.5) tags.push('가전');
  if (fac !== 'free' && gi >= 3 && rnd() < 0.5) tags.push('비전');
  if (o.fixed && fac !== 'free' && gi >= 2 && rnd() < 0.5) tags.push('독문');
  const k = KIND[o.k];
  const r = { n: o.n, k: o.k, g: GRADES[gi], f: fac };
  if (tags.length) r.tg = tags;
  r.yy = acc.yy || (o.k === '심법' ? '중화' : null);
  if (acc.wx) r.wx = acc.wx;
  if (acc.sp) r.sp = acc.sp;
  r.my = acc.my.length ? acc.my.slice(0, 2) : [pick(['강', '유', '쾌', '변', '둔'])];
  if (Object.keys(acc.eff).length) r.eff = acc.eff;
  if (acc.fx.length) r.fx = acc.fx.slice(0, 3);
  r.gr = [...new Set([...(k.grow || []), ...acc.grow])].slice(0, 4);
  if (acc.read) r.read = acc.read;
  r.cost = ['음공', '진법'].includes(o.k) ? COST[Math.min(4, gi + 1)] : COST[gi];
  if (o.k === '심법') { r.ng = NG[gi] * (tags.includes('마공') ? 1.5 : 1); r.pur = tags.includes('마공') ? 70 : tags.includes('사공') ? 80 : 100; }
  r.tech = TECH[gi];
  const req = {};
  if (gi >= 3) req.realm = gi === 3 ? '이류' : '일류';
  if (k.grow && k.grow[0] && gi >= 1) req[k.grow[0]] = 20 + gi * 10;
  if (/옥녀|소녀|선녀/.test(o.n)) req.sex = 'f';
  if (tags.includes('마공')) req.align = -30;
  if (Object.keys(req).length) r.req = req;
  if (o.mv) r.mv = o.mv;
  if (o.k === '심법') r.layers = [3, 5, 7, 9, 12, 12][gi] + (gi < 4 && rnd() < 0.3 ? 2 : 0);
  else if (o.k !== '잡술') r.max = gi === 5 ? 12 : (rnd() < [0.7, 0.6, 0.45, 0.35, 0.3][gi] ? 10 : 12);
  if (gi === 5) {
    const coreName = o.n.replace(/(신공|심법|공|진경|심결|기공|진기|공법|보전|검법|봉법|도|보|식|장|인|우|법)$/, '') || o.n;
    const L = r.layers || r.max || 12;
    const cut = [0, 0.25, 0.5, 0.75, 0.92, 1].map(x => Math.max(1, Math.round(x * L)));
    r.st = ['기', '승', '전', '합', '화'].map((x, i) => ({ n: `${coreName} ${['초', '이', '삼', '사', '극'][i]}경`, [r.layers ? 'layer' : 'sung']: [cut[i] + (i ? 1 : 0), cut[i + 1]], fx: ['운기 안정', '속성 발현', '기 발현 한 단계 앞당김', '고유 특수효과', '신체 변화'][i] }));
  }
  if (o.fixed) r.o = 'fixed'; else if (o.base) { r.o = 'var'; r.base = o.base; } else r.o = 'gen';
  return r;
}
function add(r) { if (seen.has(r.n)) return false; seen.add(r.n); out.push(r); return true; }

function pickSyllables(gi, attr, n, righteous) {
  const aff = AFFINITY[attr || '중립'] || {};
  const pool = {};
  for (const [s, e] of SYLMAP) if (e.min <= gi) pool[s] = (aff[s] || 1) * (e.min === gi ? 1.5 : 1) * (s.length > 1 ? 0.6 : 1) * (righteous && (e.sp === '독' || e.sp === '혈' || e.tag === '마공') ? 0.1 : 1);
  const res = [];
  let tries = 0;
  while (res.length < n && tries++ < 30) {
    const s = wpick(pool);
    if (res.includes(s)) continue;
    const e = SYLMAP.get(s);
    const clash = res.some(x => { const o = SYLMAP.get(x); return (o.yy && e.yy && o.yy !== e.yy) || (o.sp && e.sp && o.sp !== e.sp) || o === e; });
    if (!clash) res.push(s);
  }
  return res;
}
function genOne(fac, cfg) {
  const w = GRADE_W[cfg.prestige];
  let rr = rnd() * w.reduce((a, b) => a + b, 0), gi = 4;
  if (fac === 'free' && rnd() < 0.015) { /* 전설 유산 후보 */ } 
  for (let i = 0; i < 5; i++) { rr -= w[i]; if (rr <= 0) { gi = i; break; } }
  const cap = fac === 'free' ? FREE_TOP : Math.max(0, topCap(fac, cfg) - (cfg.fixed || []).filter(x => x[2] === '절세' && !LEGEND.has(x[0])).length);
  if (gi === 4 && (topCount[fac] || 0) >= cap) gi = 3;
  if (gi === 4) topCount[fac] = (topCount[fac] || 0) + 1;
  const kind = wpick(cfg.kinds);
  const k = KIND[kind];
  const nSyl = rnd() < (gi >= 3 ? 0.55 : 0.35) ? 2 : 1;
  const sylls = pickSyllables(gi, cfg.attr, nSyl, ['정'].includes(ALIGN(fac)) && cfg.attr !== '독');
  const root = cfg.roots && cfg.roots.length && rnd() < 0.45 ? pick(cfg.roots) : (rnd() < 0.3 ? pick(FILLER) : '');
  const imgs = rnd() < 0.22 ? [pick(Object.keys(IMG))] : [];
  let suf = pick(k.suf);
  if (SHIN_SUF.has(suf) && gi < 3) suf = k.suf[0];
  const mv = k.move && rnd() < 0.12 ? pick(MOVES) : null;
  if (sylls.some(x => root.includes(x))) return null;
  const name = (mv ? mv + k.move : '') + root + sylls.join('') + imgs.join('') + suf;
  if (name.length < (gi >= 4 ? 4 : 2) || name.length > 8) return null;
  if (/(.)/.test(name)) return null;
  for (const w of MODERN) if (name.includes(w)) return null;
  const acc = effectsOf(sylls, gi, kind, imgs);
  const o = { n: name, k: kind, mv: mv ? `${mv}${k.move}` : null };
  if (mv) o.mvNote = 1;
  const r = finalize(o, acc, gi, fac);
  if (mv) { r.slow = 0.9; r.peak = 1.2; }
  return r;
}

// ---------- 생성 ----------
const FIXED_LIST = [];
for (const [fac, cfg] of Object.entries(FAC)) {
  let fixedTop = 0;
  for (const [n, k0, g0] of cfg.fixed || []) {
    let g = LEGEND.has(n) ? '신공' : g0;
    if (g === '절세' && fac !== 'free') { fixedTop++; if (fixedTop > topCap(fac, cfg)) g = '상승'; }
    const kind = FIXED_KIND[n] || FIXED_KIND[n.replace(/\s/g, '')] || (k0 === '보신' ? '보법' : KIND_MAP[k0] || k0);
    const gi = GRADES.indexOf(g === '절정' ? '상승' : g);
    const sylls = parseName(n, kind);
    const acc = effectsOf(sylls, gi, kind, []);
    if (!Object.keys(acc.eff).length && !acc.fx.length) {   // 이름에 뜻 음절이 없는 고정 무공: 세력 성질에 맞는 효과 하나(전승 효과)
      const grow = KIND[kind].grow || [];
      const fit = [...SYLMAP.entries()].filter(([x, e]) => e.min <= Math.max(gi, 1) && e.grow && grow.includes(e.grow)).map(([x]) => x);
      const s2 = fit.length ? pick(fit) : pickSyllables(Math.max(gi, 1), cfg.attr, 1)[0];
      if (s2) applyEntry(acc, SYLMAP.get(s2), gi);
    }
    const r = finalize({ n, k: kind, fixed: true }, acc, gi, fac);
    if (add(r)) FIXED_LIST.push(r);
  }
  let made = 0, tries = 0;
  while (made < cfg.n && tries++ < cfg.n * 30) { const r = genOne(fac, cfg); if (r && add(r)) made++; }
}
// 진산절학: 절세가 없는 세력은 세력 어근으로 이름을 지은 절세 무공 하나를 둔다
for (const [fac, cfg] of Object.entries(FAC)) {
  if (fac === 'free' || !BIG(fac) || cfg.prestige < 3 || out.some(o => o.f === fac && (o.g === '절세' || o.g === '신공'))) continue;
  const top = Object.entries(cfg.kinds).sort((x, y) => y[1] - x[1])[0][0];
  const kind = ['정', '중', '마', '암'].includes(ALIGN(fac)) && cfg.kinds.심법 >= 1 ? '심법' : top;
  const sufs = KIND[kind].suf;
  const suf = kind === '심법' ? (DEMONIC(fac) ? pick(['마공', '대법', '진경']) : pick(['신공', '진경', '보전'])) : (sufs.find(x => SHIN_SUF.has(x)) || sufs[0]);
  let made = false;
  for (const root of (cfg.roots || []).filter(r => r.length === 2).sort(() => rnd() - 0.5)) {
    const name = root + suf;
    if (seen.has(name) || MODERN.has(root)) continue;
    const acc = effectsOf(parseName(name, kind), 4, kind, []);
    if (!Object.keys(acc.eff).length && !acc.fx.length) applyEntry(acc, SYLMAP.get(pickSyllables(4, cfg.attr, 1)[0]), 4);
    const r = finalize({ n: name, k: kind }, acc, 4, fac);
    r.jin = 1;   // 진산절학
    add(r); made = true; break;
  }
  if (!made) console.log('진산절학 이름 실패', fac);
}
// 갈래 무공: 고정 이름에서 어근 한 글자를 바꾼다 (등급 ±1, 바뀐 글자의 뜻이 효과를 바꾼다)
for (const o of FIXED_LIST) {
  const k = KIND[o.k];
  const suf = (k.suf || []).slice().sort((a, b) => b.length - a.length).find(x => o.n.endsWith(x));
  if (!suf || o.n.includes(' ')) continue;
  const root = o.n.slice(0, -suf.length);
  if (root.length < 2 || root.length > 5) continue;
  const gi0 = GRADES.indexOf(o.g);
  for (let t = 0, made = 0; t < 15 && made < 3; t++) {
    const gi = Math.max(0, Math.min(3, gi0 + Math.floor(rnd() * 3) - 1));
    const cands = [...SYLMAP.keys()].filter(s => s.length === 1 && SYLMAP.get(s).min <= gi);
    const pos = Math.floor(rnd() * root.length);
    const nr = root.slice(0, pos) + pick(cands) + root.slice(pos + 1);
    if (nr === root || MODERN.has(nr.slice(0, 2))) continue;
    const name = nr + suf;
    const sylls = parseName(name, o.k);
    const r = finalize({ n: name, k: o.k, base: o.n }, effectsOf(sylls, gi, o.k, []), gi, o.f);
    if (add(r)) made++;
  }
}

// ---------- 대표 무공 (세력당 15개 이상) ----------
const QUOTA = [3, 4, 4, 3, 1, 0];
const SIG = {};
for (const fac of Object.keys(FAC)) {
  if (fac === 'free') continue;
  const mine = out.filter(o => o.f === fac);
  const sel = mine.filter(o => o.o === 'fixed');
  const need = QUOTA.slice();
  for (const o of sel) need[GRADES.indexOf(o.g)] = Math.max(0, need[GRADES.indexOf(o.g)] - 1);
  const ensure = ks => { if (!sel.some(o => ks.includes(o.k))) { const c = mine.find(o => ks.includes(o.k) && o.o === 'gen' && !sel.includes(o)); if (c) { sel.push(c); need[GRADES.indexOf(c.g)] = Math.max(0, need[GRADES.indexOf(c.g)] - 1); } } };
  ensure(['심법']); ensure(['보법', '신법', '경공']);
  for (let gi = 0; gi < 6; gi++) {
    const used = new Set(sel.map(o => o.k));
    const pool = mine.filter(o => o.g === GRADES[gi] && o.o === 'gen' && !sel.includes(o)).sort((a, b) => (used.has(a.k) ? 1 : 0) - (used.has(b.k) ? 1 : 0));
    sel.push(...pool.slice(0, need[gi]));
  }
  while (sel.length < 15) { const c = mine.find(o => !sel.includes(o) && o.o !== 'var'); if (!c) break; sel.push(c); }
  SIG[fac] = sel.sort((a, b) => GRADES.indexOf(a.g) - GRADES.indexOf(b.g)).map(o => o.n);
}

// ---------- 쓰기 ----------
const NL = String.fromCharCode(10);
const counts = {}; for (const o of out) counts[o.g] = (counts[o.g] || 0) + 1;
const MASTERY = { 성: { 10: [[1, 2, '입문'], [3, 5, '소성'], [6, 8, '중성'], [9, 9, '극성'], [10, 10, '대성']], 12: [[1, 3, '입문'], [4, 6, '소성'], [7, 9, '중성'], [10, 11, '극성'], [12, 12, '대성']] }, 층: '심법은 N층, 마지막 층이 대성', 공력: { 신중: 7, 평상: 10, 사생결단: 12, 동귀어진: 12, 회광반조: 12 } };
const RULES = { MASTERY, GRADES, GM, TECH, NG, COST, KIND: Object.fromEntries(Object.entries(KIND).map(([k, v]) => [k, { grow: v.grow, w: v.w }])), SYL: SYL.map(e => Object.assign({}, e)), IMG };
const head = [
  '// 무공 데이터 (자동 생성: node tools/gen_arts.js, 규칙: docs/p3-arts.md). 손으로 고치지 말고 생성기를 고친다.',
  '// n 이름, k 종류, g 등급(삼류·이류·일류·상승·절세·신공), f 세력 id(free=무소속), tg 꼬리표(마공·사공·독문·가전·비전), yy 음양, wx 오행, sp 특수 속성,',
  '// my 묘리, eff 갈래 배율(주무공일 때), fx 특수효과, gr 수련 때 오르는 스탯, cost 내공 소모, ng·pur 심법 축기 기준·정순도,',
  '// tech 기술 등급배율, req 요구, mv 초식 수(slow 성취 속도, peak 대성 도약), max 최대 성(10 또는 12), layers 심법 층 수,',
  '// st 신공 고유 단계(layer 구간), jin 1이면 그 세력의 진산절학, o fixed(장르 공통 이름)/gen/var(갈래, base 원본)',
  `// 총 ${out.length}종. 등급별 ${JSON.stringify(counts)}`,
];
fs.writeFileSync(path.join(__dirname, '..', 'data', 'arts.js'),
  [...head, '(function (G) {', 'G.ART_RULES = ' + JSON.stringify(RULES) + ';', 'G.ARTS = [', out.map(o => JSON.stringify(o)).join(',' + NL), '];', '})(typeof window !== "undefined" ? window : globalThis);', ''].join(NL));
const sizes = Object.values(SIG).map(a => a.length);
fs.writeFileSync(path.join(__dirname, '..', 'data', 'signature.js'),
  [`// 세력별 대표 무공 이름 (자동 생성: node tools/gen_arts.js). 세력 ${Object.keys(SIG).length}개, 세력당 ${Math.min(...sizes)}~${Math.max(...sizes)}개. 세부는 ARTS에서 이름으로 찾는다`,
    '// 입문하면 삼류부터 받고, 직책·배분이 오르면 윗등급을 전수받는다(4단계). 상승·절세는 진전제자·장로·후계자 몫',
    '(function (G) {', 'G.SIGNATURE = {', Object.entries(SIG).map(([k, v]) => '  ' + k + ': ' + JSON.stringify(v)).join(',' + NL), '};', '})(typeof window !== "undefined" ? window : globalThis);', ''].join(NL));
console.log('arts', out.length, counts, 'fixed', out.filter(o => o.o === 'fixed').length, 'var', out.filter(o => o.o === 'var').length);
console.log('signature factions', Object.keys(SIG).length, 'min', Math.min(...sizes), 'max', Math.max(...sizes));
