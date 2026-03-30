import { QueryKey } from "@api/hooks/QueryKey";
import { ElasticSearchHit } from "@api/models/ElasticSearchHit";
import { MemoColumns } from "@api/models/MemoColumns";
import { PaginatedElasticSearchHits } from "@api/models/PaginatedElasticSearchHits";
import { SortDirection } from "@api/models/SortDirection";
import { SearchService } from "@api/services/SearchService";
import {
  FILTER_PARAM,
  FilterTable,
  FilterTableContainerProps,
  FilterTableToolbarProps,
  MyFilter,
  ReduxFilterDialogProps,
  ReduxFilterTableToolbarProps,
  URLFilterDialogProps,
  URLFilterTableToolbarProps,
  createEmptyFilter,
} from "@core/filter";
import { useResetStateOnSearch } from "@hooks/useResetStateOnSearch";
import { useURLConnector } from "@hooks/useURLConnector";
import { Stack } from "@mui/material";
import { RootState } from "@store/store";
import { useAppSelector } from "@store/storeHooks";
import { useInfiniteQuery } from "@tanstack/react-query";
import { MRT_ColumnDef } from "material-react-table";
import { memo, useCallback, useMemo, useState } from "react";
import { MemoRenderer } from "../renderer";
import { MemoReduxToolbarLeft } from "./_components/MemoReduxToolbarLeft";
import { MemoTableOptionsMenu } from "./_components/MemoTableOptionsMenu";
import { MemoToolbarRight } from "./_components/MemoToolbarRight";
import { MemoURLToolbarLeft } from "./_components/MemoURLToolbarLeft";
import { useInitMemoFilterSlice } from "./_hooks/useInitMemoFilterSlice";
import { MemoFilterActions, defaultMemoFilterExpression } from "./memoFilterSlice";

const flatMapData = (page: PaginatedElasticSearchHits) => page.hits;

/**
 * Component for rendering a filter table for memos.
 * The filter state can be managed either via Redux or via URL search params, which is determined by the parent component.
 * It defines the columns and how to fetch the data, while the actual filter state management is delegated to the parent component.
 *
 * @param filter the filter state, which is either obtained from Redux or from URL search params, depending on the parent component
 * @param renderTopLeftToolbar the function to render the top left toolbar, which is either the ReduxFilterTableToolbarLeft or the URLFilterTableToolbarLeft, depending on the parent component
 * @param toolbarExtraProps the extra props to pass to the toolbar, which contains the necessary information for managing the filter state (either Redux or URL)
 */
