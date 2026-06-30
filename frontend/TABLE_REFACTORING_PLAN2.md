# Table Refactoring Plan 2 (Hooks-First Architecture)

## Why this second plan exists

The first plan standardizes table architecture via 3 layers (state, data, renderer). This plan keeps the same architecture goals, but changes the implementation style:

- Prefer hooks for state and data layers
- Keep one feature table component as composition root
- Keep one shared generic renderer component

This approach reduces wrapper-component nesting and prop drilling while preserving strict ownership boundaries.

Important boundary: this plan is only about table architecture and table-related state/logic.

## Strategic objective

Adopt a hooks-first table architecture across the frontend so that all complex tables share:

1. A state hook (URL/Redux/local orchestration)
2. A data hook (query binding, columns, transformation, reset effects)
3. A shared table renderer (InfiniteTable / FilterTable specialization)

Primary expected outcomes:

- Consistent reset behavior (selection, fetch size, callback)
- Clear ownership and easier debugging
- Better logic reuse across similar table features
- Faster onboarding and lower chance of regression
- Strict separation between table logic and non-table feature orchestration

## Scope and priority

### Wave 1 (outlier targets)

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

- Simple annotation tables and feature-local tables not yet aligned

## Core architecture standard

## Layer A: State hook

Responsibility:

- Own and normalize view state from URL, Redux, and local state
- Provide stable event handlers for table state only (selection/sorting/visibility/fetch-size/expansion/sizing/density)

Must not contain:

- Query execution
- Column definitions
- Infinite scroll mechanics
- Cross-panel behavior
- DnD workflow orchestration
- Feature navigation/business action orchestration

Naming convention:

- useFeatureTableState

Examples:

- useWordFrequencyTableState
- useSearchDocumentTableState
- useSentenceSimilarityTableState
- useSdocStatusTableState

## Layer B: Data hook

Responsibility:

- Bind query options/hooks to state inputs
- Define columns
- Transform backend results into renderer-ready data
- Implement reset effects on search-defining parameter changes
- Expose table-ready data and metadata (isLoading, isFetching, errors, totals)

Must not contain:

- Feature navigation and business action workflows
- Generic MRT rendering setup

Naming convention:

- useFeatureTableData

Examples:

- useWordFrequencyTableData
- useSearchDocumentTableData

## Layer C: Shared renderer component

Responsibility:

- Render MRT with standardized infinite scrolling behavior
- Own generic rendering defaults and table UX baseline
- Accept slot props for top-left, top-right, and bottom toolbar customization

Must not contain:

- Feature-specific query logic
- Feature-specific state ownership

Naming convention:

- InfiniteTable (generic)
- FilterTable (specialized variant for filter-first use cases)

## Reference composition pattern

Feature table component becomes a composition shell:

1. call state hook
2. call data hook with state outputs
3. render InfiniteTable with merged props and slots

Pseudo-structure:

- WordFrequencyTable.tsx
- useWordFrequencyTableState.ts
- useWordFrequencyTableData.ts
- core/infinite-table/InfiniteTable.tsx

## Hook contract design

## State hook return contract

State hook should return an object with stable shape:

- identifiers: projectId, route params
- table state: rowSelectionModel, sortingModel, columnVisibilityModel, fetchSize
- setters/handlers: onRowSelectionChange, onSortingChange, onColumnVisibilityChange, onFetchSizeChange
- optional table-only state where needed: expandedModel, columnSizingModel, density

Guidelines:

- Use useCallback for handlers consumed by renderer/data hooks
- Keep return object memo-stable where practical
- Hide Redux/URL implementation detail from table component
- Keep non-table logic in the feature view (or separate non-table hook), not in the table state hook

## Data hook input contract

Data hook input should minimally include:

- projectId and route/search parameters
- table state from state hook
- optional table callback (onSearchParameterChange)

Data hook output should include:

- columns
- data/infiniteData adapter and flat rows
- query status flags
- total counts
- table renderer helper callbacks (fetchNextPage, onTableScroll adapter if needed)
- optional detail panel renderers

