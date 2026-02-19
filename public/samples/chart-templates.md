# Chart JSON Templates

Use these templates as prompts for AI to generate chart data in the correct format.
Paste the generated JSON into the **JSON import** field in the Chart block properties panel.

## Format

Each data point is an object with:
- `label` (string) — category name, x-axis label, or segment name
- `value` (number) — the numeric value
- `color` (string, optional) — hex color code (e.g. `"#6366f1"`)

The importer also accepts alternative key names: `name`/`category`/`key` for labels, and `amount`/`count`/`total` for values.

Two JSON structures are supported:
- **Array**: `[{ "label": "A", "value": 10 }, ...]`
- **Wrapped**: `{ "data": [{ "label": "A", "value": 10 }, ...] }`

---

## Bar Chart

Best for comparing categories side by side.

```json
[
  { "label": "Category A", "value": 40, "color": "#6366f1" },
  { "label": "Category B", "value": 70, "color": "#8b5cf6" },
  { "label": "Category C", "value": 55, "color": "#a78bfa" }
]
```

**Example AI prompt:**
> Generate a JSON array for a bar chart about the population of the 10 largest cities in Switzerland.
> Use this format: `[{ "label": "City", "value": 123456, "color": "#hexcolor" }]`

---

## Pie Chart

Best for showing proportions of a whole.

```json
[
  { "label": "Segment A", "value": 40, "color": "#6366f1" },
  { "label": "Segment B", "value": 30, "color": "#8b5cf6" },
  { "label": "Segment C", "value": 20, "color": "#a78bfa" },
  { "label": "Segment D", "value": 10, "color": "#c4b5fd" }
]
```

**Example AI prompt:**
> Generate a JSON array for a pie chart showing the percentage of energy sources in Germany (solar, wind, coal, gas, nuclear, other).
> Use this format: `[{ "label": "Source", "value": 25, "color": "#hexcolor" }]`

---

## Line Chart

Best for showing trends over time.

```json
[
  { "label": "Point 1", "value": 20 },
  { "label": "Point 2", "value": 35 },
  { "label": "Point 3", "value": 28 },
  { "label": "Point 4", "value": 45 },
  { "label": "Point 5", "value": 40 }
]
```

**Example AI prompt:**
> Generate a JSON array for a line chart showing average monthly temperatures in Zurich (Jan–Dec) in °C.
> Use this format: `[{ "label": "Jan", "value": 2.1 }]`
