"""Build art/roster.json: every character image the design needs (approved 2026-11-24).

Groups:
  A player portraits: 5 life stages x 2 sexes x 3 wealth levels = 30
  B origin careers from data/origins.js: 17 careers, both sexes where it fits = 32
  C faction people from data/factions.js: 10 categories x 3 ranks = 30

Each entry carries a concrete look (face, body, hair, expression, clothes, pose, prop).
Abstract requests for "variety" don't work; concrete looks do.
"""
import json, os, re

STYLE = (
    "Generate an image. Single full-body standing character illustration for a wuxia life-simulation game. "
    "Square canvas, character centered, whole body visible head to feet with clear margin above the head, "
    "fully transparent PNG background with alpha channel, no ground shadow, no text. "
    "Art style: modern Korean action webtoon (murim genre) digital coloring. Bold black ink lineart with strong "
    "line-weight variation, thick at contours and thin inside; large hard-edged solid black shadow shapes (spot blacks) "
    "under the hair, jaw, neck and inside sleeves; high-contrast two-step cel shading with sharp shadow edges, no soft "
    "airbrush; subtle cool rim light along one side of the body. Glossy eye highlights, messy hair strands. Muted "
    "desaturated clothing colors with crisp fold lines. Not chibi, not Western cartoon, not painterly, not photorealistic. "
    "Draw the character exactly as described, including plain or unattractive features; do not beautify unless stated. "
)

