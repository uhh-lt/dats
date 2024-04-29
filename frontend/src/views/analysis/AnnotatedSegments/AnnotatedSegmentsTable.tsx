import { Typography } from "@mui/material";
import { useInfiniteQuery } from "@tanstack/react-query";
import {
  MRT_ColumnDef,
  MRT_RowSelectionState,
  MRT_RowVirtualizer,
  MRT_SortingState,
  MaterialReactTable,
  useMaterialReactTable,
} from "material-react-table";
import { useCallback, useEffect, useMemo, useRef, type UIEvent } from "react";
import { useParams } from "react-router-dom";
import { AnnotatedSegmentResult } from "../../../api/openapi/models/AnnotatedSegmentResult.ts";
import { AnnotatedSegmentsColumns } from "../../../api/openapi/models/AnnotatedSegmentsColumns.ts";
import { AttachedObjectType } from "../../../api/openapi/models/AttachedObjectType.ts";
import { SortDirection } from "../../../api/openapi/models/SortDirection.ts";
import { AnalysisService } from "../../../api/openapi/services/AnalysisService.ts";
import { useAuth } from "../../../auth/useAuth.ts";
import MemoRenderer2 from "../../../components/DataGrid/MemoRenderer2.tsx";
import SpanAnnotationRenderer from "../../../components/DataGrid/SpanAnnotationRenderer.tsx";
import { MyFilter } from "../../../features/FilterDialog/filterUtils.ts";
import { useAppDispatch, useAppSelector } from "../../../plugins/ReduxHooks.ts";
import AnnotatedSegmentsTableToolbar from "./AnnotatedSegmentsTableToolbar.tsx";
import { AnnotatedSegmentsActions } from "./annotatedSegmentsSlice.ts";
import { useInitAnnotatedSegmentsFilterSlice } from "./useInitAnnotatedSegmentsFilterSlice.ts";

const fetchSize = 20;
interface AnnotatedSegmentsTableProps {
  onRowContextMenu: (event: React.MouseEvent<HTMLTableRowElement>, spanAnnotationId: number) => void;
}

