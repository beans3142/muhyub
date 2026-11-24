// 출신 데이터 생성기. 실행: node tools/gen_origins.js → data/origins.js
// 손으로 쓴 기본 출신 + 세력별 출신(속가·하인·무사 집안·직계·방계 등)을 조합한다.
// w: 출생 가중치(평민이 대부분), wealth 0~5, align 성향 시작값, career 생업, join 시작 소속, rank 시작 직책 단,
// martial 1이면 어릴 때 기초 무공을 받는다, tag: 사건·스승 연결용 꼬리표
'use strict';
const fs = require('fs');
const path = require('path');
require('../data/factions.js');
const FACTIONS = globalThis.FACTIONS;

const BASE = [
  // 농어촌
  ['farmer', '빈농의 집', 260, 0, 0, 'farm'], ['tenant', '소작농의 집', 150, 0, 0, 'farm'], ['yeoman', '자작농의 집', 90, 1, 0, 'farm'], ['landlord', '지주의 집', 15, 4, 0, 'farm'],
  ['fisher', '어부의 집', 60, 0, 0, 'farm'], ['boatman', '뱃사공의 집', 30, 0, 0, 'farm', null, ['물']], ['hunter', '산골 사냥꾼의 집', 40, 0, 0, 'farm', null, ['산']],
  ['woodcutter', '나무꾼의 집', 40, 0, 0, 'farm', null, ['산']], ['charcoal', '숯쟁이의 집', 15, 0, 0, 'farm'], ['herbalist', '약초꾼의 집', 20, 0, 0, 'doctor', null, ['산']],
  ['miner', '광부의 집', 20, 0, 0, 'smith'], ['salter', '염전 일꾼의 집', 15, 0, 0, 'farm'], ['herder', '목동의 집', 20, 0, 0, 'farm'], ['tea', '차밭 일꾼의 집', 15, 0, 0, 'farm'],
  ['silk', '누에 치는 집', 15, 1, 0, 'merchant'],
  // 장터와 도시
  ['peddler', '봇짐장수의 집', 50, 0, 0, 'merchant'], ['merchant', '장터 상인의 집', 70, 2, 0, 'merchant'], ['shop', '포목점 집', 25, 2, 0, 'merchant'], ['bigmerchant', '상단주의 집', 6, 4, 0, 'merchant'],
  ['moneylender', '고리대금업자의 집', 6, 3, -10, 'merchant'], ['bank', '전장 주인의 집', 3, 5, 0, 'merchant'], ['saltlord', '소금 상인(염상)의 집', 3, 5, -5, 'merchant'],
  ['inn', '객잔 주인의 집', 40, 2, 0, 'cook', null, ['객잔']], ['innboy', '객잔에서 일하는 점소이 아이', 30, 0, 0, 'cook', null, ['객잔', '점소이']], ['teahouse', '찻집 주인의 집', 15, 1, 0, 'cook'],
  ['butcher', '백정의 집', 15, 1, 0, 'cook'], ['noodle', '국숫집', 20, 1, 0, 'cook'], ['wine', '술도가', 15, 2, 0, 'cook'],
  ['smith', '대장간', 35, 1, 0, 'smith'], ['carpenter', '목수의 집', 25, 1, 0, 'smith'], ['coffin', '관 짜는 집', 8, 1, 0, 'smith'], ['potter', '옹기장이의 집', 15, 1, 0, 'smith'],
  ['porter', '짐꾼의 집', 30, 0, 0, 'farm'], ['coachman', '마부의 집', 20, 0, 0, 'farm', null, ['하오']], ['gravekeeper', '묘지기의 집', 5, 0, 0, 'farm', null, ['무덤']],
  ['gisaeng', '기루', 12, 1, 0, 'artist', null, ['기루'], { charm: 1 }], ['troupe', '떠돌이 광대패', 10, 0, 0, 'artist'], ['acrobat', '곡예단', 6, 0, 0, 'artist', null, null, { martial: 1 }],
  ['storyteller', '설서인의 집', 6, 0, 0, 'artist'], ['gambler', '도박꾼의 집', 10, 0, -10, 'merchant', null, ['하오']],
  // 학문·관
  ['scholar', '몰락한 선비의 집', 25, 1, 5, 'scholar'], ['teacher', '서당 훈장의 집', 15, 1, 5, 'scholar'], ['clerk', '관부 아전의 집', 25, 3, 0, 'scholar'],
  ['magistrate', '지현 나리의 집', 4, 4, 0, 'scholar'], ['official', '고관 대작의 집', 1, 5, 0, 'scholar'], ['translator', '역관의 집', 3, 3, 0, 'scholar'],
  ['soldier', '병졸의 집', 30, 0, 0, null, null, ['관'], { martial: 1 }], ['officer', '무관 장교의 집', 6, 3, 0, null, null, ['관'], { martial: 1 }], ['general', '장군가', 1, 5, 5, null, null, ['관'], { martial: 1 }],
  ['constable', '포두의 집', 10, 1, 5, null, null, ['관'], { martial: 1 }], ['jailer', '옥졸의 집', 6, 0, -5, null, null, ['관']],
  ['eunuch', '환관에게 팔려 간 아이', 2, 0, -5, 'scholar', ['dongchang']], ['palacemaid', '궁녀의 사생아', 1, 1, 0, 'artist'],
  ['royal', '황족의 서출', 0.5, 5, 0, 'scholar'], ['fallenroyal', '망국 왕족의 후손', 0.3, 1, 0, 'scholar', null, ['비밀']],
  // 종교·의술
  ['doctor', '시골 의원의 집', 20, 2, 5, 'doctor'], ['famousdoc', '명의 집안', 2, 4, 10, 'doctor'], ['shaman', '무당(무녀)의 집', 6, 0, 0, 'artist', null, ['사술']],
  ['medclan', '의가(대대로 의술을 잇는 가문) 방계', 3, 3, 10, 'doctor', null, ['의가'], { martial: 1 }], ['medclanmain', '의가 직계', 0.8, 4, 10, 'doctor', null, ['의가'], { martial: 1 }],
  ['yaowang', '약왕곡에 맡겨진 아이', 1, 0, 5, 'doctor', null, ['의가', '독']], ['drugstore', '약방(약재상) 집', 12, 2, 0, 'doctor'], ['midwife', '산파의 집', 6, 0, 5, 'doctor'],
  ['innboy2', '주루에서 일하는 점소이 아이', 15, 0, 0, 'cook', null, ['객잔', '점소이', '하오']], ['innorphan', '객잔 주인이 거둔 고아(점소이)', 12, 0, 5, 'cook', null, ['객잔', '점소이', '고아']],
  ['taoistfam', '화거도사의 집', 6, 1, 5, 'doctor'], ['templeboy', '절에 맡겨진 아이', 12, 0, 10, null, ['shaolin', 'emei'], ['불가']], ['daoguan', '도관에 맡겨진 아이', 10, 0, 10, null, ['wudang', 'huashan', 'qingcheng', 'zhongnan', 'kunlun'], ['도가']],
  // 무림 주변
  ['escort', '표국 표사의 집', 25, 2, 5, null, null, ['표국'], { martial: 1 }], ['escortlord', '표국주의 집', 4, 4, 5, 'merchant', null, ['표국'], { martial: 1 }], ['zhengzi', '쟁자수의 집', 15, 0, 0, null, null, ['표국']],
  ['dojo', '동네 무관', 20, 1, 5, null, null, ['무관'], { martial: 1 }], ['ronin', '낭인의 자식', 8, 0, 0, null, null, ['낭인'], { martial: 1 }], ['retired', '은퇴한 무인의 집', 6, 1, 5, null, null, null, { martial: 1 }],
  ['hermitgrand', '은거 고수의 손주(본인은 모름)', 0.5, 0, 10, 'farm', null, ['비밀', '은거']], ['survivor', '멸문한 문파의 유일한 생존자', 1, 0, 10, null, null, ['멸문', '복수']],
  ['sworn', '무림인에게 거둬진 아이', 4, 0, 0, null, null, null, { martial: 1 }],
  // 밑바닥
  ['beggar', '거지', 40, 0, 0, null, null, ['거지']], ['beggarorphan', '거지 소굴에서 자란 고아', 25, 0, 0, null, null, ['거지', '고아']], ['streeturchin', '저잣거리 고아', 30, 0, -5, null, null, ['고아', '하오']],
  ['orphan', '산문 앞에 버려진 아이', 12, 0, 10, null, ['shaolin', 'wudang', 'emei'], ['고아']], ['slave', '노비', 30, 0, 0, null, null, ['노비']], ['exile', '유배 온 죄인의 집', 6, 0, 0, 'scholar', null, ['죄인']],
  ['refugee', '피란민', 30, 0, 0, null, null, ['떠돌이']], ['pickpocket', '소매치기 패거리', 8, 0, -15, null, ['haomun'], ['하오', '도둑']], ['thief', '도둑의 집', 6, 1, -20, null, null, ['도둑']],
  // 흑도·사교·새외
  ['bandit', '녹림 산채', 15, 1, -25, null, ['nokrim'], ['산적'], { martial: 1 }], ['pirate', '수적의 집', 10, 1, -25, null, ['river'], ['수적'], { martial: 1 }], ['horsebandit', '마적의 집', 5, 1, -25, null, null, ['마적', '새외'], { martial: 1 }],
  ['gang', '흑도 방회', 12, 2, -25, null, ['haomun', 'river', 'sado'], ['흑도'], { martial: 1 }], ['blackshop', '흑점 주인의 집', 3, 3, -20, 'merchant', ['haomun'], ['흑점']],
  ['smuggler', '소금 밀매꾼의 집', 8, 2, -15, 'merchant', null, ['염방']], ['assassin', '살문이 데려간 고아', 3, 0, -30, null, ['salmun'], ['살수'], { martial: 1 }],
  ['sacrifice', '혈교 제물로 길러진 아이', 0.5, 0, -10, null, ['blood'], ['혈교', '비밀']], ['demon', '마교도의 집', 5, 2, -40, null, ['demon', 'mingjiao'], ['마교'], { martial: 1 }],
  ['demonlord', '마교 교주의 혈통', 0.1, 5, -50, null, ['demon'], ['마교'], { martial: 1, rank: 4 }], ['demonelder', '마교 장로의 손주', 0.5, 4, -40, null, ['demon'], ['마교'], { martial: 1, rank: 1 }],
  ['westtrader', '서역 상인과의 혼혈', 3, 3, 0, 'merchant', null, ['서역']], ['nomad', '초원 유목민', 4, 1, 0, 'farm', null, ['새외']], ['tibet', '서장 목동', 3, 0, 5, 'farm', ['potala'], ['새외']],
  ['nanman', '남만 부족', 4, 0, 0, 'farm', ['beast'], ['새외', '독']], ['icecastaway', '북해에서 떠내려온 아이', 0.3, 0, 0, null, ['bingung'], ['새외', '비밀']], ['japanese', '동영 표류민의 자식', 1, 0, 0, null, ['dongying'], ['새외']],
  ['haidong', '해동에서 건너온 집', 2, 1, 5, null, null, ['새외']],
];

