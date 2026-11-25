# 네임드 인물·세력 초상 프롬프트를 만든다. 규칙: docs/p11-cast.md 2-4, 3장.
# 실행: node -e "global.window=global;require('./data/named.js');require('fs').writeFileSync('_workspace/named.json',JSON.stringify(NAMED))"
#       python tools/gen_cast_prompts.py
# 산출: art/roster_named.json(네임드), art/roster_fac.json(세력 1차: 구파일방)
import json, random, sys

sys.stdout.reconfigure(encoding='utf-8')
roster = json.load(open('art/roster.json', encoding='utf-8'))
STYLE = [r for r in roster if r['id'] == 'B21'][0]['prompt'].split('Character (a man):')[0]


def prompt(sex, desc):
    return STYLE + f"Character ({'a woman' if sex == 'f' else 'a man'}): " + desc


# ---------- 네임드 ----------
named = json.load(open('_workspace/named.json', encoding='utf-8'))
out = []
for n in named:
    ep = f" 「{n['ep']}」" if n['ep'] else ''
    out.append({"id": n['id'], "group": "N", "ko": f"{n['name']}{ep} ({n['born']}~{n['died']})",
                "sex": "female" if n['sex'] == 'f' else "male", "prompt": prompt(n['sex'], n['look'])})
