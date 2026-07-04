# Page-Based Editor Foundation

## Goal
Introduce a first non-breaking page composition foundation so the editor can migrate from flow-first layout to page-first layout.

## New Schema
Defined in `src/types/page-composition.ts`.

### Core Types
- `PageComposerMode`: `"flow" | "page"`
- `PageComposerStatus`: `"idle" | "stale" | "ready"`
- `PageCompositionBlockRef`: block reference plus optional split metadata
- `PageCompositionPage`: one composed page with dimensions, usage, and block refs
- `PageCompositionMeta`: page settings and source revision metadata
- `PageCompositionSnapshot`: payload produced by a future composer
- `PageCompositionState`: store state for current composition lifecycle

### Initial State
- `INITIAL_PAGE_COMPOSITION_STATE`
  - mode: `flow`
  - status: `idle`
  - pages: `[]`
  - overflowBlockIds: `[]`
  - revision: `0`
  - dirty: `false`

## First Store Patch
Implemented in `src/store/editor-store.tsx`.

### Editor State
- Added `pageComposition: PageCompositionState`.

### New Actions
- `SET_PAGE_COMPOSER_MODE`
- `SET_PAGE_COMPOSITION`
- `MARK_PAGE_COMPOSITION_STALE`
- `CLEAR_PAGE_COMPOSITION`

### Lifecycle Helpers
- `markPageCompositionStale(...)`
- `withStalePageComposition(...)`

### Reducer Behavior
- Composition resets on `LOAD_WORKSHEET`.
- Composition is marked stale on structural/content mutations:
  - title, blocks, block order, block visibility/display, settings, locale overrides, published toggle, container moves.
- `SET_PAGE_COMPOSITION` marks status `ready` and stores composed pages.
- `CLEAR_PAGE_COMPOSITION` clears pages while preserving selected mode.

## Why This Is Safe
- No rendering path is switched yet.
- Existing editor behavior remains unchanged.
- Store now has explicit state to plug in a dedicated composer next.

## Immediate Next Patch
1. Add a pure `composePages(blocks, settings, metrics)` service. ✅
2. Trigger composition when `pageComposition.dirty` and mode is `page`. ✅
3. Surface `overflowBlockIds` in UI diagnostics.

## Added Composer Service (Current)
- `src/lib/page-composer.ts`
- Deterministic estimate-based pagination with:
  - page dimensions from settings (`a4`/`letter`, orientation)
  - capacity calculation using margins + header/footer reserve
  - explicit handling of `page-break` blocks
  - overflow collection (`overflowBlockIds`)

## Added Store Wiring (Current)
- `EditorProvider` now auto-composes when:
  - `pageComposition.mode === "page"`
  - `pageComposition.dirty === true`
- Added context helpers:
  - `setPageComposerMode(mode)`
  - `recomputePageComposition()`
