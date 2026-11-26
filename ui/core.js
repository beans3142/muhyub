// 화면 버전들이 함께 쓰는 부분(9-56): 기록·해금·그림 고르기·진행. 화면 그리기는 버전마다 따로 한다
const L = LIFE; L.init();
const $ = id => document.getElementById(id);
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const sleep = ms => new Promise(r => setTimeout(r, ms));
const R = L.REALMS, GORDER = ['神', '天', '地', '玄', '黃'];
const yr = y => (y < 0 ? '기원전 ' + -y : y) + '년';

// ---------- 기록 ----------
const KEY = 'gangho_v3';
const old = JSON.parse(localStorage.getItem('gangho_v2') || '{}');
const rec = Object.assign({ lives: 0, endings: {}, achs: {}, origins: [], traits: [], legends: [], on: {}, pick: {} }, old.endings ? { lives: old.lives || 0, endings: old.endings, achs: old.achs || {}, origins: old.origins || [], traits: old.traits || [] } : {}, JSON.parse(localStorage.getItem(KEY) || '{}'));
const save = () => localStorage.setItem(KEY, JSON.stringify(rec));
const endCount = () => Object.values(rec.endings).reduce((a, e) => a + e.c, 0);
const endKinds = g => Object.values(rec.endings).filter(e => !g || g.includes(e.g)).length;
const has = n => !!rec.achs[n];

