# Worksheet Block JSON Reference

This document describes every worksheet block type currently defined in `src/types/worksheet.ts`.

Purpose:

- Give AI a reliable schema reference for generating complete worksheet JSON.
- Separate normal sidebar blocks from special or legacy block types.
- Show the exact field structure, required nested arrays, and common optional fields.

## How To Use This Doc

- Every block must include `id`, `type`, and `visibility`.
- Use unique IDs everywhere: block IDs, item IDs, option IDs, row IDs, category IDs.
- Rich text fields are stored as HTML strings, usually wrapped in `<p>...</p>`.
- `visibility` can be `"both"`, `"print"`, or `"online"`.
- `displayOn` is optional. If present, use:

```json
{
  "displayOn": {
    "course": true,
    "worksheetOnline": true,
    "worksheetPrint": true
  }
}
```

- Container blocks can contain nested blocks:
  - `columns.children` is an array of block arrays.
  - `accordion.items[].children` is an array of blocks.
- Some fields are runtime-oriented and should normally start empty:
  - `ai-prompt.userInput`
  - `ai-prompt.aiResult`
  - `ai-tool.latestRunId`
- `word-search.grid` should ideally be pre-generated for a complete worksheet JSON. The editor can generate it when empty, but viewer-only rendering expects a filled grid.

## Full Worksheet Wrapper

If AI should generate a complete worksheet document, use this outer shape:

```json
{
  "id": "worksheet-uuid",
  "title": "Worksheet Title",
  "description": "Short description",
  "slug": "worksheet-title",
  "blocks": [],
  "settings": {
    "pageSize": "a4",
    "orientation": "portrait",
    "margins": {
      "top": 20,
      "right": 20,
      "bottom": 113,
      "left": 20
    },
    "showHeader": true,
    "showFooter": true,
    "headerText": "",
    "footerText": "",
    "fontSize": 12.5,
    "fontFamily": "Asap Condensed, sans-serif",
    "brand": "edoomio",
    "brandSettings": {
      "logo": "/logo/arbeitsblatt_logo_full_brand.svg",
      "organization": "",
      "teacher": "",
      "headerRight": "",
      "footerLeft": "",
      "footerCenter": "",
      "footerRight": ""
    },
    "coverSubtitle": "Arbeitsblatt",
    "coverInfoText": "",
    "coverImages": [],
    "coverImageBorder": false,
    "translationLanguages": []
  },
  "published": false,
  "createdAt": "2026-04-10T00:00:00.000Z",
  "updatedAt": "2026-04-10T00:00:00.000Z"
}
```

If AI only needs to generate worksheet content, it can output the `blocks` array alone.

## Common Block Base

All blocks share this base shape:

```json
{
  "id": "block-uuid",
  "type": "heading",
  "visibility": "both"
}
```

Optional shared field:

- `displayOn?: { course?: boolean; worksheetOnline?: boolean; worksheetPrint?: boolean }`

## Sidebar Blocks

These are the normal blocks available in the worksheet editor sidebar.

### `heading`

```json
{
  "id": "heading-1",
  "type": "heading",
  "visibility": "both",
  "content": "Heading",
  "level": 1,
  "bilingual": false,
  "skipTranslation": false
}
```

Notes:

- `level` must be `1`, `2`, or `3`.

### `text`

```json
{
  "id": "text-1",
  "type": "text",
  "visibility": "both",
  "content": "<p>Enter text here...</p>",
  "textStyle": "standard",
  "comment": "",
  "imageSrc": "",
  "imageAlign": "left",
  "imageScale": 40,
  "bilingual": false,
  "bilingualDivider": false,
  "skipTranslation": false
}
```

Allowed `textStyle` values:

- `standard`
- `example`
- `example-standard`
- `example-improved`
- `fragen`
- `hinweis`
- `hinweis-wichtig`
- `hinweis-alarm`
- `lernziel`
- `kompetenzziele`
- `handlungsziele`
- `redemittel`
- `metadaten`
- `rows`

### `image`

