import { Typography } from "@mui/material";
import {
  MRT_ColumnDef,
  MRT_PaginationState,
  MRT_RowSelectionState,
  MRT_SortingState,
  MaterialReactTable,
  useMaterialReactTable,
} from "material-react-table";
import { useMemo } from "react";
import { useParams } from "react-router-dom";
import { AnnotatedSegmentsColumns } from "../../../api/openapi/models/AnnotatedSegmentsColumns.ts";
import { AttachedObjectType } from "../../../api/openapi/models/AttachedObjectType.ts";
import { useAuth } from "../../../auth/useAuth.ts";
import MemoRenderer2 from "../../../components/DataGrid/MemoRenderer2.tsx";
import SpanAnnotationRenderer from "../../../components/DataGrid/SpanAnnotationRenderer.tsx";
import { useAppDispatch, useAppSelector } from "../../../plugins/ReduxHooks.ts";
import AnnotatedSegmentsTableToolbar from "./AnnotatedSegmentsTableToolbar.tsx";
import { AnnotatedSegmentsActions } from "./annotatedSegmentsSlice.ts";
import { useAnnotatedSegmentQuery } from "./useAnnotatedSegmentsQuery.ts";
import { useInitAnnotatedSegmentsFilterSlice } from "./useInitAnnotatedSegmentsFilterSlice.ts";

interface AnnotatedSegmentsTableProps {
  onRowContextMenu: (event: React.MouseEvent<HTMLTableRowElement>, spanAnnotationId: number) => void;
}

function AnnotatedSegmentsTable({ onRowContextMenu }: AnnotatedSegmentsTableProps) {
  const projectId = parseInt(useParams<{ projectId: string }>().projectId!);

  // global client state (react router)
  const { user } = useAuth();

  // global client state (redux)
  const paginationModel = useAppSelector((state) => state.annotatedSegments.paginationModel);
  const rowSelectionModel = useAppSelector((state) => state.annotatedSegments.rowSelectionModel);
  const sortingModel = useAppSelector((state) => state.annotatedSegments.sortModel);
  const dispatch = useAppDispatch();

  // custom hooks (query)
  const annotatedSegments = useAnnotatedSegmentQuery(projectId);
  const tableInfo = useInitAnnotatedSegmentsFilterSlice({ projectId });

  // actions
  const handleRowContextMenu = (event: React.MouseEvent<HTMLTableRowElement>, spanAnnotationId: number) => {
    dispatch(AnnotatedSegmentsActions.onSelectionModelChange({ [spanAnnotationId]: true }));
    onRowContextMenu(event, spanAnnotationId);
  };

  // computed
  const columns: MRT_ColumnDef<{ spanAnnotationId: number }>[] = useMemo(() => {
    if (!tableInfo.data || !user) return [];

    const result = tableInfo.data.map((column) => {
      const colDef = {
        id: column.column.toString(),
        header: column.label,
        enableSorting: column.sortable,
      };

      switch (column.column) {
        case AnnotatedSegmentsColumns.ASC_SOURCE_SOURCE_DOCUMENT_FILENAME:
          return {
            ...colDef,
            // flex: 2,
            Cell: ({ row }) => (
              <SpanAnnotationRenderer
                spanAnnotation={row.original.spanAnnotationId}
                showCode={false}
                showSpanText={false}
                showSdoc
                sdocRendererProps={{
                  link: true,
                  renderFilename: true,
                  renderDoctypeIcon: true,
                }}
              />
            ),
          } as MRT_ColumnDef<{ spanAnnotationId: number }>;
        case AnnotatedSegmentsColumns.ASC_DOCUMENT_DOCUMENT_TAG_ID_LIST:
          return {
            ...colDef,
            flex: 2,
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
            flex: 3,
            description: "Your comments on the annotation",
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
            flex: 3,
            Cell: ({ row }) => (
              <SpanAnnotationRenderer spanAnnotation={row.original.spanAnnotationId} showCode={false} />
            ),
          } as MRT_ColumnDef<{ spanAnnotationId: number }>;
        default:
          if (typeof column.column === "number") {
            return {
              ...colDef,
              flex: 1,
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
              flex: 1,
              Cell: () => <i>Cannot render column {column.column}</i>,
            } as MRT_ColumnDef<{ spanAnnotationId: number }>;
          }
      }
    });

    return result;
  }, [tableInfo.data, user]);

  // table
  const table = useMaterialReactTable({
    data: annotatedSegments.data?.span_annotation_ids.map((spanAnnotationId) => ({ spanAnnotationId })) || [],
    columns: columns,
    getRowId: (row) => row.spanAnnotationId.toString(),
    enableColumnFilters: false,
    // state
    state: {
      rowSelection: rowSelectionModel,
      pagination: paginationModel,
      sorting: sortingModel,
      isLoading: annotatedSegments.isLoading || annotatedSegments.isPlaceholderData || columns.length === 0,
    },
    // row actions
    muiTableBodyRowProps: ({ row }) => ({
      onContextMenu: (event) => handleRowContextMenu(event, row.original.spanAnnotationId),
    }),
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
    // pagination
    rowCount: annotatedSegments.data?.total_results || 0,
    onPaginationChange: (paginationUpdater) => {
      let newPaginationModel: MRT_PaginationState;
      if (typeof paginationUpdater === "function") {
        newPaginationModel = paginationUpdater(paginationModel);
      } else {
        newPaginationModel = paginationUpdater;
      }
      dispatch(AnnotatedSegmentsActions.onPaginationModelChange(newPaginationModel));
    },
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
    // toolbar
    renderToolbarInternalActions: AnnotatedSegmentsTableToolbar,
  });

  if (annotatedSegments.isError) {
    return (
      <Typography variant="body1" color="inherit" component="div">
        {annotatedSegments.error?.message}
      </Typography>
    );
  } else {
    return <MaterialReactTable table={table} />;
  }
}

export default AnnotatedSegmentsTable;