// ---------- 해금(켜고 끄기, 10단계 9-10) ----------
const CH = [[-500, -222, '검의 시대'], [-221, 219, '제국과 유협'], [220, 588, '산문의 시작'], [589, 906, '승병과 이교'], [907, 1126, '문파의 태동'], [1127, 1278, '구파 정립'], [1279, 1367, '명교와 홍건'], [1368, 1449, '마교의 굴기'], [1450, 1549, '강호의 전성기'], [1550, 1643, '왜구와 동영'], [1644, 1779, '반청'], [1780, 1840, '황혼']];
// 해금(9-25): 켜고 끄기만. 자질·재산은 하·중·상 세 칸이고, 켠 것 가운데 가장 높은 칸이 적용된다
const APT_TIERS = { 근골: [['첫걸음', '삼류에 오르면'], ['소년고수', '스무 살 전에 일류가 되면'], ['벽을 넘다', '절정에 오르면']], 오성: [['대성', '무공 하나를 대성하면'], ['무공 창안', '무공을 지으면'], ['신공', '신공을 익히면']], 심성: [['사부님', '스승을 모시면'], ['주화입마를 넘다', '주화입마를 이겨 내면'], ['폐관 수련', '세 해를 이어 폐관하면']], 기연: [['기연', '기연을 만나면'], ['세 번의 기연', '한 생에 기연을 세 번 만나면'], ['전설의 무덤', '전설 고수의 무덤에 닿으면']], 풍모: [['첫 만남', '마음에 둔 사람이 생기면'], ['혼례', '혼례를 올리면'], ['명동일방', '명동일방에 이르면']] };
const TIER = [['하', 5], ['중', 10], ['상', 20]];
const UNLOCKS = [
  ...Object.entries(APT_TIERS).flatMap(([k, l]) => l.map(([ach, why], i) => ({ id: `apt_${k}_${i}`, n: `${k} (${TIER[i][0]})`, d: `${k} +${TIER[i][1]}`, open: () => has(ach), why: `${why} 열린다`, apt: k, add: TIER[i][1] }))),
  { id: 'rich_0', n: '재산 (하)', d: '집안 재산 ×3', open: () => has('돈으로 산 강함'), why: '가게에서 물건을 사면 열린다', wealth: 3 },
  { id: 'rich_1', n: '재산 (중)', d: '집안 재산 ×10', open: () => has('부자'), why: '한 생에 만 냥을 모으면 열린다', wealth: 10 },
  { id: 'rich_2', n: '재산 (상)', d: '집안 재산 ×30', open: () => has('거부'), why: '한 생에 십만 냥을 모으면 열린다', wealth: 30 },
  { id: 'reveal', n: '제 몸을 안다', d: '타고난 특성을 처음부터 안다', open: () => endCount() >= 3, why: '세 번 살아 보면 열린다' },
  { id: 'extra', n: '한 번 더 타고난다', d: '큰 특성을 한 번 더 굴린다', open: () => endKinds(['玄', '地', '天', '神']) >= 1, why: '玄 이상으로 생을 마치면 열린다' },
  { id: 'traitX2', n: '하늘의 총애', d: '큰 특성이 두 배 잘 나온다', open: () => endKinds(['地', '天', '神']) >= 3, why: '地 이상의 끝을 세 가지 보면 열린다' },
  { id: 'longLife', n: '장수 집안의 피', d: '「장수 집안」(수명 +12)을 타고난다', open: () => has('백세'), why: '백 살을 넘기면 열린다' },
  { id: 'masterLuck', n: '스승 복', d: '고수가 먼저 찾아와 제자로 삼겠다는 일이 두 배', open: () => has('스승의 부름') && has('청출어람'), why: '스승의 부름을 받고, 그 스승을 넘어서면 열린다' },
  { id: 'founder', n: '개파조사의 기억', d: '세력을 세우는 데 드는 돈이 절반', open: () => has('삼대 제자') || has('큰 세력의 주인'), why: '삼대 제자를 두거나 큰 세력의 주인이 되면 열린다' },
];
function buildOpts() {
  const o = { legends: rec.legends.slice(-60), aptBonus: {} }, on = id => rec.on[id] && (UNLOCKS.find(u => u.id === id) || { open: () => false }).open();
  for (const u of UNLOCKS) if (u.apt && on(u.id)) o.aptBonus[u.apt] = Math.max(o.aptBonus[u.apt] || 0, u.add);
  for (const u of UNLOCKS) if (u.wealth && on(u.id)) o.wealthMul = Math.max(o.wealthMul || 1, u.wealth);
  if (on('reveal')) o.revealTraits = true;
  if (on('extra')) o.extraBig = true;
  if (on('traitX2')) o.traitX2 = true;
  if (on('longLife')) o.longLife = true;
  if (on('masterLuck')) o.masterLuck = true;
  if (on('founder')) o.founder = true;
  return o;
}
// ---------- 초상(10단계 9-11) ----------
const CAREER_B = { farm: 1, fisher: 3, hunter: 5, herb: 7, smith: 9, merchant: 11, cook: 13, craft: 15, artist: 17, troupe: 19, geomancer: 21, scholar: 22, military: 24, eunuch: 26, doctor: 27, thief: 29 };
const CAT_C = ['구파일방', '세가', '연합', '사교', '흑도', '암중', '관부', '오악도불', '새외', '생업'];
const pad = n => String(n).padStart(2, '0');
// 세력 초상(docs/p11-cast.md 3장): 직위를 네 단(0 삼대제자, 1 일대·이대제자, 2 장로, 3 수장)으로 묶는다
// 직위 이름으로 네 단을 정한다(사다리 길이가 바뀌어도 맞게): 맨 위는 수장, 장로·원로·호법·부수장 급은 장로, 맨 아래 견습 급은 삼대제자
const TIER_ELDER = /장로|원로|태상|호법|부교주|부맹주|군사|총관|부채주|부막주|부수뇌|6결|7결|지휘첨사|부국주|소가주|각주|^당주|^채주/;
const TIER_LOW = /입문|평제자|방계|맹원|조원|교도|하급|졸개|행동대원|^1결|^2결|심부름|정보원|견습|말단|소기|쟁자수/;
const facTier = (lad, rank, n) => { const nm = (LADDERS[lad] || [])[rank] || ''; return rank >= n - 1 ? 3 : TIER_ELDER.test(nm) ? 2 : TIER_LOW.test(nm) ? 0 : 1; };
// 그림의 성별: A는 번호, B는 짝홀(단독 생업 제외), C는 roster.json, F/N/M은 이름·데이터에서 읽는다
const C_FEMALE = new Set([6, 11, 14, 17, 22, 24, 26, 30]);
const hasArt = id => !!(window.FAC_ART && FAC_ART.has(id));
function artSex(id) {
  id = String(id).replace(/_\d$/, '');
  if (/^[CB]\d\d[mf]$/.test(id)) return id.slice(-1);
  if (id[0] === 'F') return id.slice(-1);
  if (id[0] === 'A') return ((+id.slice(1) - 1) % 6) >= 3 ? 'f' : 'm';
  if (id[0] === 'B') { const n = +id.slice(1); return (n <= 20 ? n % 2 === 0 : [23, 25, 28, 30, 32].includes(n)) ? 'f' : 'm'; }
  if (id[0] === 'C') return C_FEMALE.has(+id.slice(1)) ? 'f' : 'm';
  const nm = (window.NAMED || []).find(n => n.id === id); return nm ? nm.sex : 'm';
}
// 계열 그림(C): 성별이 다르면 반대 성별 그림, 없으면 같은 계열에서 성별이 맞는 가까운 단, 그것도 없으면 무인 그림
function catArt(cat, tier, sex) {
  const id = n => `C${pad(cat * 3 + n + 1)}`;
  if (artSex(id(tier)) === sex) return id(tier);
  if (hasArt(id(tier) + sex)) return id(tier) + sex;
  for (const t of [tier - 1, tier + 1, tier - 2, tier + 2]) if (t >= 0 && t <= 2 && artSex(id(t)) === sex) return id(t);
  return sex === 'f' ? 'B32' : 'B31';
}
const careerArt = (career, sex) => {
  const b = CAREER_B[career]; if (!b) return null;
  if ([21, 26].includes(b)) return sex === 'f' ? (hasArt(`B${pad(b)}f`) ? `B${pad(b)}f` : null) : `B${pad(b)}`;
  return `B${pad(b + (sex === 'f' ? 1 : 0))}`;
};
const civArt = (age, sex, wb) => `A${pad((age < 10 ? 0 : age < 18 ? 1 : age < 35 ? 2 : age < 55 ? 3 : 4) * 6 + (sex === 'f' ? 3 : 0) + wb + 1)}`;
function rawPortrait(P) {
  if (P.age >= 16 && P.member) {
    const f = L.facDef(P.member.fid), lad = LADDERS[f.lad] ? f.lad : 'sect';
    const id = `F_${f.id}_${facTier(lad, P.member.rank, LADDERS[lad].length)}${P.sex}`;
    if (hasArt(id)) return id;
  }
  if (P.age >= 16 && (P.member || P.force)) {
    let cat, tier;
    if (P.member) { const f = L.facDef(P.member.fid), lad = LADDERS[f.lad] || LADDERS.sect, fr = P.member.rank / Math.max(1, lad.length - 1); cat = CAT_C.indexOf(f.cat); if (cat < 0) cat = 7; tier = fr >= 0.95 ? 2 : fr >= 0.4 || P.realm >= 4 ? 1 : 0; }
    else { cat = { 문파: 0, 방회: 4, 산채: 4, 상단: 9 }[P.force.kind] ?? 0; tier = P.force.men >= 50 ? 2 : 1; }
    return catArt(cat, tier, P.sex);
  }
  if (P.age >= 16 && P.career) { const b = careerArt(P.career, P.sex); if (b) return b; }
  if (P.age >= 16 && P.flags.ronin && P.arts.length) return P.sex === 'f' ? 'B32' : 'B31';
  return civArt(P.age, P.sex, P._wb ?? 0);
}
// 초상은 나이 단계(10·16·35·55세)가 바뀔 때만 다시 고른다. 그 사이에 소속·생업·재산·경지가 바뀌어도 얼굴은 그대로이고,
// 다음 단계로 넘어갈 때 그때의 처지로 새로 고른다. 어린 시절은 출신 집안의 형편으로 고른다.
// 환골탈태·반로환동은 몸이 바뀌는 일이라 그 자리에서 다시 고르고, 반로환동 뒤에는 서른 살 얼굴로 돌아간다.
// 같은 자리에 그림이 여럿이면(A14, A14_2, A14_3 …) 사람마다 하나를 고정해 쓴다. 플레이어는 생의 seed, 상대는 이름으로 고른다
const hashStr = s => { let h = 2166136261; for (const c of String(s)) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; };
const variant = (id, salt) => { if (!id) return id; const vs = [id, `${id}_2`, `${id}_3`].filter((v, i) => i === 0 || hasArt(v)); return vs[hashStr(salt) % vs.length]; };
const faceStage = a => a < 10 ? 0 : a < 16 ? 1 : a < 35 ? 2 : a < 55 ? 3 : 4;
function portrait(P) {
  const reborn = (P.traits || []).filter(t => /환골탈태|반로환동/.test(t.n)).length;
  const age = P.flags && P.flags.rejuv ? Math.min(P.age, 30) : P.age;
  const key = `${faceStage(age)}|${reborn}`;
  if (!P._face || P._face.key !== key) {
    const ow = P.origin ? P.origin.wealth || 0 : 1;
    P._wb = age < 16 ? (ow === 0 ? 0 : ow <= 2 ? 1 : 2) : (P.wealth < 30 ? 0 : P.wealth < 1000 ? 1 : 2);
    P._face = { key, id: variant(rawPortrait(age === P.age ? P : Object.assign(Object.create(P), { age })), P.seed) };
  }
  return P._face.id;
}
// 상대의 얼굴(사건·갈림길). 이름난 사람이면 그 사람 그림, 아니면 소속·역할·성별·나이로 고른다
function npcFace(n, P) { const id = npcFace0(n, P); return id && id[0] !== 'N' && id[0] !== 'M' ? variant(id, n.name || n.role) : id; }
function npcFace0(n, P) {
  if (!n) return null;
  const sex = n.sex === 'f' ? 'f' : 'm', role = n.role || '';
  const nm = (window.NAMED || []).find(x => x.name === n.name);
  if (nm && hasArt(nm.id)) return nm.id;
  const age = n.age || (/아이|또래|소년|소녀|어린/.test(role) ? 12 : /노인|노파|노승|장로|늙은|할/.test(role) ? 65 : /정인|마음에 둔|배우자|혼약/.test((n.rels || []).join()) ? (P ? P.age : 25) : n.realm >= 4 ? 45 : 28);
  if (age < 16) return civArt(age, sex, hashStr(n.name || role) % 3);
  if (n.fid) {
    const f = L.facDef(n.fid);
    if (f) {
      const lad = LADDERS[f.lad] ? f.lad : 'sect', L0 = LADDERS[lad], rk = /장문|가주|교주|방주|맹주|채주/.test(role) ? L0.length - 1 : /장로|호법/.test(role) ? Math.max(0, L0.findIndex(x => TIER_ELDER.test(x))) : n.realm >= 4 ? Math.min(3, L0.length - 2) : 1;
      const id = `F_${f.id}_${facTier(lad, rk, LADDERS[lad].length)}${sex}`;
      if (hasArt(id)) return id;
      return catArt(Math.max(0, CAT_C.indexOf(f.cat)), /장문|가주|교주|방주|맹주/.test(role) ? 2 : n.realm >= 4 ? 1 : 0, sex);
    }
  }
  const boss = /두목|채주|우두머리|수령|대장/.test(role) ? 2 : n.realm >= 3 ? 1 : 0;
  if (/산적|녹림|수적|도적|왈패|패거리|흑도|채주|강도/.test(role)) return catArt(4, boss, sex);
  if (/마교|마두|사교|혈교/.test(role)) return catArt(3, boss, sex);
  if (/살수|자객|추살|밀정/.test(role)) return catArt(5, boss, sex);
  if (/포쾌|포졸|관병|관리|금의위|관원|군관|현령/.test(role)) return catArt(6, boss, sex);
  if (/스님|승려|노승|도사|비구니|사태/.test(role)) return catArt(7, boss, sex);
  if (/왜구|낭인|새외|오랑캐/.test(role)) return catArt(8, boss, sex);
  const CR = { 상인: 'merchant', 객잔: 'cook', 숙수: 'cook', 의원: 'doctor', 대장장이: 'smith', 사냥꾼: 'hunter', 어부: 'fisher', 농부: 'farm', 약초: 'herb', 기녀: 'artist', 악사: 'artist', 광대: 'troupe', 선비: 'scholar', 서생: 'scholar', 도둑: 'thief', 풍수: 'geomancer', 장인: 'craft' };
  for (const k in CR) if (role.includes(k)) { const b = careerArt(CR[k], sex); if (b) return b; }
  if (/표사|표두/.test(role)) return catArt(9, boss, sex);
  // 소속 없는 무인과 범인은 이름으로 그림 하나를 고정해 고른다. 같은 그림이 줄줄이 겹치지 않게 한다
  const h = hashStr(n.name || role);
  if (n.realm >= 2 || /무사|검객|고수|관주|사범|제자/.test(role)) { const pool = MARTIAL_POOL.filter(id => artSex(id) === sex); return pool[h % pool.length]; }
  return civArt(age, sex, h % 3);
}
const MARTIAL_POOL = ['B31', 'B32', ...[0, 1, 2, 8, 9].flatMap(c => [0, 1].map(t => `C${pad(c * 3 + t + 1)}`))];

