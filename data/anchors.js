// 닻(anchor) 데이터. 규칙: docs/p8-world.md 4장(분기 처리), docs/p8-lineage.md(계통·흐름 장치).
// 일반 개파는 data/factions.js의 from 범위로 처리한다. 여기 있는 것은 서사가 붙은 사건뿐이다.
//
// k  종류: 정사 | 메인 | 계통 | 혈겁 | 연합 | 흑막 | 유산 | 일통 | 통제
// src 구분: 정사 | 전설 | 창작
// y  고정 연도(정사) 또는 [최소, 최대] 시기 창. 'any'는 반복 닻(rep 필요)
// rep 반복 닻: {cd: 재발 대기 연수, p: 조건이 맞는 해마다 발생 확률(%), from: 이 해부터만}
// at 장소 id (data/places.js PLACES2)
// cond 조건 목록(모두 참이어야 함)
//   {has:'선택자'} 존재 / {no:'선택자'} 부재
//   {flag:'키', is:'값'} / {flag:'키', not:'값'}
//   {pow:['A','B'], gte:n} / {pow:[...], lte:n}  A 무력 ÷ B 무력
//   {rel:['A','B'], lte:n} / {rel:[...], gte:n}  관계(−100~100)
//   {share:'A', gte:n}  A의 영역이 전체 영역에서 차지하는 비율
//   {state:['A','상태']}  A의 상태가 그 값
// 선택자: 세력 id | 'top:정'·'top:사'·'top:마'·'top:암'·'top:관'·'top:중' (그 성향 중 무력 1위) | 'cat:새외' (그 범주 무력 1위) | 'all' | 'all:정' (그 성향 전부)
//   'vanguard:정' (직전 전쟁에서 그 성향 쪽 선봉을 맡은 세력: 전쟁 판정 때 무력 기여가 가장 큰 세력)
//   'new:마' (그 성향의 새 세력을 이름 생성기로 만든다. found에만 쓴다)
// promote 대상이 없으면(선택자가 아무 세력도 못 고르면) new:같은 성향으로 대신한다.
// alt 조건이 창 끝까지 안 맞으면 대신 일으킬 닻 id
// out 갈래(최대 3). 정사는 하나.
//   id, t(연표 문장), w(기본 가중치), by(가중치 보정: {pow:['A','B']} 이면 A 쪽 무력비로 보정, p8-world 4-2),
//   flags {키:값}, fx [효과], open [닻 id], close [닻 id]
// fx 효과
//   {f:선택자, pow:×, wealth:×, coh:+, fame:+, land:×, state:'정상'|'몰락'|'봉문'|'잠적'|'멸문'}
//   {found:'세력 id'} 등장 / {revive:'세력 id'} 잠적·멸문에서 부활 / {merge:['흡수당함','흡수함']} / {split:['원래','새']}
//   {promote:'선택자', as:'세력 id'} 그 세력이 다른 세력의 자리(근거지·이름)를 이어받음
//   {grow:{t:'성향', x:성장 배율, yrs:기간}} / {relic:'종류'} 신물·명검 출세 / {lost:'선택자'} 그 세력 비급 일부 실전
//   {rel:['A','B', 가산]}
// hero 주인공 개입: {as:'참전'|'의병'|'호위'|'노역'|'선단'|'수성'|'시험'..., n: 판정 수, max: 자기 편 갈래 최대 배율}
// route 세계 갈래 이름(엔딩 화면 "이 생의 세계")을 정하는 깃발이면 표시
(function (G) {
G.ANCHORS = [
  // ================= 1장 검의 시대 (BC 500~BC 222) =================
  { id: 'ouyezi', k: '유산', src: '전설', y: [-500, -470], at: 'hangzhou', t: '월나라의 장인 구야자가 명검을 벼린다는 소문이 돈다.',
    out: [{ id: 'forged', t: '구야자의 명검 다섯 자루가 세상에 나왔다.', w: 1, fx: [{ relic: '구야자의 검' }] }], hero: { as: '검 의뢰', n: 1, max: 1 } },
  { id: 'assassins', k: '계통', src: '정사', y: [-515, -397], at: 'changan', t: '전제·예양·섭정 같은 자객의 이름이 열국에 퍼진다.',
    out: [{ id: 'legend', t: '자객의 길이 하나의 전통이 되었다.', w: 1, flags: { 'root.assassin': '있음' } }] },
  { id: 'jingke', k: '정사', src: '정사', y: -227, at: 'changan', t: '형가가 진왕을 찌르려다 실패했다.', out: [{ id: 'x', w: 1 }] },

  // ================= 2장 제국과 유협 (BC 221~219) =================
  { id: 'qin_unify', k: '정사', src: '정사', y: -221, at: 'changan', t: '진이 천하를 통일했다. 진왕은 스스로 시황제라 칭했다.', out: [{ id: 'x', w: 1, fx: [{ f: 'jianke', coh: -10 }] }] },
  { id: 'xufu', k: '정사', src: '정사', y: -219, at: 'quanzhou', t: '서복이 불로초를 찾아 동쪽 바다로 떠날 사람을 모은다.', out: [{ id: 'x', w: 1 }], hero: { as: '선단', n: 2, max: 1 } },
  { id: 'burn_books', k: '정사', src: '정사', y: -213, at: 'changan', t: '분서갱유. 의서와 농서를 뺀 책이 불탔다.', out: [{ id: 'x', w: 1, fx: [{ lost: 'jianke' }] }] },
  { id: 'lishan_labor', k: '정사', src: '정사', y: [-212, -210], at: 'changan', t: '시황제의 능을 쌓는 노역에 사람을 끌어간다.', out: [{ id: 'x', w: 1 }], hero: { as: '노역', n: 2, max: 1 } },
  { id: 'qin_fall', k: '정사', src: '정사', y: -207, at: 'changan', t: '진이 무너졌다.', out: [{ id: 'x', w: 1 }] },
  { id: 'han_youxia', k: '계통', src: '정사', y: [-140, -90], at: 'luoyang', t: '조정이 이름난 유협들을 누르기 시작했다.',
    out: [{ id: 'x', t: '유협들이 흩어져 숨거나 관에 들어갔다.', w: 1, fx: [{ f: 'jianke', pow: 0.8 }] }] },
  { id: 'lulin', k: '계통', src: '정사', y: 17, at: 'xiangyang', t: '기근 속에 녹림산에서 봉기가 일어났다.', out: [{ id: 'x', t: '산적 무리를 녹림이라 부르게 되었다.', w: 1, fx: [{ found: 'nokrim' }] }] },
  { id: 'wudoumi', k: '계통', src: '정사', y: [140, 150], at: 'qingcheng', t: '장릉이 청성산에서 득도했다고 하며 오두미도를 연다.', out: [{ id: 'x', w: 1, flags: { 'root.dao': '오두미도' } }] },
  { id: 'yellow_turban', k: '정사', src: '정사', y: 184, at: 'luoyang', t: '황건적이 일어났다.', out: [{ id: 'x', w: 1, fx: [{ f: 'all', coh: -10 }] }] },

  // ================= 3장 산문의 시작 (220~588) =================
  { id: 'maoshan', k: '계통', src: '정사', y: [364, 400], at: 'maoshan', t: '모산에서 상청의 도맥이 열렸다.', out: [{ id: 'x', w: 1, fx: [{ found: 'maoshan' }] }] },
  { id: 'persecution_446', k: '정사', src: '정사', y: 446, at: 'changan', t: '북위 태무제가 불교를 탄압했다.', out: [{ id: 'x', w: 1 }] },
  { id: 'shaolin', k: '정사', src: '정사', y: 495, at: 'songshan', t: '북위 효문제가 숭산에 소림사를 세웠다. 서역 승려 발타가 개산했다.', out: [{ id: 'x', w: 1, fx: [{ found: 'shaolin' }] }] },
  { id: 'leiyin', k: '계통', src: '창작', y: [500, 520], at: 'tianzhu', t: '서역 승단이 대뢰음사를 세웠다.', out: [{ id: 'x', w: 1, fx: [{ found: 'leiyin' }] }] },
  { id: 'damo', k: '메인', src: '전설', y: [527, 536], at: 'songshan', t: '서역 승려 달마가 소림 뒷산 동굴에서 면벽에 들었다고 전해진다.',
    out: [
      { id: 'passed', t: '달마의 가르침이 소림에 전해졌다고 한다.', w: 85, fx: [{ f: 'shaolin', pow: 1.3, fame: 20 }], flags: { 'shaolin.damo': '전승' } },
      { id: 'vanished', t: '면벽하던 승려는 아무것도 남기지 않고 떠났다.', w: 15, flags: { 'shaolin.damo': '없음' } }],
    hero: { as: '시중', n: 2, max: 1.5 } },
  { id: 'persecution_574', k: '정사', src: '정사', y: 574, at: 'songshan', t: '북주 무제가 불교와 도교를 함께 탄압했다.', out: [{ id: 'x', w: 1, fx: [{ f: 'shaolin', pow: 0.6, coh: -15 }] }] },

  // ================= 4장 승병과 이교 (589~906) =================
  { id: 'monks13', k: '정사', src: '정사', y: 621, at: 'luoyang', t: '소림 승려들이 진왕 이세민을 도왔다.', out: [{ id: 'x', w: 1, fx: [{ f: 'shaolin', fame: 30, wealth: 1.5 }] }] },
  { id: 'persia', k: '계통', src: '정사', y: [600, 640], at: 'changan', t: '배화교 사원이 장안에 섰다.', out: [{ id: 'x', w: 1, fx: [{ found: 'persia' }] }] },
  { id: 'manichaean', k: '정사', src: '정사', y: 694, at: 'changan', t: '마니교가 측천무후의 조정에 전해졌다. 강호는 이들을 명교라 부른다.', out: [{ id: 'x', w: 1, fx: [{ found: 'mingjiao' }] }] },
  { id: 'xiaoleiyin', k: '계통', src: '창작', y: [690, 720], at: 'tianzhu', cond: [{ has: 'leiyin' }], t: '대뢰음사에서 계율을 두고 다툼이 벌어졌다.',
    out: [
      { id: 'split', t: '한 무리가 떨어져 나가 소뢰음사를 세웠다.', w: 70, fx: [{ split: ['leiyin', 'xiaoleiyin'] }] },
      { id: 'united', t: '다툼이 가라앉고 대뢰음사가 서역 불가를 하나로 묶었다.', w: 30, fx: [{ f: 'leiyin', pow: 1.3 }], flags: { 'leiyin.united': '예' } }] },
  { id: 'anshi', k: '정사', src: '정사', y: 755, at: 'changan', t: '안사의 난이 일어났다.', out: [{ id: 'x', w: 1, fx: [{ f: 'all', coh: -10 }, { grow: { t: '사', x: 1.3, yrs: 10 } }] }] },
  { id: 'salmun', k: '계통', src: '창작', y: [800, 860], at: 'dongting', t: '번진이 부리던 자객들이 동정호에 모였다.', cond: [{ flag: 'root.assassin', is: '있음' }],
    out: [{ id: 'x', t: '무영살문이 섰다.', w: 1, fx: [{ found: 'salmun' }] }] },
  { id: 'baijiao', k: '계통', src: '창작', y: [800, 900], at: 'xizang', t: '배화 사원의 사술사들이 서장으로 흘러갔다.',
    out: [{ id: 'x', t: '배교가 섰다.', w: 1, fx: [{ split: ['persia', 'baijiao'] }] }] },
  { id: 'huichang', k: '정사', src: '정사', y: 845, at: 'changan', t: '회창폐불. 불교와 함께 경교·배화교·마니교가 모두 탄압받았다.',
    out: [{ id: 'x', w: 1, fx: [{ f: 'shaolin', pow: 0.7 }, { f: 'mingjiao', state: '잠적' }, { f: 'persia', state: '잠적' }] }] },
  { id: 'huangchao', k: '정사', src: '정사', y: 875, at: 'changan', t: '황소의 난이 일어났다.', out: [{ id: 'x', w: 1, fx: [{ f: 'all', coh: -10 }] }] },
  { id: 'gaibang', k: '계통', src: '창작', y: [880, 900], at: 'luoyang', t: '난리 통에 떠돌던 거지들이 한 노인 아래 뭉쳤다.', out: [{ id: 'x', t: '개방이 섰다.', w: 1, fx: [{ found: 'gaibang' }] }] },

  // ================= 5장 문파의 태동 (907~1126) =================
  { id: 'song_found', k: '정사', src: '정사', y: 960, at: 'kaifeng', t: '송이 섰다.', out: [{ id: 'x', w: 1, fx: [{ found: 'jinjun' }, { found: 'liushan' }] }] },
  { id: 'qingcheng', k: '계통', src: '창작', y: [1000, 1020], at: 'qingcheng', cond: [{ flag: 'root.dao', is: '오두미도' }], t: '오두미도의 성지 청성산에서 검을 쓰는 도사들이 문파를 열었다.', out: [{ id: 'x', w: 1, fx: [{ found: 'qingcheng' }] }] },
  { id: 'jianke_to_sects', k: '계통', src: '창작', y: [990, 1060], at: 'huashan', t: '떠돌던 검객 문하들이 명산에 산문을 열기 시작했다.',
    out: [{ id: 'x', t: '화산과 종남에 검문이 섰다.', w: 1, fx: [{ found: 'huashan' }, { found: 'zhongnan' }, { f: 'jianke', state: '멸문' }] }] },
  { id: 'bingung', k: '계통', src: '창작', y: [1100, 1140], at: 'beihai', t: '북해 얼음 땅에 한빙 무공의 궁이 섰다.', out: [{ id: 'x', w: 1, fx: [{ found: 'bingung' }] }] },
  { id: 'fangla', k: '정사', src: '정사', y: 1120, at: 'hangzhou', t: '방랍이 강남에서 난을 일으켰다. 명교도가 많다는 말이 돈다.',
    out: [{ id: 'x', w: 1, fx: [{ revive: 'mingjiao' }, { f: 'mingjiao', pow: 1.3, fame: -20 }] }] },

  // ================= 6장 구파 정립 (1127~1278) =================
  { id: 'jingkang', k: '정사', src: '정사', y: 1127, at: 'kaifeng', t: '정강의 변. 금이 개봉을 함락하고 두 황제를 끌고 갔다.',
    out: [{ id: 'x', w: 1, fx: [{ f: 'all', coh: -10 }], open: ['heroes_meet'] }] },
  { id: 'heroes_meet', k: '연합', src: '창작', y: [1127, 1130], at: 'kaifeng', t: '나라를 구하겠다며 강호의 고수들이 영웅대회를 열었다.',
    out: [
      { id: 'disband', t: '금군 앞에 무너지고 고수들은 흩어졌다.', w: 70, fx: [{ f: 'all:정', pow: 0.9 }] },
      { id: 'permanent', t: '영웅대회가 흩어지지 않고 무림맹이라는 이름을 걸었다.', w: 30, fx: [{ found: 'league' }], flags: { 'league.early': '예' } }],
    hero: { as: '의병', n: 3, max: 1.5 } },
  { id: 'bailian', k: '계통', src: '정사', y: 1133, at: 'hefei', t: '승려 모자원이 백련교를 열었다.', out: [{ id: 'x', w: 1, fx: [{ found: 'bailian' }] }] },
  { id: 'yuefei', k: '정사', src: '정사', y: [1134, 1140], at: 'kaifeng', t: '악비의 군대가 북벌에 나섰다. 의병을 모은다.', out: [{ id: 'x', w: 1 }], hero: { as: '의병', n: 3, max: 1 } },
  { id: 'yuefei_death', k: '정사', src: '정사', y: 1142, at: 'hangzhou', t: '악비가 누명을 쓰고 죽었다.', out: [{ id: 'x', w: 1 }] },
  { id: 'quanzhen', k: '정사', src: '정사', y: 1167, at: 'zhongnan', t: '왕중양이 전진교를 열었다.', out: [{ id: 'x', w: 1, fx: [{ found: 'quanzhen' }] }] },
  { id: 'blood_rise', k: '계통', src: '창작', y: [1150, 1250], at: 'nanman', t: '남만 밀림에서 피를 바치는 교단이 생겼다는 소문이 있다.',
    out: [{ id: 'x', w: 1, fx: [{ found: 'blood' }, { f: 'blood', state: '잠적' }, { rel: ['blood', 'all', -100] }] }] },
  { id: 'mongol', k: '정사', src: '정사', y: 1235, at: 'chengdu', t: '몽골군이 사천을 치기 시작했다.',
    out: [{ id: 'x', w: 1, fx: [{ f: 'tang', pow: 0.8 }, { f: 'qingcheng', pow: 0.8 }, { f: 'emei', pow: 0.8 }], open: ['league_found'] }] },
  { id: 'league_found', k: '연합', src: '창작', y: [1235, 1240], at: 'kaifeng', cond: [{ no: 'league' }], t: '몽골에 맞서 구파와 세가가 손을 잡자는 말이 오간다.',
    out: [
      { id: 'formed', t: '무림맹이 섰다. 맹주는 회의로 추대한다.', w: 80, fx: [{ found: 'league' }] },
      { id: 'failed', t: '문파들이 서로 맹주 자리를 다투다 맹이 깨졌다.', w: 20, fx: [{ f: 'all:정', coh: -15 }], open: ['league_retry'] }],
    hero: { as: '사신', n: 2, max: 1.3 } },
  { id: 'league_retry', k: '연합', src: '창작', y: [1255, 1290], at: 'kaifeng', cond: [{ no: 'league' }], t: '다시 정파 연합을 세우자는 회합이 열렸다.',
    out: [{ id: 'formed', t: '늦게나마 무림맹이 섰다.', w: 1, fx: [{ found: 'league' }] }] },
  { id: 'potala', k: '계통', src: '창작', y: [1240, 1260], at: 'xizang', t: '원 조정의 비호를 받는 밀종 무승들이 포달랍궁을 열었다.', out: [{ id: 'x', w: 1, fx: [{ found: 'potala' }] }] },
  { id: 'blood_calamity1', k: '혈겁', src: '창작', y: [1250, 1275], at: 'chengdu', cond: [{ has: 'blood' }, { pow: ['blood', 'top:정'], gte: 0.2 }], t: '각 문파의 고수들이 하나둘 실종된다. 혈교가 움직였다.',
    out: [
      { id: 'stopped', t: '정파가 혈교를 막아 남만으로 몰아냈다.', w: 60, by: { pow: ['top:정', 'blood'] }, fx: [{ f: 'blood', state: '잠적', pow: 0.4 }, { f: 'top:정', fame: 30 }], flags: { 'blood.1': '막음' } },
      { id: 'ruled', t: '혈교가 강호를 피로 덮었다. 여러 문파가 멸문했다.', w: 25, by: { pow: ['blood', 'top:정'] }, fx: [{ f: 'blood', pow: 1.5, land: 2 }, { f: 'all:정', pow: 0.6 }], flags: { 'blood.1': '장악' }, route: '혈겁의 시대' },
      { id: 'swept', t: '혈교와 정파가 싸우는 사이 몽골군이 둘 다 쓸어버렸다.', w: 15, fx: [{ f: 'blood', state: '잠적', pow: 0.3 }, { f: 'all:정', pow: 0.8 }], flags: { 'blood.1': '휩쓸림' } }],
    hero: { as: '참전', n: 3, max: 1.5 } },
  { id: 'xiangyang', k: '정사', src: '정사', y: [1268, 1273], at: 'xiangyang', t: '양양성 공방전. 강호인들이 성을 지키러 모인다.', out: [{ id: 'x', w: 1, fx: [{ f: 'league', pow: 0.8 }] }], hero: { as: '수성', n: 3, max: 1 } },
  { id: 'song_fall', k: '정사', src: '정사', y: 1279, at: 'guangzhou', t: '남송이 무너지고 원이 천하를 차지했다.', out: [{ id: 'x', w: 1, fx: [{ f: 'all:정', coh: -10 }] }] },

  // ================= 7장 명교와 홍건 (1279~1367) =================
  { id: 'beast', k: '계통', src: '창작', y: [1280, 1320], at: 'nanman', t: '남만 밀림에 짐승을 부리는 궁이 섰다.', out: [{ id: 'x', w: 1, fx: [{ found: 'beast' }, { rel: ['beast', 'blood', -80] }] }] },
  { id: 'zhangsanfeng', k: '메인', src: '전설', y: [1310, 1345], at: 'wudang', t: '장삼봉이라는 도인이 무당산에서 태극의 이치를 깨쳤다고 한다.',
    out: [
      { id: 'founded', t: '무당파가 섰다.', w: 85, fx: [{ found: 'wudang' }] },
      { id: 'gone', t: '도인은 깨달음만 남기고 산을 떠났다. 그 깨달음을 이을 자를 기다린다.', w: 15, flags: { 'wudang.zsf': '떠남' }, open: ['wudang_late'] }],
    hero: { as: '제자', n: 2, max: 1.5 } },
  { id: 'wudang_late', k: '계통', src: '창작', y: [1360, 1450], at: 'wudang', cond: [{ no: 'wudang' }], t: '무당산에 장삼봉의 깨달음을 이었다는 도사가 나타났다.', out: [{ id: 'x', t: '늦게나마 무당파가 섰다.', w: 1, fx: [{ found: 'wudang' }] }] },
  { id: 'red_turban', k: '정사', src: '정사', y: 1351, at: 'hefei', t: '홍건적이 일어났다. 백련교와 명교의 이름이 함께 들린다.',
    out: [{ id: 'x', w: 1, fx: [{ revive: 'bailian' }, { revive: 'mingjiao' }, { f: 'bailian', pow: 1.5 }, { f: 'mingjiao', pow: 1.5 }] }] },
  { id: 'ming_found', k: '정사', src: '정사', y: 1368, at: 'nanjing', t: '주원장이 명을 세웠다. 백련교와 명교는 금지되었다.',
    out: [{ id: 'x', w: 1, fx: [{ f: 'mingjiao', state: '멸문' }, { f: 'bailian', state: '잠적' }], open: ['guangming'] }] },

  // ================= 8장 마교의 굴기 (1368~1449) =================
  { id: 'guangming', k: '계통', src: '창작', y: [1368, 1380], at: 'tianshan', t: '버림받은 명교의 잔당이 천산으로 들어갔다.',
    out: [
      { id: 'inherited', t: '잔당이 광명성교를 세웠다.', w: 80, fx: [{ found: 'riyue' }] },
      { id: 'scattered', t: '잔당은 흩어졌고 명교의 이름은 끊겼다.', w: 20, open: ['demon_vacuum'] }] },
  { id: 'demon_vacuum', k: '메인', src: '창작', y: [1380, 1420], at: 'tianshan', t: '비어 있는 천산을 다른 마도가 노린다.',
    out: [{ id: 'filled', t: '마도의 다른 세력이 천산을 차지하고 마교를 자칭했다.', w: 1, fx: [{ promote: 'top:마', as: 'riyue' }] }] },
  { id: 'jinyiwei', k: '정사', src: '정사', y: 1382, at: 'beijing', t: '금의위가 설치되었다.', out: [{ id: 'x', w: 1, fx: [{ found: 'jinyiwei' }] }] },
  { id: 'zhengmo1', k: '메인', src: '창작', y: [1385, 1410], at: 'kaifeng',
    cond: [{ pow: ['top:마', 'top:정'], gte: 0.45 }, { rel: ['top:마', 'top:정'], lte: -50 }], alt: 'demon_silence',
    t: '마교가 천산을 내려왔다. 1차 정마대전이다.',
    out: [
      { id: 'right', t: '정파가 이겼다. 마교는 천산으로 물러났다.', w: 50, by: { pow: ['top:정', 'top:마'] },
        fx: [{ f: 'top:마', land: 0.5, pow: 0.6 }, { f: 'vanguard:정', state: '몰락', pow: 0.3, wealth: 0, lost: 'vanguard:정' }, { grow: { t: '사', x: 1.4, yrs: 20 } }], flags: { 'zhengmo1': '정파승' } },
      { id: 'demon', t: '마교가 이겼다. 개봉과 낙양이 마교의 손에 들어갔다.', w: 30, by: { pow: ['top:마', 'top:정'] },
        fx: [{ f: 'top:마', land: 2, fame: 40 }, { f: 'league', state: '멸문' }], flags: { 'zhengmo1': '마도승' }, open: ['league_reform'], route: '마도천하' },
      { id: 'mutual', t: '양쪽 모두 무너졌다. 강호에 주인이 없다.', w: 20,
        fx: [{ f: 'top:마', pow: 0.5 }, { f: 'all:정', pow: 0.6 }, { f: 'huashan', coh: -30 }, { f: 'diancang', coh: -30 }, { grow: { t: '사', x: 1.6, yrs: 20 } }], flags: { 'zhengmo1': '공멸' } }],
    hero: { as: '참전', n: 3, max: 1.5 } },
  { id: 'demon_silence', k: '메인', src: '창작', y: [1405, 1415], at: 'tianshan', t: '마교는 움직이지 않았다. 대신 정파끼리 다툼이 잦아졌다.',
    out: [{ id: 'x', w: 1, fx: [{ f: 'top:마', coh: -20 }, { f: 'all:정', coh: -10 }] }] },
  { id: 'league_reform', k: '연합', src: '창작', y: [1430, 1450], at: 'luoyang', cond: [{ no: 'league' }], t: '마교 치하에서 숨죽이던 정파가 다시 맹을 세우려 모인다.',
    out: [{ id: 'x', t: '무림맹이 다시 섰다.', w: 1, fx: [{ revive: 'league' }] }], hero: { as: '사신', n: 2, max: 1 } },
  { id: 'zhenghe', k: '정사', src: '정사', y: 1405, at: 'quanzhou', t: '정화의 함대가 서양으로 떠난다. 선원과 호위를 모은다.', out: [{ id: 'x', w: 1, fx: [{ f: 'merchants', wealth: 1.5 }] }], hero: { as: '선단', n: 2, max: 1 } },
  { id: 'sado', k: '계통', src: '창작', y: [1405, 1415], at: 'changjiang', t: '해상 밀무역의 이권을 두고 흑도가 손을 잡는다.',
    out: [
      { id: 'nokrim_led', t: '녹림과 수로채가 뭉쳐 사도련이 섰다.', w: 70, fx: [{ found: 'sado' }] },
      { id: 'river_led', t: '장강수로채가 주도해 물길의 연합이 섰다.', w: 30, fx: [{ found: 'sado' }, { f: 'river', pow: 1.5 }], flags: { 'sado.led': '수로채' } }] },
  { id: 'dongchang', k: '정사', src: '정사', y: 1420, at: 'beijing', t: '동창이 설치되었다.', out: [{ id: 'x', w: 1, fx: [{ found: 'dongchang' }] }] },
  { id: 'tumu', k: '정사', src: '정사', y: 1449, at: 'beijing', t: '토목의 변. 황제가 오이라트에 사로잡혔다.', out: [{ id: 'x', w: 1, fx: [{ f: 'jinyiwei', pow: 0.8 }], open: ['jiutian'] }] },

  // ================= 9장 강호의 전성기 (1450~1549) =================
  { id: 'jiutian', k: '흑막', src: '창작', y: [1450, 1460], at: 'beijing', t: '환관과 관료, 무인이 비밀리에 모였다.', out: [{ id: 'x', w: 1, fx: [{ found: 'jiutian' }, { f: 'jiutian', state: '잠적' }] }] },
  { id: 'xichang', k: '정사', src: '정사', y: 1477, at: 'beijing', t: '서창이 설치되었다.', out: [{ id: 'x', w: 1, fx: [{ found: 'xichang' }] }] },
  { id: 'tianmo', k: '계통', src: '창작', y: [1490, 1510], at: 'tianshan', cond: [{ has: 'riyue' }], t: '천산의 고수 하나가 스스로 천마라 칭했다.',
    out: [
      { id: 'absorbed', t: '천마가 광명성교를 삼켰다. 천마신교가 섰다.', w: 65, fx: [{ merge: ['riyue', 'demon'] }, { found: 'demon' }] },
      { id: 'repelled', t: '광명성교가 천마를 물리쳤다.', w: 35, by: { pow: ['riyue', 'top:정'] }, fx: [{ f: 'riyue', pow: 1.2, fame: 20 }], flags: { 'tianmo': '실패' } }] },
  { id: 'jiutian_coup', k: '흑막', src: '창작', y: [1515, 1525], at: 'beijing', cond: [{ has: 'jiutian' }], t: '구천회가 조정을 움직이려 한다.',
    out: [
      { id: 'failed', t: '음모가 드러나 구천회가 무너졌다.', w: 70, fx: [{ f: 'jiutian', state: '멸문' }] },
      { id: 'seized', t: '구천회가 조정을 장악했다. 금의위와 동창이 강호를 직접 누른다.', w: 30, fx: [{ f: 'jinyiwei', pow: 1.5 }, { f: 'dongchang', pow: 1.5 }], flags: { 'court': '구천회' }, open: ['court_control'], route: '관부의 강호' }],
    hero: { as: '밀정', n: 2, max: 1.5 } },
  { id: 'zhengmo2', k: '메인', src: '창작', y: [1521, 1530], at: 'luoyang',
    cond: [{ has: 'top:마' }, { rel: ['top:마', 'top:정'], lte: -50 }], alt: 'demon_silence2',
    t: '2차 정마대전이다.',
    out: [
      { id: 'right', t: '정파가 이겼다.', w: 45, by: { pow: ['top:정', 'top:마'] }, fx: [{ f: 'top:마', land: 0.5, pow: 0.6 }, { f: 'vanguard:정', state: '몰락', pow: 0.3, wealth: 0, lost: 'vanguard:정' }, { grow: { t: '사', x: 1.4, yrs: 20 } }], flags: { 'zhengmo2': '정파승' } },
      { id: 'demon', t: '마교가 이겼다. 천마가 무림일통을 선포했다.', w: 35, by: { pow: ['top:마', 'top:정'] }, fx: [{ f: 'top:마', land: 3, fame: 60 }, { f: 'league', state: '멸문' }], flags: { 'zhengmo2': '마도승' }, route: '마도천하' },
      { id: 'truce', t: '새외의 궁들이 끼어들어 휴전이 맺어졌다.', w: 20, fx: [{ f: 'cat:새외', land: 1.5, fame: 30 }, { f: 'top:마', pow: 0.8 }, { f: 'top:정', pow: 0.8 }], flags: { 'zhengmo2': '휴전' } }],
    hero: { as: '참전', n: 3, max: 1.5 } },
  { id: 'demon_silence2', k: '메인', src: '창작', y: [1528, 1535], at: 'tianshan', t: '전쟁은 오지 않았다. 마도는 서로를 물어뜯었다.', out: [{ id: 'x', w: 1, fx: [{ f: 'all:마', coh: -20 }] }] },

  // ================= 10장 왜구와 동영 (1550~1643) =================
  { id: 'wokou', k: '정사', src: '정사', y: [1550, 1560], at: 'hangzhou', t: '왜구가 동남 해안을 휩쓸고 있다. 동영 검객이 섞여 있다.', out: [{ id: 'x', w: 1, fx: [{ found: 'dongyingro' }] }], hero: { as: '의병', n: 3, max: 1 } },
  { id: 'blood_calamity2', k: '혈겁', src: '창작', y: [1570, 1600], at: 'chengdu', cond: [{ has: 'blood' }, { state: ['blood', '잠적'] }, { pow: ['blood', 'top:정'], gte: 0.15 }], t: '수십 년 숨어 있던 혈교가 다시 움직인다.',
    out: [
      { id: 'stopped', t: '혈교가 다시 꺾였다.', w: 55, by: { pow: ['top:정', 'blood'] }, fx: [{ f: 'blood', state: '잠적', pow: 0.4 }], flags: { 'blood.2': '막음' } },
      { id: 'ruled', t: '두 번째 혈겁이 강호를 덮었다.', w: 30, by: { pow: ['blood', 'top:정'] }, fx: [{ f: 'blood', pow: 1.5, land: 2 }, { f: 'all:정', pow: 0.6 }], flags: { 'blood.2': '장악' }, route: '혈겁의 시대' },
      { id: 'demon_hand', t: '마교가 혈교를 먼저 쳤다. 정파는 손 하나 쓰지 않았다.', w: 15, fx: [{ f: 'blood', state: '멸문' }, { f: 'top:마', fame: 30 }], flags: { 'blood.2': '마교가 침' } }],
    hero: { as: '참전', n: 3, max: 1.5 } },
  { id: 'blood_heir', k: '계통', src: '창작', y: [1620, 1700], at: 'nanman', cond: [{ state: ['blood', '멸문'] }], t: '혈교의 잔당이 다른 이름으로 교단을 세웠다는 말이 돈다.',
    out: [{ id: 'x', w: 1, fx: [{ revive: 'blood' }, { f: 'blood', state: '잠적' }], flags: { 'blood.heir': '예' } }] },
  { id: 'ming_fall', k: '정사', src: '정사', y: 1644, at: 'beijing', t: '이자성이 북경을 함락했다. 명이 무너지고 청이 들어왔다.',
    out: [{ id: 'x', w: 1, fx: [{ f: 'jinyiwei', state: '멸문' }, { f: 'dongchang', state: '멸문' }, { f: 'all', coh: -10 }] }] },

  // ================= 11장 반청 (1644~1779) =================
  { id: 'shaolin_burn', k: '메인', src: '전설', y: [1670, 1680], at: 'songshan', t: '청 조정이 소림을 불태웠다는 이야기가 퍼진다.',
    out: [
      { id: 'burned', t: '소림이 실제로 불탔다. 살아남은 승려들이 남쪽으로 흩어졌다.', w: 50, fx: [{ f: 'shaolin', state: '몰락', pow: 0.4 }], open: ['tiandihui'] },
      { id: 'rumor', t: '불탄 것은 소문뿐이었지만, 그 소문으로 반청 결사가 모였다.', w: 50, open: ['tiandihui'] }] },
  { id: 'tiandihui', k: '계통', src: '전설', y: [1674, 1700], at: 'quanzhou', cond: [{ no: 'tiandihui' }], t: '반청복명을 내건 결사가 모였다.', out: [{ id: 'x', w: 1, fx: [{ found: 'tiandihui' }] }] },
  { id: 'qingbang', k: '계통', src: '정사', y: [1700, 1750], at: 'canal', t: '대운하의 뱃사람들이 결사를 맺었다.', out: [{ id: 'x', w: 1, fx: [{ found: 'qingbang' }] }] },
  { id: 'anti_qing', k: '메인', src: '창작', y: [1674, 1690], at: 'quanzhou', cond: [{ has: 'tiandihui' }], t: '반청 결사가 봉기했다.',
    out: [
      { id: 'crushed', t: '봉기는 진압되었다.', w: 75, fx: [{ f: 'tiandihui', state: '잠적', pow: 0.5 }] },
      { id: 'south', t: '봉기가 강남 일대를 장악했다.', w: 25, fx: [{ f: 'tiandihui', land: 3, pow: 2 }], flags: { 'antiqing': '강남 장악' }, route: '반청의 강남' }],
    hero: { as: '참전', n: 3, max: 1.5 } },

  // ================= 12장 황혼 (1780~1840) =================
  { id: 'twilight', k: '메인', src: '창작', y: 1780, at: 'beijing', t: '총포를 든 관군 앞에서 고수들의 이름이 하나둘 잊힌다.', out: [{ id: 'x', w: 1, fx: [{ f: 'all', fame: -20 }, { grow: { t: 'all', x: 0.8, yrs: 60 } }] }] },
  { id: 'bailian_revolt', k: '정사', src: '정사', y: 1796, at: 'xiangyang', t: '백련교도의 난이 일어났다.',
    out: [{ id: 'x', w: 1, fx: [{ revive: 'bailian' }, { f: 'bailian', pow: 2 }], open: ['demon_joins'] }] },
  { id: 'demon_joins', k: '메인', src: '창작', y: [1796, 1804], at: 'tianshan', cond: [{ has: 'top:마' }], t: '천산의 마교가 백련교도의 난에 끼어들지를 두고 갈렸다.',
    out: [
      { id: 'stay', t: '마교는 천산을 지켰다.', w: 60, fx: [{ f: 'top:마', coh: 10 }] },
      { id: 'join', t: '마교가 난에 가담했다가 관군의 대포에 크게 꺾였다.', w: 40, fx: [{ f: 'top:마', pow: 0.4 }] }] },
  { id: 'opium', k: '정사', src: '정사', y: 1840, at: 'guangzhou', t: '영국 함대의 대포가 광주를 때렸다. 강호의 시대가 저문다.', out: [{ id: 'x', w: 1 }] },

  // ================= 반복 닻 (시기 없음, 조건이 맞으면 언제든) =================
  { id: 'sapa_unify', k: '일통', src: '창작', y: 'any', rep: { cd: 60, p: 20, from: 1100 }, at: 'nanjing', cond: [{ share: 'top:사', gte: 0.35 }], t: '사파 하나가 강남의 흑도를 모두 굴복시켰다.',
    out: [{ id: 'x', t: '사파일통이 선포되었다.', w: 1, fx: [{ f: 'top:사', fame: 40, coh: 20 }], flags: { 'sapa.unify': '예' }, route: '사파일통' }] },
  { id: 'right_unify', k: '일통', src: '창작', y: 'any', rep: { cd: 100, p: 10, from: 1100 }, at: 'kaifeng', cond: [{ share: 'top:정', gte: 0.5 }], t: '정파 하나가 강호 절반을 손에 넣었다.',
    out: [{ id: 'x', t: '무림일통이 선포되었다.', w: 1, fx: [{ f: 'top:정', fame: 60 }], route: '무림일통' }] },
  { id: 'demon_unify', k: '일통', src: '창작', y: 'any', rep: { cd: 100, p: 10, from: 1100 }, at: 'tianshan', cond: [{ share: 'top:마', gte: 0.5 }], t: '마도가 강호 절반을 손에 넣었다.',
    out: [{ id: 'x', t: '마도천하가 선포되었다.', w: 1, fx: [{ f: 'top:마', fame: 60 }], route: '마도천하' }] },
  { id: 'court_control', k: '통제', src: '창작', y: 'any', rep: { cd: 50, p: 15, from: 960 }, at: 'beijing', cond: [{ has: 'top:관' }, { pow: ['top:관', 'top:정'], gte: 0.8 }], t: '조정이 강호를 손보겠다고 나섰다.',
    out: [
      { id: 'submit', t: '문파들이 관의 감찰을 받아들였다.', w: 50, fx: [{ f: 'all:정', coh: -10 }, { f: 'top:관', fame: 20 }] },
      { id: 'purge', t: '관이 이름난 문파 몇을 역도로 몰아 쳤다.', w: 30, fx: [{ f: 'vanguard:정', state: '몰락', pow: 0.5 }] },
      { id: 'resist', t: '문파들이 관에 맞서 연합했다.', w: 20, fx: [{ f: 'all:정', coh: 15 }, { rel: ['top:관', 'all:정', -40] }] }],
    hero: { as: '참전', n: 2, max: 1.3 } },
  { id: 'black_hand', k: '흑막', src: '창작', y: 'any', rep: { cd: 120, p: 5, from: 1000 }, at: 'luoyang', cond: [{ has: 'top:암' }], t: '어디선가 자금과 비급이 흘러들어 한 무리가 갑자기 커졌다.',
    out: [
      { id: 'hidden', t: '그 무리를 막겠다며 연합이 생겼고, 연합의 주도권은 뜻밖의 세력이 쥐었다.', w: 70, fx: [{ f: 'top:암', fame: 20, pow: 1.3 }], flags: { 'blackhand': '숨음' }, open: ['black_hand_reveal'] },
      { id: 'exposed', t: '돈줄을 캐던 자가 배후를 밝혀냈다.', w: 30, fx: [{ f: 'top:암', state: '몰락' }] }],
    hero: { as: '밀정', n: 2, max: 1.5 } },
  { id: 'black_hand_reveal', k: '흑막', src: '창작', y: 'any', rep: { cd: 30, p: 8, from: 1000 }, at: 'luoyang', cond: [{ flag: 'blackhand', is: '숨음' }], t: '연합의 배후가 그 적을 키운 자였다는 증거가 나왔다.',
    out: [{ id: 'x', t: '연합이 깨지고 배후 세력은 쫓겨났다.', w: 1, fx: [{ f: 'top:암', state: '몰락' }], flags: { 'blackhand': '드러남' } }] },
  { id: 'tomb', k: '유산', src: '창작', y: 'any', rep: { cd: 60, p: 2, from: 600 }, at: 'shiwan', t: '옛 전설 고수의 무덤이 발견되었다는 소문이 돈다.',
    out: [
      { id: 'war', t: '무덤을 두고 여러 세력이 싸웠다.', w: 60, fx: [{ rel: ['all', 'all', -10] }, { relic: '전설 고수의 유산' }] },
      { id: 'quiet', t: '한 문파가 조용히 무덤을 차지했다.', w: 30, fx: [{ relic: '전설 고수의 유산' }] },
      { id: 'fake', t: '무덤은 빈 껍데기였다. 누군가 꾸민 함정이었다.', w: 10, fx: [{ f: 'all', coh: -5 }] }],
    hero: { as: '탐색', n: 3, max: 2 } },
  { id: 'relic_out', k: '유산', src: '창작', y: 'any', rep: { cd: 60, p: 2, from: -500 }, at: 'luoyang', t: '신병이기가 출세했다.',
    out: [{ id: 'x', t: '누가 차지할지 강호의 눈이 쏠렸다.', w: 1, fx: [{ relic: '신병이기' }] }], hero: { as: '탐색', n: 2, max: 2 } },
  { id: 'manual_out', k: '유산', src: '창작', y: 'any', rep: { cd: 50, p: 2, from: 900 }, at: 'kaifeng', t: '실전된 비급이 세상에 나왔다는 말이 돈다.',
    out: [{ id: 'x', w: 1, fx: [{ relic: '비급' }] }], hero: { as: '탐색', n: 2, max: 2 } },
  { id: 'cult_heir', k: '계통', src: '창작', y: 'any', rep: { cd: 80, p: 5, from: 1370 }, at: 'nanman', cond: [{ no: 'top:마' }], t: '마도가 모두 사라진 강호에서, 멸문한 사교의 잔당이 새 이름으로 일어섰다.',
    out: [{ id: 'x', w: 1, fx: [{ found: 'new:마' }] }] },
];
})(typeof window !== 'undefined' ? window : globalThis);
