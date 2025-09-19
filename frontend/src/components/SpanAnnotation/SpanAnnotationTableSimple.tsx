import { Stack } from "@mui/material";
import {
  MRT_ColumnDef,
  MRT_ShowHideColumnsButton,
  MRT_TableInstance,
  MRT_ToggleDensePaddingButton,
  MaterialReactTable,
  useMaterialReactTable,
} from "material-react-table";
import { memo, useMemo } from "react";
import { AttachedObjectType } from "../../api/openapi/models/AttachedObjectType.ts";
import { useAuth } from "../../auth/useAuth.ts";
import MemoRenderer2 from "../Memo/MemoRenderer2.tsx";
import SpanAnnotationRenderer from "./SpanAnnotationRenderer.tsx";

interface SpanAnnotationTableRow {
  spanAnnoId: number;
}

const renderToolbaInternalContent = ({ table }: { table: MRT_TableInstance<SpanAnnotationTableRow> }) => (
  <Stack direction="row" spacing={1}>
    <MRT_ShowHideColumnsButton table={table} />
    <MRT_ToggleDensePaddingButton table={table} />
  </Stack>
);

function SpanAnnotationTableSimple({ spanAnnoIds }: { spanAnnoIds: number[] }) {
  // global client state (react router)
  const { user } = useAuth();

  // computed
  const data = useMemo(() => spanAnnoIds.map((spanAnnoId) => ({ spanAnnoId })), [spanAnnoIds]);
  const columns: MRT_ColumnDef<SpanAnnotationTableRow>[] = useMemo(
    () => [
      {
        id: "Text",
        header: "Text",
        Cell: ({ row }) => <SpanAnnotationRenderer spanAnnotation={row.original.spanAnnoId} showSpanText />,
      },
      {
        id: "Code",
        header: "Code",
        Cell: ({ row }) => <SpanAnnotationRenderer spanAnnotation={row.original.spanAnnoId} showCode />,
      },
      {
        id: "Name",
        header: "Document",
        Cell: ({ row }) => (
          <SpanAnnotationRenderer
            spanAnnotation={row.original.spanAnnoId}
            showSdoc
            sdocRendererProps={{ renderName: true, link: true }}
          />
        ),
      },
      {
        id: "Tags",
        header: "Tags",
        Cell: ({ row }) => <SpanAnnotationRenderer spanAnnotation={row.original.spanAnnoId} showSdocTags />,
      },
      {
        id: "Memo",
        header: "Memo",
        description: "Your comments on the document",
        Cell: ({ row }) =>
          user ? (
            <MemoRenderer2
              attachedObjectType={AttachedObjectType.SPAN_ANNOTATION}
              attachedObjectId={row.original.spanAnnoId}
              showTitle={false}
              showContent
              showIcon={false}
            />
          ) : null,
      },
    ],
    [user],
  );

  // table
  const table = useMaterialReactTable<SpanAnnotationTableRow>({
    data: data,
    columns: columns,
    getRowId: (row) => `${row.spanAnnoId}`,
    // style
    muiTablePaperProps: {
      elevation: 0,
      style: { height: "100%", display: "flex", flexDirection: "column" },
    },
    muiTableContainerProps: {
      style: { flexGrow: 1 },
    },
    // virtualization (scrolling instead of pagination)
    enablePagination: false,
    enableRowVirtualization: true,
    // hide columns per default
    initialState: {
      columnVisibility: {
        Memo: false,
      },
    },
    // toolbar
    enableBottomToolbar: false,
    renderToolbarInternalActions: renderToolbaInternalContent,
  });

  return <MaterialReactTable table={table} />;
}

export default memo(SpanAnnotationTableSimple);
