# 캐릭터 견본 프롬프트 (13명, 채팅 4개)

개정 2: 그림체를 반실사에서 2D 게임 일러스트(셀 셰이딩)로, 배경을 회색에서 투명 PNG로 바꿈.

공통 블록은 그림체와 출력 형식만 정한다. 외형은 인물마다 얼굴형·눈·코·피부·체형·머리·표정·자세·옷을 따로 적는다. "서로 다르게" 같은 추상 지시는 효과가 없었다(ChatGPT 대화 '농촌').

## 공통 블록

```
Full-body character concept art for a Chinese wuxia life-simulation game (Ming-era setting).
Style: 2D game character illustration, clean dark-brown lineart, flat cel shading with two tones per color, slightly stylized anime-influenced proportions (normal adult proportions, not chibi), muted earthy palette, readable silhouette. Not photorealistic, no painterly rendering, no realistic skin texture.
Layout: 2x2 grid on a square canvas, exactly one person per quadrant, whole body visible head to feet, all four standing on the same ground line at the same scale (real height differences must show), wide empty space between them.
Background: fully transparent PNG with alpha channel, no ground shadow, no scenery, no text, no labels, no frames.
These are four unrelated strangers. Draw each one exactly as described below, including plain, odd or unattractive features. Do not beautify anyone and do not reuse one face for several people.
```

## 채팅 1: 서민

```
Top-left — farm boy, 13: small and wiry, deeply sun-tanned, round face, upturned nose, gap between front teeth, cropped hair with a tiny messy topknot, squinting grin. Barefoot, hemp trousers rolled to the knee and caked with mud, patched sleeveless tunic. Carries a hoe over one shoulder, weight on one leg.
Top-right — small child, 5: chubby boy, two tufted hair buns, bright red cheeks, mouth open in wonder, looking upward. Oversized padded cotton jacket in faded red, sleeves covering his hands, cloth shoes. Holds a stick of candied hawthorn.
Bottom-left — village girl, 15: tall and lanky for her age, long narrow face, freckles, thick straight eyebrows, one long braid, serious wary look. Indigo-dyed cotton jacket and skirt, sleeves tied back. Carries a laundry basket on her hip.
Bottom-right — ordinary townsman, 45: pear-shaped body, narrow shoulders, receding hairline with a thin grey-black topknot, thin drooping mustache, nearsighted squint and worried frown, slightly hunched. Plain grey-brown long robe, cloth cap. Holds a closed oiled-paper umbrella and a cloth-wrapped bundle.
```

## 채팅 2: 도시

```
Top-left — inn waiter (jeomsoi), 19: skinny, long neck, narrow shoulders, small eyes, big ears, slight buck teeth, eager half-bow. Short brown jacket, apron, white towel over one shoulder, hair in a small cloth-wrapped bun. Holds a teapot.
Top-right — courtesan, late 20s: angular face, high cheekbones, heavy-lidded tired eyes, beauty mark under the left eye, cool aloof expression. Tall piled hairstyle with gold hairpins, layered plum and rose silk with long trailing sleeves. Holds a pipa against her hip.
Bottom-left — classic beauty, 20: soft oval face, gentle almond eyes, small mouth, fair skin, calm shy look. Long hair half tied up and flowing down her back, pale celadon gown with a white sash, upright graceful posture. Holds a round silk fan near her chest.
Bottom-right — great merchant, 60: tall and heavyset, broad but not jolly, square jaw, heavy jowls, deep frown lines, short grey goatee, shrewd cold stare. Fur-trimmed dark brown brocade coat over a black robe, jade ring, hands clasped behind his back.
```

## 채팅 3: 무림

```
Top-left — Martial Alliance guard, 35: stocky, medium height, flat once-broken nose, stubble, small scar on the chin, bored expression. Dark navy uniform with a plain round emblem patch, leather bracers and boots. Holds a sheathed broad saber, leaning slightly.
Top-right — Martial Alliance rising star (young man), 22: tall and athletic, hawk nose, thin lips, narrow single-lidded eyes, confident smirk. High ponytail through a small silver crown, white and pale-blue martial robe. Long straight sword held point down at his side.
Bottom-left — Tang clan rising star (young woman), 20, Sichuan poison-and-hidden-weapon family: petite, round face, upturned cat-like eyes, mischievous dangerous smile. Shoulder-length hair tied with a dark ribbon, dark purple and moss-green tight-sleeved outfit, black leather gloves, belt lined with small pouches. Three thin throwing darts between her fingers.
Bottom-right — Shaolin abbot, 75: very tall and gaunt, shaved head with nine small ordination dots, long white eyebrows hanging past his cheeks, sunken cheeks, eyes half closed, serene. Red and gold patchwork kasaya over an ochre robe, long prayer beads, tall ringed monk staff.
```