function AnnotatedSegmentsTable({ onRowContextMenu }: AnnotatedSegmentsTableProps) {
  const projectId = parseInt(useParams<{ projectId: string }>().projectId!);

  // global client state (react router)
  const { user } = useAuth();

  // global client state (redux)
  const rowSelectionModel = useAppSelector((state) => state.annotatedSegments.rowSelectionModel);
  const sortingModel = useAppSelector((state) => state.annotatedSegments.sortModel);

  const userIds = useAppSelector((state) => state.annotatedSegments.selectedUserIds);
  const filter = useAppSelector((state) => state.annotatedSegmentsFilter.filter["root"]);
  const dispatch = useAppDispatch();

  const tableContainerRef = useRef<HTMLDivElement>(null);
  const rowVirtualizerInstanceRef = useRef<MRT_RowVirtualizer>(null);

  // custom hooks (query)
  const { data, fetchNextPage, isError, isFetching, isLoading } = useInfiniteQuery<AnnotatedSegmentResult>({
    queryKey: [
      "table-data",
      projectId,
      userIds,
      filter, //refetch when columnFilters changes
      sortingModel, //refetch when sorting changes
    ],
    queryFn: ({ pageParam }) =>
      AnalysisService.annotatedSegments({
        projectId: projectId!,
        requestBody: {
          filter: filter as MyFilter<AnnotatedSegmentsColumns>,
          user_ids: userIds,
          sorts: sortingModel.map((sort) => ({
            column: sort.id as AnnotatedSegmentsColumns,
            direction: sort.desc ? SortDirection.DESC : SortDirection.ASC,
          })),
        },
        page: pageParam as number,
        pageSize: fetchSize,
      }),
    initialPageParam: 0,
    getNextPageParam: (_lastGroup, groups) => {
      console.log("groups", groups);
      return groups.length;
    },
    refetchOnWindowFocus: false,
  });
  const tableInfo = useInitAnnotatedSegmentsFilterSlice({ projectId });

  // computed
  const flatData = useMemo(() => data?.pages.flatMap((page) => page.span_annotation_ids) ?? [], [data]);

  const totalDBRowCount = data?.pages?.[0]?.total_results ?? 0;
  const totalFetched = flatData.length;

  //called on scroll and possibly on mount to fetch more data as the user scrolls and reaches bottom of table
  const fetchMoreOnBottomReached = useCallback(
    (containerRefElement?: HTMLDivElement | null) => {
      if (containerRefElement) {
        const { scrollHeight, scrollTop, clientHeight } = containerRefElement;
        //once the user has scrolled within 400px of the bottom of the table, fetch more data if we can
        if (scrollHeight - scrollTop - clientHeight < 400 && !isFetching && totalFetched < totalDBRowCount) {
          fetchNextPage();
        }
      }
    },
    [fetchNextPage, isFetching, totalFetched, totalDBRowCount],
  );

  // actions
  const handleRowContextMenu = (event: React.MouseEvent<HTMLTableRowElement>, spanAnnotationId: number) => {
    dispatch(AnnotatedSegmentsActions.onSelectionModelChange({ [spanAnnotationId]: true }));
    onRowContextMenu(event, spanAnnotationId);
  };

  // effects
  //scroll to top of table when sorting or filters change
  useEffect(() => {
    //scroll to the top of the table when the sorting changes
    try {
      rowVirtualizerInstanceRef.current?.scrollToIndex?.(0);
    } catch (error) {
      console.error(error);
    }
  }, [projectId, userIds, sortingModel, filter]);

  //a check on mount to see if the table is already scrolled to the bottom and immediately needs to fetch more data
  useEffect(() => {
    fetchMoreOnBottomReached(tableContainerRef.current);
  }, [fetchMoreOnBottomReached]);

  // computed
  const columns: MRT_ColumnDef<{ spanAnnotationId: number }>[] = useMemo(() => {
    if (!tableInfo.data || !user) return [];

    const result = tableInfo.data.map((column) => {
      const colDef = {
        id: column.column.toString(),
        header: column.label,
        enableSorting: true,
      };

      switch (column.column) {
        case AnnotatedSegmentsColumns.ASC_SOURCE_SOURCE_DOCUMENT_FILENAME:
          return {
            ...colDef,
            accessorFn: (row) => row.spanAnnotationId,
            // Cell: ({ row }) => (
            //   <SpanAnnotationRenderer
            //     spanAnnotation={row.original.spanAnnotationId}
            //     showCode={false}
            //     showSpanText={false}
            //     showSdoc
            //     sdocRendererProps={{
            //       link: true,
            //       renderFilename: true,
            //       renderDoctypeIcon: true,
            //     }}
            //   />
            // ),
          } as MRT_ColumnDef<{ spanAnnotationId: number }>;
        case AnnotatedSegmentsColumns.ASC_DOCUMENT_DOCUMENT_TAG_ID_LIST:
          return {
            ...colDef,
            Cell: ({ row }) => (
              <SpanAnnotationRenderer
                spanAnnotation={row.original.spanAnnotationId}
                showCode={false}
                showSpanText={false}
                showSdocTags
              />
            ),
          } as MRT_ColumnDef<{ spanAnnotationId: number }>;
        case AnnotatedSegmentsColumns.ASC_CODE_ID:
          return {
            ...colDef,
            flex: 1,
            Cell: ({ row }) => (
              <SpanAnnotationRenderer spanAnnotation={row.original.spanAnnotationId} showSpanText={false} />
            ),
          } as MRT_ColumnDef<{ spanAnnotationId: number }>;
        case AnnotatedSegmentsColumns.ASC_MEMO_CONTENT:
          return {
            ...colDef,
            Cell: ({ row }) =>
              user ? (
                <MemoRenderer2
                  attachedObjectType={AttachedObjectType.SPAN_ANNOTATION}
                  attachedObjectId={row.original.spanAnnotationId}
                  userId={user.id}
                  showTitle={false}
                  showContent
                  showIcon={false}
                />
              ) : null,
          } as MRT_ColumnDef<{ spanAnnotationId: number }>;
        case AnnotatedSegmentsColumns.ASC_SPAN_TEXT:
          return {
            ...colDef,
            Cell: ({ row }) => (
              <SpanAnnotationRenderer spanAnnotation={row.original.spanAnnotationId} showCode={false} />
            ),
          } as MRT_ColumnDef<{ spanAnnotationId: number }>;
        default:
          if (typeof column.column === "number") {
            return {
              ...colDef,
              Cell: ({ row }) => (
                <SpanAnnotationRenderer
                  spanAnnotation={row.original.spanAnnotationId}
                  showCode={false}
                  showSpanText={false}
                  showSdocProjectMetadataId={column.column as number}
                />
              ),
            } as MRT_ColumnDef<{ spanAnnotationId: number }>;
          } else {
            return {
              ...colDef,
              Cell: () => <i>Cannot render column {column.column}</i>,
            } as MRT_ColumnDef<{ spanAnnotationId: number }>;
          }
      }
    });

    return result;
  }, [tableInfo.data, user]);

  // table
  const table = useMaterialReactTable({
    data: flatData.map((spanAnnotationId) => ({ spanAnnotationId })) || [],
    columns: columns,
    getRowId: (row) => `${row.spanAnnotationId}`,
    // state
    state: {
      rowSelection: rowSelectionModel,
      sorting: sortingModel,
      isLoading: isLoading || columns.length === 0,
      showAlertBanner: isError,
      showProgressBars: isFetching,
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
      dispatch(AnnotatedSegmentsActions.onSelectionModelChange(newRowSelectionModel));
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
      dispatch(AnnotatedSegmentsActions.onSortModelChange(newSortingModel));
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
      onContextMenu: (event) => handleRowContextMenu(event, row.original.spanAnnotationId),
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
    muiToolbarAlertBannerProps: isError
      ? {
          color: "error",
          children: "Error loading data",
        }
      : undefined,
    // toolbar
    renderToolbarInternalActions: AnnotatedSegmentsTableToolbar,
    renderBottomToolbarCustomActions: () => (
      <Typography>
        Fetched {totalFetched} of {totalDBRowCount} total rows.
      </Typography>
    ),
  });

  return <MaterialReactTable table={table} />;
}

export default AnnotatedSegmentsTable;
