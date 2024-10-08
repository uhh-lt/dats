import { Stack, Typography } from "@mui/material";
import { useInfiniteQuery } from "@tanstack/react-query";
import {
  MRT_ColumnDef,
  MRT_RowVirtualizer,
  MRT_ShowHideColumnsButton,
  MRT_ToggleDensePaddingButton,
  MaterialReactTable,
  useMaterialReactTable,
} from "material-react-table";
import { useCallback, useEffect, useMemo, useRef, type UIEvent } from "react";
import { ElasticSearchDocumentHit } from "../../../api/openapi/models/ElasticSearchDocumentHit.ts";
import { MemoColumns } from "../../../api/openapi/models/MemoColumns.ts";
import { PaginatedElasticSearchDocumentHits } from "../../../api/openapi/models/PaginatedElasticSearchDocumentHits.ts";
import { SortDirection } from "../../../api/openapi/models/SortDirection.ts";
import { MemoService } from "../../../api/openapi/services/MemoService.ts";
import { useAuth } from "../../../auth/useAuth.ts";
import ReduxFilterDialog from "../../../components/FilterDialog/ReduxFilterDialog.tsx";
import { MyFilter, createEmptyFilter } from "../../../components/FilterDialog/filterUtils.ts";
import MemoDeleteButton from "../../../components/Memo/MemoDeleteButton.tsx";
import MemoRenderer from "../../../components/Memo/MemoRenderer.tsx";
import MemoStarButton from "../../../components/Memo/MemoStarButton.tsx";
import { useAppSelector } from "../../../plugins/ReduxHooks.ts";
import { RootState } from "../../../store/store.ts";
import { useReduxConnector } from "../../../utils/useReduxConnector.ts";
import { LogbookActions } from "../logbookSlice.ts";
import SearchMemoOptionsMenu from "./SearchMemoOptionsMenu.tsx";
import { useInitMemoFilterSlice } from "./useInitMemoFilterSlice.ts";

const filterStateSelector = (state: RootState) => state.logbook;
const filterName = "root";
const fetchSize = 20;

interface SearchMemoTableProps {
  projectId: number;
}

