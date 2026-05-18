import re

ts_file = 'src/types/worksheet.ts'
md_file = 'WORKSHEET_BLOCK_JSON_REFERENCE.md'

# Extract BlockType from .ts
with open(ts_file, 'r') as f:
    content = f.read()
    match = re.search(r'export type BlockType =([\s\S]*?);', content)
    if match:
        block_type_text = match.group(1)
        # Match "type-name"
        types_in_ts = set(re.findall(r'"([^"]+)"', block_type_text))
    else:
        types_in_ts = set()

# Extract headings from .md
types_in_md = set()
with open(md_file, 'r') as f:
    for line in f:
        if line.startswith('### '):
            # Extract content within backticks or the whole heading
            head_match = re.search(r'### `([^`]+)`', line)
            if head_match:
                types_in_md.add(head_match.group(1))
            else:
                # Fallback to the whole heading after "### "
                types_in_md.add(line[4:].strip())

print("In BlockType but NOT in Documentation:")
for t in sorted(types_in_ts - types_in_md):
    print(f"- {t}")

print("\nIn Documentation but NOT in BlockType:")
# Many documented items are not in the BlockType list, let's filter the output to show them clearly.
for t in sorted(types_in_md - types_in_ts):
    print(f"- {t}")