```json
{
  "id": "image-1",
  "type": "image",
  "visibility": "both",
  "src": "/samples/example.jpg",
  "alt": "Example image",
  "width": 800,
  "height": 600,
  "caption": "Optional caption",
  "imageStyle": "standard"
}
```

Allowed `imageStyle` values:

- `standard`
- `example`

### `image-cards`

```json
{
  "id": "image-cards-1",
  "type": "image-cards",
  "visibility": "both",
  "items": [
    {
      "id": "card-1",
      "src": "/samples/apple.jpg",
      "alt": "Apple",
      "text": "Apple"
    },
    {
      "id": "card-2",
      "src": "/samples/banana.jpg",
      "alt": "Banana",
      "text": "Banana"
    }
  ],
  "columns": 2,
  "imageAspectRatio": "1:1",
  "imageScale": 100,
  "showWritingLines": false,
  "writingLinesCount": 1,
  "showWordBank": false
}
```

Rules:

- `columns` must be `2`, `3`, or `4`.
- `imageAspectRatio` must be `16:9`, `4:3`, `1:1`, `3:4`, or `9:16`.

### `text-cards`

```json
{
  "id": "text-cards-1",
  "type": "text-cards",
  "visibility": "both",
  "items": [
    {
      "id": "card-1",
      "text": "Text 1",
      "caption": "Caption 1"
    },
    {
      "id": "card-2",
      "text": "Text 2",
      "caption": "Caption 2"
    }
  ],
  "columns": 2,
  "textSize": "base",
  "textAlign": "center",
  "textBold": false,
  "textItalic": false,
  "showBorder": true,
  "showWritingLines": false,
  "writingLinesCount": 1,
  "showWordBank": false
}
```

Allowed `textSize` values:

- `xs`
- `sm`
- `base`
- `lg`
- `xl`
- `2xl`

Allowed `textAlign` values:

- `left`
- `center`
- `right`

### `spacer`

```json
{
  "id": "spacer-1",
  "type": "spacer",
  "visibility": "both",
  "height": 40
}
```

### `divider`

```json
{
  "id": "divider-1",
  "type": "divider",
  "visibility": "both",
  "style": "solid"
}
```

Allowed `style` values:

- `solid`
- `dashed`
- `dotted`

### `logo-divider`

```json
{
  "id": "logo-divider-1",
  "type": "logo-divider",
  "visibility": "both"
}
```

### `columns`

```json
{
  "id": "columns-1",
  "type": "columns",
  "visibility": "both",
  "columns": 2,
  "children": [
    [
      {
        "id": "child-heading-1",
        "type": "heading",
        "visibility": "both",
        "content": "Left column",
        "level": 3
      }
    ],
    [
      {
        "id": "child-text-1",
        "type": "text",
        "visibility": "both",
        "content": "<p>Right column text.</p>"
      }
    ]
  ]
}
```

Rules:

- `columns` can be `1` to `4`.
- `children.length` should match `columns`.

### `multiple-choice`

```json
{
  "id": "mcq-1",
  "type": "multiple-choice",
  "visibility": "both",
  "question": "Enter your question here",
  "options": [
    {
      "id": "opt-1",
      "text": "Option A",
      "isCorrect": true
    },
    {
      "id": "opt-2",
      "text": "Option B",
      "isCorrect": false
    }
  ],
  "allowMultiple": false
}
```

### `fill-in-blank`

```json
{
  "id": "fib-1",
  "type": "fill-in-blank",
  "visibility": "both",
  "content": "The {{blank:answer}} is the correct word."
}
```

Rule:

- Blanks use `{{blank:correctAnswer}}` syntax.
- `{{blank}}` creates a blank gap with no solution (no auto-correction).
- `{{blank*:correctAnswer}}` adds no space before the gap (useful for prefixes/suffixes like `ge{{blank*:macht}}`).

### `fill-in-blank-items`

```json
{
  "id": "fib-items-1",
  "type": "fill-in-blank-items",
  "visibility": "both",
  "items": [
    {
      "id": "item-1",
      "content": "The {{blank:cat}} sat on the mat."
    },
    {
      "id": "item-2",
      "content": "She {{blank:goes}} to school every day."
    }
  ],
  "showWordBank": false
}
```