function SearchMemoTable({ projectId }: SearchMemoTableProps) {
  // global client state (react router)
  const { user } = useAuth();

  // global client state (redux) connected to table state
  const [searchQuery, setSearchQuery] = useReduxConnector(
    (state) => state.logbook.searchQuery,
    LogbookActions.onSearchQueryChange,
  );
  const [rowSelectionModel, setRowSelectionModel] = useReduxConnector(
    (state) => state.logbook.rowSelectionModel,
    LogbookActions.onRowSelectionChange,
  );
  const [sortingModel, setSortingModel] = useReduxConnector(
    (state) => state.logbook.sortingModel,
    LogbookActions.onSortChange,
  );
  const [columnVisibilityModel, setColumnVisibilityModel] = useReduxConnector(
    (state) => state.logbook.columnVisibilityModel,
    LogbookActions.onColumnVisibilityChange,
  );
  const [columnSizingModel, setColumnSizingModel] = useReduxConnector(
    (state) => state.logbook.columnSizingModel,
    LogbookActions.onColumnSizingChange,
  );
  const [gridDensity, setGridDensityModel] = useReduxConnector(
    (state) => state.logbook.gridDensityModel,
    LogbookActions.onGridDensityChange,
  );
  const selectedMemoIds = Object.keys(rowSelectionModel).map((id) => parseInt(id));

  // virtualization
  const rowVirtualizerInstanceRef = useRef<MRT_RowVirtualizer>(null);

  // table columns
  const tableInfo = useInitMemoFilterSlice({ projectId });
  const columns = useMemo(() => {
    if (!tableInfo || !user) return [];

    const result = tableInfo.map((column) => {
      const colDef: MRT_ColumnDef<ElasticSearchDocumentHit> = {
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
            Cell: ({ row }) => <MemoRenderer memo={row.original.document_id} showTitle />,
          } as MRT_ColumnDef<ElasticSearchDocumentHit>;
        case MemoColumns.M_CONTENT:
          return {
            ...colDef,
            size: 360,
            Cell: ({ row }) => <MemoRenderer memo={row.original.document_id} showContent />,
          } as MRT_ColumnDef<ElasticSearchDocumentHit>;
        case MemoColumns.M_STARRED:
          return {
            ...colDef,
            Cell: ({ row }) => <MemoRenderer memo={row.original.document_id} showStar />,
          } as MRT_ColumnDef<ElasticSearchDocumentHit>;
        case MemoColumns.M_USER_ID:
          return {
            ...colDef,
            Cell: ({ row }) => <MemoRenderer memo={row.original.document_id} showUser />,
          } as MRT_ColumnDef<ElasticSearchDocumentHit>;
        default:
          return {
            ...colDef,
            Cell: () => <i>Cannot render column {column.column}</i>,
          } as MRT_ColumnDef<ElasticSearchDocumentHit>;
      }
    });

    // custom columns
    const attachedToCell = {
      id: "attached_to",
      header: "Attached To",
      enableSorting: false,
      accessorFn: () => null,
      Cell: ({ row }) => <MemoRenderer memo={row.original.document_id} showAttachedObject attachedObjectLink />,
    } as MRT_ColumnDef<ElasticSearchDocumentHit>;

    // unwanted columns are set to null, so we filter those out
    return [...result, attachedToCell];
  }, [tableInfo, user]);

  // table data
  const filter = useAppSelector((state) => state.logbook.filter[filterName]) || createEmptyFilter(filterName);
  const isSearchContent = useAppSelector((state) => state.logbook.isSearchContent);
  const { data, fetchNextPage, isError, isFetching, isLoading } = useInfiniteQuery<PaginatedElasticSearchDocumentHits>({
    queryKey: [
      "search-memo-table-data",
      projectId,
      searchQuery, // refetch when searchQuery changes
      filter, // refetch when columnFilters changes
      sortingModel, // refetch when sorting changes
      isSearchContent,
    ],
    queryFn: ({ pageParam }) =>
      MemoService.searchMemos({
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
    getNextPageParam: (_lastGroup, groups) => {
      return groups.length;
    },
    refetchOnWindowFocus: false,
  });
  // create a flat array of data mapped from id to row
  const flatData = useMemo(() => data?.pages.flatMap((page) => page.hits) ?? [], [data]);
  const totalDBRowCount = data?.pages?.[0]?.total_results ?? 0;
  const totalFetched = flatData.length;

  // infinite scrolling
  const tableContainerRef = useRef<HTMLDivElement>(null);
  // called on scroll and possibly on mount to fetch more data as the user scrolls and reaches bottom of table
  const fetchMoreOnBottomReached = useCallback(
    (containerRefElement?: HTMLDivElement | null) => {
      if (containerRefElement) {
        const { scrollHeight, scrollTop, clientHeight } = containerRefElement;
        // once the user has scrolled within 400px of the bottom of the table, fetch more data if we can
        if (scrollHeight - scrollTop - clientHeight < 400 && !isFetching && totalFetched < totalDBRowCount) {
          fetchNextPage();
        }
      }
    },
    [fetchNextPage, isFetching, totalFetched, totalDBRowCount],
  );
  // scroll to top of table when sorting or filters change
  useEffect(() => {
    try {
      rowVirtualizerInstanceRef.current?.scrollToIndex?.(0);
    } catch (error) {
      console.error(error);
    }
  }, [projectId, sortingModel, filter]);
  // a check on mount to see if the table is already scrolled to the bottom and immediately needs to fetch more data
  useEffect(() => {
    fetchMoreOnBottomReached(tableContainerRef.current);
  }, [fetchMoreOnBottomReached]);

  // table
  const table = useMaterialReactTable<ElasticSearchDocumentHit>({
    data: flatData,
    columns: columns,
    getRowId: (row) => `${row.document_id}`,
    // state
    state: {
      globalFilter: searchQuery,
      rowSelection: rowSelectionModel,
      sorting: sortingModel,
      columnVisibility: columnVisibilityModel,
      columnSizing: columnSizingModel,
      density: gridDensity,
      isLoading: isLoading || columns.length === 0,
      showAlertBanner: isError,
      showProgressBars: isFetching,
      showGlobalFilter: true,
    },
    // search query
    autoResetAll: false,
    manualFiltering: true, // turn of client-side filtering
    // enableGlobalFilter: true,
    onGlobalFilterChange: setSearchQuery,
    // selection
    enableRowSelection: true,
    onRowSelectionChange: setRowSelectionModel,
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
    onSortingChange: setSortingModel,
    // density
    onDensityChange: setGridDensityModel,
    // column visiblility
    onColumnVisibilityChange: setColumnVisibilityModel,
    // column resizing
    enableColumnResizing: true,
    columnResizeMode: "onEnd",
    onColumnSizingChange: setColumnSizingModel,

    // mui components
    muiTablePaperProps: {
      style: { height: "100%", display: "flex", flexDirection: "column" },
    },
    muiTableContainerProps: {
      ref: tableContainerRef, //get access to the table container element
      onScroll: (event: UIEvent<HTMLDivElement>) => fetchMoreOnBottomReached(event.target as HTMLDivElement), //add an event listener to the table container element
      style: { flexGrow: 1 },
    },
    muiToolbarAlertBannerProps: isError
      ? {
          color: "error",
          children: "Error loading data",
        }
      : undefined,
    // toolbar
    positionToolbarAlertBanner: "head-overlay",
    renderTopToolbarCustomActions: () => (
      <Stack direction={"row"} spacing={1} alignItems="center">
        <ReduxFilterDialog
          anchorEl={tableContainerRef.current}
          buttonProps={{ size: "small" }}
          filterName={filterName}
          filterStateSelector={filterStateSelector}
          filterActions={LogbookActions}
        />
        {selectedMemoIds.length > 0 && (
          <>
            <MemoDeleteButton memoIds={selectedMemoIds} />
            <MemoStarButton memoIds={selectedMemoIds} isStarred={true} />
            <MemoStarButton memoIds={selectedMemoIds} isStarred={false} />
          </>
        )}
      </Stack>
    ),
    renderToolbarInternalActions: () => (
      <Stack direction={"row"} spacing={1} alignItems="center">
        <SearchMemoOptionsMenu />
        <MRT_ShowHideColumnsButton table={table} />
        <MRT_ToggleDensePaddingButton table={table} />
      </Stack>
    ),
    renderBottomToolbarCustomActions: () => (
      <Stack direction={"row"} spacing={1} alignItems="center">
        <Typography>
          Fetched {totalFetched} of {totalDBRowCount} total memos.
        </Typography>
      </Stack>
    ),
  });

  return <MaterialReactTable table={table} />;
}

export default SearchMemoTable;
