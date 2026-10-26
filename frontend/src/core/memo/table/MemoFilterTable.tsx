import {
  createEmptyFilter,
  FILTER_PARAM,
  FilterTable,
  FilterTableContainerProps,
  FilterTableToolbarProps,
  LocalFilterTableProps,
  MyFilter,
  ReduxFilterTableProps,
  toSorts,
  URLFilterTableProps,
} from "@core/filter";
import { useResetStateOnSearch } from "@hooks/useResetStateOnSearch";
import { useURLConnector } from "@hooks/useURLConnector";
import { MemoColumns } from "@models/MemoColumns";
import { MemoRead } from "@models/MemoRead";
import { Page_MemoRead_ } from "@models/Page_MemoRead_";
import { RootState } from "@store/store";
import { useAppSelector } from "@store/storeHooks";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { MRT_ColumnDef } from "material-react-table";
import { memo, useCallback, useMemo, useState } from "react";
import { memoQueries } from "../api/memoQueries";
import { MemoRenderer } from "../renderer";
import { MemoLocalToolbarLeft } from "./_components/MemoLocalToolbarLeft";
import { MemoReduxToolbarLeft } from "./_components/MemoReduxToolbarLeft";
import { MemoToolbarRight } from "./_components/MemoToolbarRight";
import { MemoURLToolbarLeft } from "./_components/MemoURLToolbarLeft";
import { defaultMemoFilterExpression, MemoFilterActions } from "./memoFilterSlice";

const flatMapData = (page: Page_MemoRead_) => page.items;

/**
 * Filter table for memos: defines the columns and fetches the data.
 * Where the filter lives (Redux, URL or the caller) is decided by the variants below, which pass the filter and the
 * matching top left toolbar.
 */
const MemoFilterTable = <TToolbarProps extends FilterTableToolbarProps<MemoRead>>({
  projectId,
  filter,
  rowSelectionModel,
  onRowSelectionChange,
  sortingModel,
  onSortingChange,
  columnVisibilityModel,
  onColumnVisibilityChange,
  fetchSize,
  onFetchSizeChange,
  onSearchParameterChange,
  renderTopLeftToolbar,
  renderTopRightToolbar = MemoToolbarRight,
  renderBottomToolbar,
  toolbarExtraProps,
}: FilterTableContainerProps<MemoRead, TToolbarProps, MyFilter<MemoColumns>>) => {
  const [searchQuery, setSearchQuery] = useState<string | undefined>("");

  // table columns
  const { data: tableInfo } = useQuery(memoQueries.tableInfo(projectId));
  const columns = useMemo(() => {
    if (!tableInfo) return [];

    return tableInfo.map((column): MRT_ColumnDef<MemoRead> => {
      const colDef: MRT_ColumnDef<MemoRead> = {
        id: column.column,
        accessorFn: () => null,
        header: column.label,
        enableSorting: column.sortable,
      };

      switch (column.column) {
        case MemoColumns.M_TITLE:
          return {
            ...colDef,
            size: 100,
            Cell: ({ row }) => <MemoRenderer memo={row.original.id} renderTitle />,
          };
        case MemoColumns.M_CONTENT:
          return {
            ...colDef,
            size: 360,
            Cell: ({ row }) => <MemoRenderer memo={row.original.id} renderContent />,
          };
        case MemoColumns.M_FAVORITE:
          return {
            ...colDef,
            Cell: ({ row }) => <MemoRenderer memo={row.original.id} renderStar />,
          };
        case MemoColumns.M_USER_ID:
          return {
            ...colDef,
            Cell: ({ row }) => <MemoRenderer memo={row.original.id} renderUser />,
          };
        case MemoColumns.M_ATTACHED_OBJECT_ID:
          return {
            ...colDef,
            enableSorting: false,
            Cell: ({ row }) => <MemoRenderer memo={row.original.id} renderAttachedObject attachedObjectLink />,
          };
        default:
          return {
            ...colDef,
            Cell: () => <i>Cannot render column {column.column}</i>,
          };
      }
    });
  }, [tableInfo]);

  // table data
  const { data, fetchNextPage, isError, isFetching, isLoading } = useInfiniteQuery(
    memoQueries.search({
      project_id: projectId,
      search_query: searchQuery || "",
      filter,
      sorts: toSorts<MemoColumns>(sortingModel),
      page_size: fetchSize,
    }),
  );

  // resetting search-parameter-dependant state
  const resetState = useCallback(() => {
    onRowSelectionChange?.({});
    onFetchSizeChange(20);
    onSearchParameterChange?.();
  }, [onRowSelectionChange, onFetchSizeChange, onSearchParameterChange]);
  useResetStateOnSearch([searchQuery, filter, sortingModel], resetState);

  return (
    <FilterTable
      name="memos"
      columns={columns}
      getRowId={(row) => `${row.id}`}
      data={data}
      fetchNextPage={fetchNextPage}
      flatMapData={flatMapData}
      isLoading={isLoading || columns.length === 0}
      isError={isError}
      isFetching={isFetching}
      onFetchSizeChange={onFetchSizeChange}
      rowSelectionModel={rowSelectionModel}
      onRowSelectionChange={onRowSelectionChange}
      sortingModel={sortingModel}
      onSortingChange={onSortingChange}
      columnVisibilityModel={columnVisibilityModel}
      onColumnVisibilityChange={onColumnVisibilityChange}
      renderTopLeftToolbar={renderTopLeftToolbar}
      renderTopRightToolbar={renderTopRightToolbar}
      renderBottomToolbar={renderBottomToolbar}
      toolbarExtraProps={toolbarExtraProps}
      state={{
        globalFilter: searchQuery,
        showGlobalFilter: true,
      }}
      autoResetAll={false}
      enableGlobalFilter
      onGlobalFilterChange={setSearchQuery}
      enableColumnResizing
      columnResizeMode="onEnd"
    />
  );
};