// ---------- 그림 주소 ----------
const faceSrc = id => id ? `art/thumbs/${id}.webp` : '';
const bodySrc = id => id ? `art/chars/${id}.png` : '';
const imgTag = (id, cls = '', big = false) => id ? `<img class="${cls}" src="${big ? bodySrc(id) : faceSrc(id)}" onerror="this.onerror=null;this.src='${big ? faceSrc(id) : bodySrc(id)}'" alt="">` : '';

// ---------- 한 생의 끝 기록 ----------
function recordEnding(P, e) {
  const before = UNLOCKS.filter(u => u.open()).map(u => u.id);
  const firstEnd = !rec.endings[e.name];
  const newA = [...P.ach].filter(a => !rec.achs[a]);
  rec.lives++;
  rec.endings[e.name] = { g: e.grade, c: (rec.endings[e.name] || { c: 0 }).c + 1 };
  for (const a of P.ach) rec.achs[a] = (rec.achs[a] || 0) + 1;
  if (!rec.origins.includes(P.origin.id)) rec.origins.push(P.origin.id);
  for (const t of P.traits) if (!L.MINOR_IDS.has(t.id) && !L.isHidden(P, t) && !rec.traits.includes(t.id)) rec.traits.push(t.id);
  rec.legends.push(L.legendOf(P)); if (rec.legends.length > 300) rec.legends.shift();
  rec.last = L.lastOf(P);
  save();
  return { firstEnd, newA, opened: UNLOCKS.filter(u => u.open() && !before.includes(u.id)), summary: L.summary(P) };
}

