// 네임드 인물. 규칙: docs/p11-cast.md 2장.
// 지난 생 기록(LIFE.legendOf)과 같은 키(name, ep, born, died, realm, place, art)에 다음을 더한다.
// id 초상 파일 이름 · sex m|f · fid 소속 세력 id(null이면 무소속) · rank founder|head|elder|disciple|null · kind real|made
// realm은 REALMS 번호(3 일류, 4 절정, 5 초절정, 6 화경, 7 현경) · look 초상 프롬프트용 외형(영어)
(function (G) {
G.NAMED = [
  // 실존·전설
  { id: 'N01', kind: 'real', name: '구야자', ep: null, sex: 'm', born: -540, died: -470, realm: 3, fid: null, rank: null, place: 'shaoxing', art: '월녀검법',
    look: 'legendary sword smith of the Yue kingdom, about 65: short and wiry, sinewy scarred forearms, burn marks on the hands, deep-set squinting eyes, sparse white beard, hair tied back with a leather cord. Bare-chested under a scorched leather apron, rough hemp trousers. Holds a freshly forged bronze sword upright in tongs, a forge hammer at the belt.' },
  { id: 'N02', kind: 'real', name: '형가', ep: null, sex: 'm', born: -260, died: -227, realm: 4, fid: null, rank: null, place: 'changan', art: '자객패검공',
    look: 'assassin of the late Warring States, about 35: lean and tall, hollow cheeks, calm cold eyes, thin lips pressed shut, short stubble, hair in a plain topknot. Plain dark grey Warring States travel robe with wide sleeves, cloth wrapped shins. Holds a rolled bamboo map scroll with the hilt of a short dagger just showing from inside the roll.' },
  { id: 'N03', kind: 'real', name: '서복', ep: null, sex: 'm', born: -255, died: -200, realm: 3, fid: null, rank: null, place: 'quanzhou', art: null,
    look: 'Qin court fangshi alchemist, about 55: plump soft face, small clever eyes, neatly trimmed goatee, black Qin-style tall cap. Layered black and dark red Qin court robe. Holds a gourd of elixir and a bundle of bamboo slips, a small bronze compass spoon at the waist.' },
  { id: 'N04', kind: 'real', name: '장릉', ep: '천사', sex: 'm', born: 34, died: 156, realm: 6, fid: null, rank: null, place: 'qingcheng', art: '오뢰정법',
    look: 'Han-dynasty Taoist patriarch, about 70: tall and thin, long flowing white beard and eyebrows, serene half-closed eyes, white hair in a crown topknot with a jade guan. Plain hemp Taoist robe, yellow paper talismans tucked in the sash. Peachwood sword in one hand, a talisman between two fingers of the other.' },
  { id: 'N05', kind: 'real', name: '발타', ep: null, sex: 'm', born: 440, died: 520, realm: 5, fid: 'shaolin', rank: 'founder', place: 'songshan', art: '나한권',
    look: 'Indian Buddhist monk who opened Shaolin temple, about 60: lean brown-skinned face, shaved head, short grey beard, calm heavy-lidded eyes, long earlobes. Saffron monk robe over one shoulder, wooden prayer beads, straw sandals. Holds a monk staff with metal rings, the other palm raised in blessing.' },
  { id: 'N06', kind: 'real', name: '달마', ep: null, sex: 'm', born: 470, died: 536, realm: 6, fid: 'shaolin', rank: null, place: 'songshan', art: '역근경',
    look: 'Indian Buddhist monk Bodhidharma, about 60: dark skin, shaved head, thick black curly beard, heavy bushy eyebrows, large intense staring eyes, gold earring in one ear, broad shoulders. Faded red patched monk robe over one shoulder, barefoot. Arms folded inside the sleeves, one straw sandal hanging from a staff over the shoulder.' },
  { id: 'N07', kind: 'real', name: '모자원', ep: null, sex: 'm', born: 1096, died: 1166, realm: 4, fid: 'bailian', rank: 'founder', place: 'yingzhou', art: '미륵중심법',
    look: 'Song-dynasty Buddhist monk who founded the White Lotus teaching, about 45: shaved head with faint stubble, gentle round face, small kind eyes, slight smile. Plain white monk robe, long string of wooden prayer beads. A single white lotus flower in one hand, a sutra book in the other.' },
  { id: 'N08', kind: 'real', name: '악비', ep: null, sex: 'm', born: 1103, died: 1142, realm: 5, fid: 'jinjun', rank: null, place: 'kaifeng', art: '뢰정창법',
    look: 'Southern Song general, about 35: strong square jaw, short black beard, stern straight brows, upright stance. Song-dynasty lamellar armor, red cloak, helmet with a red tassel. Long spear planted upright.' },
  { id: 'N09', kind: 'real', name: '왕중양', ep: null, sex: 'm', born: 1113, died: 1170, realm: 6, fid: 'quanzhen', rank: 'founder', place: 'zhongnan', art: '천강북두진',
    look: 'Taoist founder of the Quanzhen school, about 55: lean weathered face, sharp bright eyes, long black beard with grey streaks, hair in a topknot under a simple black Taoist cap. Grey-blue Taoist robe with a sash, worn cloth shoes. Horsetail whisk in hand, a long sword in a plain scabbard on the back.' },
  { id: 'N10', kind: 'real', name: '장삼봉', ep: null, sex: 'm', born: 1247, died: 1417, realm: 7, fid: 'wudang', rank: 'founder', place: 'wudang', art: '태극신공',
    look: 'Taoist hermit, very old about 100 but upright: tall and bony, untidy long white hair and beard, large ears, clear calm eyes, slight smile. Shabby patched grey Taoist robe, conical straw hat hanging on the back, straw sandals. Relaxed tai chi stance, one palm forward and one palm down.' },
  { id: 'N11', kind: 'real', name: '주원장', ep: null, sex: 'm', born: 1328, died: 1398, realm: 3, fid: null, rank: null, place: 'fengyang', art: null,
    look: 'rebel general who became the Ming founding emperor, about 40: rough peasant face, long protruding jaw, pockmarked skin, heavy brows, small hard eyes, short beard. Red rebel headscarf, worn leather and iron armor over a red tunic. One hand on a broad saber hilt, the other on the hip. Do not beautify.' },
  { id: 'N12', kind: 'real', name: '정화', ep: null, sex: 'm', born: 1371, died: 1433, realm: 4, fid: null, rank: null, place: 'quanzhou', art: null,
    look: 'Ming admiral and eunuch, about 35: very tall and broad, beardless smooth face, large forehead, deep commanding eyes. Dark red Ming official robe with a square embroidered chest badge, black official hat with side wings. Rolled sea chart in one hand, a brass compass at the belt.' },
  { id: 'N13', kind: 'real', name: '여사낭', ep: null, sex: 'f', born: 1705, died: 1733, realm: 5, fid: null, rank: null, place: 'beijing', art: null,
    look: 'legendary woman avenger of the Qing era, about 25: slender and tense, sharp narrow eyes, pale face set hard, black hair in a tight Qing-style braid bun. Black close-fitting night clothes with cloth-bound wrists. Short sword reversed along the forearm, the other hand on a rope at the waist.' },

  // 창작 — 검의 시대
  { id: 'M01', kind: 'made', name: '백리항', ep: '일검개천', sex: 'm', born: -488, died: -401, realm: 6, fid: 'jianke', rank: 'head', place: 'shaoxing', art: '협객섬절검식',
    look: 'founding sword master of the Warring States, about 50: tall and spare, long face, a scar through the left eyebrow, quiet steady eyes, black hair with grey at the temples in a plain topknot. Faded brown hemp robe, cloth belt. Long bronze sword held low and sheathed.' },
  { id: 'M02', kind: 'made', name: '공야무', ep: '철편귀', sex: 'm', born: -420, died: -361, realm: 4, fid: null, rank: null, place: 'taihang', art: null,
    look: 'bandit chief of the Warring States, about 40: huge and hairy, broken nose, thick beard, gap-toothed grin, wild hair tied with rope. Fur vest over bare chest, leather bracers. Iron chain whip coiled over one shoulder. Do not beautify.' },
  { id: 'M03', kind: 'made', name: '단소아', ep: '월하자', sex: 'f', born: -330, died: -284, realm: 4, fid: null, rank: null, place: 'changan', art: '어장일쾌검법',
    look: 'woman assassin of the Warring States, about 24: small and light, sharp chin, cold dark eyes above a black cloth mask over the lower face, black hair in a tight bun. Black short robe and leggings. A short dagger in each hand held reversed.' },
  // 제국과 유협
  { id: 'M04', kind: 'made', name: '주가량', ep: '관중대협', sex: 'm', born: -160, died: -92, realm: 4, fid: null, rank: null, place: 'changan', art: null,
    look: 'Han-dynasty wandering knight-errant, about 45: broad-shouldered, open friendly face, thick black beard, laugh lines, black hair in a topknot with a cloth band. Dark green Han robe with a wide belt, a wine cup in one hand. Plain iron straight sword at the hip.' },
  { id: 'M05', kind: 'made', name: '위청란', ep: '녹림모', sex: 'f', born: 2, died: 61, realm: 4, fid: 'nokrim', rank: 'head', place: 'taihang', art: '녹림 십팔채 부법',
    look: 'woman leader of a peasant bandit army, about 35: tall and muscular, sun-tanned weathered face, a scar on the cheek, short rough hair tied with a red cloth. Patched hemp tunic with leather armor pieces, straw sandals. Heavy axe resting on the shoulder. Do not beautify.' },
  { id: 'M06', kind: 'made', name: '하후담', ep: '흑부', sex: 'm', born: 150, died: 215, realm: 5, fid: null, rank: null, place: 'luoyang', art: null,
    look: 'sinister late-Han sorcerer, about 50: gaunt, sunken yellowish eyes, long thin black mustache and beard, sly smile. Black robe with yellow talisman patterns, a yellow headband. A bundle of burning paper talismans in one hand, a black ritual axe in the other.' },
  // 산문의 시작
  { id: 'M07', kind: 'made', name: '혜각', ep: '일지선', sex: 'm', born: 470, died: 563, realm: 5, fid: 'shaolin', rank: 'elder', place: 'songshan', art: '대력금강지',
    look: 'first warrior monk of an early temple, about 55: solid compact build, shaved head with nine incense scars, square calm face, thick eyebrows. Grey monk robe tied up for training, leg wraps. One index finger extended forward, the other hand holding a broken spear shaft.' },
  { id: 'M08', kind: 'made', name: '사마연', ep: '상청선고', sex: 'f', born: 345, died: 430, realm: 6, fid: 'maoshan', rank: 'founder', place: 'maoshan', art: '오뢰정법',
    look: 'Taoist priestess of the Shangqing lineage, about 60 but youthful: slender, long serene face, faint wrinkles, long grey-black hair in a high crown with a jade pin. Layered pale blue Taoist robe with cloud borders. A horsetail whisk in one hand, a bronze ritual mirror in the other.' },
  { id: 'M09', kind: 'made', name: '아수타', ep: '흑수라', sex: 'm', born: 505, died: 570, realm: 4, fid: 'leiyin', rank: null, place: 'tianzhu', art: '뇌음신장',
    look: 'expelled Western Regions warrior monk, about 40: dark-skinned, heavily muscled, shaved head with a jagged scar, glaring bloodshot eyes, broken prayer beads around the neck. Torn black monk robe hanging from the waist, bare chest with tattoos. Fists wrapped in iron rings. Do not beautify.' },
  // 승병과 이교
  { id: 'M10', kind: 'made', name: '연무백', ep: '취개', sex: 'm', born: 820, died: 903, realm: 5, fid: 'gaibang', rank: 'founder', place: 'luoyang', art: '타구봉법',
    look: 'old beggar who gathered the beggars, about 65: thin with a round belly, messy grey hair and beard, red nose, half-closed drunken eyes, crooked grin. Rags patched in many colors, a gourd of wine at the hip. Green bamboo staff.' },
  { id: 'M11', kind: 'made', name: '소교', ep: '무영', sex: 'f', born: 800, died: 870, realm: 5, fid: 'salmun', rank: 'founder', place: 'dongting', art: '무영보',
    look: 'Tang-era assassin mistress, about 40: tall and narrow, expressionless pale face, thin eyebrows, a small mole under the eye, black hair in a severe high bun. Dark grey layered robe with a black veil hanging from a wide hat. Thin straight sword held behind the back.' },
  { id: 'M12', kind: 'made', name: '아흐람', ep: '불꽃 사제', sex: 'm', born: 660, died: 731, realm: 4, fid: 'persia', rank: 'head', place: 'changan', art: '성화장',
    look: 'Persian fire temple priest in Tang Chang-an, about 50: hooked nose, deep-set dark eyes, thick black curly beard, olive skin. White Zoroastrian robe with a red sash, white cloth tied over the mouth. A brass fire bowl with flames held in one hand.' },
  // 문파의 태동
  { id: 'M13', kind: 'made', name: '청허자', ep: '낙화검선', sex: 'm', born: 1000, died: 1080, realm: 6, fid: 'huashan', rank: 'founder', place: 'huashan', art: '이십사수매화검법',
    look: 'founding Taoist swordsman of a mountain sword sect, about 60: lean upright, long narrow face, thin white beard, calm piercing eyes. White Taoist robe with a few plum blossom embroideries at the hem, black sash. Long sword drawn and pointed down, plum petals drifting.' },
  { id: 'M14', kind: 'made', name: '남궁휘', ep: '창궁일검', sex: 'm', born: 1135, died: 1210, realm: 5, fid: 'namgung', rank: 'founder', place: 'hefei', art: '창궁무애검법',
    look: 'founder of a rich sword clan, about 45: tall, handsome but hard face, neat short beard, confident eyes. Rich deep blue brocade robe with silver cloud pattern, jade belt. Ornate long sword at the hip, a merchant ledger tucked in the sleeve.' },
  { id: 'M15', kind: 'made', name: '당소소', ep: '독봉', sex: 'f', born: 1085, died: 1150, realm: 4, fid: 'tang', rank: 'head', place: 'chengdu', art: '폭우이화침',
    look: 'poison and hidden-weapon clan matriarch, about 45: sharp features, narrow knowing eyes, thin red lips, black hair in a tight bun with many silver needles. Dark purple robe, black leather gloves, many small pouches on the belt. A fan of steel needles between the fingers.' },
  // 구파 정립
  { id: 'M16', kind: 'made', name: '진무결', ep: '무명검', sex: 'm', born: 1205, died: 1279, realm: 5, fid: 'league', rank: 'founder', place: 'kaifeng', art: null,
    look: 'wandering swordsman who became the first alliance leader, about 35: average build, plain honest face, short messy hair, stubble, determined eyes. Worn brown travel clothes with a patched cloak. A cheap unadorned sword in a cracked scabbard.' },
  { id: 'M17', kind: 'made', name: '정연 사태', ep: null, sex: 'f', born: 1190, died: 1270, realm: 6, fid: 'emei', rank: 'founder', place: 'emei', art: '금정신공',
    look: 'Buddhist nun founder of a sword sect, about 60: shaved head, strong stern face, deep lines, hard calm eyes. Grey nun robe, long wooden prayer beads. Straight sword held upright in front of the chest.' },
  { id: 'M18', kind: 'made', name: '사도천', ep: '혈마', sex: 'm', born: 1190, died: 1262, realm: 6, fid: 'blood', rank: 'head', place: 'nanman', art: '혈해마공',
    look: 'blood cult master, about 50: tall and gaunt, grey skin, sunken red eyes, long lank black hair, cruel thin smile. Dark crimson robe soaked darker at the hem, bone ornaments. A thin red-tinted sword, faint red mist around the hands.' },
  // 명교와 홍건
  { id: 'M19', kind: 'made', name: '은소한', ep: '청의검', sex: 'f', born: 1300, died: 1368, realm: 4, fid: 'wudang', rank: 'elder', place: 'wudang', art: '태극혜검',
    look: 'early Taoist sword disciple of a mountain sect, about 30: slim, calm oval face, clear eyes, black hair in a Taoist bun with a wooden pin. Plain blue-green Taoist robe. Straight sword held in a soft circular guard.' },
  { id: 'M20', kind: 'made', name: '상관위', ep: '광명좌사', sex: 'm', born: 1310, died: 1371, realm: 5, fid: 'mingjiao', rank: 'elder', place: 'tianshan', art: '성화신공',
    look: 'fire cult envoy and rebel leader, about 45: lean, hawk nose, burning intense eyes, short beard, red headband. Red and black robe with a flame emblem on the chest, armor plates on the shoulders. Palm raised with small flames on it.' },
  { id: 'M21', kind: 'made', name: '카르마', ep: '금강법왕', sex: 'm', born: 1270, died: 1340, realm: 5, fid: 'potala', rank: 'head', place: 'lasa', art: '밀종대수인',
    look: 'Tibetan lama warrior favored by the Yuan court, about 55: massive and heavy, round face, shaved head, small cold eyes, thick neck. Dark red and saffron lama robe, gold-trimmed. A gold vajra in one hand, a heavy brass prayer wheel in the other.' },
  // 마교의 굴기
  { id: 'M22', kind: 'made', name: '방채운', ep: '무쌍검', sex: 'f', born: 1360, died: 1431, realm: 5, fid: 'huashan', rank: 'elder', place: 'huashan', art: '자하신공',
    look: 'veteran woman sword elder who led the vanguard against the demon cult, about 45: lean and hard, weathered face, a scar across the nose, grey-streaked hair tied high, unshakable eyes. Torn white Taoist robe with plum embroidery over light armor. Long sword chipped from battle.' },
  { id: 'M23', kind: 'made', name: '야율홍', ep: '혈수교주', sex: 'm', born: 1345, died: 1402, realm: 6, fid: 'riyue', rank: 'head', place: 'tianshan', art: '일월신공',
    look: 'Khitan-blooded leader of a demonic cult, about 50: broad and towering, braided hair with shaved sides, heavy beard, red-tinted right hand. Black robe with sun and moon emblems in gold and silver, fur mantle. Right hand dripping red, the left on a broad saber.' },
  { id: 'M24', kind: 'made', name: '서문란', ep: '귀녀', sex: 'f', born: 1420, died: 1495, realm: 5, fid: 'jiutian', rank: 'founder', place: 'beijing', art: '구천현기공',
    look: 'mastermind of a secret court society, about 40: elegant, pale face, long phoenix eyes, faint smile that does not reach the eyes. Dark green court-lady robe with black lace, gold hairpins. Closed iron fan in one hand.' },
  // 강호의 전성기
  { id: 'M25', kind: 'made', name: '혁무진', ep: '천마', sex: 'm', born: 1452, died: 1521, realm: 7, fid: 'demon', rank: 'founder', place: 'tianshan', art: '천마신공',
    look: 'self-proclaimed Heavenly Demon who leads the demonic cult, about 45: tall and imposing, sharp angular face, pale skin, long loose black hair, thin cruel smile, eyes with a faint red glint. Layered black robe with dark crimson lining and a high collar, black leather bracers. Arms crossed, a curved black saber at the hip, dark red qi wisps around the hands.' },
  { id: 'M26', kind: 'made', name: '제갈운', ep: '신산', sex: 'm', born: 1460, died: 1530, realm: 4, fid: 'zhuge', rank: 'head', place: 'nanyang', art: '팔괘진법',
    look: 'strategist of a scholar clan, about 50: slim, long elegant face, neat long beard, gentle clever eyes. Light grey scholar robe with trigram border, black scholar hat. White feather fan in one hand, a rolled battle map in the other.' },
  { id: 'M27', kind: 'made', name: '팽소령', ep: '광도녀', sex: 'f', born: 1470, died: 1538, realm: 5, fid: 'peng', rank: 'elder', place: 'hejian', art: '오호단문도',
    look: 'blade fighter woman of a saber clan, about 35: big-boned and strong, square jaw, fierce wide grin, thick eyebrows, short tied-back black hair. Dark brown martial outfit with tiger-stripe trim, sleeves torn off, wrapped forearms. Huge broad saber on the shoulder. Do not beautify.' },
  // 왜구와 동영
  { id: 'M28', kind: 'made', name: '육청', ep: '해검', sex: 'm', born: 1525, died: 1590, realm: 5, fid: 'hainan', rank: 'head', place: 'hainan', art: '남해삼십육검',
    look: 'southern sea sword sect leader who fought pirates, about 45: sun-darkened lean face, salt-white hair tied back, crow feet, steady eyes. Faded blue short robe with rolled sleeves, sea-stained trousers, straw sandals. Thin curved sea sword, a rope over the shoulder.' },
  { id: 'M29', kind: 'made', name: '사카키 효에', ep: '귀검', sex: 'm', born: 1520, died: 1566, realm: 5, fid: 'dongyingro', rank: 'founder', place: 'dongying', art: '이도류',
    look: 'Japanese ronin swordsman among coastal pirates, about 35: lean and scarred, unshaven, cold half-lidded eyes, unkempt topknot. Worn dark kimono and hakama, a straw cloak. Two Japanese swords at the waist, one long one short, hand on the long hilt.' },
  { id: 'M30', kind: 'made', name: '혈선고', ep: null, sex: 'f', born: 1560, died: 1620, realm: 6, fid: 'blood', rank: 'head', place: 'nanman', art: '혈영대법',
    look: 'blood cult priestess, about 40 but ageless: pale porcelain face, red-painted eyelids, very long black hair loose to the knees, serene smile. Layered white robe stained red at the hems and sleeves, red cord at the waist. Bare hands with long red nails, faint red mist.' },
  // 반청
  { id: 'M31', kind: 'made', name: '혜명', ep: '잿불', sex: 'm', born: 1650, died: 1728, realm: 5, fid: 'shaolin', rank: 'elder', place: 'quanzhou', art: '백보신권',
    look: 'warrior monk who escaped a burned temple, about 45: burn scars on one side of the face and neck, shaved head, grim eyes. Soot-stained grey monk robe, a black bandage on one forearm. Fists clenched, prayer beads wound around one fist.' },
  { id: 'M32', kind: 'made', name: '진소완', ep: '비연', sex: 'f', born: 1690, died: 1745, realm: 4, fid: null, rank: null, place: 'suzhou', art: null,
    look: 'secret society courier woman of the Qing era, about 25: small and quick, round face, bright watchful eyes, black hair in a simple braid. Plain indigo jacket and trousers, cloth shoes. A thin throwing knife between two fingers, a letter hidden in the sleeve.' },
  { id: 'M33', kind: 'made', name: '니오후루 장가', ep: null, sex: 'm', born: 1660, died: 1733, realm: 5, fid: 'jinjun', rank: 'head', place: 'beijing', art: '뢰정창법',
    look: 'Manchu imperial guard commander, about 45: broad heavy build, shaved forehead with a long queue braid, thick mustache, cold heavy-lidded eyes. Qing imperial guard robe with horse-hoof cuffs, round hat with a red tassel. A long saber at the hip, a jade thumb ring.' },
  // 황혼
  { id: 'M34', kind: 'made', name: '고연', ep: '만검', sex: 'm', born: 1775, died: 1840, realm: 6, fid: 'wudang', rank: 'head', place: 'wudang', art: '태극혜검',
    look: 'last great Taoist sword master at the end of an age, about 60: thin, white hair and beard, deep tired kind eyes, long fingers. Faded grey Taoist robe, worn cloth shoes. An old plain sword held point down, the other hand behind the back.' },
  { id: 'M35', kind: 'made', name: '선우청', ep: '약선', sex: 'f', born: 1785, died: 1852, realm: 4, fid: 'yijia', rank: 'head', place: 'changsha', art: '회춘수',
    look: 'famous physician woman head of a medical clan, about 50: plain kind face, fine wrinkles, calm careful eyes, grey-streaked hair in a neat bun with a wooden pin. Pale green physician robe with rolled sleeves, a medicine box on the back. Acupuncture needles held between fingers.' },
  { id: 'M36', kind: 'made', name: '마조원', ep: '흑룡', sex: 'm', born: 1790, died: 1845, realm: 4, fid: 'kongling', rank: 'head', place: 'guangzhou', art: null,
    look: 'smuggling boss of the late Qing era, about 45: fat, jowly face, small shrewd eyes, thin mustache, long queue braid. Expensive black silk jacket with a dragon embroidery, many rings. An opium pipe in one hand, an abacus in the other. Do not beautify.' },
];
// 개파조사 이름(세계 시뮬레이션의 첫 수장). lore.md 4장의 이름에 네임드 개파조사를 덮는다
G.FOUNDERS = Object.assign({ qingcheng: '송학도인', zhongnan: '운허진인', diancang: '단목휘', kunlun: '백운자', kongtong: '철벽진인' },
  Object.fromEntries(G.NAMED.filter(n => n.rank === 'founder' && n.fid).map(n => [n.fid, n.name])));
})(typeof window !== "undefined" ? window : globalThis);