A = [
 # (id, ko, desc)
 ("A01","유년·남·빈천","poor boy, 6: skinny, big head on thin neck, shaved head with one forelock tuft, dirty face, chapped cheeks, wary eyes. Torn hemp tunic too big for him, barefoot. Clutches a half-eaten steamed bun to his chest."),
 ("A02","유년·남·평민","commoner boy, 6: sturdy and round-cheeked, two small hair buns, gap-toothed grin. Clean blue cotton jacket and trousers, cloth shoes. Holds a wooden toy sword over his head."),
 ("A03","유년·남·부귀","rich boy, 6: plump and pale, haughty pout, hair in a neat topknot with a gold ring, long-life lock pendant. Embroidered red silk jacket with gold trim, small fur collar, satin boots. Hands on hips."),
 ("A04","유년·여·빈천","poor girl, 6: small and thin, tangled hair tied with straw, big frightened eyes, smudged nose. Patched grey smock, one sandal missing. Holds a cracked clay bowl."),
 ("A05","유년·여·평민","commoner girl, 6: chubby, twin pigtails with red strings, bright curious smile. Flowered pink cotton jacket, green trousers. Holds a paper pinwheel."),
 ("A06","유년·여·부귀","rich girl, 6: delicate, solemn little face, hair in two loops with pearl pins. Layered peach silk dress with tiny jade bells, embroidered slippers. Holds a small silk fan primly."),
 ("A07","소년·남·빈천","poor boy, 14: wiry and tanned, sharp hungry eyes, scar on the eyebrow, shaggy hair tied with rag. Sleeveless torn jacket, rope belt, straw sandals. Carries a bundle of firewood on his back."),
 ("A08","소년·남·평민","commoner boy, 14: lanky, freckled, cowlick, earnest look. Plain brown short jacket, wrapped shins, cloth shoes. Holds a wooden practice staff upright."),
 ("A09","소년·남·부귀","rich young master, 14: slim, smooth pale face, arrogant smirk, hair in a jade crown. White and gold brocade robe, jade pendant, folding fan tapped against his chin."),
 ("A10","소년·여·빈천","poor girl, 14: gaunt, hollow cheeks, fierce stubborn stare, hair cropped short like a boy. Oversized men's jacket with patches, bare feet. Grips a short kitchen knife at her side."),
 ("A11","소년·여·평민","commoner girl, 14: sturdy, round face, single braid over the shoulder, cheerful squint. Light green cotton jacket and skirt, apron. Carries a basket of vegetables."),
 ("A12","소년·여·부귀","rich young lady, 14: willowy, small cool face, half-lidded bored eyes, elaborate hair loops with gold flowers. Pale blue layered silk gown, long ribbons. Holds a book of poems."),
 ("A13","청년·남·빈천","poor young man, 22: tall and bony, unshaven, tired red-rimmed eyes, hair loosely tied. Faded dark jacket with one sleeve torn off, rope belt, worn boots. Carries a rusty sword wrapped in cloth over the shoulder."),
 ("A14","청년·남·평민","commoner young man, 22: medium build, broad honest face, thick eyebrows, short topknot, slight smile. Grey-blue short robe, wrapped shins, travel bundle on back, walking staff."),
 ("A15","청년·남·부귀","rich young lord, 22: tall and elegant, narrow fox eyes, faint sneer, long hair half up in a gold crown. Layered black and gold brocade robes, jade belt. One hand on the hilt of an ornate jian."),
 ("A16","청년·여·빈천","poor young woman, 22: lean, sun-browned, high cheekbones, guarded eyes, hair tied up with a cloth. Rough brown work clothes with rolled sleeves, wrapped hands. Carries a carrying pole with two buckets."),
 ("A17","청년·여·평민","commoner young woman, 22: average height, soft round face, dimples, hair in a low bun with a wooden pin. Light lilac cotton jacket and long skirt. Holds a cloth-wrapped lunch box."),
 ("A18","청년·여·부귀","noble young woman, 22: tall, striking sharp beauty, cold proud gaze, hair piled high with jade and gold pins. Deep red and gold layered silk, long trailing sleeves. Hands folded at the waist."),
 ("A19","장년·남·빈천","poor middle-aged man, 42: stooped and hard-worn, deep lines, missing tooth, greying stubble, cloth headband. Patched faded jacket, bare calloused feet in straw sandals. Leans on a hoe."),
 ("A20","장년·남·평민","commoner middle-aged man, 42: thickset, belly, kind tired eyes, short beard, topknot with cloth cap. Brown long robe, cloth shoes. Holds an abacus under one arm."),
 ("A21","장년·남·부귀","wealthy middle-aged lord, 42: tall, well-fed, neat long beard, calm cold eyes, official-style hat. Dark purple brocade robe with gold cranes, jade belt. Hands clasped behind his back."),
 ("A22","장년·여·빈천","poor middle-aged woman, 42: thin and weathered, grey streaks, sharp worried eyes, headscarf. Patched dark blue clothes, apron, sleeves tied up. Carries a bundle of washing."),
 ("A23","장년·여·평민","commoner middle-aged woman, 42: plump and brisk, ruddy cheeks, loud laughing mouth, hair in a tight bun. Russet cotton jacket and skirt, apron. Holds a ladle."),
 ("A24","장년·여·부귀","wealthy matron, 42: stately, fleshy face, thin painted eyebrows, stern mouth, heavy gold hairpins. Dark green brocade robes with fur trim, many rings. Holds prayer beads."),
 ("A25","노년·남·빈천","poor old man, 68: tiny and bent, toothless, wispy white beard, cloudy eye. Ragged layered rags, bare feet. Leans on a crooked branch as a cane, holds a begging bowl."),
 ("A26","노년·남·평민","commoner old man, 68: lean, bald crown with white topknot, long white eyebrows, gentle smile. Plain grey robe, cloth shoes. Holds a long pipe and a bird cage."),
 ("A27","노년·남·부귀","rich old patriarch, 68: big frame gone soft, heavy jowls, long white beard, piercing eyes. Black and gold brocade robe, fur-lined mantle. Seated-style dragon-head cane held upright."),
 ("A28","노년·여·빈천","poor old woman, 68: shrunken, deep wrinkles, white hair in a thin knot, few teeth, squinting. Faded black jacket, patched skirt. Carries a basket of herbs on her back."),
 ("A29","노년·여·평민","commoner old woman, 68: small and round, kind wrinkled face, silver hair bun with a wooden pin. Dark blue jacket, apron. Holds a sewing basket."),
 ("A30","노년·여·부귀","grand matriarch, 68: thin and upright, severe narrow face, silver hair under a jeweled headband, thin lips. Deep plum brocade robes, jade bracelets. Holds a carved staff with a phoenix head."),
]