// ---------- 기록 한 줄 목록 ----------
// P.log의 해마다 카드에서 줄을 꺼낸다. 각 줄은 { age, year, place, m, t, cls }
function allLines(P) { const out = []; for (const c of P.log) for (const l of c.lines) out.push({ age: c.age, year: c.year, place: c.place, m: l.m, t: l.t, cls: l.cls || '' }); return out; }
const plain = t => String(t || '').replace(/<[^>]+>/g, '');

// ---------- 진행 ----------
// 화면은 hooks로 받는다.
//  onAsk(q) → Promise<답>        갈림길(q.ask, q.text, q.options, q.who/npc, q.input)
//  onResult(r) → Promise          갈림길 직후의 결과 { title, pick, lines, deltas, face }
//  onTick(kind)                   'month' | 'year' | 'start'
//  onEnd(e, rec)                  생의 끝
const Game = {
  P: null, speed: 1, paused: false, auto: false, hooks: null,
  async wait(ms) { let t = 0; while (t < ms || this.paused) { await sleep(40); if (!this.paused) t += 40 * this.speed; } },
  async start(hooks, opts) {
    this.hooks = hooks;
    const P = this.P = L.create(Object.assign(buildOpts(), opts || {})); P.auto = this.auto;
    const gen = L.run(P), run = this.run = (this.run || 0) + 1;
    let r = gen.next(), ticks = 0;
    hooks.onTick && hooks.onTick('start');
    while (!r.done) {
      if (this.run !== run) return; // 새 생이 시작되면 이전 진행은 멈춘다
      let ans;
      if (r.value && r.value.ask) {
        hooks.onTick && hooks.onTick('ask');
        const q = r.value, snap = L.snapshot(P), from = allLines(P).length;
        const face = npcFace(q.who || q.npc, P);
        // 점검용 빨리 감기: 목표 나이(필요하면 얼굴 있는 갈림길)까지는 아무거나 고른다
        const D = this.demo, skip = D && !D.hit && (P.age < D.age || (D.face && !face));
        if (D && !D.hit && !skip) { D.hit = true; hooks.onDemo && hooks.onDemo(D); }
        if (skip) { r = gen.next(q.input ? null : Math.floor(Math.random() * q.options.length)); continue; }
        ans = this.auto ? (q.input ? null : Math.floor(Math.random() * q.options.length)) : D && D.st === 'res' && !D.done ? (D.done = true, 0) : await hooks.onAsk(q, face);
        if (this.auto && hooks.onAuto) hooks.onAuto(q, ans);
        r = gen.next(ans);
        // 다음 멈춤까지 엔진을 돌린 뒤 무엇이 바뀌었는지 센다
        if (hooks.onResult && !(r.value && r.value.ask)) {
          const lines = allLines(P).slice(from).filter(l => l.cls !== 'pick' && l.cls !== 'world' && plain(l.t).trim() !== plain(q.text).trim());
          const pick = typeof ans === 'string' ? ans : q.options[ans] ? q.options[ans][0] : '';
          const deltas = L.diff(P, snap);
          if (!lines.length && !deltas.length) continue; // 그냥 지나친 선택은 결과 카드를 띄우지 않는다
          if (!this.auto) await hooks.onResult({ title: q.ask, pick, lines, deltas, face, month: q.month });
          else if (hooks.onAutoResult) hooks.onAutoResult({ title: q.ask, pick, lines, deltas, face });
        }
        continue;
      }
      if (this.demo && !this.demo.hit) {
        if (this.demo.st === 'idle' && P.age >= this.demo.age) { this.demo.hit = true; this.paused = true; hooks.onDemo && hooks.onDemo(this.demo); }
        else { r = gen.next(ans); continue; }
      }
      if (r.value && r.value.tick === 'month') { ticks++; hooks.onTick && hooks.onTick('month', ticks); await this.wait(P.age < 6 ? 40 : 110); }
      else if (r.value && r.value.tick === 'year') { hooks.onTick && hooks.onTick('year'); await this.wait(120); }
      r = gen.next(ans);
    }
    if (this.demo && !this.demo.hit && this.demo.tries++ < 40) { this.demo.seed++; seedRandom(this.demo.seed); return this.start(hooks, opts); } // 목표 나이 전에 죽으면 다시
    hooks.onTick && hooks.onTick('end');
    await this.wait(800);
    const info = recordEnding(P, r.value);
    hooks.onEnd && hooks.onEnd(r.value, info);
  },
};

