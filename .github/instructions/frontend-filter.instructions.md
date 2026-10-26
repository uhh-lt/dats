---
applyTo: "frontend/src/core/filter/**, frontend/src/**/*FilterTable.tsx, frontend/src/**/*FilterSlice.ts"
paths:
  - "frontend/src/core/filter/**"
  - "frontend/src/**/*FilterTable.tsx"
  - "frontend/src/**/*FilterSlice.ts"
---

# Filter Table Pattern

An entity that can be listed with filters, sorting and infinite scrolling (sdocs, memos, span / sentence / bbox annotations) gets one vertical slice built on `@core/filter`: a `<prefix>FilterSlice.ts` on top of `filterReducer` and a `<Entity>FilterTable.tsx` on top of `FilterTable`, both in `core/<domain>/table/`. All of them have the same shape, so a new one is a copy of [SpanAnnotationFilterTable.tsx](../../frontend/src/core/span-annotation/table/SpanAnnotationFilterTable.tsx) and [satFilterSlice.ts](../../frontend/src/core/span-annotation/table/satFilterSlice.ts) with the domain swapped.

## The Building Blocks (`core/filter`)

| Part                             | What it is                                                                                                                                                                                                                                                                                                                                                                 |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `filterUtils.ts`                 | `MyFilter<Columns>` (a tree of `MyFilterExpression`s), `ColumnInfo`, the tree helpers (`findInFilter`, `countFilterExpressions`), the pure edit functions (`createEmptyFilter`, `withDefaultFilterExpression`, `addDefaultFilter`, `addDefaultFilterExpression`, `deleteInFilter`, `changeFilter<LogicalOperator/Column/Operator/Value>`), `toSorts<Column>(sortingModel)` |
| `store/filterSlice.ts`           | `FilterState` (`filter: Record<filterName, MyFilter>`, `defaultFilterExpression`, `expertMode`), `createInitialFilterState`, `resetProjectFilterState`, `filterReducer`                                                                                                                                                                                                    |
| `searchParamFilterValidators.ts` | `FILTER_PARAM` / `FILTER_EXPERT_MODE_PARAM` and `searchParamFilterValidators<Columns>()`, which parses them from the URL                                                                                                                                                                                                                                                   |
| `api/`                           | `TableInfoOptions`, `tableInfoQueries` (key prefixes of every `tableInfo` leaf), `toColumnInfos`, `TableInfoHooks.useColumnInfoMap` / `useColumnVisibility`                                                                                                                                                                                                                |
| `filter-popovers/`               | `FilterPopover` (the caller owns filter + expert mode), `ReduxFilterPopover` (a `*FilterSlice`), `URLFilterPopover` (the route's search params); all three wrap `InternalFilterPopover`                                                                                                                                                                                    |
| `filter-renderer/`               | `FilterRenderer` (expert) / `FilterRendererSimple`, one row per expression: `FilterColumnSelector`, `FilterOperatorSelector`, `FilterValueSelector` → one `<Type>ValueSelector` per `FilterValueType`                                                                                                                                                                      |
| `toolbar/`                       | `FilterTableToolbarProps` (`table`, `selectedData`, `anchor`), `Redux` / `URL` / `LocalFilterTableToolbarLeft` (the matching dialog), `FilterTableToolbarRight`                                                                                                                                                                                                            |
| `table/`                         | `FilterTable` (MRT table with virtualization, infinite scroll, selection, manual sorting and the toolbars), `FilterTableContainerProps`, the variant props `ReduxFilterTableProps` / `URLFilterTableProps` / `LocalFilterTableProps`                                                                                                                                       |

The query side is defined by the domain's factory (see `frontend-api.instructions.md`): `<domain>Queries.search(request)` (an `infiniteQueryOptions` leaf), `searchScope()` and `tableInfo(projectId)`, whose key is `tableInfoQueries.byDomain("<domain>", projectId)` and whose `queryFn` maps the backend infos with `toColumnInfos`.

## File Structure

### `<prefix>FilterSlice.ts`

```ts
// 1. The expression a new filter row starts with (usually the name column, STRING_CONTAINS)
export const default<PREFIX>FilterExpression: MyFilterExpression = {
  id: crypto.randomUUID(),
  column: <Entity>Columns.<NAME_COLUMN>,
  operator: StringOperator.STRING_CONTAINS,
  value: "",
};

// 2. The slice: name = file name without "Slice", reducers = filterReducer, reset on project change
const initialState = createInitialFilterState(default<PREFIX>FilterExpression);

const <prefix>FilterSlice = createSlice({
  name: "<prefix>Filter",
  initialState,
  reducers: filterReducer,
  extraReducers(builder) {
    builder.addCase(ProjectActions.changeProject, (state) => {
      console.log("Project changed! Resetting '<prefix>Filter' state.");
      resetProjectFilterState({ state, defaultFilterExpression: default<PREFIX>FilterExpression });
    });
  },
});

// 3. Exports
export const <PREFIX>FilterActions = <prefix>FilterSlice.actions;
export const <prefix>FilterReducer = { [<prefix>FilterSlice.name]: <prefix>FilterSlice.reducer };
```

### `<Entity>FilterTable.tsx`

```tsx
// 1. Imports, then the page flattener of the search response
const flatMapData = (page: Page_<Entity>Row_) => page.items;

// 2. The private inner table: columns + data, generic over the toolbar props of the variant
const <Entity>FilterTable = <TToolbarProps extends FilterTableToolbarProps<Row>>({
  projectId, filter, rowSelectionModel, onRowSelectionChange, sortingModel, onSortingChange,
  columnVisibilityModel, onColumnVisibilityChange, fetchSize, onFetchSizeChange, onSearchParameterChange,
  renderTopLeftToolbar, renderTopRightToolbar, renderBottomToolbar, toolbarExtraProps,
}: FilterTableContainerProps<Row, TToolbarProps, MyFilter<Columns>>) => {
  // table columns
  const { data: tableInfo } = useQuery(<domain>Queries.tableInfo(projectId));
  const columns = useMemo(() => {
    if (!tableInfo) return [];
    return tableInfo.map((column): MRT_ColumnDef<Row> => {
      const colDef: MRT_ColumnDef<Row> = {
        id: column.column,
        accessorFn: () => null,
        header: column.label,
        enableSorting: column.sortable,
      };
      switch (column.column) {
        case Columns.X:
          return { ...colDef, Cell: ({ row }) => <XRenderer ... /> };
        default:
          if (!isNaN(parseInt(column.column))) return { ...colDef, Cell: /* SdocMetadataRenderer */ };
          return { ...colDef, Cell: () => <i>Cannot render column {column.column}</i> };
      }
    });
  }, [tableInfo]);

  // table data
  const { data, fetchNextPage, isError, isFetching, isLoading } = useInfiniteQuery(
    <domain>Queries.search({ project_id: projectId, filter, sorts: toSorts<Columns>(sortingModel), page_size: fetchSize }),
  );

  // resetting search-parameter-dependant state
  const resetState = useCallback(() => {
    onRowSelectionChange?.({});
    onFetchSizeChange(20);
    onSearchParameterChange?.();
  }, [onRowSelectionChange, onFetchSizeChange, onSearchParameterChange]);
  useResetStateOnSearch([filter, sortingModel], resetState);

  return <FilterTable name="<entities>" columns={columns} getRowId={(row) => `${row.id}`} data={data} ... />;
};

// 3. configs for redux filter table
const filterStateSelector = (state: RootState) => state.<prefix>Filter;
const filterActions = <PREFIX>FilterActions;

// 4. Redux variant: filter = state.<prefix>Filter.filter[filterName]
export const <Entity>ReduxFilterTable = memo(
  ({ filterName, renderTopLeftToolbar = ReduxFilterTableToolbarLeft, ...tableProps }: ReduxFilterTableProps<Row, Columns>) => { ... },
);

// 5. configs for URL and local filter table
const defaultFilterExpression = default<PREFIX>FilterExpression;

// 6. URL variant: filter = useURLConnector(routeApi, FILTER_PARAM)
export const <Entity>URLFilterTable = memo(
  ({ routeApi, renderTopLeftToolbar = URLFilterTableToolbarLeft, ...tableProps }: URLFilterTableProps<Row, Columns>) => { ... },
);

// 7. Local variant: the caller passes filter, onFilterChange, expertMode, onExpertModeChange
export const <Entity>LocalFilterTable = memo(
  ({ filterName, filter, onFilterChange, expertMode, onExpertModeChange, renderTopLeftToolbar = LocalFilterTableToolbarLeft, ...tableProps }: LocalFilterTableProps<Row, Columns>) => { ... },
);
```

## Rules

### Filter Slice

- **Name**: file `<prefix>FilterSlice.ts`, slice name `"<prefix>Filter"` (= the `RootState` key), exports `default<PREFIX>FilterExpression`, `<PREFIX>FilterActions` and `<prefix>FilterReducer`. The prefix is the domain's short name (`sdoc`, `memo`, `sat`, `seat`, `bbox`); actions and default expression may capitalize it (`SATFilterActions`).
- **Shared logic only**: `reducers: filterReducer`, state from `createInitialFilterState`, no own reducers. A table that needs more state keeps it in its feature's slice, not here.
- **Reset**: on `ProjectActions.changeProject`, call `resetProjectFilterState` (keeps `expertMode`).
- **Registration**: the domain's `table/index.ts` does `export * from "./<prefix>FilterSlice"`; `store/store.ts` spreads `...<prefix>FilterReducer` among the non-persisted reducers.

### Filter Table

- **Exports**: exactly `<Entity>ReduxFilterTable`, `<Entity>URLFilterTable` and `<Entity>LocalFilterTable`, each `memo(...)` with a JSDoc that names where the filter lives. The inner `<Entity>FilterTable` is not exported.
- **Variant props**: type the variants with `ReduxFilterTableProps<Row, Columns>` / `URLFilterTableProps` / `LocalFilterTableProps`, never with hand-written `Omit<FilterTableContainerProps ...>`. Every variant defaults `renderTopLeftToolbar` to its generic toolbar (or the domain's own, e.g. `MemoReduxToolbarLeft`) and lets the caller override it.
- **Table infos**: every filter popover (Redux, URL and Local) takes the domain's `tableInfo` leaf as `tableInfoOptions` (`sdocQueries.tableInfo(projectId)`, no `useMemo`) and loads the column infos itself. Code that needs the infos as a map (`addMetadataFilter`, `ConceptFilterEditor`) reads `columnInfoMap = TableInfoHooks.useColumnInfoMap(...)`.
- **Columns**: built in one `useMemo` from `tableInfo`, `[]` while loading. Type the map callback (`(column): MRT_ColumnDef<Row> =>`) and the base `colDef`; never cast with `as MRT_ColumnDef`. The base `colDef` has `accessorFn: () => null`, because MRT only sorts columns with an accessor. Metadata columns (numeric `column`) render `SdocMetadataRenderer`; unknown columns render `<i>Cannot render column …</i>`. Extra columns that are not in `tableInfo` are typed constants prepended to the result (`textColumn`, `previewColumn`); columns to skip go in a `HIDDEN_COLUMNS: string[]` constant filtered before the map.
- **Data**: `useInfiniteQuery(<domain>Queries.search({...}))` with `toSorts<Columns>(sortingModel)` and `fetchSize` as page size; pass the factory leaf directly (no spread, no `enabled`).
- **Reset**: `useResetStateOnSearch([...searchParams], resetState)` clears the selection, sets the fetch size back to 20 and calls `onSearchParameterChange`. The params are every input of the search: `[filter, sortingModel]`, plus `searchQuery` if the table has a global search.
- **`FilterTable` props** in this order: `name`, `columns`, `getRowId`, `data`, `fetchNextPage`, `flatMapData`, `isLoading={isLoading || columns.length === 0}`, `isError`, `isFetching`, `onFetchSizeChange`, the three state pairs, the four toolbar props, then any extra MRT options (global search, detail panel, resizing).
- **Global search** (sdoc, memo): `const [searchQuery, setSearchQuery] = useState<string | undefined>("")`, passed as `state={{ globalFilter: searchQuery }}`, `enableGlobalFilter`, `onGlobalFilterChange={setSearchQuery}`.

### Callers

- The caller owns `rowSelectionModel`, `sortingModel`, `columnVisibilityModel` and `fetchSize` (local `useState`, or its feature slice / route search params) and passes `projectId`. Column visibility defaults come from `TableInfoHooks.useColumnVisibility(<domain>Queries.tableInfo(projectId), storedModel, HIDDEN_BY_DEFAULT)`.
- Pick the variant by where the filter must live: a dialog or panel → Redux with a unique `filterName` constant; a page whose filter belongs in the URL → URL; a feature that keeps the filter in its own state → Local. Domain actions on the selection go in a custom `renderTopLeftToolbar` / `renderBottomToolbar` that receives `selectedData`.
- URL-backed filters (the URL variant, `URLFilterPopover`, or a Local variant fed from `useURLConnector`) get their search params from the validators used in the route's `validateSearch` schema (see [frontend-route.instructions.md](frontend-route.instructions.md)): `searchParamFilterValidators<Columns>()` (`searchParamFilterValidators.ts`) adds `FILTER_PARAM` (deserialized to a `MyFilter`) and `FILTER_EXPERT_MODE_PARAM`; `searchParamSortingModelValidator({ default? })` and `searchParamBooleanValidator({ default })` from `@utils/searchParamValidators` add the sorting state and any other flag. Never write these schemas by hand.

  ```ts
  const wordFrequencySearchSchema = z.object({
    ...searchParamFilterValidators<WordFrequencyColumns>(),
    sortingModel: searchParamSortingModelValidator({ default: [{ id: "WF_WORD_FREQUENCY", desc: true }] }),
    fetchSize: z.coerce.number().default(50),
  });
  // createFileRoute(...)({ validateSearch: zodValidator(wordFrequencySearchSchema), ... })
  ```

### Filter Popovers and Selectors

- `URLFilterPopover` takes a `routeApi` whose search schema has `FILTER_PARAM` and `FILTER_EXPERT_MODE_PARAM` (checked by its type).
- A value selector is `export const <Type>ValueSelector = memo(({ filterExpression, onChangeValue }: SharedFilterValueSelectorProps) => ...)` with one `handleValueChange` callback that calls `onChangeValue(filterExpression.id, value)`; register it in the `FilterValueSelector` switch under its `FilterValueType`.
- Filter edits go through the pure edit functions of `filterUtils.ts` (each returns a new filter); never mutate a `MyFilter`.

### Lint

`local/filter-table-shape` checks the three variant exports and the `MRT_ColumnDef` casts of every `*FilterTable.tsx`; `local/filter-slice-shape` checks the slice name, `reducers: filterReducer`, the project reset and the exports of every `*FilterSlice.ts`.

## Examples

See:

- [SpanAnnotationFilterTable.tsx](../../frontend/src/core/span-annotation/table/SpanAnnotationFilterTable.tsx) — the plain pattern with all three variants
- [MemoFilterTable.tsx](../../frontend/src/core/memo/table/MemoFilterTable.tsx) — global search, domain-specific toolbars (`_components/Memo*ToolbarLeft.tsx`, `MemoToolbarRight`)
- [satFilterSlice.ts](../../frontend/src/core/span-annotation/table/satFilterSlice.ts) — a filter slice