json.dump(out, open('art/roster_named.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('named', len(out))

# ---------- 세력 1차 ----------
# 세력: (이름, 성별 제한, 세력 공통 복장, 단별 복장·무기 [삼대제자, 일대·이대제자, 장로, 수장])
F = {
    'shaolin': ('소림사', 'm', "Shaolin Buddhist temple; ochre-yellow and grey monk clothing",
                ["grey short training monk clothes with leg wraps, a plain wooden staff",
                 "ochre monk robe tied up for fighting, iron-shod staff",
                 "ochre robe with a red kasaya over one shoulder, long wooden prayer beads, monk spade staff",
                 "red and gold abbot kasaya over a yellow robe, staff with six metal rings, prayer beads"]),
    'gaibang': ('개방', '', "beggar sect; patched ragged clothes, cloth sacks tied at the belt (more sacks mean higher rank), bamboo staff",
                ["torn rags with one cloth sack, bare feet, a short bamboo stick",
                 "patched rags with three cloth sacks, straw sandals, a bamboo staff, a wine gourd",
                 "heavily patched coat with six sacks, a thick dark bamboo staff, a battered wine gourd",
                 "patched coat with eight sacks worn with dignity, a green jade bamboo staff"]),
    'qingcheng': ('청성파', '', "Taoist sword sect of Mount Qingcheng; blue-green Taoist robes with a bamboo leaf motif, straight swords",
                  ["plain blue-green training robe, a wooden practice sword",
                   "blue-green Taoist robe with bamboo leaf embroidery at the hem, a straight sword",
                   "dark green Taoist robe with wide sleeves and silver bamboo embroidery, jade hair crown, fine sword on the back",
                   "deep green ceremonial Taoist robe with a lotus crown, horsetail whisk, treasured sword at the hip"]),
    'zhongnan': ('종남파', '', "Taoist sword sect of Mount Zhongnan; dark navy Taoist robes with a white sash, straight swords",
                 ["plain navy training robe, white sash, a wooden practice sword",
                  "navy Taoist robe with white sash and cloud trim, a straight sword",
                  "navy robe with wide sleeves and white cloud embroidery, Taoist cap, fine sword",
                  "black-navy ceremonial robe with Big Dipper stars embroidered, Taoist crown, horsetail whisk and sword"]),
    'huashan': ('화산파', '', "Taoist sword sect of Mount Hua; white and black Taoist robes with plum blossom embroidery, straight swords",
                ["plain white training robe with black trim and no embroidery, a wooden sword",
                 "white Taoist robe with a small plum blossom on the chest, black sash, a straight sword",
                 "white robe with wide sleeves and red plum blossoms on the hem, Taoist cap, fine sword",
                 "white and black ceremonial robe with a large plum branch embroidered, jade crown, treasured sword"]),
    'kunlun': ('곤륜파', '', "sect of the snowy Kunlun mountains; off-white and grey layered robes with fur trim, long swords",
               ["grey padded training clothes with a fur collar, a wooden sword",
                "off-white layered robe with grey fur trim, a long sword",
                "heavy white robe with a snow-leopard fur mantle, silver hair ornaments, fine sword",
                "white ceremonial robe with silver mountain embroidery and a white fur mantle, jade crown, treasured sword"]),
    'kongtong': ('공동파', '', "martial sect of Mount Kongtong famed for fist arts; brown and ochre close-fitting clothes, leather bracers",
                 ["brown short training clothes, wrapped fists",
                  "ochre martial outfit, leather bracers and shin guards, fists raised",
                  "dark brown long coat over martial clothes, studded bracers, prayer beads around the wrist",
                  "dark brown and gold ceremonial robe, heavy iron bracers, broad belt with a jade buckle"]),
    'emei': ('아미파', 'f', "Buddhist women's sect of Mount Emei; grey and pale pink robes, swords",
             ["pale grey training robe, a wooden practice sword",
              "pale pink-grey robe with a white sash, a straight sword",
              "grey Buddhist nun robe, long prayer beads, a sword",
              "grey and gold Buddhist abbess robe, a nun's cap, long prayer beads, a treasured sword"]),
    'diancang': ('점창파', '', "sword sect of Mount Diancang in Yunnan known for fast swords; light green short robes, bamboo hats, slim swords",
                 ["light green short training clothes, a bamboo hat on the back, a wooden sword",
                  "light green short robe with tight sleeves, bamboo hat, a slim sword",
                  "dark green long robe with cloud trim, bamboo hat in hand, fine slim sword",
                  "jade green ceremonial robe with butterfly and cloud embroidery, jade crown, treasured slim sword"]),
    'wudang': ('무당파', '', "Taoist sect of Mount Wudang; blue Taoist robes with a yin-yang emblem, straight swords and horsetail whisks",
               ["plain light blue training robe, a wooden sword",
                "blue Taoist robe with a small yin-yang on the back, a straight sword",
                "dark blue robe with wide sleeves and white yin-yang and cloud trim, Taoist cap, horsetail whisk and sword",
                "deep blue ceremonial robe with a large yin-yang and bagua, jade lotus crown, treasured sword"]),
}
AGE = [(15, 17), (22, 32), (55, 70), (55, 68)]
TIER = ["third-generation junior disciple", "senior disciple", "sect elder", "sect leader"]
TIER_KO = ['삼대제자', '일대·이대제자', '장로', '수장']
# 얼굴 조각. 추상적인 "다양하게" 대신 사람마다 구체 외형을 고른다(그림체 메모)
BUILD = {'m': ["thin and lanky", "stocky and short", "tall and broad", "wiry", "heavy-set", "average build, slightly stooped"],
         'f': ["slim and tall", "small and sturdy", "lean and athletic", "plump", "willowy", "broad-shouldered and strong"]}
FACE = ["long narrow face", "round face", "square jaw", "sharp angular face", "heart-shaped face", "flat broad face", "hollow-cheeked face", "oval face"]
EYE = ["sleepy half-lidded eyes", "sharp narrow eyes", "big round eager eyes", "small deep-set eyes", "upturned fox-like eyes", "heavy-browed glaring eyes", "gentle drooping eyes"]
MARK = ["a mole on the cheek", "freckles", "a small scar on the chin", "a crooked nose", "thick eyebrows", "a gap in the front teeth", "prominent ears",
        "a burn mark on the hand", "a broken nose", "thin pale lips", "pockmarked skin", "a split eyebrow"]
EXP = ["serious and stiff", "cheerful grin", "arrogant smirk", "nervous and earnest", "calm and distant", "stern frown", "sly smile", "tired but kind"]
HAIR = {'m': [["short messy hair in a small topknot", "bowl-cut fringe under a small bun"], ["long black hair in a topknot", "hair half tied with loose strands"],
              ["grey hair in a topknot, long grey beard", "white hair, short white beard and mustache"], ["white hair under a crown, long white beard", "grey-white hair, neatly trimmed beard"]],
        'f': [["hair in two small buns", "a long single braid"], ["hair in a high ponytail", "hair in a neat bun with a pin"],
              ["grey hair in a tight bun", "white-streaked hair in a low bun"], ["silver hair in a high crown bun", "grey hair coiled under a jade pin"]]}

out = []
for fid, (ko, lim, base, tiers) in F.items():
    for t in range(4):
        for sx in ('m', 'f'):
            if lim and sx != lim:
                continue
            r = random.Random(f"{fid}{t}{sx}")
            age = r.randint(*AGE[t])
            if fid == 'shaolin':
                hair = "shaved head with incense scars" + (", grey stubble beard" if t >= 2 else "")
            elif fid == 'emei' and t >= 2:
                hair = "shaved head"
            elif fid == 'gaibang':
                hair = r.choice(["matted messy hair tied with straw", "shaggy unkempt hair"]) + (", grey" if t >= 2 else "")
            else:
                hair = r.choice(HAIR[sx][t])
            plain = r.random() < 0.35
            who = 'man' if sx == 'm' else 'woman'
            desc = (f"{TIER[t]} of a {base}; a {who}, {age}: {r.choice(BUILD[sx])}, {r.choice(FACE)}, {r.choice(EYE)}, {r.choice(MARK)}, "
                    f"{r.choice(EXP)} expression, {hair}. Outfit and weapon: {tiers[t]}. "
                    f"All ranks of this sect share the same uniform colors; a higher rank only adds trim and a finer weapon."
                    + (" Plain looking, do not beautify." if plain else ""))
            out.append({"id": f"F_{fid}_{t}{sx}", "group": "F", "ko": f"{ko}·{TIER_KO[t]}·{'남' if sx == 'm' else '여'}",
                        "sex": "male" if sx == 'm' else "female", "prompt": prompt(sx, desc)})
json.dump(out, open('art/roster_fac.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('faction', len(out))
