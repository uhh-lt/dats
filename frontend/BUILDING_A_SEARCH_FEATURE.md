Architecture Guideline: Building Search Features in DATS

Stack: TanStack Router + TanStack Query v5 + React

This document explains how to build production-grade search pages in DATS, based on our three existing implementations:

- Document Search (infinite, folder-aware)
- Image Similarity Search
- Sentence Similarity Search

The goal is unchanged: filters are shareable via URL, first paint is preloaded in route loaders, and components remain responsive and interactive after mount.

## Core Philosophy

When combining TanStack Router and Query for search UX in DATS, responsibilities are intentionally split:

1. URL is the source of truth

- Search state belongs in route search params (searchQuery, searchFilter, sortingModel, topK, threshold, etc.).
- We do not keep canonical filter state in local component state.

2. Route loader owns first paint

- Loader validates/coerces URL params with zod.
- Loader prefetches all critical server state before render.
- Result: immediate rendering from hydrated query cache.

3. Component owns interactivity

- Component reads route search params and consumes the already-primed cache.
- Component updates URL for user actions (query change, filter updates, options).
- For infinite lists, component fetches next pages based on scroll.

## Our Existing Search Routes

All three routes follow the same TanStack Router contract: validateSearch, loaderDeps, loader.

### 1) Document Search

- Route: /\_auth/project/$projectId/search
- Search params include:
  - searchQuery: string
  - searchFilter: string (serialized filter JSON)
  - filterExpertMode: boolean
  - selectedFolderId: number
  - sortingModel: [{ id, desc }]
  - fetchSize: number
- Data strategy: infinite query (paginated Elasticsearch hits)

### 2) Image Similarity Search

- Route: /\_auth/project/$projectId/imagesearch
- Search params include:
  - searchQuery: string
  - searchFilter: string
  - topK: number
  - threshold: number
- Data strategy: single query (vector similarity result list)

### 3) Sentence Similarity Search

- Route: /\_auth/project/$projectId/sentencesearch
- Search params include:
  - searchQuery: string
  - searchFilter: string
  - topK: number
  - threshold: number
- Data strategy: single query (vector sentence-hit list)

## Step-by-Step Implementation Pattern

## 1) Define Query Options (Single Source for Loader + Component)

In DATS we create one query-options builder per search view.

### Document search query options

Use infiniteQueryOptions with a fully parameterized query key:

- queryKey includes:
  - QueryKey.SEARCH_TABLE
  - projectId, selectedFolderId, searchQuery
  - filter, expertMode, sortingModel, fetchSize
- queryFn calls SearchService.searchSdocs with:
  - folderId mapping: -1 -> null
  - highlight: true
  - requestBody.filter and requestBody.sorts (mapped from sortingModel)
  - pageNumber/pageSize
- initialPageParam is 0
- getNextPageParam returns groups.length
- staleTime is 5 minutes
- refetchOnWindowFocus is false

Important implementation detail:
Document search queryFn hydrates related caches (sdoc, tags, annotators, folder map) to avoid downstream waterfalls in renderers.

### Image and sentence similarity query options

Use queryOptions (non-infinite) with keys:

- Image: [QueryKey.IMG_SIMSEARCH, projectId, searchQuery, filter, topK, threshold]
- Sentence: [QueryKey.SENT_SIMSEARCH, projectId, searchQuery, filter, topK, threshold]

Both call SimsearchService with:

- requestBody.query
- requestBody.filter
- topK
- threshold
- staleTime: 5 minutes

## 2) Define Route Validation + Loader Dependencies

Every search route validates URL state through zod + zodValidator.

Best practice in DATS:

- Coerce numeric URL params via z.coerce.number().
- Normalize booleans from "true"/"false" strings where needed.
- Always provide defaults to guarantee deterministic loader behavior.

Then restrict loaderDeps to only params that affect server data.
This ensures loader reruns exactly when needed.

## 3) Loader Prefetch Contract

All three loaders use the same prefetch shape:

1. Deserialize filter from URL search param.
2. Ensure project metadata is available.
3. Ensure table-info/column-info is available.
4. Ensure/prefetch the primary search query.

Concretely:

- projectMetadataListQueryOptions(projectId)
- searchTableInfoQueryOptions(projectId)
- and one of:
  - documentSearchQueryOptions(...) via prefetchInfiniteQuery
  - imageSimilaritySearchQueryOptions(...) via ensureQueryData
  - sentenceSimilaritySearchQueryOptions(...) via ensureQueryData

This keeps first render consistently fast and avoids initial loading flicker.

## 4) Component Interactivity Pattern

After loader-prefetch, components do three things:

1. Read route state

- useSearch for searchQuery/topK/threshold/sorting/fetchSize
- useURLConnector or useURLConnectorDebounced for URL updates

2. Read query cache with suspense hooks

- useSuspenseInfiniteQuery for document search
- useSuspenseQuery for image/sentence similarity search

3. Update URL (not local canonical state)

