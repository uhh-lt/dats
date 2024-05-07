import { Stack, Typography } from "@mui/material";
import { useInfiniteQuery } from "@tanstack/react-query";
import {
  MRT_ColumnDef,
  MRT_RowSelectionState,
  MRT_RowVirtualizer,
  MRT_SortingState,
  MRT_TableInstance,
  MaterialReactTable,
  useMaterialReactTable,
} from "material-react-table";
import { useCallback, useEffect, useMemo, useRef, useState, type UIEvent } from "react";
import { AnnotatedSegmentResult } from "../../api/openapi/models/AnnotatedSegmentResult.ts";
import { SearchColumns } from "../../api/openapi/models/SearchColumns.ts";
import { SortDirection } from "../../api/openapi/models/SortDirection.ts";
import { SearchService } from "../../api/openapi/services/SearchService.ts";
import { useAuth } from "../../auth/useAuth.ts";
import { MyFilter, createEmptyFilter } from "../../features/FilterDialog/filterUtils.ts";
import { useAppSelector } from "../../plugins/ReduxHooks.ts";
import SdocAnnotatorsRenderer from "../DataGrid/SdocAnnotatorsRenderer.tsx";
import SdocMetadataRenderer from "../DataGrid/SdocMetadataRenderer.tsx";
import SdocRenderer from "../DataGrid/SdocRenderer.tsx";
import SdocTagsRenderer from "../DataGrid/SdocTagRenderer.tsx";
import { useInitDocumentTableFilterSlice } from "./useInitDocumentTableFilterSlice.ts";

const fetchSize = 20;

interface DocumentTableRow {
  sdocId: number;
}

export interface DocumentTableActionProps {
  table: MRT_TableInstance<DocumentTableRow>;
  selectedDocuments: DocumentTableRow[];
}

export interface DocumentTableProps {
  projectId: number;
  filterName: string;
  // selection
  rowSelectionModel: MRT_RowSelectionState;
  onRowSelectionChange: (rowSelectionModel: MRT_RowSelectionState) => void;
  // sorting
  sortingModel: MRT_SortingState;
  onSortingChange: (sortingModel: MRT_SortingState) => void;
  // actions
  onRowContextMenu?: (event: React.MouseEvent<HTMLTableRowElement>, sdocId: number) => void;
  // toolbar
  renderToolbarInternalActions?: (props: DocumentTableActionProps) => React.ReactNode;
  renderTopToolbarCustomActions?: (props: DocumentTableActionProps) => React.ReactNode;
  renderBottomToolbarCustomActions?: (props: DocumentTableActionProps) => React.ReactNode;
}