// ---------- 화면 공용 글귀 ----------
const roleText = P => { if (P.age < 10) return '어린 날'; const f = P.member && L.facDef(P.member.fid), c = P.career && L.careerDef(P.career); return f ? `${f.n} · ${L.rankName(P)}` : P.force ? `${P.force.name} ${L.forceTitle(P)}` : c ? `${c.n} · ${c.lad[P.rung]}` : P.age >= 18 ? L.roninTitle(P) : '어린 날'; };
// 처음 하는 사람을 위한 설명(9-58)
const GUIDE = [
  '한 사람의 일생을 태어날 때부터 지켜본다. 시간은 저절로 흐르고, 멈춤·빠르기를 고를 수 있다.',
  '갈림길이 오면 고른다. 고른 결과와 바뀐 것(명성·재산·경지·인연…)이 바로 보인다.',
  '열다섯 살부터 방침(한 해를 무엇에 쓸지)을 정하고, 열두 살부터 지도에서 갈 곳을 고를 수 있다.',
  '죽으면 한 생이 끝난다. 이룬 일이 업적으로 남고, 업적이 다음 생의 「타고날 것」을 연다.',
];
const TIP = {
  realm: '경지: 범인(무공 없는 보통 사람) → 삼류 → 이류 → 일류 → 절정 → 초절정 → 화경 → 현경. 막대는 다음 경지까지 얼마나 찼는지다',
  ww: '무위: 싸움 실력을 하나로 센 값. 경지가 오르면 크게 뛴다',
  fame: '명성: 강호에 이름이 알려진 정도. 무명소졸에서 시작한다',
  plan: '방침: 한 해를 무엇에 쓸지. 수련·생업·유랑 등에 따라 크는 것과 만나는 일이 달라진다',
  speed: '시간 빠르기. Space로 멈추고 다시 흐르게 한다',
  auto: '켜면 갈림길에서 멈추지 않고 아무것이나 고른다',
};
// 시작 화면의 「타고날 것」: 아직 하나도 안 열렸으면 목록 대신 한 줄로
function unlockIntro(render) { const open = UNLOCKS.filter(u => u.open()).length; return open ? render() : `<p style="opacity:.75;font-size:14px;grid-column:1/-1;margin:0">지난 생의 업적으로 「타고날 것」이 열린다. 지금은 열린 것이 없다(0/${UNLOCKS.length}).</p>`; }
const guideHTML = cls => `<ol class="${cls || 'guide'}">${GUIDE.map(g => `<li>${g}</li>`).join('')}</ol>`;
const bodyText = P => P.hurt ? ['', '경상', '중상', '위중'][P.hurt] : P.poison ? '중독' : '성함';
const wwText = P => { const w = L.wuwei(P); return w >= 100 ? Math.round(w).toLocaleString() : w.toFixed(1); };
const realmText = P => R[P.realm] + (P.realm ? ' ' + L.STAGES[P.stage] : '');
const nameText = P => P.dharma || P.name || '';
// 한 해 안의 줄을 달 순서로(달이 없는 줄은 앞 줄의 달을 따른다)
function byMonth(ls) { let m = 0; return ls.map((l, i) => ({ l, i, m: l.m ? (m = l.m) : m })).sort((a, b) => a.m - b.m || a.i - b.i).map(x => x.l); }
const INV_ICON = { 병기: '劍', 보물: '寶', 약기: '藥', 비급: '書', 가게: '店', 장원: '莊', 투자: '錢', 요리: '食', '벼린 칼': '鍛' };
const BOND_ORDER = ['배우자', '정인', '혼약', '마음에 둔 사람', '스승', '제자', '의형제', '벗', '수하', '맞수', '원수', '은인'];
function bondList(P) { const rk = b => Math.min(...b.rels.map(r => { const i = BOND_ORDER.indexOf(r); return i < 0 ? 99 : i; })); return P.bonds.filter(b => b.rels.length).sort((a, b) => (b.alive - a.alive) || rk(a) - rk(b)); }
const nextText = P => { const ax = L.nextAxes(P); if (!ax) return null; return { to: ax.to, fill: ax.rows.reduce((a, r) => a + r[2], 0) / ax.rows.length, need: ax.ok.every(Boolean) ? '문턱에 섰다' : '모자란 것: ' + ax.rows.filter((r, i) => !ax.ok[i]).map(r => r[0]).join(', ') }; };

