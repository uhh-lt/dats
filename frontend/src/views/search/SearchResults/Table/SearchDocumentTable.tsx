import { Box, Stack, Typography } from "@mui/material";
import { useInfiniteQuery } from "@tanstack/react-query";
import parse from "html-react-parser";
import {
  MRT_ColumnDef,
  MRT_ColumnSizingState,
  MRT_DensityState,
  MRT_RowSelectionState,
  MRT_RowVirtualizer,
  MRT_ShowHideColumnsButton,
  MRT_SortingState,
  MRT_ToggleDensePaddingButton,
  MRT_ToggleGlobalFilterButton,
  MRT_VisibilityState,
  MaterialReactTable,
  useMaterialReactTable,
} from "material-react-table";
import { useCallback, useEffect, useMemo, useRef, type UIEvent } from "react";
import { useNavigate } from "react-router-dom";
import { ElasticSearchDocumentHit } from "../../../../api/openapi/models/ElasticSearchDocumentHit.ts";
import { PaginatedElasticSearchDocumentHits } from "../../../../api/openapi/models/PaginatedElasticSearchDocumentHits.ts";
import { SearchColumns } from "../../../../api/openapi/models/SearchColumns.ts";
import { SortDirection } from "../../../../api/openapi/models/SortDirection.ts";
import { SearchService } from "../../../../api/openapi/services/SearchService.ts";
import { useAuth } from "../../../../auth/useAuth.ts";
import SdocAnnotatorsRenderer from "../../../../components/DataGrid/SdocAnnotatorsRenderer.tsx";
import SdocMetadataRenderer from "../../../../components/DataGrid/SdocMetadataRenderer.tsx";
import SdocRenderer from "../../../../components/DataGrid/SdocRenderer.tsx";
import SdocTagsRenderer from "../../../../components/DataGrid/SdocTagRenderer.tsx";
import DocumentTableFilterDialog from "../../../../components/DocumentTable/DocumentTableFilterDialog.tsx";
import { MyFilter } from "../../../../features/FilterDialog/filterUtils.ts";
import { useAppDispatch, useAppSelector } from "../../../../plugins/ReduxHooks.ts";
import { RootState } from "../../../../store/store.ts";
import { QueryType } from "../../QueryType.ts";
import DeleteButton from "../../ToolBar/ToolBarElements/DeleteButton.tsx";
import DownloadSdocsButton from "../../ToolBar/ToolBarElements/DownloadSdocsButton.tsx";
import TagMenuButton from "../../ToolBar/ToolBarElements/TagMenu/TagMenuButton.tsx";
import { SearchFilterActions } from "../../searchFilterSlice.ts";
import { SearchActions } from "../../searchSlice.ts";
import { useInitSearchFilterSlice } from "../../useInitSearchFilterSlice.ts";
import SearchOptionsMenu from "./SearchOptionsMenu.tsx";

const fetchSize = 20;
const filterStateSelector = (state: RootState) => state.searchFilter;
const filterName = "root";

interface DocumentTableProps {
  projectId: number;
}