function DocumentTableProps({
  projectId,
  filterName,
  rowSelectionModel,
  onRowSelectionChange,
  sortingModel,
  onSortingChange,
  onRowContextMenu,
  renderToolbarInternalActions,
  renderTopToolbarCustomActions,
  renderBottomToolbarCustomActions,
}: DocumentTableProps) {
  // global client state (react router)
  const { user } = useAuth();

  // query
  const [searchQuery, setSearchQuery] = useState("");

  // filtering
  const filter = useAppSelector((state) => state.satFilter.filter[filterName]) || createEmptyFilter(filterName);

  // virtualization
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const tableBodyRef = useRef<HTMLTableSectionElement>(null);
  const rowVirtualizerInstanceRef = useRef<MRT_RowVirtualizer>(null);

  // table columns
  const tableInfo = useInitDocumentTableFilterSlice({ projectId });
  const columns: MRT_ColumnDef<DocumentTableRow>[] = useMemo(() => {
    if (!tableInfo.data || !user) return [];

    const result = tableInfo.data.map((column) => {
      const colDef: MRT_ColumnDef<DocumentTableRow> = {
        id: column.column.toString(),
        header: column.label,
        enableSorting: column.sortable,
      };

      switch (column.column) {
        case SearchColumns.SC_SOURCE_DOCUMENT_TYPE:
          return {
            ...colDef,
            Cell: ({ row }) => <SdocRenderer sdoc={row.original.sdocId} renderDoctypeIcon />,
          } as MRT_ColumnDef<DocumentTableRow>;
        case SearchColumns.SC_SOURCE_DOCUMENT_FILENAME:
          return {
            ...colDef,
            flex: 2,
            Cell: ({ row }) => <SdocRenderer sdoc={row.original.sdocId} renderFilename />,
          } as MRT_ColumnDef<DocumentTableRow>;
        case SearchColumns.SC_DOCUMENT_TAG_ID_LIST:
          return {
            ...colDef,
            flex: 2,
            Cell: ({ row }) => <SdocTagsRenderer sdocId={row.original.sdocId} />,
          } as MRT_ColumnDef<DocumentTableRow>;
        case SearchColumns.SC_USER_ID_LIST:
          return {
            ...colDef,
            flex: 2,
            Cell: ({ row }) => <SdocAnnotatorsRenderer sdocId={row.original.sdocId} />,
          } as MRT_ColumnDef<DocumentTableRow>;
        case SearchColumns.SC_CODE_ID_LIST:
          return null;
        case SearchColumns.SC_SPAN_ANNOTATIONS:
          return null;
        default:
          // render metadata
          if (typeof column.column === "number") {
            return {
              ...colDef,
              flex: 2,
              Cell: ({ row }) => (
                <SdocMetadataRenderer sdocId={row.original.sdocId} projectMetadataId={column.column as number} />
              ),
            } as MRT_ColumnDef<DocumentTableRow>;
          } else {
            return {
              ...colDef,
              flex: 1,
              Cell: () => <i>Cannot render column {column.column}</i>,
            } as MRT_ColumnDef<DocumentTableRow>;
          }
      }
    });

    // unwanted columns are set to null, so we filter those out
    return result.filter((column) => column !== null) as MRT_ColumnDef<DocumentTableRow>[];
  }, [tableInfo.data, user]);

  // table data
  const { data, fetchNextPage, isError, isFetching, isLoading } = useInfiniteQuery<AnnotatedSegmentResult>({
    queryKey: [
      "document-table-data",
      projectId,
      searchQuery, // refetch when searchQuery changes
      filter, // refetch when columnFilters changes
      sortingModel, // refetch when sorting changes
    ],
    queryFn: ({ pageParam }) =>
      SearchService.searchSdocs({
        searchQuery: searchQuery,
        projectId: projectId!,
        requestBody: {
          filter: filter as MyFilter<SearchColumns>,
          sorts: sortingModel.map((sort) => ({
            column: sort.id as SearchColumns,
            direction: sort.desc ? SortDirection.DESC : SortDirection.ASC,
          })),
        },
        page: pageParam as number,
        pageSize: fetchSize,
      }),
    initialPageParam: 0,
    getNextPageParam: (_lastGroup, groups) => {
      return groups.length;
    },
    refetchOnWindowFocus: false,
  });
  // create a flat array of data mapped from id to row
  const dataMap = useMemo(
    () =>
      data?.pages
        .flatMap((page) => page.data)
        .reduce(
          (prev, current) => {
            prev[current.id] = current;
            return prev;
          },
          {} as Record<number, DocumentTableRow>,
        ) ?? [],
    [data],
  );
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
  const handleRowContextMenu = (event: React.MouseEvent<HTMLTableRowElement>, spanAnnotationId: number) => {
    event.preventDefault();
    onRowSelectionChange({ [spanAnnotationId]: true });
    onRowContextMenu && onRowContextMenu(event, spanAnnotationId);
  };

  // table
  const table = useMaterialReactTable<DocumentTableRow>({
    data: Object.values(dataMap),
    columns: columns,
    getRowId: (row) => `${row.sdocId}`,
    // state
    state: {
      globalFilter: searchQuery,
      rowSelection: rowSelectionModel,
      sorting: sortingModel,
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
    manualFiltering: true,
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
    // column hiding: hide metadata columns by default
    initialState: {
      columnVisibility: columns.reduce((acc, column) => {
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
    },
    // mui components
    muiTableBodyRowProps: ({ row }) => ({
      onContextMenu: (event) => handleRowContextMenu(event, row.original.id),
    }),
    muiTablePaperProps: {
      elevation: 0,
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
    renderTopToolbarCustomActions: renderTopToolbarCustomActions
      ? (props) =>
          renderTopToolbarCustomActions({
            table: props.table,
            selectedDocuments: Object.values(dataMap).filter((row) => rowSelectionModel[row.id]),
          })
      : undefined,
    renderToolbarInternalActions: renderToolbarInternalActions
      ? (props) =>
          renderToolbarInternalActions({
            table: props.table,
            selectedDocuments: Object.values(dataMap).filter((row) => rowSelectionModel[row.id]),
          })
      : undefined,
    renderBottomToolbar: (props) => (
      <Stack direction={"row"} spacing={1} alignItems="center" p={1}>
        <Typography>
          Fetched {totalFetched} of {totalDBRowCount} total rows.
        </Typography>
        {renderBottomToolbarCustomActions &&
          renderBottomToolbarCustomActions({
            table: props.table,
            selectedDocuments: Object.values(dataMap).filter((row) => rowSelectionModel[row.id]),
          })}
      </Stack>
    ),
  });

  return <MaterialReactTable table={table} />;
}

export default DocumentTableProps;
