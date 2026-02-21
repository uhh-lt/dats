import { Box, Button, Stack, Typography } from "@mui/material";
import { useInfiniteQuery } from "@tanstack/react-query";
import {
  MRT_ColumnDef,
  MRT_RowVirtualizer,
  MRT_TableInstance,
  MaterialReactTable,
  useMaterialReactTable,
} from "material-react-table";
import { memo, useCallback, useEffect, useMemo, useRef, useState, type UIEvent } from "react";
import { ElasticSearchHit } from "../../../api/openapi/models/ElasticSearchHit.ts";
import { MemoColumns } from "../../../api/openapi/models/MemoColumns.ts";
import { PaginatedElasticSearchHits } from "../../../api/openapi/models/PaginatedElasticSearchHits.ts";
import { SortDirection } from "../../../api/openapi/models/SortDirection.ts";
import { SearchService } from "../../../api/openapi/services/SearchService.ts";
import { QueryKey } from "../../../api/QueryKey.ts";
import { MyFilter, createEmptyFilter } from "../../../components/FilterDialog/filterUtils.ts";
import { FilterTableProps } from "../../../components/FilterTable/types/FilterTableProps.ts";
import { useTableInfiniteScroll } from "../../../hooks/useTableInfiniteScroll.ts";
import { useAppSelector } from "../../../plugins/ReduxHooks.ts";
import { RootState } from "../../../store/store.ts";
import { MemoRenderer } from "../renderer/MemoRenderer.tsx";
import { MemoTableOptionsMenu } from "./components/MemoTableOptionsMenu.tsx";
import { MemoToolbarLeft } from "./components/MemoToolbarLeft.tsx";
import { MemoToolbarRight } from "./components/MemoToolbarRight.tsx";
import { MemoFilterActions } from "./memoFilterSlice.ts";
import { useInitMemoFilterSlice } from "./useInitMemoFilterSlice.ts";

const flatMapData = (page: PaginatedElasticSearchHits) => page.hits;

// this defines which filter slice is used
const filterStateSelector = (state: RootState) => state.memoFilter;
const filterActions = MemoFilterActions;