// 세력별 출신 틀: 세력 종류(lad)에 따라 다르다
const BY_LAD = {
  sect:   [['속가 제자의 집', 6, 2, 10, 0, 1], ['산문 아래 마을(전답 소작)', 10, 0, 5, null, 0], ['문파 하인의 자식', 4, 0, 5, null, 0], ['장로의 손주', 0.4, 3, 10, 1, 1], ['속가 문파 관주의 집', 1.5, 3, 10, 0, 1]],
  clan:   [['방계', 4, 3, 10, 0, 1], ['직계', 1, 4, 10, 1, 1], ['가솔(하인)의 자식', 6, 0, 5, null, 0], ['외척', 1, 3, 5, 0, 0], ['식객 무사의 집', 2, 1, 5, 0, 1], ['서자', 1, 2, 5, 0, 1]],
  league: [['맹원 무사의 집', 3, 2, 10, 0, 1], ['맹 관할 마을', 6, 1, 5, null, 0]],
  demon:  [['교도의 집', 3, 2, -40, 0, 1], ['교 영역 마을', 4, 1, -20, null, 0]],
  bandit: [['채 졸개의 집', 4, 0, -25, 0, 1], ['채 영역 마을', 5, 0, -10, null, 0]],
  assassin: [['살수 연락책의 집', 0.8, 1, -25, 0, 1]],
  shadow: [['비밀 신도의 집', 1, 1, -20, 0, 0]],
  guard:  [['군호(세습 군인)의 집', 4, 1, 0, 0, 1], ['관원의 집', 2, 3, 0, 0, 0]],
  info:   [['정보원의 집', 3, 1, -15, 0, 0], ['점소이 조직원의 집', 4, 0, -10, 0, 0]],
  beggar: [['거지 패거리', 8, 0, 0, 0, 1], ['결 받은 거지의 자식', 2, 0, 5, 0, 1]],
  escort: [['표사의 집', 6, 2, 5, 0, 1], ['국주의 집', 1, 4, 5, 1, 1]],
};