- Search bars set searchQuery in URL
- Option menus set topK/threshold in URL (replace: true)
- Filter dialog serializes filter back into searchFilter URL param

## 5) Filter System (Shared Across Search Features)

Our filter system is one of the key reusable building blocks for future search features.

### URL-backed filter payload

- FILTER_PARAM is searchFilter
- FILTER_EXPERT_MODE_PARAM is filterExpertMode
- Filters are URI-encoded JSON
- deserializeFilterFromSearchParam(value, filterName) safely restores filter state
- serializeFilterToSearchParam(filter) writes it back

### Filter scopes via filterName

We scope filter trees by feature-specific names:

- Document search: root
- Image similarity: imageSimilaritySearch
- Sentence similarity: sentenceSimilaritySearch

This allows each page to keep its own logical filter tree while using one shared URL parameter contract.

### Filter UI integration

All search toolbars use URLFilterDialog with:

- routeApi of the current route
- filterName for scope
- defaultFilterExpression (usually name contains)
- column2InfoSelector for type-aware operators and values

### Programmatic filter additions

Search side-panels and stats add filters via utility functions:

- addTagFilter
- addKeywordFilter
- addSpanAnnotationFilter
- addMetadataFilter

These functions clone existing filter trees and append valid expressions/groups.

## 6) Column System (Dynamic, Metadata-Aware)

Search table columns are not hardcoded only once in UI.
They are driven by backend-provided table info plus local render mapping.

### Column info source

- searchTableInfoQueryOptions(projectId) calls SearchService.searchSdocInfo
- ColumnInfo column values are normalized to string
- useInitSearchFilterSlice initializes:
  - search.column2Info map
  - default column visibility behavior

### Default visibility behavior

Metadata columns (numeric column ids) are hidden by default.
Core document columns remain visible.
This makes new metadata fields safe-by-default in the UI.

### Rendering strategy

Document and sentence tables map ColumnInfo to Material React Table column definitions:

- SdocColumns.SD_SOURCE_DOCUMENT_TYPE -> doctype icon renderer
- SdocColumns.SD_SOURCE_DOCUMENT_NAME -> document/folder name renderer
- SdocColumns.SD_TAG_ID_LIST -> tag renderer
- SdocColumns.SD_USER_ID_LIST -> annotator renderer
- Numeric metadata columns -> metadata renderer

Sentence similarity adds concrete custom columns before shared ones:

- score
- sentence

## 7) Infinite Scrolling Pattern (Document Search)

Document search is our reference implementation for infinite result browsing.

Key implementation details:

- Material React Table row virtualization enabled
- useTableFetchMoreOnScroll triggers fetchNextPage near container bottom
- Results are flattened from infinite pages
- Folder hits are merged by folder id across pages to avoid duplicates
- Search result counters show fetched vs total
- Fetch All action updates fetchSize in URL

Because sortingModel/filter/searchQuery/fetchSize are in URL, scrolling state stays reproducible and shareable.

## 8) Concrete Filter-Change Lifecycle in DATS

When a filter/search option changes:

1. Component writes to URL (navigate or URL connector).
2. Router detects changed loaderDeps.
3. Loader re-runs and prefetches the target query.
4. Component re-renders from updated cache.

Result:

- stable transitions
- no ad-hoc local synchronization bugs
- predictable back/forward browser behavior

## 9) Input Handling and Debouncing Guidance

For text query updates, avoid flooding the router with URL updates on each keypress.
Prefer form submit or debounced updates for smoother UX.

Current implementations:

- Document search uses a debounced URL connector for global filter text.
- Image/sentence similarity search bars submit on form submit and provide explicit clear behavior.

## 10) Staleness and Cache Policy

All search query options set staleTime to 5 minutes.
This is essential because loaders prefetch before render.
Without staleTime, an immediate second fetch after mount is likely.

Document search additionally disables refetchOnWindowFocus for table stability.

## 11) Navigation Entry Points into Search

Search routes are triggered from multiple UX contexts, not only sidebar tabs:

- Sentence context menus can open sentence similarity and image similarity with selected sentence text as searchQuery.
- Image viewers and image context menus can open image/sentence similarity with sdoc id as searchQuery.

When implementing new search pages, support these deep-link workflows early.

## Build Checklist for New Search Features

Use this sequence when adding a new search page:

1. Create route schema with validateSearch defaults and strict loaderDeps.
2. Define query options with complete query key and 5-minute staleTime.
3. Implement loader that ensures metadata + table info + feature query.
4. Use URLFilterDialog and a feature-specific filterName.
5. Initialize column info via useInitSearchFilterSlice if the feature renders document-related columns.
6. Keep selection/sorting/visibility state in feature redux slice when table UX needs persistence.
7. Ensure URL-based updates for all canonical search state.
8. Add navigation hooks from related features (annotation/image viewers) if applicable.

If you follow this pattern, your new search feature will match DATS behavior: shareable URLs, fast first paint, consistent filtering semantics, and robust table/column integration.
