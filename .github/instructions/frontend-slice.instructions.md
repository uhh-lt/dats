---
applyTo: "frontend/src/**/*Slice.ts, frontend/src/store/store.ts"
paths:
  - "frontend/src/**/*Slice.ts"
  - "frontend/src/store/store.ts"
---

# Redux Slice Pattern

A slice holds one feature's (or core domain's) global client state in Redux Toolkit: selections, open panels, table and filter state, user preferences. Every slice is spread into the one store in [store.ts](../../frontend/src/store/store.ts). A slice lives in its owner's `store/` folder (`features/<feature>/store/`) or next to the core code that owns it; slices that the whole app reads live in `store/global/` (ESLint `local/no-cross-slice-access` lets only the owner folder read a slice).

## Where does state belong?

| State                                                                               | Owner                                              |
| ----------------------------------------------------------------------------------- | -------------------------------------------------- |
| Server data (entities, lists, job status, column infos)                             | TanStack Query (`<domain>Queries.ts`), never Redux |
| What the URL must reproduce: the opened entity (`$sdocId`), shareable view switches | Route params / search params (e.g. `showFolders`)  |
| Shared between components or kept across navigation: selections, table/filter state | Redux slice                                        |
| User preferences that survive a reload (layout, annotation mode, open tabs)         | Redux slice, persisted                             |
| Used by one component and lost on unmount (hover, menu anchor, input draft)         | `useState`; form values in React Hook Form         |

A slice stores **ids** of server entities, never copies (`selectedCodeId`, not `selectedCode: CodeRead`); the component resolves them with the domain hooks.

## File Structure

```ts
// 1. imports: "@reduxjs/toolkit" (never "@reduxjs/toolkit/react"), ProjectActions, generic reducers, persistReducer + persistStorage
import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { TableState, initialTableState, resetProjectTableState, tableReducer } from "@store/generic/tableSlice";
import { ProjectActions } from "@store/global/projectSlice";
import { persistStorage } from "@store/persistStorage";
import { persistReducer } from "redux-persist";

// 2. state type: interface XState, extends TableState / FilterState when it composes them
interface SentenceSearchState extends TableState {
  // project state:
  selectedDocumentId: number | undefined;
}

// 3. typed initial state
const initialState: SentenceSearchState = {
  ...initialTableState,
  selectedDocumentId: undefined,
};

// 4. module helpers (resetXState, getOrCreate...), only when several reducers share them

// 5. the slice: const xSlice, name "x"
const sentenceSearchSlice = createSlice({
  name: "sentenceSearch",
  initialState,
  reducers: {
    ...tableReducer,
    onToggleSelectedDocumentIdChange: (state, action: PayloadAction<number | undefined>) => { ... },
  },
  extraReducers: (builder) => {
    builder.addCase(ProjectActions.changeProject, (state) => {
      console.log("Project changed! Resetting 'sentenceSearch' state.");
      state.selectedDocumentId = initialState.selectedDocumentId;
      resetProjectTableState(state);
    });
  },
});

// 6. actions
export const SentenceSearchActions = sentenceSearchSlice.actions;

// 7. selectors (only those that compute or take parameters)

// 8. reducer map, always the last statement
export const sentenceSearchReducer = {
  [sentenceSearchSlice.name]: persistReducer({ key: sentenceSearchSlice.name, storage: persistStorage }, sentenceSearchSlice.reducer),
};
```

## Rules

### Naming and exports (ESLint `local/slice-conventions`)

- **One name**: file `xSlice.ts`, `const xSlice = createSlice({ name: "x" })`, `export const XActions = xSlice.actions`, `export const xReducer = { [xSlice.name]: ... }`. `x` is camelCase and is also the state key (`state.x`). `XActions` may capitalize acronyms (`LLMAssistantActions`, `SATFilterActions`).
- **Reducer map**: `xReducer` is an object with the single computed key `[xSlice.name]`; it is the last statement of the file. The feature's `index.ts` exports it and `store.ts` spreads it. The slice object itself is never exported.
- **State type**: `interface XState`, exported only when another module needs it; `const initialState: XState`. Compose with `extends TableState` / `extends FilterState`, never with `&`. A slice of plain table state uses `const initialState: TableState = initialTableState`.
- **Payloads** are typed `PayloadAction<T>`; multi-field payloads are inline object types or a named `interface ...Payload`.
- **Imports** come from `"@reduxjs/toolkit"`, never `"@reduxjs/toolkit/react"`.

