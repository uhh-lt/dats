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
import { BBoxAnnotationRenderer } from "../BBoxAnnotationRenderer";

interface BBoxAnnotationTableRow {
  bboxAnnoId: number;
}

const columns: MRT_ColumnDef<BBoxAnnotationTableRow>[] = [
  {
    id: "Text",
    header: "Text",
    Cell: ({ row }) => <BBoxAnnotationRenderer bboxAnnotation={row.original.bboxAnnoId} showText />,
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
    Cell: ({ row }) => <BBoxAnnotationRenderer bboxAnnotation={row.original.bboxAnnoId} renderMemoIndicator />,
  },
];

export const BBoxAnnotationTableSimple = memo(({ bboxAnnoIds }: { bboxAnnoIds: number[] }) => {
  // computed data
  const data = useMemo(() => bboxAnnoIds.map((bboxAnnoId) => ({ bboxAnnoId })), [bboxAnnoIds]);

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
