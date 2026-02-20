import locale
locale.setlocale(locale.LC_ALL, 'de_DE.UTF-8')

def load_verbs(path):
    with open(path) as f:
        return {line.strip().removeprefix('sich ') for line in f if line.strip()}

a1 = load_verbs('public/verbs/verbs_a1.txt')
a2 = load_verbs('public/verbs/verbs_a2_only.txt')
known = a1 | a2

with open('public/verbs/verbs_b1.txt') as f:
    b1_all = [line.strip() for line in f if line.strip()]

b1_only = [v for v in b1_all if v.removeprefix('sich ') not in known]
dupes = [v for v in b1_all if v.removeprefix('sich ') in known]

b1_only.sort(key=lambda v: locale.strxfrm(v.removeprefix('sich ')))

with open('public/verbs/verbs_b1_only.txt', 'w') as f:
    f.write('\n'.join(b1_only) + '\n')

print(f'A1: {len(a1)} | A2-only: {len(a2)} | Combined: {len(known)}')
print(f'B1 total: {len(b1_all)}')
print(f'Duplicates removed: {len(dupes)}')
print(f'B1-only written: {len(b1_only)}')
print()
print('Duplicates:')
for d in sorted(dupes, key=lambda v: locale.strxfrm(v.removeprefix('sich '))):
    src = 'A1' if d.removeprefix('sich ') in a1 else 'A2'
    print(f'  {d} ({src})')