## Reset contract inside data hook

All search-defining parameter changes must trigger reset behavior in the data hook.

Required behavior:

- Clear row selection
- Reset fetch size to default for fetch-size-enabled tables
- Trigger optional parent callback

Required comment in each reset effect:

- // resetting search-parameter-dependant state

Dependency policy:

- Include all search-defining inputs used by query options
- Avoid hidden dependencies in closure state

## Query and loader policy (unchanged by hooks)

Hooks-first does not mean loader removal.

Use this policy:

- Keep route loaders for prefetch and route-level readiness
- Keep query options as single source of truth
- Use the same query options in loader and data hook
- Keep data transformation/reset logic in data hook, not loader

This preserves fast route transitions while keeping table behavior deterministic and local.

## Shared primitives to build first

## A) InfiniteTable base

Build a generic renderer with:

- infinite scroll integration
- standard MRT defaults
- toolbar slots
- alert/error handling
- optional detail panel support
- fetched/total footer slot or helper

## B) Hook utility package

Create reusable helpers for common patterns:

- useTableResetOnSearchParams
- useScrollToTopOnSortOrSearch
- useStableRowSelectionHelpers
- query key composition helper (optional)

Note:

- Keep these helpers small and explicit to avoid hidden behavior.
- If helper abstraction becomes opaque, prefer explicit per-hook useEffect.

## C) Shared constants/types

- DEFAULT_TABLE_FETCH_SIZE = 20
- Table state interfaces
- Infinite table props contracts

## Detailed migration plan for outliers

## 1) WordFrequencyTable (pilot)

Target file split:

- WordFrequencyTable.tsx (composition root)
- \_hooks/useWordFrequencyTableState.ts
- \_hooks/useWordFrequencyTableData.ts

State hook owns:

- row selection (Redux)
- sorting model (URL)
- column visibility (Redux)
- export-related feature state

Data hook owns:

- filter deserialization inputs
- query consumption and infinite pages flattening
- columns and totals
- reset effect for filter/sorting

Renderer:

- InfiniteTable with toolbar slots and bottom summary

Why first:

- Lower coupling than document search
- Good pilot for infinite and filter-driven behavior

## 2) SdocStatusTable

Target split:

- SdocStatusTable.tsx
- \_hooks/useSdocStatusTableState.ts
- \_hooks/useSdocStatusTableData.ts

State hook owns:

- doctype, sorting, fetch-size URL state
- selection-derived action state
- retry/recompute/settings action handlers

Data hook owns:

- dynamic columns from server-provided metadata
- query data wiring and flattening
- reset effect on doctype/sorting/fetch-size drivers

Renderer:

- InfiniteTable with action toolbar composition

## 3) SentenceSimilaritySearchTable

Target split:

- SentenceSimilaritySearchTable.tsx
- \_hooks/useSentenceSimilarityTableState.ts
- \_hooks/useSentenceSimilarityTableData.ts

State hook owns:

- selection/sorting/visibility/sizing/density state
- table-only interaction state and handlers

Data hook owns:

- sentence similarity query binding
- columns and detail renderers
- reset effect on query/filter/topK/threshold/sorting

Renderer:

- Use MRT directly in the feature component (this table is not an infinite table)

Note:

- InfiniteTable is only for true infinite-scrolling tables.

## 4) SearchDocumentTable

Target split:

- SearchDocumentTable.tsx
- \_hooks/useSearchDocumentTableState.ts
- \_hooks/useSearchDocumentTableData.ts

State hook owns:

- complex folder-vs-document selection semantics
- table-specific redux/url connectors
- table interaction state (sorting, selection, expansion, visibility, sizing, density, fetch-size)

Data hook owns:

- document query consumption
- folder merge/de-dup flattening
- columns and detail panel content inputs
- reset effect on folder/query/filter/expert/sorting
- derived table result metadata (for example visible row ids) as plain outputs

Renderer:

- InfiniteTable with feature-specific row props and toolbar slots

Risk note:

- Highest coupling; migrate last in Wave 1.

Boundary note:

- DnD handlers, side-panel coordination, and cross-panel actions stay in the view-level feature orchestration and are not part of table hooks.

## Phase plan

## Phase 0: Alignment and templates

Deliverables:

- ADR addendum for hooks-first layering
- Hook templates (state/data hook skeletons)
- Inventory matrix with migration order and owner

Exit criteria:

- Team agrees on hook contracts and naming

## Phase 1: Foundation extraction

Deliverables:

- InfiniteTable base renderer
- small reusable hook utilities (if useful and transparent)
- FilterTable remains working, optionally refactored internally to reuse primitives

Exit criteria:

- No behavior change in existing filter tables

## Phase 2: Wave 1 migrations

Order:

1. WordFrequencyTable
2. SdocStatusTable
3. SentenceSimilaritySearchTable
4. SearchDocumentTable

Per-table deliverables:

- state hook + data hook + composition root
- reset effect behavior aligned to contract
- no regression in row interactions and toolbars

Exit criteria:

- each migrated table passes regression checklist
- query options shared by loader and hook

## Phase 3: Rollout to remaining MRTs

Deliverables:

- wave 2 and wave 3 migrations or documented exceptions
- consistent pattern in new feature development templates

Exit criteria:

- all major tables compliant or explicitly exempted

## Phase 4: Hardening and governance

Deliverables:

- lint or static checks for reset comment and dependency completeness
- docs updates in architecture and feature-building guides
- cleanup obsolete table helpers

Exit criteria:

- hooks-first pattern is default for new table work

## Testing and quality gates

## Unit tests (hook level)

State hooks:

- correctly map URL/Redux state to stable contract
- handlers dispatch expected state changes

Data hooks:

- query keys include full search-defining inputs
- transformations produce expected row outputs
- reset effects trigger exactly when expected

## Component tests (composition root)

- table renders with hook outputs
- toolbar slots receive correct props
- selection/fetch-size reset on parameter changes

## Integration tests

- route search param updates -> refetch + reset behavior
- route loader prefetch + data hook consumption remain consistent
- tab restore behavior remains correct

## Regression checklist

For each migrated table:

1. Change filter/search inputs -> row selection clears
2. Change sorting -> scroll top and reset behavior as specified
3. Fetch all then modify search parameters -> fetch size returns to 20
4. Navigate across tabs and return -> expected table state restoration
5. No unexpected duplicate requests beyond prefetch + consumption

## Risks and mitigations

Risk: hook contracts become inconsistent across features.

Mitigation:

- enforce naming + return-shape conventions and provide templates.

Risk: over-abstracted utilities hide behavior.

Mitigation:

- favor explicit useEffect in data hooks when readability is better.

Risk: migration complexity in SearchDocumentTable.

Mitigation:

- last migration in wave 1, with incremental extraction and parity checks.

Risk: loader/data-hook divergence.

Mitigation:

- query options are single source of truth consumed by both.

## Definition of done for hooks-first compliance

A table is compliant when all are true:

- It has one composition component + state hook + data hook.
- State hook owns orchestration only.
- Data hook owns query/columns/transforms/reset behavior.
- Renderer is shared generic primitive (or documented exception).
- Reset contract and scroll contract are implemented and tested.
- Route loader and data hook share query options.

## Practical implementation guidance

- Start from WordFrequencyTable as reference implementation.
- Keep the first migrated hook APIs intentionally boring and explicit.
- Reuse shape and naming conventions across all subsequent migrations.
- For very complex screens, allow one additional orchestration hook only if responsibilities are clearly split.

## Immediate next steps

1. Add hook templates in shared table docs and create a migration checklist artifact.
2. Implement InfiniteTable base renderer extraction with zero behavior changes.
3. Execute WordFrequencyTable pilot migration and validate against checklist.
4. Use pilot learnings to finalize patterns before moving to SdocStatusTable and sentence/document search tables.
