# Props UI Design

This document is the working design system for block property editors in the worksheet editor.

It is intentionally built incrementally. Each block-level cleanup should update this file with concrete decisions so repeated patterns become shared rules instead of one-off styling.

## Purpose

- Make all block property editors feel like one coherent UI.
- Reduce layout and interaction drift between block editors.
- Capture stable patterns before extracting shared components.

## Scope

This applies to block property editors rendered through the worksheet editor properties panel.

It does not automatically apply to other editing surfaces unless we explicitly adopt the same pattern there.

## Core Principles

### 1. One panel language

All block editors should use the same visual grammar for:

- section headers
- field labels
- helper text
- row spacing
- destructive actions
- list item editors
- media pickers
- empty states

### 2. Structure first

Editors should be organized by content structure, not by raw data shape.

Preferred order:

1. content
2. presentation
3. behavior or logic
4. data import or bulk actions
5. destructive actions

### 3. Stable density

Spacing and control density should feel consistent across simple and complex blocks. Dense editors are acceptable, but only when the grouping is obvious.

### 4. Repeated patterns become components

When the same UI pattern appears in multiple block editors, we should prefer extracting a shared prop-editor primitive over restyling copies manually.

## Baseline Rules

### Sections

- Use clearly separated sections for distinct concerns.
- Each section should have a short title.
- Use optional helper text only when it prevents confusion.
- Avoid long uninterrupted stacks of unrelated controls.

### Fields

- Every interactive control should have a visible label unless the control is self-evident inside a strongly labeled row.
- Labels should be short and concrete.
- Helper text should explain consequences or constraints, not restate the label.
- Related small fields should sit on the same row when they are usually edited together.

### Actions

- Primary creation actions should be visually easy to find.
- Secondary actions should stay close to the content they affect.
- Destructive actions should be visually separated from normal editing actions.
- Bulk actions should be grouped together rather than mixed into per-item controls.

### Lists and item editors

- Multi-item content should use a predictable pattern for add, remove, reorder, and selection.
- The selected item should always be obvious.
- Item-level editing and collection-level actions should be visually distinct.
- Empty states should explain the next useful action.

### Media inputs

- Upload, replace, browse, and remove should follow one standard pattern across blocks.
- Preview should appear near the media control.
- Drag-and-drop wording should be reused across editors where possible.

## Decision Log

Add new decisions here as we standardize specific blocks.

### Global

- The document is additive. Each block pass should record concrete UI rules, not vague intentions.
- The props sidebar shell uses a white background with a 1px border in the default foreground text color.
- Standard compact control height for props UI is 32px. This is anchored to the text block's "Generate text with AI" button and should be matched by single-line buttons, selects, and inputs unless a different size is intentionally required.
- Icon-only segmented controls in props UI, including visibility toggles, also use the same 32px height.
- Switch rows use divider-based grouping: every row gets a bottom divider, and the first row in a switch group also gets a top divider.

## Block Notes

Add block-specific notes under this section as we work through the editor.

### Template

Use this structure for new entries:

#### Block name

- changed:
- pattern decided:
- follow-up extraction candidate:

#### Text

- changed: text style now uses the shared select control at the same 32px height as the AI action button; text block switch rows now use a consistent divided-row pattern.
- pattern decided: use the small control size as the default single-line props control height; switch groups should read as a continuous stack of rows instead of isolated label-switch pairs separated inconsistently.
- follow-up extraction candidate: a shared prop-editor switch-row component and a small set of section field wrappers for labeled single-line controls.

#### Heading

- changed: heading props now use the same section structure as text props, with `CONTENT`, `LEVEL`, optional `START NUMBER`, and `SETTINGS` grouped as titled sections.
- pattern decided: simple metadata blocks should still use explicit section titles rather than unlabeled stacked fields; heading-level selects should use the shared compact select height, and heading toggles should use the same divided switch-row pattern as text props.
- follow-up extraction candidate: a shared compact section wrapper for title-plus-field stacks and a shared switch-row group helper reusable across simple block editors.

#### Text Cards

- changed: the columns control now uses the default compact full-width select style, and the cards section now uses the standard section-title treatment.
- pattern decided: indexed card editors should use leading-zero numbering without punctuation, and multi-row item editors should reserve the same trailing control width on every row so paired inputs stay visually aligned.
- follow-up extraction candidate: a shared indexed-item row layout with a fixed index column and fixed trailing action column for card-like editors.

#### Schedule

- changed: schedule props now separate `SETTINGS` from `SCHEDULE ITEMS`, and the settings toggles use the same divided switch-row grouping as heading and text props.
- pattern decided: list-like editors with compact per-item controls should use the same indexed row language as card editors, including leading-zero numbering and a fixed trailing action area for reorder and delete actions. Native `time` inputs are a narrow-sidebar edge case and need stricter width control than normal text inputs; when item rows get too tight, drop decorative item containers before shrinking the main editable fields.
- follow-up extraction candidate: a shared indexed row editor wrapper that supports optional leading metadata rows above the main indexed content fields.

#### Glossary

- changed: glossary props now use the default section wrappers for instruction, column width, terms, and CSV import, and glossary items are edited as stacked rows instead of one wide multi-column row.
- pattern decided: in narrow sidebars, three-field item editors should stack vertically and keep only one trailing destructive action on the first row; this preserves full input width better than squeezing multiple semantic fields onto one horizontal line.
- follow-up extraction candidate: a shared stacked indexed-item editor for multi-field rows like glossary, schedule, and other compact list-based editors.

