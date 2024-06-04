import { Box, Stack, Typography } from "@mui/material";
import { useInfiniteQuery } from "@tanstack/react-query";
import parse from "html-react-parser";
import {
  MRT_ColumnDef,
  MRT_RowSelectionState,
  MRT_RowVirtualizer,
  MRT_SortingState,
  MRT_TableInstance,
  MRT_TableOptions,
  MRT_VisibilityState,
  MaterialReactTable,
  useMaterialReactTable,
} from "material-react-table";
import { useCallback, useEffect, useMemo, useRef, useState, type UIEvent } from "react";
import { AnnotationTableRow } from "../../../api/openapi/models/AnnotationTableRow.ts";
import { ElasticSearchDocumentHit } from "../../../api/openapi/models/ElasticSearchDocumentHit.ts";
import { PaginatedElasticSearchDocumentHits } from "../../../api/openapi/models/PaginatedElasticSearchDocumentHits.ts";
import { SearchColumns } from "../../../api/openapi/models/SearchColumns.ts";
import { SortDirection } from "../../../api/openapi/models/SortDirection.ts";
import { SearchService } from "../../../api/openapi/services/SearchService.ts";
import { useAuth } from "../../../auth/useAuth.ts";
import { FilterActions, FilterState } from "../../../features/FilterDialog/filterSlice.ts";
import { MyFilter, createEmptyFilter } from "../../../features/FilterDialog/filterUtils.ts";
import { useAppSelector } from "../../../plugins/ReduxHooks.ts";
import { RootState } from "../../../store/store.ts";
import SdocMetadataRenderer from "../../Metadata/SdocMetadataRenderer.tsx";
import SdocAnnotatorsRenderer from "../SdocAnnotatorsRenderer.tsx";
import SdocRenderer from "../SdocRenderer.tsx";
import SdocTagsRenderer from "../SdocTagRenderer.tsx";
import SdocTableToolbar from "./SdocTableToolbar.tsx";
import { DocumentTableFilterActions } from "./documentTableFilterSlice.ts";
import { useInitDocumentTableFilterSlice } from "./useInitDocumentTableFilterSlice.ts";

const fetchSize = 20;

export interface DocumentTableActionProps {
  table: MRT_TableInstance<ElasticSearchDocumentHit>;
  selectedDocuments: ElasticSearchDocumentHit[];
}

interface SdocTableProps {
  projectId: number;
  // selection
  rowSelectionModel: MRT_RowSelectionState;
  onRowSelectionChange: (rowSelectionModel: MRT_RowSelectionState) => void;
  // sorting
  sortingModel: MRT_SortingState;
  onSortingChange: (sortingModel: MRT_SortingState) => void;
  // toolbar
  positionToolbarAlertBanner?: MRT_TableOptions<AnnotationTableRow>["positionToolbarAlertBanner"];
  renderToolbarInternalActions?: (props: DocumentTableActionProps) => React.ReactNode;
  renderTopToolbarCustomActions?: (props: DocumentTableActionProps) => React.ReactNode;
  renderBottomToolbarCustomActions?: (props: DocumentTableActionProps) => React.ReactNode;
  // filter
  filterName?: string;
  filterStateSelector?: (state: RootState) => FilterState;
  filterActions?: FilterActions;
}

const defaultFilterStateSelector = (state: RootState) => state.documentTableFilter;

