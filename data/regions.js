// 자동 생성: node tools/gen_places.js. 규칙: docs/p8-geography.md. 손으로 고치지 않는다.
// zone 권역, pop 출생 인구 배율(중원만), price 물가, career 생업 배율, sp 특산(data/items.js id), goods 상품, names 이름 짓기 키(data/names.js), hz 재해 {k 종류, p 해마다 %, y 연도 범위}
(function (G) {
G.REGIONS = {
 "하북": {
  "n": "하북",
  "zone": "중원",
  "range": "북직례, 북경 일대",
  "pop": 1.2,
  "price": 1.1,
  "career": {
   "military": 1.5,
   "eunuch": 2,
   "smith": 1.3
  },
  "sp": [],
  "goods": [
   "말",
   "철기"
  ],
  "hz": [
   {
    "k": "가뭄",
    "p": 2
   }
  ],
  "names": "하북"
 },
 "하남": {
  "n": "하남",
  "zone": "중원",
  "range": "하남. 좁은 뜻의 중원",
  "pop": 1.4,
  "price": 1,
  "career": {
   "farm": 1.2,
   "troupe": 1.2,
   "scholar": 1.1
  },
  "sp": [],
  "goods": [
   "곡식",
   "회경 약재",
   "모란"
  ],
  "hz": [
   {
    "k": "홍수",
    "p": 4
   },
   {
    "k": "가뭄",
    "p": 2
   }
  ],
  "names": "하남"
 },
 "산동": {
  "n": "산동",
  "zone": "중원",
  "range": "산동, 운하 북단",
  "pop": 1.3,
  "price": 0.9,
  "career": {
   "farm": 1.2,
   "fisher": 1.3,
   "military": 1.2
  },
  "sp": [
   "lingzhi"
  ],
  "goods": [
   "산동 견",
   "해산물"
  ],
  "hz": [
   {
    "k": "홍수",
    "p": 3
   },
   {
    "k": "왜구",
    "p": 5,
    "y": [
     1550,
     1600
    ]
   }
  ],
  "names": "산동"
 },
 "산서": {
  "n": "산서",
  "zone": "중원",
  "range": "산서, 태행·여량 사이",
  "pop": 0.9,
  "price": 1,
  "career": {
   "merchant": 1.6,
   "smith": 1.5,
   "farm": 0.8
  },
  "sp": [
   "motie"
  ],
  "goods": [
   "하동 소금",
   "표호 어음"
  ],
  "hz": [
   {
    "k": "가뭄",
    "p": 3
   },
   {
    "k": "마적",
    "p": 2
   }
  ],
  "names": "산서"
 },
 "섬서": {
  "n": "섬서",
  "zone": "중원",
  "range": "섬서, 관중",
  "pop": 0.8,
  "price": 0.9,
  "career": {
   "military": 1.3,
   "herb": 1.2
  },
  "sp": [],
  "goods": [
   "말",
   "진령 약초"
  ],
  "hz": [
   {
    "k": "가뭄",
    "p": 4
   }
  ],
  "names": "섬서"
 },
 "감숙": {
  "n": "감숙",
  "zone": "중원",
  "range": "하서회랑, 청해 동부",
  "pop": 0.4,
  "price": 1.2,
  "career": {
   "hunter": 1.4,
   "military": 1.4,
   "merchant": 1.2,
   "farm": 0.7
  },
  "sp": [],
  "goods": [
   "말",
   "하서 옥"
  ],
  "hz": [
   {
    "k": "가뭄",
    "p": 4
   },
   {
    "k": "마적",
    "p": 6
   }
  ],
  "names": "감숙"
 },
 "사천": {
  "n": "사천",
  "zone": "중원",
  "range": "사천",
  "pop": 1.1,
  "price": 0.9,
  "career": {
   "herb": 1.6,
   "cook": 1.4,
   "craft": 1.2
  },
  "sp": [
   "lingzhi",
   "heshouwu"
  ],
  "goods": [
   "촉금",
   "차",
   "자류정 소금"
  ],
  "hz": [],
  "names": "사천"
 },
 "호북": {
  "n": "호북",
  "zone": "중원",
  "range": "호광 북부",
  "pop": 1,
  "price": 1,
  "career": {
   "fisher": 1.4,
   "farm": 1.2
  },
  "sp": [],
  "goods": [
   "쌀",
   "무당 약초"
  ],
  "hz": [
   {
    "k": "홍수",
    "p": 2
   }
  ],
  "names": "호북"
 },
 "호남": {
  "n": "호남",
  "zone": "중원",
  "range": "호광 남부",
  "pop": 1,
  "price": 0.9,
  "career": {
   "farm": 1.3,
   "fisher": 1.3,
   "herb": 1.2
  },
  "sp": [],
  "goods": [
   "쌀",
   "상수 자수",
   "차"
  ],
  "hz": [
   {
    "k": "홍수",
    "p": 2
   }
  ],
  "names": "호남"
 },
 "강북": {
  "n": "강북",
  "zone": "중원",
  "range": "남직례 장강 이북, 회수 유역",
  "pop": 1.1,
  "price": 1.1,
  "career": {
   "merchant": 1.3,
   "fisher": 1.2,
   "troupe": 1.2
  },
  "sp": [],
  "goods": [
   "양회 소금",
   "쌀"
  ],
  "hz": [
   {
    "k": "홍수",
    "p": 3
   }
  ],
  "names": "강북"
 },
 "강남": {
  "n": "강남",
  "zone": "중원",
  "range": "남직례 장강 이남, 절강, 강서",
  "pop": 1.6,
  "price": 1.3,
  "career": {
   "merchant": 1.5,
   "craft": 1.5,
   "artist": 1.3,
   "scholar": 1.3,
   "farm": 0.9
  },
  "sp": [],
  "goods": [
   "비단",
   "용정차",
   "경덕진 자기",
   "쌀"
  ],
  "hz": [
   {
    "k": "역병",
    "p": 2
   },
   {
    "k": "왜구",
    "p": 15,
    "y": [
     1550,
     1600
    ]
   },
   {
    "k": "왜구",
    "p": 3,
    "y": [
     1350,
     1549
    ]
   },
   {
    "k": "왜구",
    "p": 3,
    "y": [
     1601,
     1643
    ]
   }
  ],
  "names": "강남"
 },
 "안휘": {
  "n": "안휘",
  "zone": "중원",
  "range": "남직례 서부",
  "pop": 1,
  "price": 1,
  "career": {
   "merchant": 1.5,
   "scholar": 1.3,
   "craft": 1.2
  },
  "sp": [
   "lingzhi"
  ],
  "goods": [
   "휘묵",
   "선지",
   "황산 차"
  ],
  "hz": [],
  "names": "안휘"
 },
 "복건": {
  "n": "복건",
  "zone": "중원",
  "range": "복건",
  "pop": 0.8,
  "price": 1.1,
  "career": {
   "fisher": 1.5,
   "merchant": 1.3,
   "craft": 1.1
  },
  "sp": [],
  "goods": [
   "무이 차",
   "배",
   "해산물"
  ],
  "hz": [
   {
    "k": "역병",
    "p": 2
   },
   {
    "k": "왜구",
    "p": 15,
    "y": [
     1550,
     1600
    ]
   },
   {
    "k": "왜구",
    "p": 3,
    "y": [
     1350,
     1549
    ]
   },
   {
    "k": "왜구",
    "p": 3,
    "y": [
     1601,
     1643
    ]
   }
  ],
  "names": "복건"
 },
 "광동": {
  "n": "광동",
  "zone": "중원",
  "range": "광동, 광서, 해남도",
  "pop": 0.9,
  "price": 1.2,
  "career": {
   "merchant": 1.6,
   "fisher": 1.4,
   "cook": 1.3
  },
  "sp": [
   "yemingzhu"
  ],
  "goods": [
   "향료",
   "진주",
   "외국 물품"
  ],
  "hz": [
   {
    "k": "역병",
    "p": 2
   },
   {
    "k": "왜구",
    "p": 8,
    "y": [
     1550,
     1600
    ]
   }
  ],
  "names": "광동"
 },
 "운남": {
  "n": "운남",
  "zone": "중원",
  "range": "운남, 귀주",
  "pop": 0.5,
  "price": 0.8,
  "career": {
   "herb": 1.6,
   "hunter": 1.4
  },
  "sp": [
   "jinchan"
  ],
  "goods": [
   "보이차",
   "비취",
   "독충"
  ],
  "hz": [
   {
    "k": "역병",
    "p": 3
   }
  ],
  "names": "운남"
 },
 "요동": {
  "n": "요동",
  "zone": "중원",
  "range": "요동도사, 장백산",
  "pop": 0.4,
  "price": 1,
  "career": {
   "hunter": 1.8,
   "herb": 1.4,
   "military": 1.3,
   "farm": 0.8
  },
  "sp": [
   "shanshen",
   "xueshen"
  ],
  "goods": [
   "담비 가죽"
  ],
  "hz": [],
  "names": "요동"
 },
 "대막": {
  "n": "대막",
  "zone": "새외",
  "range": "몽고 초원, 고비 사막",
  "names": "몽고",
  "price": 1.4,
  "career": {
   "hunter": 2,
   "military": 1.5
  },
  "sp": [],
  "goods": [
   "말",
   "양"
  ],
  "hz": [
   {
    "k": "마적",
    "p": 10
   }
  ]
 },
 "서역": {
  "n": "서역",
  "zone": "새외",
  "range": "천산 남북, 하미·투르판·카슈가르, 곤륜 서쪽, 파사까지",
  "names": "서역",
  "price": 1.5,
  "career": {
   "merchant": 2
  },
  "sp": [
   "xuelian",
   "huojing"
  ],
  "goods": [
   "옥"
  ],
  "hz": [
   {
    "k": "마적",
    "p": 8
   }
  ]
 },
 "서장": {
  "n": "서장",
  "zone": "새외",
  "range": "티베트 고원, 대설산",
  "names": "서장",
  "price": 1.4,
  "career": {
   "herb": 1.3
  },
  "sp": [
   "bingjing",
   "xueshen"
  ],
  "goods": [
   "장향"
  ],
  "hz": []
 },
 "남만": {
  "n": "남만",
  "zone": "새외",
  "range": "묘강, 교지, 운남 남쪽 밀림",
  "names": "남만",
  "price": 0.7,
  "career": {
   "hunter": 1.8,
   "herb": 1.5
  },
  "sp": [
   "xuemang",
   "shuangtou"
  ],
  "goods": [
   "고독"
  ],
  "hz": []
 },
 "북해": {
  "n": "북해",
  "zone": "새외",
  "range": "흑룡강 너머 숲과 얼음 바다",
  "names": "북해",
  "price": 1.6,
  "career": {
   "hunter": 2,
   "fisher": 1.5
  },
  "sp": [
   "bingcan",
   "bingjing",
   "wanniantie"
  ],
  "goods": [],
  "hz": []
 },
 "해동": {
  "n": "해동",
  "zone": "새외",
  "range": "고려·조선",
  "names": "해동",
  "price": 1,
  "career": {
   "scholar": 1.2
  },
  "sp": [
   "shanshen"
  ],
  "goods": [
   "종이"
  ],
  "hz": []
 },
 "동영": {
  "n": "동영",
  "zone": "새외",
  "range": "왜, 대마도",
  "names": "동영",
  "price": 1.2,
  "career": {
   "fisher": 1.4,
   "military": 1.5
  },
  "sp": [],
  "goods": [
   "왜도"
  ],
  "hz": []
 },
 "천축": {
  "n": "천축",
  "zone": "새외",
  "range": "인도, 서쪽 바다 길",
  "names": "서역",
  "price": 1.5,
  "career": {
   "merchant": 1.3
  },
  "sp": [],
  "goods": [
   "향료",
   "불경"
  ],
  "hz": []
 }
};
})(typeof window !== 'undefined' ? window : globalThis);