function SearchDocumentTable({ projectId }: DocumentTableProps) {
  const navigate = useNavigate();

  // global client state (react router)
  const { user } = useAuth();

  // global client state (redux)
  const searchQuery = useAppSelector((state) => state.search.searchQuery);
  const searchType = useAppSelector((state) => state.search.searchType);
  const rowSelectionModel = useAppSelector((state) => state.search.selectionModel);
  const selectedDocumentId = useAppSelector((state) => state.search.selectedDocumentId);
  const selectedDocumentIds = useAppSelector((state) => state.search.selectedDocumentIds);
  const sortingModel = useAppSelector((state) => state.search.sortingModel);
  const columnVisibilityModel = useAppSelector((state) => state.search.columnVisibilityModel);
  const columnSizingModel = useAppSelector((state) => state.search.columnSizingModel);
  const gridDensity = useAppSelector((state) => state.search.gridDensity);
  const filter = useAppSelector((state) => state.searchFilter.filter["root"]);
  const dispatch = useAppDispatch();

  // virtualization
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const tableBodyRef = useRef<HTMLTableSectionElement>(null);
  const rowVirtualizerInstanceRef = useRef<MRT_RowVirtualizer>(null);

  // table columns
  const tableInfo = useInitSearchFilterSlice({ projectId });
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
        case SearchColumns.SC_SOURCE_DOCUMENT_TYPE:
          return {
            ...colDef,
            size: 100,
            Cell: ({ row }) => <SdocRenderer sdoc={row.original.sdoc_id} renderDoctypeIcon />,
          } as MRT_ColumnDef<ElasticSearchDocumentHit>;
        case SearchColumns.SC_SOURCE_DOCUMENT_FILENAME:
          return {
            ...colDef,
            size: 360,
            Cell: ({ row }) => <SdocRenderer sdoc={row.original.sdoc_id} renderFilename />,
          } as MRT_ColumnDef<ElasticSearchDocumentHit>;
        case SearchColumns.SC_DOCUMENT_TAG_ID_LIST:
          return {
            ...colDef,
            Cell: ({ row }) => <SdocTagsRenderer sdocId={row.original.sdoc_id} />,
          } as MRT_ColumnDef<ElasticSearchDocumentHit>;
        case SearchColumns.SC_USER_ID_LIST:
          return {
            ...colDef,
            Cell: ({ row }) => <SdocAnnotatorsRenderer sdocId={row.original.sdoc_id} />,
          } as MRT_ColumnDef<ElasticSearchDocumentHit>;
        case SearchColumns.SC_CODE_ID_LIST:
          return null;
        case SearchColumns.SC_SPAN_ANNOTATIONS:
          return null;
        default:
          // render metadata
          if (!isNaN(parseInt(column.column))) {
            return {
              ...colDef,
              Cell: ({ row }) => (
                <SdocMetadataRenderer sdocId={row.original.sdoc_id} projectMetadataId={parseInt(column.column)} />
              ),
            } as MRT_ColumnDef<ElasticSearchDocumentHit>;
          } else {
            return {
              ...colDef,
              Cell: () => <i>Cannot render column {column.column}</i>,
            } as MRT_ColumnDef<ElasticSearchDocumentHit>;
          }
      }
    });

    // unwanted columns are set to null, so we filter those out
    return result.filter((column) => column !== null) as MRT_ColumnDef<ElasticSearchDocumentHit>[];
  }, [tableInfo, user]);

  // table data
  const { data, fetchNextPage, isError, isFetching, isLoading } = useInfiniteQuery<PaginatedElasticSearchDocumentHits>({
    queryKey: [
      "search-document-table-data",
      projectId,
      searchQuery, // refetch when searchQuery changes
      filter, // refetch when columnFilters changes
      sortingModel, // refetch when sorting changes
    ],
    queryFn: ({ pageParam }) =>
      SearchService.searchSdocs({
        searchQuery: searchQuery || "",
        projectId: projectId!,
        highlight: true,
        expertMode: false,
        requestBody: {
          filter: filter as MyFilter<SearchColumns>,
          sorts: sortingModel.map((sort) => ({
            column: sort.id as SearchColumns,
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
  const { hits, dataMap } = useMemo(() => {
    const hits = data?.pages.flatMap((page) => page.hits) ?? [];
    const dataMap = hits.reduce(
      (prev, current) => {
        prev[current.sdoc_id] = current;
        return prev;
      },
      {} as Record<number, ElasticSearchDocumentHit>,
    );
    return { hits, dataMap };
  }, [data]);
  const totalDBRowCount = data?.pages?.[0]?.total_results ?? 0;
  const totalFetched = Object.keys(dataMap).length;

  // infinite scrolling
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
  // scroll to top of table when userId, sorting or filters change
  useEffect(() => {
    try {
      rowVirtualizerInstanceRef.current?.scrollToIndex?.(0);
    } catch (error) {
      console.error(error);
    }
  }, [projectId, sortingModel]);
  // a check on mount to see if the table is already scrolled to the bottom and immediately needs to fetch more data
  useEffect(() => {
    fetchMoreOnBottomReached(tableContainerRef.current);
  }, [fetchMoreOnBottomReached]);

  // actions
  const handleRowContextMenu = (event: React.MouseEvent<HTMLTableRowElement>, sdocId: number) => {
    event.preventDefault();
    console.log("HI!", sdocId);
  };

  // table
  const table = useMaterialReactTable<ElasticSearchDocumentHit>({
    data: hits,
    columns: columns,
    getRowId: (row) => `${row.sdoc_id}`,
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
    },
    // search query
    autoResetAll: false,
    manualFiltering: true, // turn of client-side filtering
    // enableGlobalFilter: true,
    onGlobalFilterChange: (rowSelectionUpdater) => {
      let newSearchQuery: string | undefined;
      if (typeof rowSelectionUpdater === "function") {
        newSearchQuery = rowSelectionUpdater(rowSelectionModel);
      } else {
        newSearchQuery = rowSelectionUpdater;
      }
      dispatch(SearchActions.onChangeSearchQuery(newSearchQuery || ""));
    },
    // selection
    enableRowSelection: true,
    onRowSelectionChange: (rowSelectionUpdater) => {
      let newRowSelectionModel: MRT_RowSelectionState;
      if (typeof rowSelectionUpdater === "function") {
        newRowSelectionModel = rowSelectionUpdater(rowSelectionModel);
      } else {
        newRowSelectionModel = rowSelectionUpdater;
      }
      dispatch(SearchActions.onUpdateSelectionModel(newRowSelectionModel));
    },
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
    onSortingChange: (sortingUpdater) => {
      let newSortingModel: MRT_SortingState;
      if (typeof sortingUpdater === "function") {
        newSortingModel = sortingUpdater(sortingModel);
      } else {
        newSortingModel = sortingUpdater;
      }
      dispatch(SearchActions.onSortModelChange(newSortingModel));
    },
    // density
    onDensityChange: (densityUpdater) => {
      let newGridDensity: MRT_DensityState;
      if (typeof densityUpdater === "function") {
        newGridDensity = densityUpdater(gridDensity);
      } else {
        newGridDensity = densityUpdater;
      }
      dispatch(SearchActions.setTableDensity(newGridDensity));
    },
    // column visiblility
    onColumnVisibilityChange: (visibilityUpdater) => {
      let newVisibilityModel: MRT_VisibilityState;
      if (typeof visibilityUpdater === "function") {
        newVisibilityModel = visibilityUpdater(columnVisibilityModel);
      } else {
        newVisibilityModel = visibilityUpdater;
      }
      dispatch(SearchActions.onColumnVisibilityChange(newVisibilityModel));
    },
    // column resizing
    enableColumnResizing: true,
    columnResizeMode: "onEnd",
    onColumnSizingChange: (sizingUpdater) => {
      let newColumnSizingModel: MRT_ColumnSizingState;
      if (typeof sizingUpdater === "function") {
        newColumnSizingModel = sizingUpdater(columnSizingModel);
      } else {
        newColumnSizingModel = sizingUpdater;
      }
      dispatch(SearchActions.onColumnSizingChange(newColumnSizingModel));
    },
    // detail (highlights)
    renderDetailPanel:
      searchType === QueryType.LEXICAL && searchQuery.trim().length > 0
        ? ({ row }) =>
            row.original.highlights ? (
              <Box className="search-result-highlight">
                {row.original.highlights.map((highlight, index) => (
                  <Typography key={`sdoc-${row.original.sdoc_id}-highlight-${index}`} m={0.5}>
                    {parse(highlight)}
                  </Typography>
                ))}
              </Box>
            ) : null
        : undefined,
    // mui components
    muiTableBodyRowProps: ({ row }) => ({
      onClick: (event) => {
        if (event.detail >= 2) {
          navigate(`/project/${projectId}/annotation/${row.original.sdoc_id}`);
        } else {
          dispatch(SearchActions.onToggleSelectedDocumentIdChange(row.original.sdoc_id));
        }
      },
      onContextMenu: (event) => handleRowContextMenu(event, row.original.sdoc_id),
      sx: {
        backgroundColor: selectedDocumentId === row.original.sdoc_id ? "lightgrey !important" : undefined,
      },
    }),
    muiTablePaperProps: {
      elevation: 8,
      style: { height: "100%", display: "flex", flexDirection: "column" },
    },
    muiTableContainerProps: {
      ref: tableContainerRef, //get access to the table container element
      onScroll: (event: UIEvent<HTMLDivElement>) => fetchMoreOnBottomReached(event.target as HTMLDivElement), //add an event listener to the table container element
      style: { flexGrow: 1 },
    },
    muiTableBodyProps: {
      ref: tableBodyRef,
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
      <Stack direction={"row"} spacing={1} alignItems="center" height={48}>
        <DocumentTableFilterDialog
          anchorEl={tableBodyRef.current}
          buttonProps={{ size: "small" }}
          filterName={filterName}
          filterStateSelector={filterStateSelector}
          filterActions={SearchFilterActions}
        />
        {selectedDocumentIds.length > 0 && (
          <>
            <TagMenuButton popoverOrigin={{ horizontal: "center", vertical: "bottom" }} />
            <DeleteButton sdocIds={selectedDocumentIds} navigateTo="../search" />
            <DownloadSdocsButton sdocIds={selectedDocumentIds} />
          </>
        )}
      </Stack>
    ),
    renderToolbarInternalActions: ({ table }) => (
      <Stack direction={"row"} spacing={1} alignItems="center" height={48}>
        <MRT_ToggleGlobalFilterButton table={table} disabled={false} />
        <SearchOptionsMenu />
        <MRT_ShowHideColumnsButton table={table} />
        <MRT_ToggleDensePaddingButton table={table} />
      </Stack>
    ),
    renderBottomToolbarCustomActions: () => (
      <Stack direction={"row"} spacing={1} alignItems="center">
        <Typography>
          Fetched {totalFetched} of {totalDBRowCount} total rows.
        </Typography>
      </Stack>
    ),
  });

  return <MaterialReactTable table={table} />;
}

export default SearchDocumentTable;