### `matching`

```json
{
  "id": "matching-1",
  "type": "matching",
  "visibility": "both",
  "instruction": "Match the items on the left with the items on the right.",
  "pairs": [
    {
      "id": "pair-1",
      "left": "Hund",
      "right": "dog"
    },
    {
      "id": "pair-2",
      "left": "Katze",
      "right": "cat"
    }
  ],
  "extendedRows": false
}
```

### `two-column-fill`

```json
{
  "id": "two-column-fill-1",
  "type": "two-column-fill",
  "visibility": "both",
  "instruction": "Fill in the missing items.",
  "items": [
    {
      "id": "item-1",
      "left": "go",
      "right": "geht"
    },
    {
      "id": "item-2",
      "left": "come",
      "right": "kommt"
    }
  ],
  "fillSide": "right",
  "colRatio": "1-1",
  "extendedRows": false,
  "showWordBank": false
}
```

Allowed values:

- `fillSide`: `left` or `right`
- `colRatio`: `1-1`, `1-2`, or `2-1`

### `open-response`

```json
{
  "id": "open-response-1",
  "type": "open-response",
  "visibility": "both",
  "question": "Write your answer below:",
  "lines": 4
}
```

### `word-bank`

```json
{
  "id": "word-bank-1",
  "type": "word-bank",
  "visibility": "both",
  "words": ["word1", "word2", "word3", "word4"]
}
```

### `true-false-matrix`

```json
{
  "id": "tf-1",
  "type": "true-false-matrix",
  "visibility": "both",
  "instruction": "Mark each statement as True or False.",
  "statementColumnHeader": "Statement",
  "trueLabel": "True",
  "falseLabel": "False",
  "showPill": true,
  "statements": [
    {
      "id": "statement-1",
      "text": "Berlin is in Germany.",
      "correctAnswer": true
    },
    {
      "id": "statement-2",
      "text": "Paris is in Spain.",
      "correctAnswer": false
    }
  ],
  "statementOrder": ["statement-2", "statement-1"]
}
```

Notes:

- `statementOrder` is optional persisted shuffle order.

### `order-items`

```json
{
  "id": "order-items-1",
  "type": "order-items",
  "visibility": "both",
  "instruction": "Put the following items in the correct order.",
  "showPill": true,
  "items": [
    {
      "id": "item-1",
      "text": "Wake up",
      "correctPosition": 1
    },
    {
      "id": "item-2",
      "text": "Brush teeth",
      "correctPosition": 2
    }
  ]
}
```

### `inline-choices`

```json
{
  "id": "inline-choices-1",
  "type": "inline-choices",
  "visibility": "both",
  "items": [
    {
      "id": "item-1",
      "content": "In {{1988|1889|1898}} he was born in London."
    },
    {
      "id": "item-2",
      "content": "She {{goes|go|going}} to school every day."
    }
  ]
}
```

Rules:

- The first choice inside `{{...}}` is the correct answer.
- Legacy `content` as a single string exists in the type for backward compatibility, but AI should generate `items`.

### `word-search`

```json
{
  "id": "word-search-1",
  "type": "word-search",
  "visibility": "both",
  "words": ["HELLO", "WORLD", "SEARCH", "FIND"],
  "gridCols": 8,
  "gridRows": 8,
  "grid": [
    ["H", "E", "L", "L", "O", "A", "B", "C"],
    ["D", "W", "O", "R", "L", "D", "E", "F"],
    ["G", "H", "I", "J", "K", "L", "M", "N"],
    ["O", "P", "Q", "R", "S", "E", "A", "R"],
    ["C", "H", "T", "U", "V", "W", "X", "Y"],
    ["F", "I", "N", "D", "Z", "A", "B", "C"],
    ["D", "E", "F", "G", "H", "I", "J", "K"],
    ["L", "M", "N", "O", "P", "Q", "R", "S"]
  ],
  "showWordList": true
}
```

