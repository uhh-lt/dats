import { Typography } from "@mui/material";
import { GridColDef } from "@mui/x-data-grid";
import { useMemo } from "react";
import { useParams } from "react-router-dom";
import { AnnotatedSegmentsColumns, AttachedObjectType } from "../../../api/openapi";
import { useAuth } from "../../../auth/AuthProvider";
import MemoRenderer2 from "../../../components/DataGrid/MemoRenderer2";
import SpanAnnotationRenderer from "../../../components/DataGrid/SpanAnnotationRenderer";
import ServerDataGrid from "../../../components/DataGridTables/ServerDataGrid";
import { useAppDispatch, useAppSelector } from "../../../plugins/ReduxHooks";
import { AnnotatedSegmentsActions } from "./annotatedSegmentsSlice";
import { useAnnotatedSegmentQuery } from "./useAnnotatedSegmentsQuery";
import { useInitAnnotatedSegmentsFilterSlice } from "./useInitAnnotatedSegmentsFilterSlice";
import SdocMetadataRenderer from "../../../components/DataGrid/SdocMetadataRenderer";

interface AnnotateSegmentsTableProps {
  onRowContextMenu: (event: React.MouseEvent<HTMLDivElement>, spanAnnotationId: number) => void;
}

function AnnotateSegmentsTable({ onRowContextMenu }: AnnotateSegmentsTableProps) {
  const projectId = parseInt(useParams<{ projectId: string }>().projectId!);

  // global client state (react router)
  const { user } = useAuth();

  // global client state (redux)
  const paginationModel = useAppSelector((state) => state.annotatedSegments.paginationModel);
  const rowSelectionModel = useAppSelector((state) => state.annotatedSegments.rowSelectionModel);
  const sortModel = useAppSelector((state) => state.annotatedSegments.sortModel);
  const dispatch = useAppDispatch();

  // custom hooks (query)
  const annotatedSegments = useAnnotatedSegmentQuery(projectId);
  const tableInfo = useInitAnnotatedSegmentsFilterSlice({ projectId });

  // actions
  const handleRowContextMenu = (event: React.MouseEvent<HTMLDivElement>, spanAnnotationId: number) => {
    dispatch(AnnotatedSegmentsActions.onSelectionModelChange([spanAnnotationId]));
    onRowContextMenu(event, spanAnnotationId);
  };

  // computed
  const columns: GridColDef<{ id: number }>[] = useMemo(() => {
    if (!tableInfo.data || !user.data) return [];

    const result = tableInfo.data.map((column) => {
      const colDef = {
        field: column.column,
        headerName: column.label,
        sortable: column.sortable,
      } as GridColDef<{ id: number }>;

      switch (column.column) {
        case AnnotatedSegmentsColumns.ASC_SOURCE_SOURCE_DOCUMENT_FILENAME:
          return {
            ...colDef,
            flex: 2,
            renderCell: (params) => (
              <SpanAnnotationRenderer
                spanAnnotation={params.row.id}
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
          } as GridColDef<{ id: number }>;
        case AnnotatedSegmentsColumns.ASC_DOCUMENT_DOCUMENT_TAG_ID_LIST:
          return {
            ...colDef,
            flex: 2,
            renderCell: (params) => (
              <SpanAnnotationRenderer
                spanAnnotation={params.row.id}
                showCode={false}
                showSpanText={false}
                showSdocTags
              />
            ),
          } as GridColDef<{ id: number }>;
        case AnnotatedSegmentsColumns.ASC_CODE_ID:
          return {
            ...colDef,
            flex: 1,
            renderCell: (params) => <SpanAnnotationRenderer spanAnnotation={params.row.id} showSpanText={false} />,
          } as GridColDef<{ id: number }>;
        case AnnotatedSegmentsColumns.ASC_MEMO_CONTENT:
          return {
            ...colDef,
            flex: 3,
            description: "Your comments on the annotation",
            renderCell: (params) =>
              user.data ? (
                <MemoRenderer2
                  attachedObjectType={AttachedObjectType.SPAN_ANNOTATION}
                  attachedObjectId={params.row.id}
                  userId={user.data.id}
                  showTitle={false}
                  showContent
                  showIcon={false}
                />
              ) : null,
          } as GridColDef<{ id: number }>;
        case AnnotatedSegmentsColumns.ASC_SPAN_TEXT:
          return {
            ...colDef,
            flex: 3,
            renderCell: (params) => <SpanAnnotationRenderer spanAnnotation={params.row.id} showCode={false} />,
          } as GridColDef<{ id: number }>;
        default:
          if (typeof column.column === "number") {
            return {
              ...colDef,
              flex: 1,
              renderCell: (params) => (
                <SpanAnnotationRenderer
                  spanAnnotation={params.row.id}
                  showCode={false}
                  showSpanText={false}
                  showSdocProjectMetadataId={column.column as number}
                />
              ),
            } as GridColDef<{ id: number }>;
          } else {
            return {
              ...colDef,
              flex: 1,
              renderCell: (params) => <i>Cannot render column {column.column}</i>,
            } as GridColDef<{ id: number }>;
          }
      }
    });

    return result;
  }, [tableInfo.data, user.data]);

  return (
    <>
      {annotatedSegments.isError ? (
        <Typography variant="body1" color="inherit" component="div">
          {annotatedSegments.error?.message}
        </Typography>
      ) : (
        <ServerDataGrid
          rows={annotatedSegments.data?.span_annotation_ids.map((spanAnnotationId) => ({ id: spanAnnotationId })) || []}
          columns={columns}
          rowCount={annotatedSegments.data?.total_results || 0}
          loading={annotatedSegments.isLoading || annotatedSegments.isPreviousData}
          paginationModel={paginationModel}
          onPaginationModelChange={(model) => dispatch(AnnotatedSegmentsActions.onPaginationModelChange(model))}
          rowSelectionModel={rowSelectionModel}
          onRowSelectionModelChange={(selectionModel) =>
            dispatch(AnnotatedSegmentsActions.onSelectionModelChange(selectionModel as number[]))
          }
          sortModel={sortModel}
          onSortModelChange={(sortModel) => dispatch(AnnotatedSegmentsActions.onSortModelChange(sortModel))}
          onRowContextMenu={handleRowContextMenu}
        />
      )}
    </>
  );
}

export default AnnotateSegmentsTable;
