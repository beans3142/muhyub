// 강호 천만 분의 일 — 세계 데이터
// 구분: 정사(실제 역사) / 전설 / 무림사(창작). 창작 세력의 연도는 이 게임의 설정이다.
(function (G) {
const W = {};

// ---------- 시대 (출생 주사위 구간 비율, 합 10,000,000) ----------
W.ERAS = [
  { id: 'chunqiu', name: '춘추전국', from: -500, to: -222, w: 300000 },
  { id: 'qin',     name: '진',       from: -221, to: -207, w: 100000 },
  { id: 'han',     name: '한',       from: -206, to: 219,  w: 600000 },
  { id: 'nanbei',  name: '위진남북조', from: 220, to: 588, w: 800000 },
  { id: 'suitang', name: '수당',     from: 589,  to: 906,  w: 1200000 },
  { id: 'beisong', name: '오대·북송', from: 907, to: 1126, w: 1300000 },
  { id: 'nansong', name: '남송',     from: 1127, to: 1278, w: 1200000 },
  { id: 'yuan',    name: '원',       from: 1279, to: 1367, w: 800000 },
  { id: 'ming',    name: '명',       from: 1368, to: 1643, w: 2200000 },
  { id: 'qing',    name: '청',       from: 1644, to: 1840, w: 1500000 },
];

// ---------- 지명 (지도 좌표: viewBox 0 0 640 520) ----------
W.PLACES = {
  tianshan: { n: '천산', x: 80, y: 130 },   kunlun: { n: '곤륜산', x: 165, y: 250 },
  kongtong: { n: '공동산', x: 268, y: 205 }, changan: { n: '장안', x: 330, y: 238 },
  huashan: { n: '화산', x: 352, y: 230 },    zhongnan: { n: '종남산', x: 322, y: 255 },
  songshan: { n: '숭산', x: 392, y: 238 },   luoyang: { n: '낙양', x: 375, y: 228 },
  kaifeng: { n: '개봉', x: 418, y: 232 },    hebei: { n: '하북', x: 428, y: 168 },
  beijing: { n: '북경', x: 452, y: 140 },    taishan: { n: '태산', x: 470, y: 205 },
  taihang: { n: '태행산', x: 398, y: 192 },  wudang: { n: '무당산', x: 362, y: 288 },
  chengdu: { n: '성도', x: 262, y: 312 },    emei: { n: '아미산', x: 250, y: 338 },
  qingcheng: { n: '청성산', x: 244, y: 300 }, diancang: { n: '점창산', x: 215, y: 410 },
  dongting: { n: '동정호', x: 385, y: 345 }, changjiang: { n: '장강', x: 432, y: 318 },
  anhui: { n: '안휘', x: 455, y: 280 },      suzhou: { n: '소주', x: 515, y: 298 },
  hangzhou: { n: '항주', x: 505, y: 322 },   fujian: { n: '복건', x: 482, y: 400 },
  guangdong: { n: '광동', x: 420, y: 440 },  liaodong: { n: '요동', x: 540, y: 105 },
  donghai: { n: '동해', x: 590, y: 300 },    nanman: { n: '남만', x: 285, y: 470 },
  lishan: { n: '여산', x: 340, y: 242 },     yue: { n: '월나라 땅', x: 500, y: 340 },
};
W.OUTLINE = '40,125 120,72 220,92 330,62 430,42 545,32 612,82 560,132 505,152 525,192 492,232 545,282 535,342 492,412 432,462 352,472 282,502 202,462 152,402 122,322 62,282 30,202';

// ---------- 직책 사다리 ----------
W.LADDERS = {
  sect:   ['외문제자', '내문제자', '진전제자', '당주', '장로', '장문인'],
  clan:   ['방계', '직계', '가주 후보', '원로', '가주'],
  league: ['맹원', '조장', '대주', '단주', '군사', '부맹주', '맹주'],
  demon:  ['교도', '향주', '당주', '호법', '장로', '부교주', '교주'],
  bandit: ['졸개', '조장', '두목', '부채주', '채주'],
  assassin: ['견습 살수', '살수', '청부 조장', '살주', '문주'],
  shadow: ['말단', '행동대', '간부', '장로', '수뇌'],
  guard:  ['소기', '총기', '백호', '천호', '지휘사'],
  info:   ['심부름꾼', '정보원', '분타주', '총관', '문주'],
};

// ---------- 세력 ----------
// art: 대표 무공(data/arts.js의 고정 이름). 세력의 전체 무공은 ARTS에서 f === id로 찾는다
// t: 성향(정/사/마/관/암), lad: 직책 사다리, from/to: [최소,최대] 연도(생마다 굴림) 또는 고정, fall: 생마다 멸문 확률(%)
W.FACTIONS = [
  { id: 'shaolin', n: '소림사', t: '정', lad: 'sect', at: 'songshan', from: [495, 495], fall: 3, theme: 'shaolin', art: ['나한권', '백보신권', '금강불괴신공', '역근경', '세수경', '대력금강지', '여래신장', '천수여래장', '용조수', '연대구품', '일위도강', '금강부동신법', '나한도법', '달마검법', '무상각', '아라한신권', '반야장', '사자후', '십팔나한진', '백팔나한진', '금종조', '철포삼', '소림 기초 토납법', '나한봉법', '소림 칠십이종 절예'] },
  { id: 'gaibang', n: '개방', t: '정', lad: 'sect', at: 'luoyang', from: [880, 1000], fall: 6, theme: 'gaibang', art: ['타구봉법', '취팔선보', '타구진', '취권', '연환장', '개방 기초 토납법'] },
  { id: 'qingcheng', n: '청성파', t: '정', lad: 'sect', at: 'qingcheng', from: [900, 1100], fall: 15, theme: 'qingcheng', art: ['청풍검법', '송풍검법', '청운적하검', '청성심법', '니추공', '천풍장'] },
  { id: 'zhongnan', n: '종남파', t: '정', lad: 'sect', at: 'zhongnan', from: [900, 1100], fall: 15, theme: 'zhongnan', art: ['천하삼십육검', '태을신공', '종남심법', '종남검법'] },
  { id: 'huashan', n: '화산파', t: '정', lad: 'sect', at: 'huashan', from: [950, 1100], fall: 20, theme: 'huashan', art: ['매화검법', '이십사수매화검법', '자하신공', '암향표', '매화지', '육합검법', '매화기공', '매화장'] },
  { id: 'kunlun', n: '곤륜파', t: '정', lad: 'sect', at: 'kunlun', from: [1000, 1300], fall: 12, theme: 'kunlun', art: ['운룡대팔식', '곤륜검법', '운학장', '한매검진', '곤륜 기초 심법'] },
  { id: 'kongtong', n: '공동파', t: '정', lad: 'sect', at: 'kongtong', from: [1000, 1200], fall: 15, theme: 'kongtong', art: ['칠상권', '복마검법', '혼원일기공', '칠살검', '공동검법'] },
  { id: 'emei', n: '아미파', t: '정', lad: 'sect', at: 'emei', from: [1100, 1300], fall: 10, theme: 'emei', art: ['아미검법', '복호권', '표설천운장', '불광보조', '난화불혈수', '금정신공', '아미창법', '아미 기초 심법'] },
  { id: 'diancang', n: '점창파', t: '정', lad: 'sect', at: 'diancang', from: [1100, 1300], fall: 18, theme: 'diancang', art: ['사일검법', '분광검법', '회풍무류검법', '낙일도법', '섬광분운검', '점창쾌검'] },
  { id: 'wudang', n: '무당파', t: '정', lad: 'sect', at: 'wudang', from: [1320, 1350], fall: 4, theme: 'wudang', art: ['태극권', '태극검', '태극혜검', '양의검법', '양의심공', '면장', '십단금', '제운종', '현허도법', '태청검법', '태극신공', '무당칠검진', '무당 기초 토납법'] },
  { id: 'namgung', n: '남궁세가', t: '정', lad: 'clan', at: 'anhui', from: [1000, 1200], fall: 12, theme: 'clan', sur: '남궁', art: ['창궁무애검법', '제왕검형', '섬전십삼뢰', '대연검법', '창궁신공'] },
  { id: 'murong', n: '모용세가', t: '정', lad: 'clan', at: 'liaodong', from: [1000, 1200], fall: 15, theme: 'clan', sur: '모용', art: ['모용검법', '모용세가 연환검', '마상창법'] },
  { id: 'zhuge', n: '제갈세가', t: '정', lad: 'clan', at: 'wudang', from: [1100, 1300], fall: 10, theme: 'clan', sur: '제갈', art: ['팔괘진법', '기관진식', '판관필법', '칠현무형검', '제갈신산'] },
  { id: 'peng', n: '하북팽가', t: '정', lad: 'clan', at: 'hebei', from: [1100, 1300], fall: 12, theme: 'clan', sur: '팽', art: ['오호단문도', '혼원벽력도', '혼원벽력신공', '팽가 기초 도법'] },
  { id: 'tang', n: '사천당가', t: '사', lad: 'clan', at: 'chengdu', from: [1000, 1200], fall: 8, theme: 'tang', sur: '당', art: ['만천화우', '무형지독', '당가 암기술', '폭우이화침', '당문 독공', '당가 해독술'] },
  { id: 'league', n: '무림맹', t: '정', lad: 'league', at: 'kaifeng', from: [1150, 1250], fall: 10, theme: 'league', art: ['무림맹 합격진'] },
  { id: 'mingjiao', n: '명교', t: '마', lad: 'demon', at: 'tianshan', from: [700, 700], to: [1368, 1368], fall: 0, theme: 'demon', art: ['성화신공', '광명좌사장'] },
  { id: 'demon', n: '천마신교', t: '마', lad: 'demon', at: 'tianshan', from: [1250, 1400], fall: 8, theme: 'demon', art: ['천마신공', '천마군림보', '흡성대법', '화공대법', '역혈기공', '소수마공', '혈수마공', '천마검법', '혈마수', '섭혼술'] },
  { id: 'sado', n: '사도련', t: '사', lad: 'bandit', at: 'changjiang', from: [1200, 1500], fall: 20, theme: 'bandit', art: ['혈수장', '사혼도법'] },
  { id: 'nokrim', n: '녹림', t: '사', lad: 'bandit', at: 'taihang', from: [-400, -400], fall: 0, theme: 'nokrim', art: ['개산부법', '녹림 십팔채 부법', '산적 도법'] },
  { id: 'river', n: '장강수로채', t: '사', lad: 'bandit', at: 'changjiang', from: [900, 1000], fall: 10, theme: 'nokrim', art: ['수상비', '분수도법', '분수자법'] },
  { id: 'haomun', n: '하오문', t: '사', lad: 'info', at: 'kaifeng', from: [1000, 1100], fall: 5, theme: 'haomun', art: ['하오잡술', '귀식대법', '축골공', '역용술', '미혼향', '야행술', '소매치기 수법'] },
  { id: 'salmun', n: '무영살문', t: '암', lad: 'assassin', at: 'dongting', from: [800, 1000], fall: 10, theme: 'salmun', art: ['무영보', '일살필살검', '은잠술', '살수 비도술'] },
  { id: 'blood', n: '혈교', t: '암', lad: 'shadow', at: 'nanman', from: [1100, 1300], fall: 30, theme: 'blood', art: ['혈영대법', '혈해마공'] },
  { id: 'jiutian', n: '구천회', t: '암', lad: 'shadow', at: 'beijing', from: [1400, 1600], fall: 25, theme: 'blood', art: ['구천현기공'] },
  { id: 'jinyiwei', n: '금의위', t: '관', lad: 'guard', at: 'beijing', from: [1382, 1382], to: [1644, 1644], fall: 0, theme: 'guard', art: ['수춘도법', '관부 금나수'] },
  { id: 'dongchang', n: '동창', t: '관', lad: 'guard', at: 'beijing', from: [1420, 1420], to: [1644, 1644], fall: 0, theme: 'guard', art: ['동창 침술'] },
  { id: 'tiandihui', n: '천지회', t: '정', lad: 'shadow', at: 'fujian', from: [1680, 1720], fall: 10, theme: 'league', art: ['홍권'] },
  { id: 'jianke', n: '검객 문하', t: '정', lad: 'sect', at: 'yue', from: [-500, -500], to: [494, 494], fall: 0, theme: 'default', art: ['월녀검법', '자객의 단검술'] },
];

// ---------- 연표 ----------
// y: 연도 또는 [최소,최대](가변), p: 가변 사건 발생 확률(%), k: 정사/전설/무림사
W.HISTORY = [
  { id: 'ouyezi', y: [-500, -470], k: '전설', at: 'yue', t: '구야자가 월나라에서 명검을 벼린다는 소문이 돈다.', ev: 'ouyezi', span: 25 },
  { id: 'jingke', y: -227, k: '정사', at: 'changan', t: '형가가 진왕을 찌르려다 실패했다.' },
  { id: 'qin', y: -221, k: '정사', at: 'changan', t: '진이 천하를 통일했다. 진왕은 스스로 시황제라 칭했다.' },
  { id: 'xufu', y: -219, k: '정사', at: 'donghai', t: '서복이 불로초를 찾아 동쪽 바다로 떠날 사람을 모은다.', ev: 'xufu' },
  { id: 'burn', y: -213, k: '정사', at: 'changan', t: '분서갱유. 의서와 농서를 뺀 책이 불탔다.', ev: 'burn' },
  { id: 'lishan', y: -212, k: '정사', at: 'lishan', t: '여산에 시황제의 능을 쌓는 노역이 한창이다.', ev: 'lishan', span: 10 },
  { id: 'qinfall', y: -207, k: '정사', at: 'changan', t: '진이 무너졌다.' },
  { id: 'yellow', y: 184, k: '정사', at: 'luoyang', t: '황건적이 일어났다.', war: 8 },
  { id: 'shaolin', y: 495, k: '정사', at: 'songshan', t: '북위 효문제가 숭산에 소림사를 세웠다.' },
  { id: 'damo', y: 527, k: '전설', at: 'songshan', t: '서역 승려 달마가 소림 뒷산 동굴에서 면벽에 들었다고 전해진다.', ev: 'damo', span: 9 },
  { id: 'monks13', y: 621, k: '정사', at: 'luoyang', t: '소림 승려들이 진왕 이세민을 도왔다.' },
  { id: 'anshi', y: 755, k: '정사', at: 'changan', t: '안사의 난이 일어났다.', war: 8 },
  { id: 'huangchao', y: 875, k: '정사', at: 'changan', t: '황소의 난이 일어났다.', war: 9 },
  { id: 'fangla', y: 1120, k: '정사', at: 'hangzhou', t: '방랍이 강남에서 난을 일으켰다. 명교도가 많다는 말이 돈다.', war: 2 },
  { id: 'jingkang', y: 1127, k: '정사', at: 'kaifeng', t: '정강의 변. 금나라가 개봉을 함락하고 두 황제를 끌고 갔다.', war: 3 },
  { id: 'yuefei', y: [1130, 1140], k: '정사', at: 'kaifeng', t: '악비의 군대가 북벌에 나섰다. 의병을 모은다.', ev: 'yuefei' },
  { id: 'yuefeid', y: 1142, k: '정사', at: 'hangzhou', t: '악비가 누명을 쓰고 죽었다.' },
  { id: 'mongol', y: 1235, k: '정사', at: 'chengdu', t: '몽골군이 남송을 치기 시작했다.', war: 40 },
  { id: 'xiangyang', y: [1268, 1273], k: '정사', at: 'wudang', t: '양양성 공방전. 강호인들이 성을 지키러 모인다.', ev: 'xiangyang' },
  { id: 'zhangsf', y: [1310, 1340], k: '전설', at: 'wudang', t: '장삼봉이라는 도인이 무당산에서 태극의 이치를 깨쳤다고 한다.', ev: 'zhangsf', span: 30 },
  { id: 'redturban', y: 1351, k: '정사', at: 'anhui', t: '홍건적이 일어났다. 명교의 이름이 다시 들린다.', war: 17 },
  { id: 'mingfound', y: 1368, k: '정사', at: 'kaifeng', t: '주원장이 명을 세웠다.' },
  { id: 'jinyiwei', y: 1382, k: '정사', at: 'beijing', t: '금의위가 설치되었다.' },
  { id: 'zhenghe', y: 1405, k: '정사', at: 'fujian', t: '정화의 함대가 서양으로 떠난다. 선원과 호위를 모은다.', ev: 'zhenghe', span: 28 },
  { id: 'dongchang', y: 1420, k: '정사', at: 'beijing', t: '동창이 설치되었다.' },
  { id: 'wokou', y: [1550, 1560], k: '정사', at: 'hangzhou', t: '왜구가 동남 해안을 휩쓸고 있다.', war: 10 },
  { id: 'lizicheng', y: 1644, k: '정사', at: 'beijing', t: '이자성이 북경을 함락했다. 명이 무너지고 청이 들어왔다.', war: 2 },
  { id: 'opium', y: 1840, k: '정사', at: 'guangdong', t: '영국 함대의 대포가 광동을 때렸다. 화기 앞에서 무공이 빛을 잃는다.' },
  // 무림사 (가변)
  { id: 'war1', y: [1260, 1500], p: 70, k: '무림사', t: '정파와 마교가 맞붙었다. 정마대전이다.', war: 4, ev: 'zhengmo', need: 'demon' },
  { id: 'war2', y: [1550, 1800], p: 45, k: '무림사', t: '천마가 재림했다. 2차 정마대전이 시작되었다.', war: 5, ev: 'zhengmo', need: 'demon' },
  { id: 'bloodrise', y: [1150, 1600], p: 40, k: '무림사', t: '각 문파의 고수들이 하나둘 실종된다. 혈교가 움직인다는 말이 있다.', war: 3, ev: 'bloodcult', need: 'blood' },
  { id: 'saja', y: [1250, 1700], p: 50, k: '무림사', t: '사도련과 무림맹 사이에 전쟁이 붙었다.', war: 3, need: 'sado' },
  { id: 'treasure', y: [900, 1800], p: 60, k: '무림사', t: '전설의 비급이 세상에 나왔다는 소문에 강호가 들끓는다.', ev: 'treasure' },
  { id: 'sword', y: [600, 1800], p: 50, k: '무림사', t: '신병이기가 출세했다. 누가 차지할지 강호의 눈이 쏠린다.', ev: 'swordout' },
];

// ---------- 출신 ----------
W.ORIGINS = [
  { id: 'farmer', n: '빈농의 집', w: 300, wealth: 0, align: 0, career: 'farm' },
  { id: 'fisher', n: '어부의 집', w: 70, wealth: 0, align: 0, career: 'farm' },
  { id: 'hunter', n: '산골 사냥꾼의 집', w: 50, wealth: 0, align: 0, career: 'farm', body: 1 },
  { id: 'merchant', n: '장터 상인의 집', w: 90, wealth: 2, align: 0, career: 'merchant' },
  { id: 'inn', n: '객잔 주인의 집', w: 50, wealth: 2, align: 0, career: 'cook' },
  { id: 'smith', n: '대장간', w: 40, wealth: 1, align: 0, career: 'smith' },
  { id: 'doctor', n: '시골 의원의 집', w: 25, wealth: 2, align: 5, career: 'doctor' },
  { id: 'scholar', n: '몰락한 선비의 집', w: 25, wealth: 1, align: 5, career: 'scholar' },
  { id: 'official', n: '관부 아전의 집', w: 30, wealth: 3, align: 0, career: 'scholar' },
  { id: 'escort', n: '표국', w: 30, wealth: 2, align: 5, martial: 1 },
  { id: 'dojo', n: '동네 무관', w: 25, wealth: 1, align: 5, martial: 1 },
  { id: 'gisaeng', n: '기루', w: 15, wealth: 1, align: 0, career: 'artist', charm: 1 },
  { id: 'troupe', n: '떠돌이 광대패', w: 10, wealth: 0, align: 0, career: 'artist' },
  { id: 'orphan', n: '산문 앞에 버려진 아이', w: 15, wealth: 0, align: 10, join: ['shaolin', 'wudang', 'emei'] },
  { id: 'lay', n: '문파 속가 제자의 집', w: 20, wealth: 2, align: 10, join: 'righteous' },
  { id: 'clanside', n: '세가 방계', w: 12, wealth: 3, align: 10, join: 'clan', rank: 0 },
  { id: 'clanmain', n: '세가 직계', w: 3, wealth: 4, align: 10, join: 'clan', rank: 1 },
  { id: 'bandit', n: '녹림 산채', w: 15, wealth: 1, align: -25, join: ['nokrim'] },
  { id: 'gang', n: '흑도 방회', w: 15, wealth: 2, align: -25, join: ['haomun', 'river', 'sado'] },
  { id: 'assassin', n: '살문이 데려간 고아', w: 4, wealth: 0, align: -30, join: ['salmun'] },
  { id: 'demon', n: '마교도의 집', w: 5, wealth: 2, align: -40, join: ['demon', 'mingjiao'] },
  { id: 'demonlord', n: '마교 교주의 혈통', w: 0.1, wealth: 5, align: -50, join: ['demon'], rank: 4 },
  { id: 'royal', n: '황족의 서출', w: 0.5, wealth: 5, align: 0, career: 'scholar' },
];

// ---------- 생업 ----------
W.CAREERS = {
  farm:     { n: '농사', st: '근골', lad: ['소작농', '자작농', '부농', '지주'] },
  merchant: { n: '장사', st: '오성', st2: '풍모', lad: ['행상', '점포 주인', '객상', '상단주', '거상', '천하제일상'] },
  cook:     { n: '요리', st: '오성', st2: '근골', lad: ['점소이', '주방 보조', '숙수', '주루 총숙수', '명숙수', '천하제일숙수'] },
  doctor:   { n: '의술', st: '오성', st2: '심성', lad: ['약초꾼', '약방 조수', '의원', '명의', '신의', '의성'] },
  smith:    { n: '대장일', st: '근골', st2: '오성', lad: ['풀무꾼', '대장장이', '병기 장인', '명장', '신장', '천하제일 장인'] },
  scholar:  { n: '학문', st: '오성', st2: '심성', lad: ['서생', '동생', '수재', '거인', '진사', '재상'] },
  artist:   { n: '기예', st: '풍모', st2: '오성', lad: ['광대', '악사', '명기', '명창', '천하제일 명인'] },
};

// ---------- 특성 (p: 출생 시 확률, 천만 분율) ----------
// 효과 키: ext/neigong/enl/combat/stat:<자질>/life/... 엔진에서 해석
W.TRAITS = [
  { id: 'tianwu', n: '천무지체', p: 50000, good: 1, d: '무공 판정 +3, 깨달음 판정 +2' },
  { id: 'sword', n: '신검합일의 재능', p: 30000, good: 1, d: '검을 쥐면 외공 상한 +1, 비무 +2' },
  { id: 'poison', n: '만독불침지체', p: 30000, good: 1, d: '독에 당하지 않는다' },
  { id: 'jade', n: '금강불괴지체', p: 15000, good: 1, d: '내상·중상 판정 +4' },
  { id: 'sage', n: '선골', p: 10000, good: 1, d: '등선 판정 +5, 깨달음 +1' },
  { id: 'genius', n: '일목십행', p: 80000, good: 1, d: '오성 +2, 비급 해독 +3' },
  { id: 'bone', n: '무골', p: 300000, good: 1, d: '근골 +2' },
  { id: 'beauty', n: '경국지색', p: 40000, good: 1, d: '풍모 +3, 인연이 몰려든다' },
  { id: 'luck', n: '천운', p: 40000, good: 1, d: '사망 판정 한 번을 넘긴다' },
  { id: 'late', n: '대기만성', p: 100000, good: 1, d: '40세 이후 모든 판정 +2' },
  { id: 'tongue', n: '세 치 혀', p: 120000, good: 1, d: '설득·흥정 +3' },
  { id: 'palate', n: '절대미각', p: 60000, good: 1, d: '요리 +4, 독 감별' },
  { id: 'hands', n: '신의 손', p: 40000, good: 1, d: '대장일·의술 +3' },
  { id: 'ninyin', n: '구음절맥', p: 30000, good: 0, female: 1, d: '스무 살 무렵 죽을 고비. 넘기면 내공 증가 2배' },
  { id: 'killer', n: '천살성', p: 30000, good: 0, d: '전투 +2, 성향이 해마다 사 쪽으로, 곁의 사람이 잘 죽는다' },
  { id: 'peach', n: '도화살', p: 100000, good: 0, d: '인연이 잦고 원한도 잦다' },
  { id: 'wander', n: '역마살', p: 120000, good: 0, d: '한곳에 오래 머물지 못한다. 기연 +2' },
  { id: 'blocked', n: '절맥', p: 200000, good: 0, d: '내공 증가 절반' },
  { id: 'sickly', n: '병약', p: 400000, good: 0, d: '근골 판정 −2' },
  { id: 'dull', n: '둔재', p: 300000, good: 0, d: '오성 −2' },
  { id: 'unlucky', n: '박복', p: 200000, good: 0, d: '기연 −2, 재물이 붙지 않는다' },
  { id: 'coward', n: '겁', p: 200000, good: 0, d: '싸움 판정 −2, 달아나기 +3' },
  { id: 'temper', n: '불같은 성정', p: 200000, good: 0, d: '참기 판정 −3, 싸움 +1' },
  { id: 'mad', n: '광기', p: 20000, good: 0, d: '주화입마 위험 2배, 깨달음 +1' },
  { id: 'orphanfate', n: '고독지상', p: 60000, good: 0, d: '가족과 연이 짧다' },
];

// ---------- 배경 테마 ----------
W.THEMES = {
  default: '한지', huashan: '매화', shaolin: '숭산 금빛', wudang: '태극 운무', emei: '아미 설경', kunlun: '곤륜 설원',
  qingcheng: '청성 대숲', zhongnan: '종남 소나무', kongtong: '공동 황토', diancang: '점창 구름', gaibang: '거적과 대나무',
  clan: '세가 비단', tang: '당가 독무', league: '무림맹 깃발', demon: '천마 혈천', bandit: '흑도의 밤', nokrim: '녹림 산채',
  haomun: '하오문 골목', salmun: '살문 칠흑', blood: '혈교 핏빛', guard: '관부 붉은 비단',
  merchant: '금전', cook: '화덕', doctor: '약초', smith: '풀무 불꽃', scholar: '먹과 벼루', artist: '연회 등불',
  hwa: '화경의 금빛', saeng: '생사경의 백광', ascend: '등선 구름',
};

// ---------- 이름 ----------
W.SURNAMES = ['이', '왕', '장', '유', '진', '양', '조', '황', '주', '오', '서', '손', '마', '호', '곽', '하', '고', '임', '정', '백', '위', '사마', '구양', '상관', '독고', '화', '설', '목', '단', '연'];
W.GIVEN_M = ['무진', '청운', '일비', '태호', '소룡', '백천', '진악', '운학', '경천', '자강', '평', '철', '대웅', '문수', '현', '도원', '천기', '불평', '삼', '구', '노을', '석', '휘', '자명', '한', '비연', '천우', '개'];
W.GIVEN_F = ['소소', '월향', '설화', '연', '청아', '옥란', '미령', '수련', '향', '초운', '영영', '은비', '서린', '홍매', '아령', '소청', '난', '단심', '혜', '유월'];
W.STATS = ['근골', '오성', '기연', '심성', '풍모'];
W.STAT_DESC = { 근골: '몸·외공·수명', 오성: '깨달음·학문·장사', 기연: '행운·기연', 심성: '의지·주화입마 저항', 풍모: '인연·처세·기예' };
W.REALMS = ['범인', '삼류', '이류', '일류', '절정', '초절정', '화경', '현경', '생사경'];
// 경지 조건 [외공, 내공(년), 깨달음]
W.REALM_REQ = [[0, 0, 0], [1, 0, 0], [2, 10, 0], [3, 20, 0], [4, 40, 1], [5, 60, 2], [5, 90, 3], [5, 120, 4], [5, 180, 5]];
W.ART_GRADE = ['없음', '삼류', '이류', '일류', '상승', '절세'];
W.WEAPONS = ['맨손', '범병', '명병', '보검', '신병이기'];
W.LEGEND_WEAPONS = ['담로검', '거궐검', '순균검', '어장검', '승사검', '태아검', '용연검', '간장검', '막야검', '청강검', '의천검', '현철중검', '묵룡도', '혈영도', '청명검'];

G.W = W;
})(typeof window !== 'undefined' ? window : globalThis);