Notes:

- `gridSize` exists only as a deprecated fallback. AI should use `gridCols` and `gridRows`.
- `grid` should match the given dimensions.

### `sorting-categories`

```json
{
  "id": "sorting-1",
  "type": "sorting-categories",
  "visibility": "both",
  "instruction": "Sort the words into the correct categories.",
  "categories": [
    {
      "id": "cat-1",
      "label": "Animals",
      "correctItems": ["item-1", "item-2"]
    },
    {
      "id": "cat-2",
      "label": "Food",
      "correctItems": ["item-3"]
    }
  ],
  "items": [
    {
      "id": "item-1",
      "text": "dog"
    },
    {
      "id": "item-2",
      "text": "cat"
    },
    {
      "id": "item-3",
      "text": "bread"
    }
  ],
  "showWritingLines": true
}
```

### `unscramble-words`

```json
{
  "id": "unscramble-1",
  "type": "unscramble-words",
  "visibility": "both",
  "instruction": "Unscramble the words.",
  "words": [
    {
      "id": "word-1",
      "word": "school"
    },
    {
      "id": "word-2",
      "word": "teacher"
    }
  ],
  "keepFirstLetter": false,
  "lowercaseAll": false,
  "showPill": true,
  "itemOrder": ["word-2", "word-1"]
}
```

Notes:

- `itemOrder` is optional persisted shuffle order.

### `fix-sentences`

```json
{
  "id": "fix-sentences-1",
  "type": "fix-sentences",
  "visibility": "both",
  "instruction": "Put the sentence parts in the correct order.",
  "sentences": [
    {
      "id": "sentence-1",
      "sentence": "The cat | sat on | the mat"
    },
    {
      "id": "sentence-2",
      "sentence": "I like | to eat | ice cream"
    }
  ]
}
```

Rule:

- Sentence parts are split using ` | `.

### `complete-sentences`

```json
{
  "id": "complete-sentences-1",
  "type": "complete-sentences",
  "visibility": "both",
  "instruction": "Complete the sentences.",
  "sentences": [
    {
      "id": "sentence-1",
      "beginning": "I like to ..."
    },
    {
      "id": "sentence-2",
      "beginning": "On weekends ..."
    }
  ]
}
```

### `verb-table`

```json
{
  "id": "verb-table-1",
  "type": "verb-table",
  "visibility": "both",
  "verb": "machen",
  "splitConjugation": false,
  "showConjugations": true,
  "singularRows": [
    {
      "id": "singular-1",
      "person": "1. Person",
      "pronoun": "ich",
      "conjugation": "mache",
      "showOverride": null,
      "showOverride2": null
    },
    {
      "id": "singular-2",
      "person": "2. Person",
      "detail": "informell",
      "pronoun": "du",
      "conjugation": "machst",
      "showOverride": null,
      "showOverride2": null
    }
  ],
  "pluralRows": [
    {
      "id": "plural-1",
      "person": "1. Person",
      "pronoun": "wir",
      "conjugation": "machen",
      "showOverride": null,
      "showOverride2": null
    }
  ]
}
```

Optional row fields:

- `detail`
- `conjugation2`
- `showOverride`
- `showOverride2`

Allowed override values:

- `show`
- `hide`
- `null`

### `glossary`

```json
{
  "id": "glossary-1",
  "type": "glossary",
  "visibility": "both",
  "instruction": "",
  "pairs": [
    {
      "id": "pair-1",
      "term": "noun",
      "definition": "A naming word"
    },
    {
      "id": "pair-2",
      "term": "verb",
      "definition": "An action word"
    }
  ],
  "leftColWidth": 25
}
```

Allowed `leftColWidth` values:

- `25`
- `33`
- `50`
- `66`

### `article-training`

```json
{
  "id": "article-training-1",
  "type": "article-training",
  "visibility": "both",
  "instruction": "Kreuze den richtigen Artikel an.",
  "showWritingLine": true,
  "items": [
    {
      "id": "item-1",
      "text": "Hund",
      "correctArticle": "der"
    },
    {
      "id": "item-2",
      "text": "Katze",
      "correctArticle": "die"
    },
    {
      "id": "item-3",
      "text": "Haus",
      "correctArticle": "das"
    }
  ]
}
```