// ---------- 지도 ----------
// 활동 범위(all이면 천하)를 맞춰 그린 SVG와 볼일 있는 곳 목록. 점은 .pl[data-p]
const PLACE_T = { 성: '큰 고을', 진: '작은 고을', 산: '산', 물: '물가', 관문: '관문', 새외: '새외', 섬: '섬', 특수: '이름난 곳' };
function mapView(P, o = {}) {
  const M = L.mapData(P), here = M.places.find(p => p.id === M.here), sel = o.sel ? M.places.find(p => p.id === o.sel) : null;
  const dist = p => here ? Math.hypot(p.x - here.x, p.y - here.y) : 0;
  const box = o.all ? M.places : M.places.filter(p => p.reach || p.id === M.here);
  let pad = 30, ar = o.aspect || 1.45, x0 = Math.min(...box.map(p => p.x)) - pad, y0 = Math.min(...box.map(p => p.y)) - pad;
  let W = Math.max(...box.map(p => p.x)) - x0 + pad, H = Math.max(...box.map(p => p.y)) - y0 + pad;
  if (W < 220) { const cx = x0 + W / 2; W = 220; x0 = cx - W / 2; } if (H < 150) { const cy = y0 + H / 2; H = 150; y0 = cy - H / 2; } // 어릴 때는 범위가 좁아도 둘레가 보이게
  if (W / H < ar) { x0 -= (H * ar - W) / 2; W = H * ar; } else { y0 -= (W / ar - H) / 2; H = W / ar; } // 가운데를 맞춰 늘린다
  const fs = W / (o.fs || 60), X = p => p.x - x0, Y = p => p.y - y0;
  const regs = {}; for (const p of M.places) (regs[p.r] = regs[p.r] || []).push(p);
  const regTxt = Object.entries(regs).map(([r, l]) => { const cx = l.reduce((a, p) => a + p.x, 0) / l.length - x0, cy = l.reduce((a, p) => a + p.y, 0) / l.length - y0; return cx > 0 && cx < W && cy > 0 && cy < H ? `<text x="${cx}" y="${cy}" font-size="${fs * 2.4}" fill="${o.ink || '#1f1913'}" opacity=".08" text-anchor="middle" font-weight="900">${esc(r)}</text>` : ''; }).join('');
  const ink = o.ink || '#1f1913', dim = o.dim || '#a99d80';
  const pts = M.places.map(p => {
    const me = p.id === M.here, col = me ? '#c0392b' : p.mark ? '#c8961e' : p.reach ? (o.dot || '#5d5141') : (o.far || '#cbbf9f'), r = (me ? 1.6 : p.t === '성' ? 1 : 0.65) * fs * 0.45;
    const lab = me || p.mark || p.id === o.sel || (p.t === '성' && p.reach) || (o.all && p.t === '성');
    return `<g class="pl ${p.reach ? 'can' : ''}" data-p="${p.id}" style="cursor:pointer"><circle cx="${X(p)}" cy="${Y(p)}" r="${fs * 0.9}" fill="transparent"/>${p.id === o.sel ? `<circle cx="${X(p)}" cy="${Y(p)}" r="${r * 2.2}" fill="none" stroke="#c0392b"/>` : ''}<circle cx="${X(p)}" cy="${Y(p)}" r="${r}" fill="${col}"/>${lab ? `<text x="${X(p) + r + 2}" y="${Y(p) + fs * 0.35}" font-size="${fs}" fill="${p.reach || me ? ink : dim}" font-weight="${me || p.mark ? 700 : 400}">${esc(p.n)}</text>` : ''}<title>${esc(p.n)}${p.mark ? ' — ' + p.mark.map(m => m.k + ': ' + m.t).join(', ') : ''}</title></g>`;
  }).join('');
  const line = sel && here ? `<line x1="${X(here)}" y1="${Y(here)}" x2="${X(sel)}" y2="${Y(sel)}" stroke="#c0392b" stroke-width="${fs / 8}" stroke-dasharray="${fs / 2} ${fs / 2}"/>` : '';
  const pend = M.pending && here ? M.places.find(p => p.id === M.pending) : null;
  const pline = pend ? `<line x1="${X(here)}" y1="${Y(here)}" x2="${X(pend)}" y2="${Y(pend)}" stroke="#c8961e" stroke-width="${fs / 5}"/>` : '';
  // 지나온 길(o.trail: 지명 id 목록)
  const tp = (o.trail || []).map(id => window.PLACES2[id]).filter(Boolean);
  const trail = tp.length > 1 ? `<polyline points="${tp.map(p => `${p.x - x0},${p.y - y0}`).join(' ')}" fill="none" stroke="${o.trailColor || '#c8961e'}" stroke-width="${fs / 7}" stroke-opacity=".55" stroke-linejoin="round"/>` : '';
  return { M, here, sel, svg: `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" style="width:100%;height:100%;display:block">${regTxt}${trail}${pline}${line}${pts}</svg>`, marked: M.places.filter(p => p.mark && p.id !== M.here).sort((a, b) => dist(a) - dist(b)) };
}

