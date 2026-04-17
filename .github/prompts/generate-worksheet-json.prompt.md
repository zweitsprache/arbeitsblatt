---
name: "Generate Worksheet JSON"
description: "Generate complete worksheet JSON from a teaching brief using the workspace block schema"
argument-hint: "Describe the worksheet topic, level, target language, exercise mix, and whether you want a full document or blocks only"
agent: "agent"
---

Generate valid worksheet JSON for this repository.

Use these source-of-truth files:

- [Worksheet block reference](../../WORKSHEET_BLOCK_JSON_REFERENCE.md)
- [Worksheet TypeScript types](../../src/types/worksheet.ts)

User brief:

${input}

Requirements:

1. Use only block types and field shapes defined in the workspace reference.
2. Default to a full `WorksheetDocument` JSON object unless the user explicitly asks for `blocks` only.
3. Generate realistic, complete content instead of placeholders whenever the brief provides enough information.
4. Use unique IDs for every block and every nested item.
5. Keep enum values exactly valid. Do not invent block types, field names, or enum values.
6. Use HTML strings for rich text fields such as `content`, `body`, `message`, `leftContent`, `rightContent`, and table cell content.
7. For nested blocks:
   - `columns.children` must be an array whose length matches `columns`
   - `accordion.items[].children` must contain valid worksheet blocks
8. For `word-search`, include a populated `grid` that matches `gridCols` and `gridRows`.
9. Do not use `linked-blocks` unless the brief explicitly asks to reference another worksheet.
10. Leave runtime/session fields empty unless explicitly requested:
    - `ai-prompt.userInput`
    - `ai-prompt.aiResult`
    - `ai-tool.latestRunId`
11. Prefer normal sidebar blocks over special-case or legacy structures.
12. Make reasonable assumptions when the brief is incomplete, but keep the output schema-valid.

Output format:

- Return only a single `json` fenced code block.
- Do not include explanations before or after the JSON.
- The JSON must be directly usable in this repository.

Quality bar:

- Match the requested pedagogical level and tone.
- Choose exercise blocks that fit the learning goal instead of repeating one block type unnecessarily.
- Keep the worksheet internally coherent: vocabulary, instructions, answers, and examples should align.
- If bilingual or translation-related output is requested, only use fields supported by the documented schema.