Allowed `correctArticle` values:

- `der`
- `die`
- `das`

### `chart`

```json
{
  "id": "chart-1",
  "type": "chart",
  "visibility": "both",
  "chartType": "bar",
  "title": "Survey Results",
  "data": [
    {
      "id": "data-1",
      "label": "A",
      "value": 40,
      "color": "#6366f1"
    },
    {
      "id": "data-2",
      "label": "B",
      "value": 70,
      "color": "#8b5cf6"
    }
  ],
  "showLegend": false,
  "showValues": true,
  "showGrid": true,
  "xAxisLabel": "Category",
  "yAxisLabel": "Value"
}
```

Allowed `chartType` values:

- `bar`
- `pie`
- `line`

### `dialogue`

```json
{
  "id": "dialogue-1",
  "type": "dialogue",
  "visibility": "both",
  "instruction": "Complete the dialogue.",
  "items": [
    {
      "id": "line-1",
      "speaker": "A",
      "icon": "triangle",
      "text": "Hello, how are you?"
    },
    {
      "id": "line-2",
      "speaker": "B",
      "icon": "circle",
      "text": "I am {{blank:fine}}, thank you!"
    }
  ],
  "showWordBank": false
}
```

Allowed `icon` values:

- `triangle`
- `square`
- `diamond`
- `circle`

### `numbered-label`

```json
{
  "id": "numbered-label-1",
  "type": "numbered-label",
  "visibility": "both",
  "startNumber": 1,
  "prefix": "Task ",
  "suffix": ":",
  "bilingual": false,
  "skipTranslation": false
}
```

### `page-break`

```json
{
  "id": "page-break-1",
  "type": "page-break",
  "visibility": "print",
  "restartPageNumbering": false
}
```

### `writing-lines`

```json
{
  "id": "writing-lines-1",
  "type": "writing-lines",
  "visibility": "both",
  "lineCount": 5,
  "lineSpacing": 24
}
```

### `writing-rows`

```json
{
  "id": "writing-rows-1",
  "type": "writing-rows",
  "visibility": "both",
  "rowCount": 5
}
```

### `text-snippet`

```json
{
  "id": "text-snippet-1",
  "type": "text-snippet",
  "visibility": "both",
  "content": "<p>Enter text here...</p>",
  "translatedContent": "",
  "bilingual": false
}
```

Notes:

- `translatedContent` is usually filled later by translation logic.

### `email-skeleton`

```json
{
  "id": "email-1",
  "type": "email-skeleton",
  "visibility": "both",
  "from": "anna@example.com",
  "to": "ben@example.com",
  "subject": "Betreff",
  "body": "<p>Hallo Ben,</p><p>...</p><p>Viele Grusse<br/>Anna</p>",
  "emailStyle": "none",
  "attachments": [
    {
      "id": "attachment-1",
      "name": "cv.pdf"
    }
  ],
  "comment": ""
}
```

Allowed `emailStyle` values:

- `none`
- `standard`
- `teal`

### `job-application`

```json
{
  "id": "job-application-1",
  "type": "job-application",
  "visibility": "both",
  "firstName": "Anna",
  "applicantName": "Muller",
  "email": "anna@example.com",
  "phone": "+49 123 456789",
  "position": "Verkaufer/in",
  "message": "<p>Sehr geehrte Damen und Herren,</p><p>...</p><p>Mit freundlichen Grussen<br/>Anna Muller</p>",
  "applicationStyle": "none",
  "comment": ""
}
```

Allowed `applicationStyle` values:

- `none`
- `standard`
- `teal`

### `text-comparison`

```json
{
  "id": "text-comparison-1",
  "type": "text-comparison",
  "visibility": "both",
  "leftContent": "<p>Variant A</p>",
  "rightContent": "<p>Variant B</p>",
  "comment": ""
}
```

