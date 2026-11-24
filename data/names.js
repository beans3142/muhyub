// 이름 데이터. 출신 지역·신분에 따라 성과 이름 짓는 법이 다르다.
// 사용: 성 = 지역 성씨 표에서(세가 출신이면 세가 성), 이름 = 출신 갈래(style)별 규칙.
(function (G) {
const S = s => s.split(' ');

// ---------- 성씨 ----------
G.SURNAME_COMMON = S('왕 이 장 유 진 양 조 황 주 오 서 손 호 고 임 하 곽 마 라 량 송 정 사 한 당 풍 우 동 소 증 여 위 원 노 요 반 두 대 종 전 육 강 심 엽 범 방 석 요 담 요 공 염 설 하 허 맹 진 구 금 백 탕 엄 상 은 반 갈 시 은 곡 경 초 막 단 화 목 위 연 남 안 언 형');
G.SURNAME_RARE = S('사마 구양 상관 독고 제갈 남궁 모용 황보 서문 동방 공손 영호 하후 종리 장손 우문 위지 백리 사공 선우 북궁 단목 혁련 호연 동곽 태숙 탁발 철');
// 지역별로 자주 나오는 성 (가중 ×3)
G.SURNAME_REGION = {
  강남: S('육 고 심 주 오 전 장 허 반 엽'), 강북: S('왕 유 손 하 곽'), 하북: S('팽 장 왕 유 조 노 위'), 하남: S('정 사마 왕 이 장 진'),
  산동: S('악 공 맹 공손 왕 장 진'), 산서: S('곽 왕 가 교 상관'), 섬서: S('양 장 두 위 마'), 사천: S('당 하 진 이 등 요'),
  호남: S('담 등 류 주 증'), 호북: S('왕 진 장 하'), 복건: S('임 진 정 황 소 채'), 광동: S('황 양 진 이 하 노'),
  운남: S('단 이 양 마 단목'), 감숙: S('마 위 동 석'), 요동: S('모용 철 혁련 우문 탁발'), 안휘: S('남궁 왕 오 정 방'),
};

// ---------- 이름 글자 ----------
const M_COMMON = S('대석 이구 삼랑 사호 소호 아우 돌 철 석 구 개 복 수 만 귀 근 춘 추 동 천복 만복 길 순 호 용 득 칠 팔 아삼 소이 대우 소우 쇠똥 덕 보');
const F_COMMON = S('아화 춘화 소매 이낭 삼낭 아련 소련 아향 꽃님 소홍 춘란 추월 금화 은화 옥이 아주 소주 연이 정이 순이');
const M_ONE = S('무 강 웅 호 천 진 악 운 학 경 현 휘 철 석 평 한 우 명 준 성 혁 결 검 표 원 결 담 위 훈 빈 청 일 정 겸 엄 걸');
const M_TWO_A = S('무 청 일 태 소 백 진 운 경 자 대 문 도 천 비 자 현 장 상 영 수 지 덕 원 중 사 승 세 명 광');
const M_TWO_B = S('진 운 비 호 룡 천 악 학 천 강 평 철 웅 수 현 원 기 명 우 연 휘 걸 양 도 결 성 담 표 겸');
const F_ONE = S('연 설 월 향 난 혜 청 아 영 윤 소 진 려 운 매 하 선 미 옥 인');
const F_TWO_A = S('소 월 설 연 청 옥 미 수 초 영 은 서 홍 아 단 유 향 혜 운 매 화 려 상 금');
const F_TWO_B = S('소 향 화 연 아 란 령 련 운 영 비 린 매 령 청 심 월 하 운 선 이');

// 항렬자(돌림자): 세가는 대마다 정해진 글자를 쓴다
G.GENERATION_CHAR = S('천 지 현 황 우 주 홍 황 일 월 성 진 운 경 무 문 영 세 장 명 덕 승 효 충 의 예 지 신');

// ---------- 갈래별 이름 짓는 법 ----------
// style: commoner(평민·하층) / literati(선비·관·상인) / martial(무가·세가) / clan(세가 직계: 항렬자+1자) /
//        monk(법명) / taoist(도호) / courtesan(기녀 예명) / beggar(거지 별명) / foreign:지역
G.NAME_STYLE = {
  commoner: { m: [M_COMMON, M_ONE], f: [F_COMMON, F_ONE] },
  literati: { m: [M_TWO_A, M_TWO_B], f: [F_TWO_A, F_TWO_B] },
  martial: { m: [M_ONE, M_TWO_A, M_TWO_B], f: [F_ONE, F_TWO_A, F_TWO_B] },
  clan: { gen: 1, m: [M_ONE], f: [F_ONE] },
  monk: { dharma: S('현 혜 공 원 법 각 정 지 무 담 명 심 도 보 선 연 묘 진'), second: S('공 오 진 각 명 정 심 지 운 해 산 성 혜 원 등 광') },
  taoist: { dao: S('청 현 운 자 옥 태 진 송 학 허 일 무 양 소'), second: S('허 진 양 송 운 학 명 원 정 소 일 산 도 화'), suf: S('자 진인 도장') },
  courtesan: { a: S('월 홍 춘 설 옥 향 소 연 매 난 화 금 채 운 취 류'), b: S('향 매 선 련 홍 화 운 아 연 란 교 주 심 소 미') },
  beggar: { nick: S('개똥 쥐눈 곰보 땅딸 외눈 털보 절름 깡마 코흘 버들 꼬마 늙은이 쇠꼬챙이 빈대 진흙 닭발 대머리 왕발 얼룩 땡중') },
};
// 새외 이름: 한자 음차로 적는다
G.FOREIGN = {
  몽고: { sur: [''], m: S('바투 테무르 보르치 수베 다얀 알탄 차간 에르덴 바얀 토곤 아릭 부르칸'), f: S('알란 체첵 사란 오윤 투야 볼로르 나랑') },
  서장: { sur: [''], m: S('다와 텐진 롭상 니마 팔덴 체링 소남 겔렉'), f: S('펨바 데첸 돌마 양첸 라모') },
  남만: { sur: S('아 몽 도 려'), m: S('사 루 쿤 무 바 탄 가 오'), f: S('라 아 미 나 소 이') },
  서역: { sur: S('강 안 석 미 사 조'), m: S('아력 합산 살리 무하 이브 알리 카심 유수'), f: S('파티 라일 아이샤 자이 나린 시린') },
  동영: { sur: S('산전 등원 원 평 소야 궁본 상삼 유생 좌좌목 이등'), m: S('일랑 차랑 삼랑 무장 반장 십병위 소병위 우위문'), f: S('설 화 매 천대 초 명') },
  해동: { sur: S('김 이 박 최 정 강 조 윤 장 임 한 신 서 권'), m: S('준 민 석 현 수 영 철 호 성 훈 재 우'), f: S('희 영 숙 순 자 옥 정 선 미 은') },
  북해: { sur: S('설 빙 한 백'), m: S('렬 한 영 설 강'), f: S('설 빙 월 하 영 소') },
};
// 출신 꼬리표/세력 → 이름 갈래
G.STYLE_BY_TAG = { 거지: 'beggar', 고아: 'commoner', 점소이: 'commoner', 노비: 'commoner', 기루: 'courtesan', 불가: 'monk', 도가: 'taoist', 새외: 'foreign' };
G.STYLE_BY_CAREER = { scholar: 'literati', merchant: 'literati', doctor: 'literati', farm: 'commoner', cook: 'commoner', smith: 'commoner', artist: 'commoner' };
// 문파에 입문하면 법명·도호를 새로 받는다: shaolin·emei(비구니)는 monk, wudang·huashan·qingcheng·zhongnan·kunlun은 taoist(속가는 본명 유지)
G.RENAME_ON_JOIN = { shaolin: 'monk', emei: 'monk', wudang: 'taoist', huashan: 'taoist', qingcheng: 'taoist', zhongnan: 'taoist', kunlun: 'taoist', kongtong: 'taoist' };
})(typeof window !== 'undefined' ? window : globalThis);
