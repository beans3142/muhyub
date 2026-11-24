// 한 번만 쓰는 이전 스크립트: world.js FACTIONS + data/factions.js FACTIONS2 + tools/faction_styles.js → 단일 data/factions.js
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = process.argv[2];
require(path.join(ROOT, 'world.js'));
require(path.join(ROOT, 'data/factions.js'));
const STY = require(path.join(ROOT, 'tools/faction_styles.js'));
const W = globalThis.W, F2 = globalThis.FACTIONS2;

const CAT = {
  구파일방: 'shaolin wudang huashan emei kunlun kongtong diancang qingcheng zhongnan hainan gaibang',
  오악도불: 'taishanp hengshanS hengshanN songshanp jiange quanzhen maoshan putuo jiuhua wutaip wuyi luofu qilian xueshan penglai taibai changbaip jianke shenyi yaowang',
  세가: 'namgung tang zhuge murong peng huangfu yan yue yang zhao yuchi ouyang helian baili dugu shangguan shijia lujia duan xiahou dongfang beigong sima ximen gongsun yijia',
  연합: 'league sado escortunion',
  흑도: 'haomun nokrim river dongting18 haisha mazei heidian kongling qingbang salmun dongyingro',
  사교: 'mingjiao demon riyue blood baijiao mijiao bailian persia',
  암중: 'jiutian anlong jiangshi yinzhe tiandihui',
  관부: 'jinyiwei dongchang xichang jinjun liushan',
  새외: 'potala bingung beast wudu taiyanggong nanhaisun kuangfeng leiyin xiaoleiyin tianzhu dongying haidongp',
  생업: 'merchants smithunion',
};
const catOf = {};
for (const [c, ids] of Object.entries(CAT)) for (const id of ids.split(' ')) catOf[id] = c;
const REL = {
  불: 'shaolin emei putuo jiuhua wutaip hengshanN songshanp leiyin xiaoleiyin potala tianzhu mijiao',
  도: 'wudang huashan kunlun qingcheng zhongnan kongtong taishanp hengshanS quanzhen maoshan wuyi luofu penglai yinzhe',
  마: 'mingjiao demon riyue blood baijiao bailian persia',
};
const relOf = {};
for (const [r, ids] of Object.entries(REL)) for (const id of ids.split(' ')) relOf[id] = r;

// 새외 5곳 (무공 설정에만 있던 것)
const EXTRA = [
  { id: 'potala', n: '포달랍궁', t: '중', lad: 'sect', at: 'xizang', from: [1240, 1260], fall: 10, d: '서장 밀종 무승의 본산. 대수인, 진언. 중원과 거리를 두지만 정마대전 때 한쪽에 선다' },
  { id: 'bingung', n: '북해빙궁', t: '중', lad: 'sect', at: 'beihai', from: [1100, 1140], fall: 10, d: '북해 너머 얼음 땅의 궁. 한빙 무공. 궁주는 대대로 여인. 수십 년에 한 번 중원에 사람을 보낸다' },
  { id: 'beast', n: '남만 야수궁', t: '사', lad: 'sect', at: 'nanman', from: [1280, 1320], fall: 20, d: '짐승을 부리고 독충을 기른다. 혈교와 땅을 다툰다' },
  { id: 'tianzhu', n: '천축 무승', t: '중', lad: 'sect', at: 'tianzhu', from: [500, 500], fall: 0, d: '문파라기보다 떠도는 고수들. 달마의 땅에서 온 자들' },
  { id: 'dongying', n: '동영 검객', t: '사', lad: 'bandit', at: 'dongying', from: [1520, 1540], fall: 0, d: '왜구에 섞여 들어온 동영 검객들 [정사: 16세기 왜구]' },
];