function SdocTable({
  projectId,
  rowSelectionModel,
  onRowSelectionChange,
  sortingModel,
  onSortingChange,
  positionToolbarAlertBanner = "top",
  renderToolbarInternalActions,
  renderTopToolbarCustomActions,
  renderBottomToolbarCustomActions,
  filterName = "root",
  filterActions = DocumentTableFilterActions,
  filterStateSelector = defaultFilterStateSelector,
}: SdocTableProps) {
  // global client state (react router)
  const { user } = useAuth();

  // search query
  const [searchQuery, setSearchQuery] = useState<string | undefined>("");

  // filtering
  const filter =
    useAppSelector((state) => filterStateSelector(state).filter[filterName]) || createEmptyFilter(filterName);

  // virtualization
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const rowVirtualizerInstanceRef = useRef<MRT_RowVirtualizer>(null);

  // table columns
  const tableInfo = useInitDocumentTableFilterSlice({ projectId });
  const columns = useMemo(() => {
    if (!tableInfo || !user) return [];

    const result = tableInfo.map((column) => {
      const colDef: MRT_ColumnDef<ElasticSearchDocumentHit> = {
        id: column.column,
        header: column.label,
        enableSorting: column.sortable,
      };

      switch (column.column) {
        case SearchColumns.SC_SOURCE_DOCUMENT_TYPE:
          return {
            ...colDef,
            Cell: ({ row }) => <SdocRenderer sdoc={row.original.sdoc_id} renderDoctypeIcon />,
          } as MRT_ColumnDef<ElasticSearchDocumentHit>;
        case SearchColumns.SC_SOURCE_DOCUMENT_FILENAME:
          return {
            ...colDef,
            flex: 2,
            Cell: ({ row }) => <SdocRenderer sdoc={row.original.sdoc_id} renderFilename />,
          } as MRT_ColumnDef<ElasticSearchDocumentHit>;
        case SearchColumns.SC_DOCUMENT_TAG_ID_LIST:
          return {
            ...colDef,
            flex: 2,
            Cell: ({ row }) => <SdocTagsRenderer sdocId={row.original.sdoc_id} />,
          } as MRT_ColumnDef<ElasticSearchDocumentHit>;
        case SearchColumns.SC_USER_ID_LIST:
          return {
            ...colDef,
            flex: 2,
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
              flex: 2,
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
  useEffect(() => {
    setColumnVisibilityModel(
      columns.reduce((acc, column) => {
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
      }, {}),
    );
  }, [columns]);

  // table data
  const { data, fetchNextPage, isError, isFetching, isLoading } = useInfiniteQuery<PaginatedElasticSearchDocumentHits>({
    queryKey: [
      "document-table-data",
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
  const flatData = useMemo(() => data?.pages.flatMap((page) => page.hits) ?? [], [data]);
  const totalDBRowCount = data?.pages?.[0]?.total_results ?? 0;
  const totalFetched = flatData.length;

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

  // table
  const table = useMaterialReactTable<ElasticSearchDocumentHit>({
    data: flatData,
    columns: columns,
    getRowId: (row) => `${row.sdoc_id}`,
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
    onRowSelectionChange: (rowSelectionUpdater) => {
      let newRowSelectionModel: MRT_RowSelectionState;
      if (typeof rowSelectionUpdater === "function") {
        newRowSelectionModel = rowSelectionUpdater(rowSelectionModel);
      } else {
        newRowSelectionModel = rowSelectionUpdater;
      }
      onRowSelectionChange(newRowSelectionModel);
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
    manualSorting: true,
    onSortingChange: (sortingUpdater) => {
      let newSortingModel: MRT_SortingState;
      if (typeof sortingUpdater === "function") {
        newSortingModel = sortingUpdater(sortingModel);
      } else {
        newSortingModel = sortingUpdater;
      }
      onSortingChange(newSortingModel);
    },
    // column visiblility
    onColumnVisibilityChange: setColumnVisibilityModel,
    // detail (highlights)
    renderDetailPanel:
      searchQuery && searchQuery.trim().length > 0
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
    muiTablePaperProps: {
      elevation: 0,
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
    positionToolbarAlertBanner,
    renderTopToolbarCustomActions: renderTopToolbarCustomActions
      ? (props) =>
          renderTopToolbarCustomActions({
            table: props.table,
            selectedDocuments: flatData.filter((row) => rowSelectionModel[row.sdoc_id]),
          })
      : undefined,
    renderToolbarInternalActions: renderToolbarInternalActions
      ? (props) =>
          renderToolbarInternalActions({
            table: props.table,
            selectedDocuments: flatData.filter((row) => rowSelectionModel[row.sdoc_id]),
          })
      : (props) => (
          <SdocTableToolbar
            table={props.table}
            anchor={tableContainerRef}
            filterName={filterName}
            filterActions={filterActions}
            filterStateSelector={filterStateSelector}
          />
        ),
    renderBottomToolbarCustomActions: (props) => (
      <Stack direction={"row"} spacing={1} alignItems="center">
        <Typography>
          Fetched {totalFetched} of {totalDBRowCount} total documents.
        </Typography>
        {renderBottomToolbarCustomActions &&
          renderBottomToolbarCustomActions({
            table: props.table,
            selectedDocuments: flatData.filter((row) => rowSelectionModel[row.sdoc_id]),
          })}
      </Stack>
    ),
  });

  return <MaterialReactTable table={table} />;
}

export default SdocTable;