// 점검용 주소: v1.html#demo=23&s=지도&st=ask|res|idle&face=1&seed=7
function seedRandom(n) { let a = n >>> 0; Math.random = () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
Game.demoArgs = function () {
  const m = new URLSearchParams(decodeURIComponent(location.hash.slice(1))); if (!m.has('demo')) return null;
  const d = { age: +m.get('demo'), s: m.get('s'), st: m.get('st') || 'ask', face: m.get('face') === '1', seed: +(m.get('seed') || 1), tries: 0, hit: false, done: false };
  seedRandom(d.seed); this.demo = d; return d;
};

// 마우스를 올리면 바로 설명이 뜬다([data-tip])
function installTips(tipEl) {
  document.addEventListener('mouseover', e => { const el = e.target.closest && e.target.closest('[data-tip]'); if (!el || !el.dataset.tip) { tipEl.style.display = 'none'; return; } tipEl.textContent = el.dataset.tip; tipEl.style.display = 'block'; });
  document.addEventListener('mousemove', e => { if (tipEl.style.display !== 'block') return; const w = tipEl.offsetWidth, h = tipEl.offsetHeight; let x = e.clientX + 14, y = e.clientY + 16; if (x + w > innerWidth - 8) x = e.clientX - w - 10; if (y + h > innerHeight - 8) y = e.clientY - h - 10; tipEl.style.left = x + 'px'; tipEl.style.top = y + 'px'; });
}
const traitTip = t => `${t.tier || ''} · ${clean(t.e)}`;
const artLevel = s => s >= 12 ? '대성' : s >= 10 ? '극성' : s >= 7 ? '중성' : s >= 4 ? '소성' : '입문';
const FXW = { train: '수련', enlight: '깨달음', ng: '축기', cap: '상한', grow: '성장', check: '판정', mastery: '성취', capa: '단전', inner: '내공', real: '실전', life: '수명', death: '요절 위험', flow: '운용', mind: '상단전', mul: '배율', start: '시작', max: '최대', fiber: '근섬유', luck: '운', deviate: '주화입마', break: '돌파', resolve: '결단', career: '생업', bond: '인연', align: '성향', aging: '노화', stat: '자질', eventRate: '사건' };
const clean = e => String(e || '').replace(/`/g, '').replace(/\b([a-zA-Z]+)\b/g, w => FXW[w] || w);
const PROJECT_NAME = { decode: '잔결 비급 해독', manor: '장원을 짓는다', revenge: '원수를 쫓는 길', pupil: '아이 하나를 길러 낸다', journey: '천하를 한 바퀴 돈다', create: '평생의 무공을 짓는다' };
