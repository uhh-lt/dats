# Table Refactoring Plan

## Why this plan exists

Table implementations in the frontend currently follow multiple architectural styles:

- Filter-table stack (state layer -> data layer -> base table layer)
- Feature-specific custom tables with mixed responsibilities
- Route-loader-prefetched data with table/view-local query wiring

This makes behavior drift likely (especially row selection reset, fetch-size reset, and scroll reset) and makes table bugs expensive to fix repeatedly.

This plan aligns table architecture across the app while preserving feature-specific behavior.

## Problem statement

The app has many Material React Tables (MRT). Several tables already follow a clear layered model:

1. State owner (Redux/URL/local orchestration)
2. Data + columns owner (query wiring + table column definitions)
3. Generic infinite scrolling rendering layer

Outlier tables currently mix these responsibilities in one component, especially:

- SearchDocumentTable
- SentenceSimilaritySearchTable
- WordFrequencyTable
- SdocStatusTable

Resulting issues:

- Inconsistent reset behavior for selection/fetch-size
- Coupling between UI concerns and query concerns
- Harder testability
- Hard to reason about loader responsibility vs table responsibility

## Goal architecture (target standard)

Every complex table should follow the same 3-stage model.

### Stage 1: State Container

Responsibility:

- Own URL/Redux/local table state
- Derive search parameters and table state
- Handle table-independent feature actions (side panels, toolbar global actions, cross-widget sync)

Rules:

- No column definitions
- No query function implementation
- No infinite-scroll implementation
- State transitions must be explicit and testable

Naming guideline:

- FeatureTableStateContainer (or existing view component if it only orchestrates state)

### Stage 2: Data/Column Container

Responsibility:

- Define table columns
- Bind query options/hooks to current search/table parameters
- Normalize/flatten/deduplicate result data
- Own reset effects tied to search-parameter changes (clear selection, reset fetch size, optional callback)

Rules:

- No raw MRT rendering details except required render callbacks
- No route navigation business logic except row-level intent callbacks passed down

Naming guideline:

- FeatureTableDataContainer
- Existing \*FilterTable components already follow this model and can be used as reference

### Stage 3: Generic Infinite Table Renderer

Responsibility:

- Generic MRT rendering with infinite scrolling
- Standard toolbar slots and common bottom status area
- Scroll-to-top behavior for sort/search parameter changes
- Shared UX defaults (overscan, alert banner wiring, loading indicators)

Rules:

- No feature-specific query logic
- No feature-specific state ownership

Naming guideline:

- Keep FilterTable as current baseline for filter-based pages
- Extract a neutral base renderer for non-filter pages (proposed: InfiniteTable)

## Design decision: Is FilterTable a generic infinite table?

Short answer: almost, but not fully.

- FilterTable already centralizes infinite scrolling and many MRT defaults.
- It is still filter-toolbar-centric by contract and naming.

Plan decision:

1. Extract generic infinite-table primitives from FilterTable.
2. Keep FilterTable as a specialization for filter-driven UIs.
3. Migrate outliers to the same base primitive without forcing filter-specific APIs onto them.

## Design decision: route loaders vs table-owned query hooks

Route loaders should not be removed globally.

Preferred model:

- Keep route loaders for prefetch/warm-cache and route-level guarantees.
- Keep all query contracts in feature query options and consume the same query options in both loader and component.
- Do not place table-specific data transformation/reset behavior in loaders.

Loader policy:

- Loader may ensure/prefetch queries and critical metadata.
- Loader must not become a second state-management layer.
- Table/view logic remains the owner of parameter-driven effects and reset behavior.

## Cross-table behavior contract (must be consistent)

### Reset contract

When search-defining parameters change, table must reset search-result-dependent state.

Minimum required behavior:

- Clear row selection
- Reset fetch size to default (20) for infinite tables that support fetch-size
- Trigger optional parent callback for feature-specific extra resets

Required comment convention in reset effects:

- // resetting search-parameter-dependant state

### Scroll contract

- Sort/search parameter changes should scroll to top for virtualized infinite tables.

### Query key contract

- Query keys must include all search-defining inputs used by the backend request.
- Query key input ordering should be stable and documented.

### Ownership contract

- State container owns URL/Redux state.
- Data container owns query + columns + flat data transformation.
- Renderer owns MRT + infinite-scroll mechanics.

## Migration scope

### Wave 1 (requested outliers)

- SearchDocumentTable
- SentenceSimilaritySearchTable
- WordFrequencyTable
- SdocStatusTable

### Wave 2 (high-value custom MRTs)

- DuplicateFinderView table
- ClassifierTable
- TagTable
- CodeTable
- CotaSentenceAnnotator
- DocAspectTable
- LLM-assistant result tables

### Wave 3 (remaining custom/simple tables)

- Sdoc/Span/Sentence/BBox simple tables
- Analysis dashboard table wrappers
- Remaining feature-local MRT usage

## Detailed migration plan for outliers

### 1) SearchDocumentTable

Current issues:

- Mixed ownership of state, data flattening/merging, and MRT rendering in one component
- Folder/non-folder row selection behavior increases complexity in rendering layer

Target split:

1. SearchDocumentTableStateContainer

- Owns URL/Redux connectors, selected document/folder side effects, DnD and external callbacks.

2. SearchDocumentTableDataContainer

- Owns columns, query consumption, folder-hit merge logic, reset effect, result-id projection.

3. SearchDocumentInfiniteTable

- Owns MRT config and infinite-scroll rendering.

Special note:

- Keep folder-specific selection semantics in stage 1 or stage 2 helper, not in generic renderer.

