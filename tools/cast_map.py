# ChatGPT 대화 기록(브라우저에서 뽑은 JSON)과 프롬프트 파일을 맞춰 "그림 ↔ id" 대조표를 만든다.
# 입력: _workspace/map_raw.json  [{id, title, seq: [[프롬프트 앞부분, 그림 수], ...]}]
#   (ChatGPT 페이지에서 /backend-api/conversation/{id}를 읽어 사용자 메시지마다 "Character (" 뒤 160자와 다음 답의 그림 수를 모은다)
# 출력: art/cast_map.md  채팅별로 몇 번째 그림이 어느 id인지, 아직 없는 id, 두 번 이상 만든 id
import json, sys

sys.stdout.reconfigure(encoding='utf-8')
files = ['art/roster_named.json', 'art/roster_extra.json', 'art/roster_fac.json', 'art/roster_variants.json']
items = []
for f in files:
    try:
        for r in json.load(open(f, encoding='utf-8')):
            p = r['prompt']; items.append((r['id'], r['ko'], p[p.index('Character ('):]))
    except FileNotFoundError:
        pass
raw = json.load(open('_workspace/map_raw.json', encoding='utf-8'))


def find(snip):
    s = snip.replace('Character (a girl)', 'Character (a woman)').replace('Character (a boy)', 'Character (a man)')
    for iid, ko, ch in items:
        c = ch.replace('Character (a girl)', 'Character (a woman)').replace('Character (a boy)', 'Character (a man)')
        if c[:120] == s[:120]:
            return iid, ko
    return None, None


made = {}
lines = ['# 초상 그림 대조표', '', 'ChatGPT 대화마다 그림이 나온 순서와 그 그림의 id다. 한 프롬프트에 그림이 둘이면 둘 다 같은 id의 후보이니 하나를 고른다.', '']
for cv in sorted(raw, key=lambda c: c['title']):
    lines += [f"## {cv['title']}", '', f"대화 id `{cv['id']}`", '', '| 순서 | id | 이름 | 그림 수 |', '|---|---|---|---|']
    k = 0
    for snip, n in cv['seq']:
        iid, ko = find(snip)
        k += 1
        lines.append(f"| {k} | {iid or '?'} | {ko or snip[:40]} | {n} |")
        if iid and n:
            made.setdefault(iid, []).append(cv['title'])
    lines.append('')
all_ids = [i for i, _, _ in items]
missing = [i for i in all_ids if i not in made]
dup = {i: v for i, v in made.items() if len(v) > 1}
lines += ['## 아직 없는 id', '', ', '.join(missing) or '없음', '', '## 두 번 이상 만든 id', '']
lines += [f"- {i}: {', '.join(v)}" for i, v in dup.items()] or ['없음']
open('art/cast_map.md', 'w', encoding='utf-8').write('\n'.join(lines) + '\n')
print(f'만든 id {len(made)} / 전체 {len(all_ids)}, 없음 {len(missing)}, 중복 {len(dup)}')