export const MemoTable = memo(
  ({
    projectId,
    filterName,
    rowSelectionModel,
    onRowSelectionChange,
    sortingModel,
    onSortingChange,
    columnVisibilityModel,
    onColumnVisibilityChange,
    fetchSize,
    onFetchSizeChange,
    positionToolbarAlertBanner = "head-overlay",
    renderTopRightToolbar = MemoToolbarRight,
    renderTopLeftToolbar = MemoToolbarLeft,
    renderBottomToolbar,
  }: FilterTableProps<ElasticSearchHit>) => {
    // local state
    const [searchQuery, setSearchQuery] = useState<string>("");
    const [isSearchContent, setIsSearchContent] = useState<boolean>(false);

    // filtering
    const filter =
      useAppSelector((state) => filterStateSelector(state).filter[filterName]) || createEmptyFilter(filterName);

    // virtualization
    const rowVirtualizerInstanceRef = useRef<MRT_RowVirtualizer>(null);

    // table columns
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

      // custom columns
      const attachedToCell = {
        id: "attached_to",
        header: "Attached To",
        enableSorting: false,
        accessorFn: () => null,
        Cell: ({ row }) => <MemoRenderer memo={row.original.id} showAttachedObject attachedObjectLink />,
      } as MRT_ColumnDef<ElasticSearchHit>;

      // unwanted columns are set to null, so we filter those out
      return [...result, attachedToCell];
    }, [tableInfo]);

    // table data
    const { data, fetchNextPage, isError, isFetching, isLoading } = useInfiniteQuery<PaginatedElasticSearchHits>({
      queryKey: [
        QueryKey.MEMO_TABLE,
        projectId,
        searchQuery, // refetch when searchQuery changes
        filter, // refetch when columnFilters changes
        sortingModel, // refetch when sorting changes
        isSearchContent,
        fetchSize,
      ],
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

    // infinite scrolling
    const tableContainerRef = useRef<HTMLDivElement>(null);
    const { flatData, totalResults, totalFetched, fetchMoreOnScroll } = useTableInfiniteScroll({
      tableContainerRef,
      data,
      isFetching,
      fetchNextPage,
      flatMapData,
    });

    // infinite scrolling reset:
    // scroll to top of table when sorting or filter change
    useEffect(() => {
      try {
        rowVirtualizerInstanceRef.current?.scrollToIndex?.(0);
      } catch (error) {
        console.error(error);
      }
    }, [projectId, sortingModel, filter]);

    const handleTableScroll = useCallback(
      (event: UIEvent<HTMLDivElement>) => fetchMoreOnScroll(event.target as HTMLDivElement),
      [fetchMoreOnScroll],
    );

    // fetch all
    const handleFetchAll = useCallback(() => {
      onFetchSizeChange(totalResults);
    }, [onFetchSizeChange, totalResults]);

    // rendering
    const renderTopLeftToolbarContent = useCallback(
      (props: { table: MRT_TableInstance<ElasticSearchHit> }) =>
        renderTopLeftToolbar({
          table: props.table,
          selectedData: flatData.filter((row) => rowSelectionModel[row.id]),
          anchor: tableContainerRef,
          filterStateSelector,
          filterActions,
          filterName,
        }),
      [renderTopLeftToolbar, filterName, flatData, rowSelectionModel],
    );

    const renderBottomToolbarContent = useCallback(
      (props: { table: MRT_TableInstance<ElasticSearchHit> }) => (
        <Stack direction={"row"} spacing={1} alignItems="center" width="100%">
          <Typography>
            Fetched {totalFetched} of {totalResults} total memos.
          </Typography>
          <Button size="small" onClick={handleFetchAll}>
            Fetch All
          </Button>
          <Box flexGrow={1} />
          {renderBottomToolbar &&
            renderBottomToolbar({
              table: props.table,
              selectedData: flatData.filter((row) => rowSelectionModel[row.id]),
              anchor: tableContainerRef,
              filterStateSelector,
              filterActions,
              filterName,
            })}
        </Stack>
      ),
      [totalFetched, totalResults, handleFetchAll, renderBottomToolbar, flatData, filterName, rowSelectionModel],
    );

    const renderTopRightToolbarContent = useCallback(
      (props: { table: MRT_TableInstance<ElasticSearchHit> }) => (
        <Stack direction="row" spacing={1} alignItems="center">
          <MemoTableOptionsMenu
            isSearchContent={isSearchContent}
            onChangeIsSearchContent={(newValue) => setIsSearchContent(newValue)}
          />
          {renderTopRightToolbar({
            table: props.table,
            selectedData: flatData.filter((row) => rowSelectionModel[row.id]),
            anchor: tableContainerRef,
            filterStateSelector,
            filterActions,
            filterName,
          })}
        </Stack>
      ),
      [filterName, flatData, isSearchContent, renderTopRightToolbar, rowSelectionModel],
    );

    // table
    const table = useMaterialReactTable<ElasticSearchHit>({
      data: flatData,
      columns: columns,
      getRowId: (row) => `${row.id}`,
      // state
      state: {
        globalFilter: searchQuery,
        rowSelection: rowSelectionModel,
        sorting: sortingModel,
        columnVisibility: columnVisibilityModel,
        isLoading: isLoading || columns.length === 0,
        showAlertBanner: isError,
        showProgressBars: isFetching,
        showGlobalFilter: true,
      },
      // search query
      autoResetAll: false,
      manualFiltering: true, // turn of client-side filtering
      enableGlobalFilter: true,
      onGlobalFilterChange: setSearchQuery,
      // selection
      enableRowSelection: true,
      onRowSelectionChange,
      // virtualization
      enableRowVirtualization: true,
      rowVirtualizerInstanceRef: rowVirtualizerInstanceRef,
      rowVirtualizerOptions: { overscan: 4 },
      // filtering
      enableColumnFilters: false,
      // pagination
      enablePagination: false,
      // sorting
      manualSorting: false,
      onSortingChange,
      // column visiblility
      onColumnVisibilityChange,
      // column resizing
      enableColumnResizing: true,
      columnResizeMode: "onEnd",
      // mui components
      muiTablePaperProps: {
        style: { height: "100%", display: "flex", flexDirection: "column" },
      },
      muiTableContainerProps: {
        ref: tableContainerRef,
        onScroll: handleTableScroll,
        style: { flexGrow: 1 },
      },
      muiToolbarAlertBannerProps: isError
        ? {
            color: "error",
            children: "Error loading data",
          }
        : undefined,
      // toolbar
      positionToolbarAlertBanner,
      renderTopToolbarCustomActions: renderTopLeftToolbarContent,
      renderToolbarInternalActions: renderTopRightToolbarContent,
      renderBottomToolbarCustomActions: renderBottomToolbarContent,
    });

    return <MaterialReactTable table={table} />;
  },
);
