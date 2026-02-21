import { Stack } from "@mui/material";
import {
  MaterialReactTable,
  MRT_ColumnDef,
  MRT_ShowHideColumnsButton,
  MRT_TableInstance,
  MRT_ToggleDensePaddingButton,
  useMaterialReactTable,
} from "material-react-table";
import { memo, useCallback, useMemo } from "react";
import { AttachedObjectType } from "../../../api/openapi/models/AttachedObjectType.ts";
import { useAuth } from "../../../features/auth/useAuth.ts";
import { MemoRenderer2 } from "../../memo/renderer/MemoRenderer2.tsx";
import { BBoxAnnotationRenderer } from "../renderer/BBoxAnnotationRenderer.tsx";

interface BBoxAnnotationTableRow {
  bboxAnnoId: number;
}

export const BBoxAnnotationTableSimple = memo(({ bboxAnnoIds }: { bboxAnnoIds: number[] }) => {
  // global client state (react router)
  const { user } = useAuth();

  // computed data
  const data = useMemo(() => bboxAnnoIds.map((bboxAnnoId) => ({ bboxAnnoId })), [bboxAnnoIds]);

  // memoized columns definition
  const columns: MRT_ColumnDef<BBoxAnnotationTableRow>[] = useMemo(
    () => [
      {
        id: "Text",
        header: "Text",
        Cell: ({ row }) => <BBoxAnnotationRenderer bboxAnnotation={row.original.bboxAnnoId} showSpanText />,
      },
      {
        id: "Code",
        header: "Code",
        Cell: ({ row }) => <BBoxAnnotationRenderer bboxAnnotation={row.original.bboxAnnoId} showCode />,
      },
      {
        id: "Name",
        header: "Document",
        Cell: ({ row }) => (
          <BBoxAnnotationRenderer
            bboxAnnotation={row.original.bboxAnnoId}
            showSdoc
            sdocRendererProps={{ renderName: true, link: true }}
          />
        ),
      },
      {
        id: "Tags",
        header: "Tags",
        Cell: ({ row }) => <BBoxAnnotationRenderer bboxAnnotation={row.original.bboxAnnoId} showSdocTags />,
      },
      {
        id: "Memo",
        header: "Memo",
        description: "Your comments on the document",
        Cell: ({ row }) =>
          user ? (
            <MemoRenderer2
              attachedObjectType={AttachedObjectType.BBOX_ANNOTATION}
              attachedObjectId={row.original.bboxAnnoId}
              showTitle={false}
              showContent
              showIcon={false}
            />
          ) : null,
      },
    ],
    [user],
  );

  // memoized toolbar renderer
  const renderToolbarActions = useCallback(
    ({ table }: { table: MRT_TableInstance<BBoxAnnotationTableRow> }) => (
      <Stack direction="row" spacing={1}>
        <MRT_ShowHideColumnsButton table={table} />
        <MRT_ToggleDensePaddingButton table={table} />
      </Stack>
    ),
    [],
  );

  // table
  const table = useMaterialReactTable<BBoxAnnotationTableRow>({
    data: data,
    columns: columns,
    getRowId: (row) => `${row.bboxAnnoId}`,
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
    renderToolbarInternalActions: renderToolbarActions,
  });

  return <MaterialReactTable table={table} />;
});