// configs for redux filter table
const filterStateSelector = (state: RootState) => state.memoFilter;
const filterActions = MemoFilterActions;

/**
 * Redux-based filter table for memos.
 * The filter state is stored under state.memoFilter.filter[filterName].
 *
 * @param filterName identifies the filter in the redux store, so that multiple tables can be used without conflicts.
 */
export const MemoReduxFilterTable = memo(
  ({
    filterName,
    renderTopLeftToolbar = MemoReduxToolbarLeft,
    ...tableProps
  }: ReduxFilterTableProps<MemoRead, MemoColumns>) => {
    const reduxFilter = useAppSelector((state) => filterStateSelector(state).filter[filterName]);
    const filter = useMemo(() => reduxFilter || createEmptyFilter(filterName), [reduxFilter, filterName]);
    const tableInfoOptions = memoQueries.tableInfo(tableProps.projectId);

    return (
      <MemoFilterTable
        {...tableProps}
        filter={filter as MyFilter<MemoColumns>}
        renderTopLeftToolbar={renderTopLeftToolbar}
        toolbarExtraProps={{
          filterName,
          filterStateSelector,
          filterActions,
          tableInfoOptions,
        }}
      />
    );
  },
);

// configs for URL and local filter table
const defaultFilterExpression = defaultMemoFilterExpression;

/**
 * URL-based filter table for memos.
 * The filter state is synced with the URL, so it can be shared via URL and is preserved on page reload.
 *
 * @param routeApi reads and writes the URL search params, it can be obtained via useRouteApi().
 */
export const MemoURLFilterTable = memo(
  ({
    routeApi,
    renderTopLeftToolbar = MemoURLToolbarLeft,
    ...tableProps
  }: URLFilterTableProps<MemoRead, MemoColumns>) => {
    const [filter] = useURLConnector(routeApi, FILTER_PARAM);
    const tableInfoOptions = memoQueries.tableInfo(tableProps.projectId);

    return (
      <MemoFilterTable
        {...tableProps}
        filter={filter}
        renderTopLeftToolbar={renderTopLeftToolbar}
        toolbarExtraProps={{
          routeApi,
          defaultFilterExpression,
          tableInfoOptions,
        }}
      />
    );
  },
);

/**
 * Local filter table for memos.
 * The filter state is owned by the caller and passed via props, so it can be stored anywhere.
 */
export const MemoLocalFilterTable = memo(
  ({
    filterName,
    filter,
    onFilterChange,
    expertMode,
    onExpertModeChange,
    renderTopLeftToolbar = MemoLocalToolbarLeft,
    ...tableProps
  }: LocalFilterTableProps<MemoRead, MemoColumns>) => {
    const tableInfoOptions = memoQueries.tableInfo(tableProps.projectId);

    return (
      <MemoFilterTable
        {...tableProps}
        filter={filter}
        renderTopLeftToolbar={renderTopLeftToolbar}
        toolbarExtraProps={{
          filterName,
          defaultFilterExpression,
          tableInfoOptions,
          filter,
          onFilterChange,
          expertMode,
          onExpertModeChange,
        }}
      />
    );
  },
);