### `dos-and-donts`

```json
{
  "id": "dos-donts-1",
  "type": "dos-and-donts",
  "visibility": "both",
  "layout": "horizontal",
  "showTitles": true,
  "dosTitle": "Do",
  "dontsTitle": "Don't",
  "dos": [
    {
      "id": "do-1",
      "text": "Arrive on time"
    }
  ],
  "donts": [
    {
      "id": "dont-1",
      "text": "Use your phone during class"
    }
  ]
}
```

Allowed `layout` values:

- `horizontal`
- `vertical`

### `numbered-items`

```json
{
  "id": "numbered-items-1",
  "type": "numbered-items",
  "visibility": "both",
  "items": [
    {
      "id": "item-1",
      "content": "<p>First item</p>"
    },
    {
      "id": "item-2",
      "content": "<p>Second item</p>"
    }
  ],
  "startNumber": 1,
  "bgColor": "",
  "borderRadius": 6,
  "bilingual": false,
  "skipTranslation": false
}
```

### `accordion`

```json
{
  "id": "accordion-1",
  "type": "accordion",
  "visibility": "both",
  "items": [
    {
      "id": "section-1",
      "title": "Section 1",
      "children": [
        {
          "id": "section-1-text",
          "type": "text",
          "visibility": "both",
          "content": "<p>Accordion content.</p>"
        }
      ]
    }
  ],
  "showNumbers": false
}
```

### `checklist`

```json
{
  "id": "checklist-1",
  "type": "checklist",
  "visibility": "both",
  "items": [
    {
      "id": "item-1",
      "content": "<p>Bring a pen</p>",
      "writingLines": 1
    },
    {
      "id": "item-2",
      "content": "<p>Bring your notebook</p>",
      "writingLines": 0
    }
  ],
  "bilingual": false
}
```

### `ai-prompt`

```json
{
  "id": "ai-prompt-1",
  "type": "ai-prompt",
  "visibility": "online",
  "instructions": "Write a short summary.",
  "description": "Summary generator",
  "variableName": "eingabe",
  "prompt": "Summarize this text: {{eingabe}}",
  "userInput": "",
  "aiResult": ""
}
```

Notes:

- This is online-only by default.
- `userInput` and `aiResult` should normally start empty.

### `ai-tool`

```json
{
  "id": "ai-tool-1",
  "type": "ai-tool",
  "visibility": "online",
  "toolKey": "",
  "toolTitle": "",
  "toolDescription": "",
  "latestRunId": ""
}
```

Notes:

- `toolKey` must match a real entry in the AI tool registry.
- `latestRunId` is runtime/session state and can start empty.

### `table`

```json
{
  "id": "table-1",
  "type": "table",
  "visibility": "both",
  "content": "<table><tbody><tr><th colspan=\"1\" rowspan=\"1\"><p>Header 1</p></th><th colspan=\"1\" rowspan=\"1\"><p>Header 2</p></th></tr><tr><td colspan=\"1\" rowspan=\"1\"><p>Cell A</p></td><td colspan=\"1\" rowspan=\"1\"><p>Cell B</p></td></tr></tbody></table>",
  "tableStyle": "default",
  "caption": "Optional caption",
  "columnWidths": [50, 50],
  "bilingual": false,
  "firstRowAsExample": false,
  "skipTranslation": false
}
```

Allowed `tableStyle` values:

- `default`
- `striped`
- `bordered`
- `minimal`

Rules:

- `columnWidths`, if used, should match the number of columns and sum roughly to `100`.

### `audio`

```json
{
  "id": "audio-1",
  "type": "audio",
  "visibility": "online",
  "src": "/audio/example.mp3",
  "title": "Listening task"
}
```

### `schedule`

```json
{
  "id": "schedule-1",
  "type": "schedule",
  "visibility": "both",
  "items": [
    {
      "id": "slot-1",
      "date": "2026-04-10",
      "start": "08:00",
      "end": "09:30",
      "room": "A101",
      "title": "Introduction",
      "description": "Course welcome"
    },
    {
      "id": "slot-2",
      "date": "2026-04-10",
      "start": "09:45",
      "end": "11:15",
      "room": "A101",
      "title": "Practice",
      "description": "Group work"
    }
  ],
  "bilingual": false,
  "showDate": true,
  "showRoom": true,
  "showHeader": true
}
```