const out = [];
for (const [id, n, w, wealth, align, career, join, tags, extra] of BASE) {
  const o = { id, n, w, wealth, align };
  if (career) o.career = career;
  if (join) o.join = join;
  if (tags) o.tag = tags;
  if (extra) Object.assign(o, extra);
  out.push(o);
}
for (const f of FACTIONS) {
  const lad = BY_LAD[f.lad]; if (!lad) continue;
  const scale = Math.min(1.2, Math.sqrt((f.size || 100) / 1000)) * 0.45;   // 세력 규모에 비례: 작은 세력 출신은 드물다
  for (const [suffix, w0, wealth, align, rank, martial] of lad) {
    const w = +(w0 * scale).toFixed(3);
    const n = `${f.n} ${suffix}`;
    const o = { id: `${f.id}_${out.length}`, n, w, wealth, align: f.t === '마' || f.t === '암' ? Math.min(align, -20) : f.t === '사' ? Math.min(align, -15) : align, join: [f.id], f: f.id };
    if (rank !== null && rank !== undefined) o.rank = rank;
    if (martial) o.martial = 1;
    out.push(o);
  }
}
// 지역 갈래: 흔한 평민 출신은 지역을 붙여 나눈다 (강남 어부의 집, 하북 빈농의 집 …). 가중치는 원래 값을 나눠 갖는다.
const REGIONS = ['강남', '강북', '하북', '하남', '산동', '산서', '섬서', '사천', '호남', '호북', '복건', '광동', '운남', '감숙', '요동', '안휘'];
const SPLIT = ['farmer', 'tenant', 'fisher', 'peddler', 'merchant', 'inn', 'smith', 'beggar', 'porter', 'refugee'];
const final = [];
for (const o of out) {
  if (SPLIT.includes(o.id)) {
    const rs = REGIONS.filter(r => !(o.id === 'fisher' && ['감숙', '산서', '섬서'].includes(r)));
    for (const r of rs) final.push(Object.assign({}, o, { id: `${o.id}_${r}`, n: `${r} ${o.n}`, w: +(o.w / rs.length).toFixed(3), region: r }));
  } else final.push(o);
}
let sum = 0; for (const o of final) sum += o.w;
fs.writeFileSync(path.join(__dirname, '..', 'data', 'origins.js'),
  `// 출신 데이터 (자동 생성: node tools/gen_origins.js). 총 ${final.length}종, 가중치 합 ${sum.toFixed(1)}\n` +
  '(function (G) {\nG.ORIGINS = [\n' + final.map(o => JSON.stringify(o)).join(',\n') + '\n];\n})(typeof window !== "undefined" ? window : globalThis);\n');
const top = final.slice().sort((a, b) => b.w - a.w);
const share = k => (final.filter(k).reduce((s, o) => s + o.w, 0) / sum * 100).toFixed(1) + '%';
console.log('origins', final.length, 'weight', sum.toFixed(1), '무림 소속 시작', share(o => o.join), '무공 기초', share(o => o.martial), '거지·고아', share(o => (o.tag || []).some(t => t === '거지' || t === '고아')));