#### Text Snippet

- changed: text-snippet props now wrap the bilingual toggle in the same titled `SETTINGS` section used by other simple editors.
- pattern decided: even a single-toggle editor should still use the standard section-title plus divider-row structure instead of reverting to a bare unlabeled switch row.
- follow-up extraction candidate: a shared minimal settings-section helper for one-toggle and two-toggle block editors.

#### Board Game

- changed: board-game props now use the default section wrappers for board metadata, selected-cell media, and text editing, and the selected-cell editor no longer relies on a separate boxed subpanel for structure.
- pattern decided: selection-driven editors should still follow the same section-title language as the rest of the props UI; media and text editing inside a selected item should be grouped as titled sections instead of styled as an isolated modal-like card.
- follow-up extraction candidate: a shared selected-item editor shell for media-heavy blocks like board game, domino, and other cell/item-based editors.

#### Free Form

- changed: free-form block metadata now lives in the properties sidebar, while the block body only shows the preview and the action that opens the larger canvas editor.
- pattern decided: when a block relies on a dedicated modal workspace, the inline block surface should stay focused on preview and entry into that workspace; title, instruction, and similar persistent metadata still belong in the standard props sidebar.
- follow-up extraction candidate: a shared pattern for preview-plus-launch blocks whose detailed editing happens in a dedicated modal or fullscreen workspace.

#### Crossword

- changed: crossword props now use the same compact titled sections as the other refactored editors, and the regenerate action now uses a refresh-style icon instead of a bidirectional sort/shuffle metaphor.
- pattern decided: freeform structured text editors, like line-based import or entry lists, should keep their inline format help inside the section rather than separating it with an extra divider; regeneration actions should use explicit refresh semantics when they recompute derived output from existing source data.
- follow-up extraction candidate: a shared multiline import/editor section with built-in helper text and a standard full-width regenerate action row for generator-backed blocks.

#### Domino

- changed: domino props now use compact titled sections for metadata, settings, selection state, selected-item editing, and CSV import, and the clear action now uses the same confirmation-dialog pattern as other destructive board-style editors.
- pattern decided: item-selection editors that combine media, text, and optional icon metadata should split those concerns into separate titled subsections instead of wrapping them in one decorative card; CSV/import controls in the narrow sidebar should stack vertically at full width rather than sharing one compressed action row.
- follow-up extraction candidate: a shared selected-item editor scaffold with optional image, text, icon, and destructive-action sections for domino, card-pairs, and similar media-backed item blocks.

#### Dialogue

- changed: dialogue props now use titled `INSTRUCTION`, optional `COL RATIO`, `DIALOGUE LINES`, trailing editable `SETTINGS`, and trailing `NOTES` sections instead of raw separators; the notes/help copy now sits below the editable props and uses a distinct section-header color from normal editable sections. Dialogue output can also show a dedicated semibold speaker-name column between the icon and the dialogue text.
- pattern decided: compact conversation editors should keep behavioral toggles inside the standard divider-based settings group, while each dialogue row should use the same indexed list language as other narrow-sidebar item editors rather than a separate boxed card treatment. When a block includes both normal editable sections and a notes/reference section, `SETTINGS` should be the last editable section immediately above `NOTES` so behavioral toggles stay closest to the end of the editable surface. Optional speaker metadata in rendered dialogue should live in its own fixed column between iconography and content rather than being merged into the main dialogue text flow.
- follow-up extraction candidate: a shared indexed dialogue-row editor with pluggable leading controls for icon metadata and compact reorder/delete actions.

#### Article Training

- changed: article-training props now use the same compact titled sections as the newer editors, with `INSTRUCTION`, `NOUNS`, `CSV IMPORT`, and trailing `SETTINGS` instead of separator-driven stacks; the writing-line toggle now lives in the standard divider-row settings section. The inline article-training editor no longer uses the older table-plus-green-dot control style and now uses compact bordered rows with square article selectors.
- pattern decided: simple metadata-plus-import editors should still use explicit titled sections even when most item editing happens inline in the block renderer. When a block shows the correct solution inside a writing-line answer area, it should use the newer handwriting-style solution rendering rather than a leftover small green label treatment. Inline block editors that stay inside the canvas should still use the same compact row language as the props panel instead of older spreadsheet-like tables when the interaction is really item selection plus text editing.
- follow-up extraction candidate: a shared compact import section with replace/append controls and a shared handwriting-solution helper for line-based answer blocks.

#### Quartett

- changed: quartett now uses the shared card-list props editor instead of a duplicated standalone implementation, and its settings, CSV import, and item editors now follow the compact titled-section pattern used by the other refactored blocks.
- pattern decided: when two block types share the same editing model, props consistency is better preserved by routing them through one shared editor surface rather than restyling duplicate implementations independently; indexed multi-field card editors should use leading-zero item labels and keep destructive actions aligned to a fixed trailing column.
- follow-up extraction candidate: a shared indexed card-list editor shell for quartett, taboo, and future four-subitem card blocks with pluggable per-item actions.

#### Worksheet Props

- changed: the no-selection worksheet props surface now uses the same white bordered shell, compact titled sections, and divider-based settings rows as the block editors instead of a separate muted card style.
- pattern decided: worksheet-level settings should follow the exact same props language as block-level settings; global editors are not a special visual case and should use the same section headers, compact controls, and indexed media-slot treatment when they live in the same sidebar.
- follow-up extraction candidate: a shared top-level props shell for both worksheet settings and block settings so no-selection and selected-block states cannot drift apart visually.
