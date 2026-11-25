# 많이 쓰이는 초상 자리에 다른 사람 그림(변형)을 더하는 프롬프트를 만든다. 규칙: docs/p11-cast.md 3-7.
# 실행: python tools/gen_variant_prompts.py  → art/roster_variants.json (id: 원래id_2, 원래id_3)
# 자리(나이·성별·형편·역할·옷)는 원래 그림과 같게 두고 얼굴·체격·머리·표정·자세만 바꾼다.
import json, random, sys

sys.stdout.reconfigure(encoding='utf-8')
roster = {r['id']: r for r in json.load(open('art/roster.json', encoding='utf-8'))}
SLOTS = [f'A{k:02d}' for k in range(1, 19)] + ['B31', 'B32', 'C13', 'C14', 'C23', 'C28']

KID = dict(
    build=["skinny", "small and round", "tall for the age", "sturdy", "thin and bony", "chubby"],
    face=["round face", "narrow face", "square little face", "pointed chin", "flat wide face", "heart-shaped face"],
    eye=["sleepy eyes", "big round eyes", "narrow sharp eyes", "droopy eyes", "upturned eyes", "small bead eyes"],
    mark=["freckles", "a scraped knee", "a missing front tooth", "a mole under the eye", "big ears", "a runny nose", "thick eyebrows", "a bandaged finger"],
    expr=["shy and looking away", "grinning", "pouting", "serious and frowning", "curious with mouth open", "sulking"],
)
ADULT = dict(
    build=["thin and lanky", "stocky and short", "tall and broad", "wiry", "heavy-set", "average build, slightly stooped", "lean and athletic"],
    face=["long narrow face", "round face", "square jaw", "sharp angular face", "flat broad face", "hollow-cheeked face", "oval face"],
    eye=["sleepy half-lidded eyes", "sharp narrow eyes", "big round eyes", "small deep-set eyes", "upturned fox-like eyes", "heavy-browed glaring eyes", "gentle drooping eyes"],
    mark=["a mole on the cheek", "freckles", "a small scar on the chin", "a crooked nose", "thick eyebrows", "a gap in the front teeth", "prominent ears", "pockmarked skin", "a split eyebrow", "a burn mark on the neck"],
    expr=["serious and stiff", "cheerful grin", "arrogant smirk", "nervous", "calm and distant", "stern frown", "sly smile", "tired but kind"],
)
HAIR = {
    ('kid', 'm'): ["shaved head with a forelock tuft", "two small buns", "short messy hair", "a single small topknot", "bowl haircut"],
    ('kid', 'f'): ["twin pigtails", "two hair loops", "a single braid", "short bob", "hair in two small buns with ribbons"],
    ('teen', 'm'): ["shaggy hair tied with a rag", "short topknot", "messy hair half tied", "hair in a high ponytail", "bowl-cut fringe under a small bun"],
    ('teen', 'f'): ["single braid over the shoulder", "twin braids", "hair in a high ponytail", "short cropped hair", "hair in a neat bun"],
    ('adult', 'm'): ["long hair in a topknot", "hair half tied with loose strands", "shaved head", "short rough hair", "topknot with a cloth band"],
    ('adult', 'f'): ["hair in a high ponytail", "hair in a low bun with a pin", "long loose hair tied at the end", "short hair tied back", "hair in a braided crown"],
}
POSE = ["standing with weight on one leg", "arms crossed", "looking over the shoulder", "walking forward mid-step", "one hand raised in greeting", "hands clasped behind the back", "leaning slightly forward"]


def make(base_id, n):
    b = roster[base_id]; p = b['prompt']; k = p.index('Character ('); style, ch = p[:k], p[k:]
    head, rest = ch.split(': ', 1)                      # "Character (a boy)", "poor boy, 6: skinny, ..."
    role, desc = rest.split(': ', 1)                    # "poor boy, 6", "skinny, ... . Clothes. Pose."
    sents = [x.strip() for x in desc.split('. ') if x.strip()]
    clothes = sents[1] if len(sents) > 1 else ''
    age = int(''.join(c for c in role.split(',')[-1] if c.isdigit()) or 30)
    sex = 'f' if any(w in head for w in ('girl', 'woman')) else 'm'
    band = 'kid' if age < 10 else 'teen' if age < 18 else 'adult'
    pool = KID if band == 'kid' else ADULT
    r = random.Random(f'{base_id}-{n}')
    face = f"{r.choice(pool['build'])}, {r.choice(pool['face'])}, {r.choice(pool['eye'])}, {r.choice(pool['mark'])}, {r.choice(pool['expr'])} expression, {'shaved head with incense burn dots' if 'monk' in role else r.choice(HAIR[(band, sex)])}"
    plain = ' Plain looking, do not beautify.' if r.random() < 0.4 else ''
    desc2 = f"{role}: {face}. {clothes.rstrip('.')}, in a different color from usual. {r.choice(POSE).capitalize()}.{plain} A different person from any earlier image."
    return {"id": f"{base_id}_{n}", "group": "V", "ko": f"{b['ko']} 변형{n}", "sex": b.get('sex'), "prompt": style + head + ': ' + desc2}


out = [make(s, n) for s in SLOTS for n in (2, 3)]
json.dump(out, open('art/roster_variants.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print(len(out)); print(out[0]['prompt'][out[0]['prompt'].index('Character'):]); print(out[-1]['prompt'][out[-1]['prompt'].index('Character'):])