B = [
 ("B01","농부·남","farmer, 40: broad shoulders, sun-baked skin, square jaw, stubble, straw hat on his back. Rolled hemp trousers, sleeveless jacket, muddy feet. Carries a plough handle over his shoulder."),
 ("B02","농부·여","farm wife, 35: strong arms, round weathered face, headscarf, sleeves tied up. Indigo work clothes, apron with seeds. Carries a sickle and a sheaf of rice."),
 ("B03","어부·남","fisherman, 45: dark leathery skin, wiry, squinting crow's-feet, wispy beard. Conical bamboo hat, bare chest under an open vest, rolled trousers. Holds a fishing net over his shoulder."),
 ("B04","어부·여","fisherwoman, 30: lean, salt-roughened hands, sharp eyes, hair wrapped in a blue cloth. Short jacket, trousers rolled up, barefoot. Carries a basket of fish on her hip."),
 ("B05","사냥꾼·남","hunter, 35: tall and rangy, hawk-like face, scar across the cheek, fur hat. Leather and fur vest, wrapped leggings. Long bow on his back, a hare hanging from his belt."),
 ("B06","사냥꾼·여","huntress, 26: lithe, narrow fierce eyes, braided hair with a feather. Deerskin jacket, leather boots. Holds a short bow, quiver at her hip."),
 ("B07","약초꾼·남","herb gatherer, 55: thin, long chin beard, calm eyes, cloth headband. Grey hemp clothes, straw sandals. Basket of roots on his back, small hoe in hand."),
 ("B08","약초꾼·여","herb gatherer girl, 18: small, quick, freckles, two braids. Moss-green clothes, gaiters. Basket of mountain herbs, sniffing a leaf."),
 ("B09","대장장이·남","blacksmith, 38: massive arms, burn scars, shaved head with sweatband, thick beard. Leather apron over bare chest, heavy gloves. Hammer resting on his shoulder."),
 ("B10","대장장이·여","blacksmith's daughter, 24: muscular, soot on the face, short practical hair, cocky grin. Leather apron over a short jacket, wrapped forearms. Holds tongs with a glowing blade."),
 ("B11","상인·남","street peddler, 30: wiry, shifty smiling eyes, thin mustache, cloth cap. Patched jacket, carrying pole with goods hanging from both ends."),
 ("B12","상인·여","market stall owner, 45: stout, loud confident face, hair in a tight bun with a silver pin. Brown jacket, money pouch at the belt. Holds a weighing scale."),
 ("B13","객잔·남","inn keeper, 50: round belly, double chin, greasy smile, small calculating eyes. Dark vest over a cream shirt, apron. Holds an account book and a brush."),
 ("B14","객잔·여","inn landlady, 35: shapely, sharp tongue look, arched eyebrows, hair up with a red flower. Red-brown jacket, white apron. Holds a wine jar on her hip."),
 ("B15","장인·남","craftsman (carpenter), 45: stocky, thick fingers, focused squint, pencil behind the ear. Short work jacket, tool belt. Holds a carpenter's square and a plane."),
 ("B16","장인·여","weaver, 28: slender, nimble hands, gentle tired eyes, hair in a low bun. Pale blue work dress, sleeves bound. Holds a shuttle and a bolt of cloth."),
 ("B17","예인·남","street musician, 25: thin, dreamy half-closed eyes, long untied hair. Faded scholar robe, worn shoes. Plays an erhu fiddle."),
 ("B18","예인·여","dancer of an entertainment house, 19: slim, painted lips, almond eyes, coy smile, hair with silk ribbons. Flowing apricot dance robe with long water sleeves, mid-twirl."),
 ("B19","광대·남","troupe acrobat, 20: compact and muscular, mischievous grin, shaved sides. Bright patched costume with bells. Balancing on one foot with plates spinning on sticks."),
 ("B20","광대·여","troupe juggler, 17: small, bright big eyes, two buns with ribbons, missing front tooth. Colorful patched outfit. Juggling three balls."),
 ("B21","풍수가·남","geomancer, 60: gaunt, narrow eyes, long thin mustache, black square cap. Dark blue robe with trigram symbols. Holds a luopan compass."),
 ("B22","선비·남","scholar, 30: thin and pale, earnest, thin beard, black scholar hat. Plain white robe, cloth shoes. Holds a scroll and a brush, book box on his back."),
 ("B23","선비·여","learned lady tutor, 40: upright, calm intelligent eyes, simple hair bun. Muted grey-green robe. Holds a book and a ruler."),
 ("B24","군관·남","army officer, 38: square jaw, trimmed beard, stern eyes. Lamellar armor over a red robe, helmet under his arm. Halberd planted beside him."),
 ("B25","군관·여","army archer, 26: tall, broad shoulders, short hair, scar on the chin, impassive face. Leather armor, red sash. Recurve bow in hand."),
 ("B26","환관·남","palace eunuch, 50: soft hairless face, smooth pale skin, thin smile, slanted cunning eyes. Dark green court robe with an embroidered square, black hat. Holds a horsetail whisk."),
 ("B27","의원·남","physician, 55: neat grey beard, kind but shrewd eyes, black cap. Plain dark robe. Holds an acupuncture needle case, medicine box on his back."),
 ("B28","의원·여","female physician, 32: composed, thin eyebrows, sharp observant eyes, hair in a simple knot. Light grey robe with rolled sleeves. Holds a mortar and pestle."),
 ("B29","도둑·남","thief, 24: wiry, ratlike face, crooked teeth, darting eyes, messy hair. Dark close-fitting clothes, wrapped shins. Tossing a stolen purse in one hand."),
 ("B30","도둑·여","pickpocket, 20: petite, sly feline smile, short choppy hair, beauty mark. Dark grey short jacket, many hidden pockets. Twirling a small knife."),
 ("B31","표사·남","escort guard, 40: burly, thick neck, broken nose, bushy beard. Brown leather vest over a jacket, escort agency flag on his back. Broad saber on the shoulder."),
 ("B32","무관·여","martial school instructor, 35: athletic, firm jaw, calm stern gaze, hair tied high. White training clothes with a black belt, wrapped wrists. Spear held across her body."),
]