### Project change

- Every slice whose state refers to the current project (entity ids, selections, filters, table state, analysis state) resets that part in `extraReducers` on `ProjectActions.changeProject`, logging `Project changed! Resetting 'x' state.`.
- Reset by assigning from `initialState` field by field; composed state calls `resetProjectTableState(state)` / `resetProjectFilterState({ state, defaultFilterExpression })`. Fields that are user preferences (grid density, annotation mode, view settings) survive.
- Exempt: state keyed by project (`tabsByProject[projectId]`, `bindingsByUserAndProject`, workspace `scope` = `${userId}:${projectId}`), app-global state (`project`, `layout`, `websocket`) and dialog / notification slices that reset themselves on close.
- When the same reset also runs from a reducer (e.g. `onOpenCota` switching the analysis), extract `const resetXState = (state: Draft<XState>) => {...}` above the slice.

### Persistence

- A slice is persisted by wrapping its reducer in the reducer map: `persistReducer({ key: xSlice.name, storage: persistStorage }, xSlice.reducer)` with `persistStorage` from [persistStorage.ts](../../frontend/src/store/persistStorage.ts). `store.ts` does not mark or group persisted slices.
- Persist only what a user expects to find again after a reload: preferences, open tabs, shortcuts, expanded trees, table models, selections of the search views. Never persist dialog or notification state, job ids/results or server data.
- Transient fields of a persisted slice go in `blacklist` with a comment (`blacklist: ["hoveredCodeId"]` in `annotationsSlice`).
- Renaming a persisted slice's `name` drops every user's stored state for it; rename the file instead when only the file name is off.

### Reducers

- Mutate the draft; return a new state only to replace it entirely (`closeClassifierDialog: () => createInitialState()`).
- Reducers never dispatch, call APIs or read other slices; react to another slice's action in `extraReducers` (`ProjectActions.changeProject`, `AuthActions.userChanged`).
- Generic behaviour is composed, not copied: an MRT table spreads `...tableReducer` from [tableSlice.ts](../../frontend/src/store/generic/tableSlice.ts), a filter `...filterReducer` from `@core/filter`, a workspace `...workspaceReducer` from [workspaceSlice.ts](../../frontend/src/store/generic/workspaceSlice.ts). Override a generic case reducer by calling it first (`tableReducer.onSearchParamsChange(state)`). A slice that only shares a row selection may hold a plain `rowSelectionModel: MRT_RowSelectionState` (`cotaSlice`).

### Selectors

- Components read plain fields inline: `useAppSelector((state) => state.x.field)`. Do not write `selectField` one-liners.
- A selector exists only when it derives data or takes parameters. It is named `selectX`, lives in the slice file after `XActions`, and takes `(state: RootState, ...params)`: `useAppSelector((state) => selectProjectTabs(state, projectId))`.
- Use `createSelector` only when the result is a new array/object; never build selectors in a factory (`selectX(projectId)` returns a new memoized selector per render).
- Generic modules' selectors take the composed state: `selectSelectedIds(state.documentSearch)`.

### Generic slices (`store/generic/*Slice.ts`, `core/filter/store/filterSlice.ts`)

- No `createSlice`. Export `XState`, `initialXState` (or `createInitialXState(...)`), the case-reducer object `xReducer` with `Draft<XState>`-typed reducers, `resetProjectXState` when the state has a project part, and selectors over `XState`.

### store.ts

- Only `configureStore` with every `...xReducer` spread into `reducer`, the redux-persist serializable-check exemption, and the `AppDispatch` / `RootState` / `AppThunk` types. Nothing else is defined there.

## Known deviations

- `sdocTableFilterSlice.ts` (slice `documentTableFilter`, `SdocTableFilterActions`), `memoDialogSlice.ts` and `dialogBusSlice.ts` (`@reduxjs/toolkit/react`, no `DialogBusActions`, React hooks in the slice file) are excluded from `local/slice-conventions` in `eslint.config.mjs` until fixed.

## Examples

- [sentenceSearchSlice.ts](../../frontend/src/features/search/store/sentenceSearchSlice.ts) — table composition, project reset, persistence.
- [timelineAnalysisSlice.ts](../../frontend/src/features/timeline-analysis/store/timelineAnalysisSlice.ts) — filter composition, shared `resetXState` for project and analysis change.
- [tabsSlice.ts](../../frontend/src/core/navigation/tabsSlice.ts) — state keyed by project, parameterized `createSelector`.