const MemoFilterTable = <TToolbarProps extends FilterTableToolbarProps<ElasticSearchHit>>({
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
  positionToolbarAlertBanner = "head-overlay",
  renderTopRightToolbar,
  renderTopLeftToolbar,
  renderBottomToolbar,
  toolbarExtraProps,
}: FilterTableContainerProps<ElasticSearchHit, TToolbarProps, MyFilter<MemoColumns>>) => {
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isSearchContent, setIsSearchContent] = useState<boolean>(false);

  const tableInfo = useInitMemoFilterSlice({ projectId });
  const columns = useMemo(() => {
    if (!tableInfo) return [];

    const result = tableInfo.map((column) => {
      const colDef: MRT_ColumnDef<ElasticSearchHit> = {
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
            Cell: ({ row }) => <MemoRenderer memo={row.original.id} showTitle />,
          } as MRT_ColumnDef<ElasticSearchHit>;
        case MemoColumns.M_CONTENT:
          return {
            ...colDef,
            size: 360,
            Cell: ({ row }) => <MemoRenderer memo={row.original.id} showContent />,
          } as MRT_ColumnDef<ElasticSearchHit>;
        case MemoColumns.M_STARRED:
          return {
            ...colDef,
            Cell: ({ row }) => <MemoRenderer memo={row.original.id} showStar />,
          } as MRT_ColumnDef<ElasticSearchHit>;
        case MemoColumns.M_USER_ID:
          return {
            ...colDef,
            Cell: ({ row }) => <MemoRenderer memo={row.original.id} showUser />,
          } as MRT_ColumnDef<ElasticSearchHit>;
        default:
          return {
            ...colDef,
            Cell: () => <i>Cannot render column {column.column}</i>,
          } as MRT_ColumnDef<ElasticSearchHit>;
      }
    });

    const attachedToCell = {
      id: "attached_to",
      header: "Attached To",
      enableSorting: false,
      accessorFn: () => null,
      Cell: ({ row }) => <MemoRenderer memo={row.original.id} showAttachedObject attachedObjectLink />,
    } as MRT_ColumnDef<ElasticSearchHit>;

    return [...result, attachedToCell];
  }, [tableInfo]);

  const { data, fetchNextPage, isError, isFetching, isLoading } = useInfiniteQuery<PaginatedElasticSearchHits>({
    queryKey: [QueryKey.MEMO_TABLE, projectId, searchQuery, filter, sortingModel, isSearchContent, fetchSize],
    queryFn: ({ pageParam }) =>
      SearchService.searchMemos({
        searchQuery: searchQuery || "",
        searchContent: isSearchContent,
        projectId: projectId!,
        requestBody: {
          filter: filter as MyFilter<MemoColumns>,
          sorts: sortingModel.map((sort) => ({
            column: sort.id as MemoColumns,
            direction: sort.desc ? SortDirection.DESC : SortDirection.ASC,
          })),
        },
        pageNumber: pageParam as number,
        pageSize: fetchSize,
      }),
    initialPageParam: 0,
    getNextPageParam: (_lastGroup, groups) => groups.length,
    refetchOnWindowFocus: false,
  });

  // resetting search-parameter-dependant state
  const resetState = useCallback(() => {
    onRowSelectionChange?.({});
    onFetchSizeChange?.(20);
    onSearchParameterChange?.();
  }, [onRowSelectionChange, onFetchSizeChange, onSearchParameterChange]);
  useResetStateOnSearch([searchQuery, filter, sortingModel, isSearchContent], resetState);

  const renderMemoTopRightToolbar = (props: TToolbarProps) => (
    <Stack direction="row" spacing={1} alignItems="center">
      <MemoTableOptionsMenu
        isSearchContent={isSearchContent}
        onChangeIsSearchContent={(newValue) => setIsSearchContent(newValue)}
      />
      {renderTopRightToolbar ? renderTopRightToolbar(props) : <MemoToolbarRight {...props} />}
    </Stack>
  );

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
      rowSelectionModel={rowSelectionModel}
      onRowSelectionChange={onRowSelectionChange}
      sortingModel={sortingModel}
      onSortingChange={onSortingChange}
      columnVisibilityModel={columnVisibilityModel}
      onColumnVisibilityChange={onColumnVisibilityChange}
      onFetchSizeChange={onFetchSizeChange}
      positionToolbarAlertBanner={positionToolbarAlertBanner}
      renderTopRightToolbar={renderMemoTopRightToolbar}
      renderTopLeftToolbar={renderTopLeftToolbar}
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
 * @param filterName used to identify the filter state in the redux store, so that multiple tables can be used without conflicts.
 */
export const MemoReduxFilterTable = memo(
  ({
    filterName,
    ...tableProps
  }: Omit<
    FilterTableContainerProps<ElasticSearchHit, ReduxFilterTableToolbarProps<ElasticSearchHit>, MyFilter<MemoColumns>>,
    "filter" | "renderTopLeftToolbar" | "toolbarExtraProps"
  > &
    Omit<ReduxFilterDialogProps, "filterActions" | "filterStateSelector">) => {
    const filter =
      useAppSelector((state) => filterStateSelector(state).filter[filterName]) || createEmptyFilter(filterName);

    return (
      <MemoFilterTable
        {...tableProps}
        filter={filter as MyFilter<MemoColumns>}
        renderTopLeftToolbar={MemoReduxToolbarLeft}
        toolbarExtraProps={{
          filterName,
          filterStateSelector,
          filterActions,
        }}
      />
    );
  },
);

// configs for URL filter table
const column2InfoSelector = (state: RootState) => state.memoFilter.column2Info;
const defaultFilterExpression = defaultMemoFilterExpression;

/**
 * URL-based filter table for memos.
 * The filter state is synced with the URL, so it can be shared via URL and is preserved on page reload.
 *
 * @param routeApi used to read and write the URL search params, it can be obtained via useRouteApi().
 */
export const MemoURLFilterTable = memo(
  ({
    routeApi,
    ...tableProps
  }: Omit<
    FilterTableContainerProps<ElasticSearchHit, URLFilterTableToolbarProps<ElasticSearchHit>, MyFilter<MemoColumns>>,
    "filter" | "renderTopLeftToolbar" | "toolbarExtraProps"
  > &
    Omit<URLFilterDialogProps, "column2InfoSelector" | "defaultFilterExpression" | "filterName">) => {
    const [filter] = useURLConnector(routeApi, FILTER_PARAM);

    return (
      <MemoFilterTable
        {...tableProps}
        filter={filter}
        renderTopLeftToolbar={MemoURLToolbarLeft}
        toolbarExtraProps={{
          routeApi,
          defaultFilterExpression,
          column2InfoSelector,
        }}
      />
    );
  },
);
