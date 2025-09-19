import { Box, Typography } from "@mui/material";
import { useInfiniteQuery } from "@tanstack/react-query";
import parse from "html-react-parser";
import { MRT_ColumnDef, MRT_RowVirtualizer, MaterialReactTable, useMaterialReactTable } from "material-react-table";
import { memo, useCallback, useEffect, useMemo, useRef, useState, type UIEvent } from "react";
import { QueryKey } from "../../../api/QueryKey.ts";
import { ElasticSearchHit } from "../../../api/openapi/models/ElasticSearchHit.ts";
import { PaginatedElasticSearchHits } from "../../../api/openapi/models/PaginatedElasticSearchHits.ts";
import { SdocColumns } from "../../../api/openapi/models/SdocColumns.ts";
import { SortDirection } from "../../../api/openapi/models/SortDirection.ts";
import { SearchService } from "../../../api/openapi/services/SearchService.ts";
import { useAppSelector } from "../../../plugins/ReduxHooks.ts";
import { RootState } from "../../../store/store.ts";
import { useTableInfiniteScroll } from "../../../utils/useTableInfiniteScroll.ts";
import { MyFilter, createEmptyFilter } from "../../FilterDialog/filterUtils.ts";
import FilterTableToolbarLeft from "../../FilterTable/FilterTableToolbarLeft.tsx";
import FilterTableToolbarRight from "../../FilterTable/FilterTableToolbarRight.tsx";
import { useRenderToolbars } from "../../FilterTable/hooks/useRenderToolbars.tsx";
import { FilterTableProps } from "../../FilterTable/types/FilterTableProps.ts";
import SdocMetadataRenderer from "../../Metadata/SdocMetadataRenderer.tsx";
import SdocAnnotatorsRenderer from "../SdocAnnotatorsRenderer.tsx";
import SdocRenderer from "../SdocRenderer.tsx";
import SdocTagsRenderer from "../SdocTagRenderer.tsx";
import { DocumentTableFilterActions } from "./documentTableFilterSlice.ts";
import { useInitDocumentTableFilterSlice } from "./useInitDocumentTableFilterSlice.ts";

const flatMapData = (page: PaginatedElasticSearchHits) => page.hits;

// this defines which filter slice is used
const filterStateSelector = (state: RootState) => state.documentTableFilter;
const filterActions = DocumentTableFilterActions;