### 2) SentenceSimilaritySearchTable

Current issues:

- Mixed state + columns + MRT in one component
- Query is finite today (topK/threshold), while table UX resembles broader table architecture

Target split:

1. SentenceSimilarityTableStateContainer

- Owns search parameter connectors and global row/table state.

2. SentenceSimilarityTableDataContainer

- Owns columns and reset behavior.
- If backend remains finite, expose data as single-page adapter.

3. Shared renderer

- Use generic renderer in non-infinite mode (or single-page infinite adapter).

Special note:

- If sentence search later adds paging, migration to true infinite mode should require only stage 2 changes.

### 3) WordFrequencyTable

Current issues:

- Already uses infinite-scroll hook but still mixes state, data and rendering heavily.

Target split:

1. WordFrequencyTableStateContainer

- Owns redux/url state and filter wiring.

2. WordFrequencyTableDataContainer

- Owns query consumption, column definitions, reset effect.

3. WordFrequencyInfiniteTable

- Uses shared renderer with feature toolbar slots.

Special note:

- Keep export action in toolbar composition layer (stage 1/2), not in generic renderer.

### 4) SdocStatusTable

Current issues:

- Mixed action toolbar logic, query consumption, selection, and MRT rendering.

Target split:

1. SdocStatusTableStateContainer

- Owns doctype, sorting/fetch-size URL state, selection-derived action state, mutation callbacks.

2. SdocStatusTableDataContainer

- Owns status columns derived from server-provided tableColumnInfo, query data mapping, reset effect.

3. SdocStatusInfiniteTable

- Shared renderer usage.

Special note:

- Keep processing actions (retry/recompute/settings) in feature toolbar layer.

## Foundation work before migrations

### A) Introduce shared table primitives

Create a shared table package (under core table module) containing:

- Infinite table renderer component
- Common toolbar composition helpers
- Shared status/footer helpers (fetched vs total)
- Shared scroll-to-top helper integration

### B) Introduce table contracts/types

Add explicit interfaces for:

- Table state contract (selection, sorting, visibility, fetch-size)
- Data container contract (query result, flatMapData, loading/error)
- Reset trigger inputs and callback contract

### C) Define reusable constants

- DEFAULT_TABLE_FETCH_SIZE = 20
- Standard overscan and table defaults

## Implementation phases

### Phase 0: Architecture baseline and ADR

Deliverables:

- Architecture Decision Record for 3-stage table model
- Table inventory matrix classifying each table by architecture style
- Finalized loader policy

Exit criteria:

- Team agreement on ownership boundaries and reset contract

### Phase 1: Generic foundation extraction

Deliverables:

- Shared infinite-table renderer (non-breaking)
- FilterTable internally using shared renderer
- Test harness for common renderer behavior

Exit criteria:

- FilterTable behavior unchanged
- Existing filter-table suite still passes

### Phase 2: Outlier migrations (Wave 1)

Order:

1. WordFrequencyTable (lowest coupling)
2. SdocStatusTable
3. SentenceSimilaritySearchTable
4. SearchDocumentTable (highest coupling)

Deliverables per table:

- New stage-1/2/3 split
- Reset effect aligned with contract
- No behavior regression in row interactions

Exit criteria:

- Functional parity validated by checklist
- No duplicate query logic between loader and component

### Phase 3: Cross-app rollout (Wave 2 and Wave 3)

Deliverables:

- Remaining custom MRTs migrated or explicitly documented as exceptions
- Consistent reset policy applied app-wide

Exit criteria:

- All target tables classified as compliant or approved exception

### Phase 4: Hardening and cleanup

Deliverables:

- Remove dead table helpers/special cases
- Add lint conventions for reset effect comment + dependency coverage
- Final docs in BUILDING_A_FEATURE.md and architecture docs

Exit criteria:

- New tables follow template by default

## Testing strategy

### Component tests

- Reset effect triggers on each search-defining input
- Selection clears and fetch-size resets correctly
- Scroll reset occurs on sort/search changes

### Integration tests

- Route search param change -> correct query refetch + table reset
- Toolbar actions remain functional after layer split
- Loader-prefetched pages render without extra inconsistent state

### Regression checklist (manual + automated)

For each migrated table:

1. Change filter/search -> selection resets
2. Change sorting -> selection resets and table scrolls to top
3. Fetch all then change search params -> fetch-size returns to 20
4. Navigate away and back via tabs -> expected state restored
5. No duplicate requests beyond expected prefetch + consume path

## Risks and mitigations

Risk: Refactor churn breaks feature-specific row actions.

Mitigation:

- Keep feature actions in stage 1 and pass explicit callbacks down.

Risk: Loader/component duplication causes stale assumptions.

Mitigation:

- Single source query options and query keys reused by both loader and component.

Risk: Over-generalizing renderer blocks special UIs.

Mitigation:

- Use slot-based API and allow controlled escape hatches with documented exceptions.

Risk: Inconsistent reset dependencies across teams.

Mitigation:

- Add template + lint guidance + test checklist.

## Definition of done (table compliance)

A table is compliant when all are true:

- It has explicit stage 1/2/3 ownership.
- Reset contract is implemented and tested.
- Query options are shared between loader and component.
- Infinite-scroll behavior uses shared primitives (or explicit exception documented).
- It is listed as compliant in the inventory matrix.

## Concrete next actions

1. Create an ADR documenting the 3-stage standard and loader policy.
2. Extract shared infinite-table renderer from FilterTable without behavior changes.
3. Migrate WordFrequencyTable as pilot implementation.
4. Validate pilot with regression checklist and use it as template for the remaining outliers.
