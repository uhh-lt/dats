import { Stack } from "@mui/material";
import {
  MRT_ColumnDef,
  MRT_ShowHideColumnsButton,
  MRT_TableInstance,
  MRT_ToggleDensePaddingButton,
  MaterialReactTable,
  useMaterialReactTable,
} from "material-react-table";
import { useMemo } from "react";
import { AttachedObjectType } from "../../../api/openapi/models/AttachedObjectType.ts";
import { useAuth } from "../../../features/auth/useAuth.ts";
import { MemoRenderer2 } from "../../memo/renderer/MemoRenderer2.tsx";
import { SentenceAnnotationRenderer } from "../renderer/SentenceAnnotationRenderer.tsx";

interface SentenceAnnotationTableRow {
  sentAnnoId: number;
}

const renderToolbaInternalContent = ({ table }: { table: MRT_TableInstance<SentenceAnnotationTableRow> }) => (
  <Stack direction="row" spacing={1}>
    <MRT_ShowHideColumnsButton table={table} />
    <MRT_ToggleDensePaddingButton table={table} />
  </Stack>
);

export function SentenceAnnotationTableSimple({ sentAnnoIds }: { sentAnnoIds: number[] }) {
  // global client state (react router)
  const { user } = useAuth();

  // computed
  const data = useMemo(() => sentAnnoIds.map((sentAnnoId) => ({ sentAnnoId })), [sentAnnoIds]);
  const columns: MRT_ColumnDef<SentenceAnnotationTableRow>[] = useMemo(
    () => [
      {
        id: "Text",
        header: "Text",
        Cell: ({ row }) => <SentenceAnnotationRenderer sentenceAnnotation={row.original.sentAnnoId} showSpanText />,
      },
      {
        id: "Code",
        header: "Code",
        Cell: ({ row }) => <SentenceAnnotationRenderer sentenceAnnotation={row.original.sentAnnoId} showCode />,
      },
      {
        id: "Name",
        header: "Document",
        Cell: ({ row }) => (
          <SentenceAnnotationRenderer
            sentenceAnnotation={row.original.sentAnnoId}
            showSdoc
            sdocRendererProps={{ renderName: true, link: true }}
          />
        ),
      },
      {
        id: "Tags",
        header: "Tags",
        Cell: ({ row }) => <SentenceAnnotationRenderer sentenceAnnotation={row.original.sentAnnoId} showSdocTags />,
      },
      {
        id: "Memo",
        header: "Memo",
        description: "Your comments on the document",
        Cell: ({ row }) =>
          user ? (
            <MemoRenderer2
              attachedObjectType={AttachedObjectType.SENTENCE_ANNOTATION}
              attachedObjectId={row.original.sentAnnoId}
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
  const table = useMaterialReactTable<SentenceAnnotationTableRow>({
    data: data,
    columns: columns,
    getRowId: (row) => `${row.sentAnnoId}`,
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