function SdocTable({
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
  positionToolbarAlertBanner = "top",
  renderTopRightToolbar = FilterTableToolbarRight,
  renderTopLeftToolbar = FilterTableToolbarLeft,
  renderBottomToolbar,
}: FilterTableProps<ElasticSearchHit>) {
  // local st ate
  const [searchQuery, setSearchQuery] = useState<string | undefined>("");

  // filtering
  const filter =
    useAppSelector((state) => filterStateSelector(state).filter[filterName]) || createEmptyFilter(filterName);

  // virtualization
  const rowVirtualizerInstanceRef = useRef<MRT_RowVirtualizer>(null);

  // table columns
  const tableInfo = useInitDocumentTableFilterSlice({ projectId });
  const columns = useMemo(() => {
    if (!tableInfo) return [];

    const result = tableInfo.map((column) => {
      const colDef: MRT_ColumnDef<ElasticSearchHit> = {
        id: column.column,
        header: column.label,
        enableSorting: column.sortable,
      };
      switch (column.column) {
        case SdocColumns.SD_SOURCE_DOCUMENT_TYPE:
          return {
            ...colDef,
            Cell: ({ row }) => <SdocRenderer sdoc={row.original.id} renderDoctypeIcon />,
          } as MRT_ColumnDef<ElasticSearchHit>;
        case SdocColumns.SD_SOURCE_DOCUMENT_NAME:
          return {
            ...colDef,
            flex: 2,
            Cell: ({ row }) => <SdocRenderer sdoc={row.original.id} renderName />,
          } as MRT_ColumnDef<ElasticSearchHit>;
        case SdocColumns.SD_TAG_ID_LIST:
          return {
            ...colDef,
            flex: 2,
            Cell: ({ row }) => <SdocTagsRenderer sdocId={row.original.id} />,
          } as MRT_ColumnDef<ElasticSearchHit>;
        case SdocColumns.SD_USER_ID_LIST:
          return {
            ...colDef,
            flex: 2,
            Cell: ({ row }) => <SdocAnnotatorsRenderer sdocId={row.original.id} />,
          } as MRT_ColumnDef<ElasticSearchHit>;
        case SdocColumns.SD_CODE_ID_LIST:
          return null;
        case SdocColumns.SD_SPAN_ANNOTATIONS:
          return null;
        default:
          // render metadata
          if (!isNaN(parseInt(column.column))) {
            return {
              ...colDef,
              flex: 2,
              Cell: ({ row }) => (
                <SdocMetadataRenderer sdocId={row.original.id} projectMetadataId={parseInt(column.column)} />
              ),
            } as MRT_ColumnDef<ElasticSearchHit>;
          } else {
            return {
              ...colDef,
              Cell: () => <i>Cannot render column {column.column}</i>,
            } as MRT_ColumnDef<ElasticSearchHit>;
          }
      }
    });
    // unwanted columns are set to null, so we filter those out
    return result.filter((column) => column !== null) as MRT_ColumnDef<ElasticSearchHit>[];
  }, [tableInfo]);

  // table data
  const { data, fetchNextPage, isError, isFetching, isLoading } = useInfiniteQuery<PaginatedElasticSearchHits>({
    queryKey: [
      QueryKey.SDOC_TABLE,
      projectId,
      searchQuery, // refetch when searchQuery changes
      filter, // refetch when columnFilters changes
      sortingModel, // refetch when sorting changes
      fetchSize,
    ],
    queryFn: ({ pageParam }) =>
      SearchService.searchSdocs({
        searchQuery: searchQuery || "",
        projectId: projectId!,
        folderId: null, // search in all folders / project
        highlight: true,
        expertMode: false,
        requestBody: {
          filter: filter as MyFilter<SdocColumns>,
          sorts: sortingModel.map((sort) => ({
            column: sort.id as SdocColumns,
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
  // scroll to top of table when sorting or filters change
  useEffect(() => {
    try {
      rowVirtualizerInstanceRef.current?.scrollToIndex?.(0);
    } catch (error) {
      console.error(error);
    }
  }, [projectId, sortingModel]);

  const handleTableScroll = useCallback(
    (event: UIEvent<HTMLDivElement>) => fetchMoreOnScroll(event.target as HTMLDivElement),
    [fetchMoreOnScroll],
  );

  // fetch all
  const handleFetchAll = useCallback(() => {
    onFetchSizeChange(totalResults);
  }, [onFetchSizeChange, totalResults]);

  // rendering
  const { renderTopLeftToolbarContent, renderTopRightToolbarContent, renderBottomToolbarContent } = useRenderToolbars({
    name: "documents",
    flatData,
    totalFetched,
    totalResults,
    handleFetchAll,
    renderTopRightToolbar,
    renderTopLeftToolbar,
    renderBottomToolbar,
    filterStateSelector,
    filterActions,
    filterName,
    rowSelectionModel,
    tableContainerRef,
  });

  const renderDetailPanel = useMemo(() => {
    if (!searchQuery || searchQuery.trim().length === 0) return undefined;

    return ({ row }: { row: { original: ElasticSearchHit } }) =>
      row.original.highlights ? (
        <Box className="search-result-highlight">
          {row.original.highlights.map((highlight, index) => (
            <Typography key={`sdoc-${row.original.id}-highlight-${index}`} m={0.5}>
              {parse(highlight)}
            </Typography>
          ))}
        </Box>
      ) : null;
  }, [searchQuery]);

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
    },
    // search query
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
    manualSorting: true,
    onSortingChange,
    // column visiblility
    onColumnVisibilityChange,
    // detail (highlights)
    renderDetailPanel,
    // mui components
    muiTablePaperProps: {
      elevation: 0,
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
}

export default memo(SdocTable);