## 채팅 4: 마교 (단독)

```
Single full-body character on a square canvas, centered, whole body visible, fully transparent PNG background, no ground shadow, no text.
Same style: 2D game character illustration, clean dark-brown lineart, flat two-tone cel shading, muted palette, not photorealistic.
Demonic Cult leader, 45: tall, broad-shouldered, pale skin, heavy brow, deep-set dark eyes with a faint crimson glint, thin cruel mouth, cold expression. Long loose black hair with one white streak. Layered black and deep crimson robes with dull gold embroidery, open collar, wide sleeves. One bare hand slightly raised, thin wisps of dark qi curling around the fingers.
```

## 개정 3: 동양 웹툰·무협 게임 그림체 (견본 1명)

개정 2의 셀 셰이딩이 미국 애니메이션처럼 보인다는 지적으로 바꿈. 무림맹 후기지수(남) 한 명으로 시험. 결과 `sample/v3_manhwa/`.

```
Single full-body standing character illustration for a Korean-made wuxia life-simulation game. Square canvas, character centered, whole body visible head to feet, fully transparent PNG background with alpha channel, no ground shadow, no text.
Art style: East Asian character art in the manner of Korean webtoon / manhwa and Chinese wuxia mobile RPG standing illustrations. Thin, fine, delicate lineart with tapered strokes; soft cel shading with subtle gradients; slender elegant proportions, about 8 heads tall; small refined facial features drawn in East Asian anime convention (narrow face, fine nose line, small mouth, sharp eyes); flowing hair strands; detailed fabric folds and embroidery. Muted ink-wash-inspired palette.
Avoid Western cartoon or American animation look: no thick uniform outlines, no exaggerated rubbery faces, no big noses or caricature, not photorealistic.
```

인물 명세는 위 채팅 3의 오른쪽 위 인물과 같고, 자세(3/4 측면, 곧게 선 자세)만 더함.

## 개정 4: 한국 무협 웹툰 그림체 (견본 1명)

사용자가 준 참고 이미지(한국 무협 웹툰 장면 3장)의 특징을 말로 옮김: 굵기가 변하는 먹선, 각진 검은 그림자 덩어리, 날카로운 얼굴과 뾰족한 턱, 윤기 있는 눈, 흐트러진 앞머리와 삐친 머리카락, 한쪽 림라이트, 채도 낮은 옷. 작품 이름은 프롬프트에 넣지 않음. 결과 `sample/v4_webtoon/`.

```
Art style: modern Korean action webtoon (murim genre) digital coloring. Bold black ink lineart with strong line-weight variation, thick at contours and thin inside; large hard-edged solid black shadow shapes (spot blacks) under the hair, jaw, neck and inside sleeves; high-contrast two-step cel shading with sharp shadow edges, no soft airbrush; subtle cool rim light along one side of the body. Sharp angular face with a narrow pointed chin, long thin eyebrows, sharp narrow eyes with glossy highlights and dark heavy upper eyelashes, small mouth. Messy layered bangs with thin stray hair strands and one ahoge strand. Slender tall proportions, about 8 heads. Muted desaturated clothing colors with crisp fold lines. Not chibi, not Western cartoon, not painterly, not photorealistic.
```

## 확정 (2026-11-24)

사용자가 개정 4(한국 무협 웹툰 그림체) 결과 5명을 보고 만족. 앞으로 캐릭터 이미지는 개정 4 스타일 블록을 쓴다. 한 채팅에 한 명씩, 여러 채팅을 동시에 돌리고, 인물마다 얼굴·체형·표정·자세·옷을 구체적으로 적는다. 평범하거나 못생긴 인물에는 "do not beautify"를 넣는다. 견본: `sample/v4_webtoon/견본_5명.png`.
