import { DataGrid, GridColDef, GridPaginationModel } from "@mui/x-data-grid";
import { useMemo } from "react";
import { AttachedObjectType } from "../../api/openapi";
import { useAuth } from "../../auth/AuthProvider";
import MemoRenderer2 from "../DataGrid/MemoRenderer2";
import SpanAnnotationRenderer from "../DataGrid/SpanAnnotationRenderer";

interface SpanAnnotationTableProps {
  rows: { spanAnnotationId: number }[];
  rowCount: number;
  loading: boolean;
  rowSelectionModel: number[];
  onRowSelectionModelChange: (selectionModel: number[]) => void;
  paginationModel: GridPaginationModel;
  onPaginationModelChange: (model: GridPaginationModel) => void;
  onRowContextMenu: (event: React.MouseEvent<HTMLDivElement>, spanAnnotationId: number) => void;
}

function SpanAnnotationTable({
  rows: data,
  rowCount,
  loading,
  rowSelectionModel,
  onRowSelectionModelChange,
  paginationModel,
  onPaginationModelChange,
  onRowContextMenu,
}: SpanAnnotationTableProps) {
  // global client state (react router)
  const { user } = useAuth();

  // computed
  const columns: GridColDef<{ spanAnnotationId: number }>[] = useMemo(
    () => [
      {
        field: "memo",
        headerName: "Memo",
        flex: 3,
        description: "Your comments on the annotation",
        renderCell: (params) =>
          user.data ? (
            <MemoRenderer2
              attachedObjectType={AttachedObjectType.SPAN_ANNOTATION}
              attachedObjectId={params.row.spanAnnotationId}
              userId={user.data.id}
              showTitle={false}
              showContent
              showIcon={false}
            />
          ) : null,
      },
      {
        field: "sdoc",
        headerName: "Document",
        flex: 2,
        renderCell: (params) => (
          <SpanAnnotationRenderer
            spanAnnotation={params.row.spanAnnotationId}
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
      },
      {
        field: "tags",
        headerName: "Tags",
        flex: 2,
        renderCell: (params) => (
          <SpanAnnotationRenderer
            spanAnnotation={params.row.spanAnnotationId}
            showCode={false}
            showSpanText={false}
            showSdocTags
          />
        ),
      },
      {
        field: "code",
        headerName: "Code",
        flex: 1,
        renderCell: (params) => (
          <SpanAnnotationRenderer spanAnnotation={params.row.spanAnnotationId} showSpanText={false} />
        ),
      },
      {
        field: "annotation",
        headerName: "Annotated text",
        flex: 3,
        renderCell: (params) => (
          <SpanAnnotationRenderer spanAnnotation={params.row.spanAnnotationId} showCode={false} />
        ),
      },
    ],
    [user.data],
  );

  // actions
  const handleContextMenu = (event: React.MouseEvent<HTMLDivElement>) => {
    event.preventDefault();

    if (!event.currentTarget) {
      return;
    }
    const spanAnnotationId = Number((event.currentTarget as HTMLDivElement).getAttribute("data-id"));
    onRowContextMenu(event, spanAnnotationId);
  };

  return (
    <DataGrid
      rows={data}
      columns={columns}
      getRowId={(row) => row.spanAnnotationId}
      style={{ border: "none" }}
      slotProps={{
        row: {
          onContextMenu: handleContextMenu,
        },
      }}
      disableColumnFilter
      // selection
      checkboxSelection
      rowSelectionModel={rowSelectionModel}
      onRowSelectionModelChange={(selectionModel) => onRowSelectionModelChange(selectionModel as number[])}
      // server side pagination
      autoPageSize
      paginationMode="server"
      rowCount={rowCount}
      paginationModel={paginationModel}
      onPaginationModelChange={onPaginationModelChange}
      keepNonExistentRowsSelected
      loading={loading}
    />
  );
}

export default SpanAnnotationTable;