function entryOf(f, cat, prestige) {
  const e = {};
  if (['구파일방', '오악도불', '새외'].includes(cat) && f.lad === 'sect') { e.age = [6, 15]; e.dc = 8 + prestige * 2; e.via = ['산문 시험', '추천', '고아', '속가', '직전제자']; }
  else if (cat === '세가') { e.via = ['혈연', '혼인', '식객', '가솔']; }
  else if (cat === '연합') { e.via = f.id === 'league' ? ['소속 문파 추천', '공적'] : f.id === 'sado' ? ['흑도 세력 추천', '투항'] : ['고용']; }
  else if (cat === '흑도') { e.via = f.lad === 'assassin' ? ['고아', '납치', '빚'] : ['소개', '빚', '범죄', '투항']; }
  else if (cat === '사교') { e.via = ['교도 가족', '귀의', '투항', '납치']; }
  else if (cat === '암중') { e.via = ['비밀 포섭', '혈연']; }
  else if (cat === '관부') { e.via = ['무과', '세습 군호', '추천', '환관']; }
  else if (cat === '생업') { e.via = ['고용', '도제']; }
  else e.via = ['고용'];
  if (f.id === 'shaolin') e.sex = 'm';
  if (['emei', 'hengshanN'].includes(f.id) || f.female) e.sex = 'f';
  return e;
}
function rulesOf(f, cat, rel) {
  const r = [];
  if (f.id === 'shaolin') r.push('살생 금지', '음주 금지', '혼인 금지', '육식 금지');
  else if (rel === '불') r.push('살생 금지', '혼인 금지(출가자)');
  else if (rel === '도') r.push('사사로운 살생 금지');
  if (['emei', 'hengshanN'].includes(f.id)) r.push('여승 혼인 금지');
  if (cat === '세가') r.push('가문 명예', '가전무공 유출 금지');
  if (f.id === 'league') r.push('정파끼리 싸움 금지', '마교와 내통 금지');
  if (cat === '사교') r.push('강자존', '교주에 대한 충성');
  if (cat === '흑도') r.push(f.lad === 'assassin' ? '청부 거절 금지' : '배신 금지', f.lad === 'assassin' ? '정체 비밀' : '상납');
  if (cat === '관부') r.push('황명');
  r.push('비전 무공 무단 전수 금지');
  return [...new Set(r)];
}
const SIZE = { 1: 60, 2: 600, 3: 3000 };
const CAT_SIZE = { 구파일방: 1.5, 오악도불: 0.6, 세가: 0.4, 연합: 3, 흑도: 1.5, 사교: 2, 암중: 0.3, 관부: 2, 새외: 0.6, 생업: 1 };

const all = [];
const seen = new Set();
function push(f, style) {
  if (seen.has(f.id)) return;
  seen.add(f.id);
  const cat = catOf[f.id] || '오악도불';
  const rel = relOf[f.id] || '없음';
  const prestige = style ? style.prestige : 1;
  const o = { id: f.id, n: f.n, cat, t: f.t, rel, lad: f.id === 'gaibang' ? 'beggar' : f.id === 'escortunion' ? 'escort' : f.lad, at: f.at, from: f.from };
  if (f.to) o.to = f.to;
  o.fall = f.fall; o.prestige = prestige; o.size = Math.round(SIZE[prestige] * (CAT_SIZE[cat] || 1));
  if (f.d) o.d = f.d;
  if (f.sur) o.sur = f.sur;
  if (f.hidden) o.hidden = true;
  if (f.theme) o.theme = f.theme;
  o.entry = entryOf(f, cat, prestige);
  o.rules = rulesOf(f, cat, rel);
  if (style) o.style = { n: style.n, attr: style.attr, prestige: style.prestige, roots: style.roots, kinds: style.kinds, fixed: style.fixed };
  all.push(o);
}
for (const f of W.FACTIONS) push(f, STY[f.id]);
for (const f of EXTRA) push(f, STY[f.id]);
for (const f of F2) push(f, Object.assign({ n: 40 + f.style.prestige * 20 }, f.style));