C = [
 ("C01","구파일방·제자","young disciple of an orthodox sect (Taoist sword school), 17: slim, earnest, eager face, hair in a topknot with a wooden pin. Plain blue Taoist training robe. Wooden practice sword in both hands."),
 ("C02","구파일방·고수","elder master of an orthodox sword sect, 55: lean and upright, long black beard with grey, piercing calm eyes, Taoist crown. Indigo and white Taoist robe. Long jian sheathed on his back, horsetail whisk in hand."),
 ("C03","구파일방·수장","beggar sect chief, 60: big-bellied, shaggy grey hair, red nose, sly drunken grin. Patched rags with many colored pouches. Green bamboo staff and a gourd of wine."),
 ("C04","세가·제자","young heir of a martial clan, 18: handsome but cold, narrow eyes, high ponytail with silver ring. Clan uniform: black and silver robe with family crest. Hand on sword hilt."),
 ("C05","세가·고수","clan elder, 60: thin, hooked nose, white goatee, half-closed suspicious eyes. Dark green robe with clan crest, fur-trimmed vest. Hands hidden in sleeves."),
 ("C06","세가·수장","clan head (female), 50: tall and commanding, severe beauty with lines, silver streaked hair in a high crown. Black and crimson brocade with gold crest. Holds a closed iron fan."),
 ("C07","연합·제자","Martial Alliance patrol member, 25: average build, alert eyes, short beard. Dark blue uniform with alliance emblem, leather armor pieces. Saber at hip, signal whistle around neck."),
 ("C08","연합·고수","Martial Alliance enforcement captain, 40: scarred face, eyepatch, grim mouth. Dark blue long coat with emblem, armored bracers. Heavy saber held point down."),
 ("C09","연합·수장","Martial Alliance leader, 58: imposing, broad white beard, calm authority. Grand white and gold robes with alliance emblem, purple mantle. Hands folded on a ceremonial sword."),
 ("C10","사교·제자","Demonic Cult foot soldier, 22: gaunt, fanatic wide eyes, shaved head with a red tattoo. Black and red uniform, face half covered by a black cloth. Twin hook swords."),
 ("C11","사교·고수","Demonic Cult elder (female), 45: tall, pale, red lips, cruel smile, long black hair with red ornaments. Black and crimson layered robes. Long red silk ribbons coiling around her arms as weapons."),
 ("C12","사교·수장","Heavenly Demon cult master, 35: young-looking but terrifying, pale with red eyes, long white hair, calm empty stare. Black robe with red cloud pattern, high collar. Bare hands loose at the sides, dark aura at the feet."),
 ("C13","흑도·제자","bandit thug, 28: hulking, low brow, missing teeth, shaggy hair. Ragged vest of animal hide, bare arms with tattoos. Spiked club."),
 ("C14","흑도·고수","river pirate captain (female), 38: lean and tanned, scarred lip, short wild hair, gold earring. Open dark jacket, sash, boots. Curved broadsword over her shoulder."),
 ("C15","흑도·수장","greenwood bandit king, 45: huge bearlike man, wild black beard, fur mantle, thick eyebrows, laughing. Tiger-skin vest, iron armbands. Giant two-handed axe."),
 # C16: the earlier wording (16-year-old assassin, mask, reverse-grip dagger) got no reply from ChatGPT three times.
 ("C16","암중·제자","shadow guild initiate, 20: lean young man, quiet blank expression, tired eyes, short black hair. Plain close-fitting black clothes with wrapped forearms, a black cloth scarf around the neck. A short sheathed blade at the hip, standing still."),
 ("C17","암중·고수","master assassin (female), 30: slender, blank beautiful face, cold grey eyes, long hair in a tight braid. Dark grey night clothes, many throwing knives on the belt. Thin blade behind her back."),
 ("C18","암중·수장","spymaster of a shadow guild, 55: ordinary forgettable face, mild smile, small eyes, plain merchant clothes in brown. Holds a ledger and a small abacus; a hidden blade shows at the sleeve."),
 ("C19","관부·제자","government constable, 30: square jaw, mustache, stubborn look. Red and black constable uniform with a black hat. Iron chain and a saber."),
 ("C20","관부·고수","imperial secret police officer, 35: sharp gaunt face, thin cruel smile. Flying-fish embroidered red robe, black hat. Curved spring saber at hip."),
 ("C21","관부·수장","provincial magistrate, 55: plump, small beard, cautious greedy eyes. Official robe with a mandarin square, winged black hat. Holds a seal and a folded edict."),
 ("C22","도불·제자","young Buddhist nun, 18: shaven head, gentle round face, serene eyes. Grey robe, prayer beads. Palms pressed together."),
 ("C23","도불·고수","Shaolin warrior monk, 40: massive muscular body, shaved head with burn dots, thick eyebrows, fierce scowl. Ochre robe with one shoulder bare. Iron staff."),
 ("C24","도불·수장","Taoist sect head (female), 65: thin and ethereal, white hair in a crown, long white eyebrows, faint smile. White and silver Taoist robe with cloud patterns. Horsetail whisk."),
 ("C25","새외·제자","northern steppe rider, 20: stocky, wind-burned cheeks, braided hair, fur hat. Fur-lined deel coat, leather boots. Horse bow and a curved knife."),
 ("C26","새외·고수","western regions sword dancer (female), 28: dark-skinned, large almond eyes, curly hair under a veil, gold coins on the forehead. Layered colorful silk, sash. Twin curved sabers."),
 ("C27","새외·수장","southern barbarian shaman king, 50: tattooed face, feather crown, bone necklaces, heavy brow. Woven cloth and animal hides. Staff topped with a skull and snakes."),
 ("C28","생업·제자","escort agency apprentice, 17: skinny, nervous, bowl haircut. Agency uniform vest over a short jacket. Carries the agency banner pole."),
 ("C29","생업·고수","chief escort of a merchant guild, 45: barrel chest, short grey beard, calm eyes. Brown armored vest with guild badge. Iron rod and a list of goods."),
 ("C30","생업·수장","head of a great merchant guild (female), 50: elegant, sharp calculating eyes, thin smile, hair with gold pins. Dark gold brocade, jade abacus at the belt. Holds a contract scroll."),
]

# Sex is stated explicitly in every prompt. Without it ChatGPT drew B12, B25 and B30
# (women in the roster) as men. A and B take it from the "·남/·여" label; C is listed here.
C_FEMALE = {"C06", "C11", "C14", "C17", "C22", "C24", "C26", "C30"}


def sex_of(grp, i, ko):
    if grp in "AB":
        return "female" if "여" in ko.split("·")[1] else "male"
    return "female" if i in C_FEMALE else "male"


out = []
for grp, rows in (("A", A), ("B", B), ("C", C)):
    for i, ko, desc in rows:
        sex = sex_of(grp, i, ko)
        word = "a woman" if sex == "female" else "a man"
        age = re.search(r", (\d+)[:,]", desc)
        if (grp == "A" and ("boy" in desc or "girl" in desc)) or (age and int(age.group(1)) < 18):
            word = "a girl" if sex == "female" else "a boy"
        out.append({"id": i, "group": grp, "ko": ko, "sex": sex,
                    "prompt": STYLE + f"Character ({word}): " + desc})
os.makedirs("art", exist_ok=True)
json.dump(out, open("art/roster.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print(len(out), {g: sum(1 for o in out if o["group"] == g) for g in "ABC"})
