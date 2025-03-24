import { Box, Typography } from "@mui/material";
import { useInfiniteQuery } from "@tanstack/react-query";
import parse from "html-react-parser";
import {
  MRT_ColumnDef,
  MRT_RowSelectionState,
  MRT_RowVirtualizer,
  MRT_SortingState,
  MRT_TableOptions,
  MRT_VisibilityState,
  MaterialReactTable,
  useMaterialReactTable,
} from "material-react-table";
import { memo, useCallback, useEffect, useMemo, useRef, useState, type UIEvent } from "react";
import { QueryKey } from "../../../api/QueryKey.ts";
import { ElasticSearchDocumentHit } from "../../../api/openapi/models/ElasticSearchDocumentHit.ts";
import { PaginatedElasticSearchDocumentHits } from "../../../api/openapi/models/PaginatedElasticSearchDocumentHits.ts";
import { SdocColumns } from "../../../api/openapi/models/SdocColumns.ts";
import { SortDirection } from "../../../api/openapi/models/SortDirection.ts";
import { SearchService } from "../../../api/openapi/services/SearchService.ts";
import { useAppSelector } from "../../../plugins/ReduxHooks.ts";
import { RootState } from "../../../store/store.ts";
import { useTableInfiniteScroll } from "../../../utils/useTableInfiniteScroll.ts";
import { ColumnInfo, MyFilter, createEmptyFilter } from "../../FilterDialog/filterUtils.ts";
import FilterTableToolbarLeft from "../../FilterTable/FilterTableToolbarLeft.tsx";
import { FilterTableToolbarProps } from "../../FilterTable/FilterTableToolbarProps.ts";
import FilterTableToolbarRight from "../../FilterTable/FilterTableToolbarRight.tsx";
import { useRenderToolbars } from "../../FilterTable/useRenderToolbars.tsx";
import SdocMetadataRenderer from "../../Metadata/SdocMetadataRenderer.tsx";
import SdocAnnotatorsRenderer from "../SdocAnnotatorsRenderer.tsx";
import SdocRenderer from "../SdocRenderer.tsx";
import SdocTagsRenderer from "../SdocTagRenderer.tsx";
import { DocumentTableFilterActions } from "./documentTableFilterSlice.ts";
import { useInitDocumentTableFilterSlice } from "./useInitDocumentTableFilterSlice.ts";

const fetchSize = 20;
const flatMapData = (page: PaginatedElasticSearchDocumentHits) => page.hits;

interface SdocTableProps {
  projectId: number;
  // selection
  rowSelectionModel: MRT_RowSelectionState;
  onRowSelectionChange: MRT_TableOptions<ElasticSearchDocumentHit>["onRowSelectionChange"];
  // sorting
  sortingModel: MRT_SortingState;
  onSortingChange: MRT_TableOptions<ElasticSearchDocumentHit>["onSortingChange"];
  // toolbar
  positionToolbarAlertBanner?: MRT_TableOptions<ElasticSearchDocumentHit>["positionToolbarAlertBanner"];
  renderTopRightToolbar?: (props: FilterTableToolbarProps<ElasticSearchDocumentHit>) => React.ReactNode;
  renderTopLeftToolbar?: (props: FilterTableToolbarProps<ElasticSearchDocumentHit>) => React.ReactNode;
  renderBottomToolbar?: (props: FilterTableToolbarProps<ElasticSearchDocumentHit>) => React.ReactNode;
  // filter
  filterName: string;
}

// this defines which filter slice is used
const filterStateSelector = (state: RootState) => state.documentTableFilter;
const filterActions = DocumentTableFilterActions;

function SdocTable(props: SdocTableProps) {
  // global client state (react router)
  const tableInfo = useInitDocumentTableFilterSlice({ projectId: props.projectId });
  if (tableInfo) {
    return <SdocTableContent {...props} tableInfo={tableInfo} />;
  }
  return null;
}

function SdocTableContent({
  projectId,
  rowSelectionModel,
  onRowSelectionChange,
  sortingModel,
  onSortingChange,
  positionToolbarAlertBanner = "top",
  renderTopRightToolbar = FilterTableToolbarRight,
  renderTopLeftToolbar = FilterTableToolbarLeft,
  renderBottomToolbar,
  filterName,
  tableInfo,
}: SdocTableProps & { tableInfo: ColumnInfo[] }) {
  // search query
  const [searchQuery, setSearchQuery] = useState<string | undefined>("");

  // filtering
  const filter =
    useAppSelector((state) => filterStateSelector(state).filter[filterName]) || createEmptyFilter(filterName);

  // virtualization
  const rowVirtualizerInstanceRef = useRef<MRT_RowVirtualizer>(null);
  const tableContainerRef = useRef<HTMLDivElement>(null);

  // table columns
  const columns = useMemo(() => {
    const result = tableInfo.map((column) => {
      const colDef: MRT_ColumnDef<ElasticSearchDocumentHit> = {
        id: column.column,
        header: column.label,
        enableSorting: column.sortable,
      };
      switch (column.column) {
        case SdocColumns.SD_SOURCE_DOCUMENT_TYPE:
          return {
            ...colDef,
            Cell: ({ row }) => <SdocRenderer sdoc={row.original.id} renderDoctypeIcon />,
          } as MRT_ColumnDef<ElasticSearchDocumentHit>;
        case SdocColumns.SD_SOURCE_DOCUMENT_FILENAME:
          return {
            ...colDef,
            flex: 2,
            Cell: ({ row }) => <SdocRenderer sdoc={row.original.id} renderFilename />,
          } as MRT_ColumnDef<ElasticSearchDocumentHit>;
        case SdocColumns.SD_DOCUMENT_TAG_ID_LIST:
          return {
            ...colDef,
            flex: 2,
            Cell: ({ row }) => <SdocTagsRenderer sdocId={row.original.id} />,
          } as MRT_ColumnDef<ElasticSearchDocumentHit>;
        case SdocColumns.SD_USER_ID_LIST:
          return {
            ...colDef,
            flex: 2,
            Cell: ({ row }) => <SdocAnnotatorsRenderer sdocId={row.original.id} />,
          } as MRT_ColumnDef<ElasticSearchDocumentHit>;
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
  }, [tableInfo]);

  // column visiblility
  const [columnVisibilityModel, setColumnVisibilityModel] = useState<MRT_VisibilityState>(() => {
    return columns.reduce((acc, column) => {
      if (!column.id) return acc;
      // this is a normal column
      if (isNaN(parseInt(column.id))) {
        return acc;
        // this is a metadata column
      } else {
        return {
          ...acc,
          [column.id]: false,
        };
      }
    }, {});
  });

  // table data
  const { data, fetchNextPage, isError, isFetching, isLoading } = useInfiniteQuery<PaginatedElasticSearchDocumentHits>({
    queryKey: [
      QueryKey.SDOC_TABLE,
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

  // rendering
  const { renderTopLeftToolbarContent, renderTopRightToolbarContent, renderBottomToolbarContent } = useRenderToolbars({
    name: "documents",
    flatData,
    totalFetched,
    totalResults,
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

    return ({ row }: { row: { original: ElasticSearchDocumentHit } }) =>
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
  const table = useMaterialReactTable<ElasticSearchDocumentHit>({
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
    onColumnVisibilityChange: setColumnVisibilityModel,
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