const LADDERS = {
  sect: ['입문제자', '평제자', '내문제자', '진산제자', '각주·당주', '장로', '태상장로', '장문인'],
  clan: ['방계·가솔', '직계', '소가주', '원로', '가주'],
  league: ['맹원', '조장', '대주', '단주', '각주·당주', '군사', '부맹주', '맹주'],
  demon: ['교도', '하급 무사', '중급 무사', '상급 무사', '대주', '단주·향주', '호법', '장로', '부교주', '교주'],
  bandit: ['졸개', '조장', '두목', '부채주', '채주', '총채주'],
  beggar: ['1결', '2결', '3결', '4결', '5결', '6결(장로)', '7결(후계)', '8결(방주)'],
  info: ['심부름꾼', '정보원', '분타주', '총관', '문주'],
  assassin: ['견습 살수', '살수', '청부 조장', '살주', '막주'],
  shadow: ['말단', '행동대', '간부', '장로', '수뇌'],
  guard: ['소기', '총기', '백호', '천호', '지휘사'],
  escort: ['쟁자수', '표사', '표두', '부국주', '국주'],
};
const DISCIPLE = ['입문제자', '평제자', '내문제자', '진산제자', '직전제자', '대제자', '속가제자'];
const ACCESS = { 입문제자: '삼류', 평제자: '삼류', 내문제자: '이류', 진산제자: '일류', '각주·당주': '일류', 직전제자: '상승', 장로: '상승', 대제자: '절세', 장문인: '신공', 태상장로: '신공', 속가제자: '이류' };
const RELATION = {
  정: { 정: 20, 중: 10, 사: -40, 마: -70, 관: 0, 암: -50 },
  중: { 정: 10, 중: 10, 사: -10, 마: -30, 관: 0, 암: -20 },
  사: { 정: -40, 중: -10, 사: 5, 마: -20, 관: -30, 암: -10 },
  마: { 정: -70, 중: -30, 사: -20, 마: 10, 관: -50, 암: -20 },
  관: { 정: 0, 중: 0, 사: -30, 마: -50, 관: 10, 암: -40 },
  암: { 정: -50, 중: -20, 사: -10, 마: -20, 관: -40, 암: 0 },
};
const RIVALS = [['huashan', 'zhongnan'], ['namgung', 'ximen'], ['peng', 'huangfu'], ['zhuge', 'sima'], ['league', 'sado'], ['leiyin', 'xiaoleiyin'], ['bingung', 'taiyanggong'], ['beast', 'blood'], ['league', 'demon'], ['shaolin', 'demon'], ['wudang', 'demon']];
const ALLIES = [['shaolin', 'wudang'], ['gaibang', 'league'], ['haomun', 'sado'], ['escortunion', 'merchants'], ['tang', 'yaowang']];
const ALLIANCE_MEMBERS = { league: CAT.구파일방.split(' ').concat(['namgung', 'tang', 'zhuge', 'murong', 'peng']), sado: ['nokrim', 'river', 'haomun', 'dongting18', 'haisha', 'heidian'] };
const NL = String.fromCharCode(10);
const head = `// 세력 데이터 (단일 정본). 규칙: docs/p4-factions.md. 이전 world.js FACTIONS·tools/faction_styles.js·FACTIONS2를 합쳤다.
// cat 계열, t 성향(정·중·사·마·관·암), rel 종교(불·도·마·없음), lad 직위 사다리(LADDERS 키), at 근거지(places), from/to 개파·멸문 연도 범위,
// fall 생마다 멸문 확률(%), prestige 위상 1~3, size 문도 수(대략), entry 입문(age 나이, dc 시험, via 길, sex 성별 제한), rules 계율,
// style 무공 생성 설정(tools/gen_arts.js가 읽음: n 생성 수, attr 성질, roots 어근, kinds 종류 가중치, fixed [이름, 종류, 등급] 장르 공통 이름)
// 세력 ${all.length}곳`;
const body = [head, '(function (G) {',
  'G.FACTIONS = [', all.map(o => '  ' + JSON.stringify(o)).join(',' + NL), '];',
  'G.LADDERS = ' + JSON.stringify(LADDERS) + ';',
  'G.DISCIPLE = ' + JSON.stringify(DISCIPLE) + ';   // 제자 등급(문파). 직위와 따로 오른다',
  'G.ART_ACCESS = ' + JSON.stringify(ACCESS) + ';   // 자리별로 열리는 무공 등급',
  'G.RELATION = ' + JSON.stringify(RELATION) + ';   // 성향 쌍 기본 관계',
  'G.RIVALS = ' + JSON.stringify(RIVALS) + ';',
  'G.ALLIES = ' + JSON.stringify(ALLIES) + ';',
  'G.ALLIANCE_MEMBERS = ' + JSON.stringify(ALLIANCE_MEMBERS) + ';',
  'G.MINOR_SUFFIX = ' + JSON.stringify(['검문', '도문', '권문', '창문', '무관', '도관', '사', '방', '회', '채', '표국', '상단', '장']) + ';   // 군소 문파 이름 = 지명 + 접미',
  '})(typeof window !== "undefined" ? window : globalThis);', ''].join(NL);
fs.writeFileSync(path.join(ROOT, 'data/factions.js'), body);
const cnt = {}; for (const o of all) cnt[o.cat] = (cnt[o.cat] || 0) + 1;
console.log('factions', all.length, cnt, 'no style', all.filter(o => !o.style).map(o => o.id));
