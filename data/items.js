// 영약·영물·내단·독·기보 데이터. 규칙: docs/p1-combat.md 4-4(복용과 연화), docs/p3-arts.md 8장(목록).
// qi 약기(년), pur 정순도(%), yy 음양(음·양·중화), wx 오행, sp 특수(독·혈), refine 연화량 배율, risk 복용 즉시 판정 DC(d100, 없으면 0)
// side 부효과(엔진 키), q 품(하품·중품·상품·극품), src 얻는 곳(7단계 사건이 장소를 고를 때 씀)
(function (G) {

// ---------- 영단: 사람이 만든 약 ----------
G.PILLS = [
  { id: 'jinchuang', n: '금창약', q: '하품', side: { heal: '부상 1' }, src: '약방·표국' },
  { id: 'huxin', n: '호심단', q: '하품', side: { heal: '내상 1' }, src: '의원' },
  { id: 'jiedu', n: '해독단', q: '하품', side: { cure: '하품 독' }, src: '약방·당가' },
  { id: 'bigu', n: '벽곡단', q: '하품', side: { hunger: '1년 면제' }, src: '도가 문파' },
  { id: 'xiaohuan', n: '소환단', q: '중품', qi: 10, pur: 85, yy: '중화', refine: 1.0, side: { heal: '내상 1' }, src: '소림' },
  { id: 'dahuan', n: '대환단', q: '극품', qi: 60, pur: 90, yy: '중화', refine: 0.8, side: { save: '사망 판정 1회 면제', stat: { 근골: 5 }, heal: '내상·불구 1' }, big: true, src: '소림 장경각' },
  { id: 'zixiao', n: '자소단', q: '상품', qi: 30, pur: 85, yy: '양', wx: '화', refine: 1.0, src: '화산' },
  { id: 'meihua', n: '매화단', q: '중품', qi: 10, pur: 80, yy: '양', refine: 1.2, src: '화산' },
  { id: 'taiqing', n: '태청신단', q: '상품', qi: 30, pur: 90, yy: '중화', refine: 1.0, side: { cure: '주화입마 1회' }, src: '무당' },
  { id: 'xiaoqing', n: '소청단', q: '중품', qi: 10, pur: 85, yy: '중화', refine: 1.2, src: '무당·청성' },
  { id: 'jiutian', n: '구천신단', q: '상품', qi: 30, pur: 85, yy: '중화', refine: 1.0, src: '청성' },
  { id: 'jinding', n: '금정단', q: '중품', qi: 12, pur: 85, yy: '음', refine: 1.1, src: '아미' },
  { id: 'xuelian_dan', n: '설련단', q: '상품', qi: 30, pur: 85, yy: '음', wx: '수', refine: 1.0, src: '곤륜' },
  { id: 'dudan', n: '당가 독단', q: '중품', qi: 15, pur: 60, sp: '독', refine: 1.0, risk: 70, side: { onlyFor: '독공 수련자, 아니면 중독' }, src: '사천당가' },
  { id: 'xuehun', n: '혈혼단', q: '상품', qi: 40, pur: 50, sp: '혈', refine: 1.3, risk: 60, side: { align: -20 }, src: '혈교·마교' },
  { id: 'xisui', n: '세수단', q: '상품', side: { stat: { 근골: 5 } }, src: '세가 비고' },
  { id: 'zhuyan', n: '주안단', q: '중품', side: { aging: 10 }, src: '도가 문파·기루' },
];

// ---------- 천재지보: 자연에서 나는 것. ages = [연수, 이름, 품, 약기] ----------
G.HERBS = [
  { id: 'shanshen', ages: [[100, '백년삼', '하품', 5], [1000, '천년삼', '상품', 30], [10000, '만년삼왕', '극품', 60]], pur: 75, yy: '양', wx: '목', side10000: { stat: { 근골: 10 }, life: 10 }, src: '깊은 산' },
  { id: 'xueshen', ages: [[100, '백년설삼', '중품', 10], [1000, '천년설삼', '상품', 30], [10000, '만년설삼', '극품', 60]], pur: 80, yy: '음', wx: '수', side1000: { cure: '구양절맥' }, side10000: { stat: { 오성: 5 }, cure: '심마 1' }, src: '장백산·곤륜·설산' },
  { id: 'huoshen', ages: [[100, '백년화삼', '중품', 10], [1000, '천년화삼', '상품', 30]], pur: 75, yy: '양', wx: '화', side1000: { cure: '구음절맥' }, src: '화산 지대' },
  { id: 'renxing', ages: [[1000, '인형삼', '상품', 40], [10000, '인형설삼', '극품', 90]], pur: 85, yy: '중화', side: { life: 10 }, side10000: { life: 20, aging: 10 }, src: '깊은 산(아이 모습으로 달아남)' },
  { id: 'heshouwu', ages: [[100, '백년하수오', '하품', 5], [1000, '천년하수오', '중품', 20], [10000, '만년하수오', '상품', 40]], pur: 70, yy: '중화', side: { look: '흰머리가 검어짐' }, src: '산' },
  { id: 'xuelian', ages: [[100, '백년설련', '중품', 10], [1000, '천년설련', '상품', 30]], pur: 85, yy: '음', side: { cure: '중품 독' }, src: '천산·곤륜' },
  { id: 'zhuguo', ages: [[300, '주과', '상품', 30]], pur: 80, yy: '양', wx: '화', src: '독충이 지키는 절벽(삼백 년에 한 번)' },
  { id: 'lingzhi', ages: [[100, '백년영지', '하품', 5], [1000, '천년영지', '중품', 20]], pur: 75, wx: '목', side: { heal: '회복 +15' }, src: '동굴' },
  { id: 'kongqing', ages: [[0, '공청석유', '극품', 120]], pur: 100, yy: '중화', refine: 1.5, side: { cure: '주화입마·단전 파괴', opening: '임독양맥 타통 판정(정신력 DC 60)' }, src: '사람 손이 닿지 않은 동굴(한 방울)' },
  { id: 'bingjing', ages: [[0, '빙정', '상품', 30]], pur: 90, yy: '음', wx: '수', side: { clearClash: '양 무공 상극' }, src: '북해·설산 얼음 속' },
  { id: 'huojing', ages: [[0, '화정', '상품', 30]], pur: 90, yy: '양', wx: '화', side: { clearClash: '음 무공 상극' }, src: '화산 분화구' },
];

// ---------- 영물과 내단. ages = [연수, 이름, 무위, 내단 약기]. 무위는 p1 개정 3 척도(절정 보통 433, 초절정 3,726, 화경 34,421, 현경 335,340) ----------
// 극품(약기 60년 이상 또는 정순 95% 이상)은 big 부효과(p3 8-3): 먹은 해 돌파 +10, 단전 확장
G.BEASTS = [
  { id: 'huoli', ages: [[1000, '천년화리', 28000, 30], [10000, '만년화리', 190000, 90]], pur: 90, yy: '양', wx: '화', side: { cure: '구음절맥' }, side10000: { capa: 30, ng: { 화: 1.2 } }, src: '화산 근처 온천·호수' },
  { id: 'bingcan', ages: [[1000, '천년빙잠', 9500, 20]], pur: 90, yy: '음', wx: '수', side: { item: '천잠사' }, src: '북해·설산' },
  { id: 'xuemang', ages: [[500, '오백년 혈망', 18000, 20], [1000, '천년 묵린혈망', 70000, 40]], pur: 80, sp: '독', side: { gall: '백독불침' }, src: '남만 밀림·늪' },
  { id: 'shuangtou', ages: [[300, '쌍두사', 6000, 10]], pur: 75, sp: '독', src: '남만' },
  { id: 'jingui', ages: [[1000, '천년금구', 13000, 40]], pur: 90, wx: '수', side: { life: 10, item: '거북 방패' }, src: '강·호수' },
  { id: 'renmian', ages: [[500, '인면지주', 13000, 20]], pur: 70, sp: '독', src: '동굴' },
  { id: 'jinchan', ages: [[500, '금섬', 6000, 15], [1000, '천년금섬', 28000, 30]], pur: 80, sp: '독', side: { cure: '만독' }, src: '독곡' },
  { id: 'baihu', ages: [[300, '백호', 18000, 10], [1000, '은호', 100000, 30]], pur: 85, wx: '금', side: { item: '가죽·뼈' }, src: '깊은 산' },
  { id: 'jiao', ages: [[1000, '이무기', 190000, 60], [3000, '교룡', 750000, 120]], pur: 95, yy: '음', wx: '수', side1000: { capa: 20 }, side3000: { capa: 30, ng: { 수: 1.2 } }, src: '깊은 소·장강' },
  { id: 'huli', ages: [[500, '오백년 영호', 9500, 20], [1000, '구미호', 150000, 50]], pur: 80, yy: '음', side: { event: '사람으로 둔갑' }, src: '산·폐허' },
  { id: 'wugong', ages: [[500, '혈오공', 9500, 20], [1000, '천년오공', 50000, 40]], pur: 70, sp: '독', src: '동굴' },
  { id: 'baiyuan', ages: [[300, '백원', 9500, 10], [1000, '통비원', 70000, 30]], pur: 85, yy: '중화', side: { event: '무공을 흉내 냄' }, src: '깊은 산' },
  { id: 'xianhe', ages: [[1000, '선학', 3000, 30]], pur: 95, yy: '중화', side: { check: { 등선: 5 } }, src: '도가 명산' },
];

// ---------- 독 (무기로 쓰는 것). grade: 하·중·상·극 → 상태 0.9/0.75/0.6/0.5, 해독 DC 50/65/80/100(d100) ----------
G.POISONS = [
  { id: 'sangong', n: '산공독', grade: '중', effect: '내공 봉인(이번 싸움과 그해)', src: '흑점·사파' },
  { id: 'mihun', n: '미혼약', grade: '하', effect: '정신을 흐림(정신력 판정)', src: '하오문·흑점' },
  { id: 'huagu', n: '화골산', grade: '상', effect: '뼈까지 녹임(강골 상한 −40)', src: '흑점·당가' },
  { id: 'heding', n: '학정홍', grade: '상', effect: '한 방울로 죽음(생존 판정 DC 80)', src: '궁중·흑점' },
  { id: 'wuxing', n: '무형지독', grade: '극', effect: '보이지 않는 독. 간파 −25', src: '사천당가 비전' },
  { id: 'jincan', n: '금잠고', grade: '극', effect: '고독. 시전자 뜻대로 발작', src: '오독문·남만' },
];

// ---------- 기보 ----------
G.TREASURES = [
  { id: 'tiancansi', n: '천잠보의', q: '상품', effect: '도검불침 옷. 부상 판정 +15' },
  { id: 'cijia', n: '가시 속갑', q: '중품', effect: '맨손 공격자 반격' },
  { id: 'lengyu', n: '냉옥 좌대', q: '상품', effect: '위에서 운기하면 축기 ×2, 연화량 ×1.5' },
  { id: 'yemingzhu', n: '야명주', q: '중품', effect: '어둠 속 빛. 재산 +2' },
  { id: 'renpi', n: '인피면구', q: '중품', effect: '정체 숨기기 +20' },
  { id: 'bidu', n: '피독주', q: '상품', effect: '물고 있으면 독 판정 +50' },
  { id: 'xuantie', n: '현철', q: '상품', effect: '보검 재료' },
  { id: 'wanniantie', n: '만년한철', q: '극품', effect: '신병이기 재료' },
  { id: 'motie', n: '묵철', q: '중품', effect: '명병 재료' },
  { id: 'yuntie', n: '운철', q: '상품', effect: '하늘에서 떨어진 쇠. 보검 재료' },
  { id: 'zhentianlei', n: '진천뢰', q: '중품', effect: '터지는 화약 구슬. 한 번 쓰는 무기(외물 ×1.3)' },
  { id: 'huoshezi', n: '화섭자', q: '하품', effect: '불씨. 동굴 사건 필수' },
];
})(typeof window !== 'undefined' ? window : globalThis);