Rules:

- `date` uses `YYYY-MM-DD`.
- `start` and `end` use `HH:mm`.

### `website`

```json
{
  "id": "website-1",
  "type": "website",
  "visibility": "both",
  "title": "Useful websites",
  "level": 2,
  "items": [
    {
      "id": "site-1",
      "title": "Example",
      "url": "https://example.com",
      "category": "Reference",
      "description": "Short description",
      "image": "/samples/example.jpg",
      "aggregator": false,
      "pageBreakAfter": false
    },
    {
      "id": "site-2",
      "title": "Example Org",
      "url": "https://example.org",
      "category": "Practice",
      "description": "Another short description",
      "image": "",
      "aggregator": false,
      "pageBreakAfter": false
    }
  ],
  "bilingual": false,
  "skipTranslation": false
}
```

Rules:

- `level` must be `1`, `2`, or `3`.

## Special And Type-Only Blocks

These block types exist in the worksheet type union but are not normal worksheet sidebar blocks.

### `number-line`

Status:

- Defined in the type union.
- Rendered in editor and viewer.
- Not present in `BLOCK_LIBRARY`, so it is not insertable from the normal worksheet sidebar.

JSON shape:

```json
{
  "id": "number-line-1",
  "type": "number-line",
  "visibility": "both",
  "min": 0,
  "max": 10,
  "step": 1,
  "markers": [0, 5, 10]
}
```

### `linked-blocks`

Status:

- Defined in the type union.
- Rendered in editor and viewer.
- Used by course structures to link an external worksheet into a lesson/topic/module.
- Not a normal standalone worksheet content block.

JSON shape:

```json
{
  "id": "linked-blocks-1",
  "type": "linked-blocks",
  "visibility": "both",
  "worksheetId": "worksheet-uuid",
  "worksheetTitle": "Referenced worksheet",
  "worksheetSlug": "referenced-worksheet"
}
```

Recommendation:

- Do not generate `linked-blocks` inside ordinary worksheet content unless the explicit goal is to reference another worksheet.

## AI Generation Rules

When AI generates worksheet JSON, it should follow these rules:

1. Only use block types documented in this file.
2. Prefer normal sidebar blocks unless the prompt explicitly asks for a special block like `linked-blocks`.
3. Always include unique IDs for every block and nested item.
4. Use HTML strings for rich text fields instead of plain arrays or custom objects.
5. Keep enum fields exactly as documented. Do not invent new values.
6. For nested container blocks, ensure child arrays contain valid worksheet blocks.
7. For `word-search`, provide a complete `grid` when possible.
8. Start runtime fields empty unless the prompt explicitly asks for prefilled runtime state.

## Quick Type Index

Normal sidebar blocks:

- `heading`
- `text`
- `image`
- `image-cards`
- `text-cards`
- `spacer`
- `divider`
- `logo-divider`
- `columns`
- `multiple-choice`
- `fill-in-blank`
- `fill-in-blank-items`
- `matching`
- `two-column-fill`
- `open-response`
- `word-bank`
- `true-false-matrix`
- `order-items`
- `inline-choices`
- `word-search`
- `sorting-categories`
- `unscramble-words`
- `fix-sentences`
- `complete-sentences`
- `verb-table`
- `glossary`
- `article-training`
- `chart`
- `dialogue`
- `numbered-label`
- `page-break`
- `writing-lines`
- `writing-rows`
- `text-snippet`
- `email-skeleton`
- `job-application`
- `text-comparison`
- `dos-and-donts`
- `numbered-items`
- `accordion`
- `checklist`
- `ai-prompt`
- `ai-tool`
- `table`
- `audio`
- `schedule`
- `website`

Special or type-only blocks:

- `number-line`
- `linked-blocks`