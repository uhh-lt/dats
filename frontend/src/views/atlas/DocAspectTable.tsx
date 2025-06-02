import { MRT_ColumnDef, MaterialReactTable, useMaterialReactTable } from "material-react-table";
import { memo, useMemo } from "react";
import TopicModellingHooks from "../../api/TopicModellingHooks.ts";
import SdocRenderer from "../../components/SourceDocument/SdocRenderer.tsx";
import SdocTagsRenderer from "../../components/SourceDocument/SdocTagRenderer.tsx";

interface SdocTableRow {
  sdocId: number;
}

interface DocAspectTableProps {
  aspectId: number;
  height: number;
}

function DocAspectTable({ aspectId, height }: DocAspectTableProps) {
  // global server state
  const vis = TopicModellingHooks.useGetDocVisualization(aspectId);

  // computed
  const data: SdocTableRow[] = useMemo(() => {
    if (!vis.data) return [];
    return vis.data.docs.slice(0, 9).map((doc) => ({ sdocId: doc.sdoc_id }));
  }, [vis]);

  const columns: MRT_ColumnDef<SdocTableRow>[] = useMemo(
    () => [
      {
        id: "Filename",
        header: "Filename",
        minSize: 100,
        size: 200,
        grow: false,
        Cell: ({ row }) => <SdocRenderer sdoc={row.original.sdocId} link renderFilename />,
      },
      {
        id: "Tags",
        header: "Tags",
        minSize: 70,
        size: 200,
        grow: false,
        Cell: ({ row }) => <SdocTagsRenderer sdocId={row.original.sdocId} />,
      },
      {
        id: "Content",
        header: "Content",
        description: "Content of the document",
        grow: true, // Allow this column to fill remaining space
        enableResizing: false, // Enable resizing for this column
        Cell: ({ row }) => <ContentRenderer aspectId={aspectId} sdocId={row.original.sdocId} />,
      },
    ],
    [aspectId],
  );

  // table
  const table = useMaterialReactTable<SdocTableRow>({
    data: data,
    columns: columns,
    state: {
      isLoading: vis.isLoading || vis.isFetching,
      density: "compact",
    },
    getRowId: (row) => `${row.sdocId}`,
    // style
    muiTablePaperProps: {
      variant: "outlined",
      style: { height },
    },
    // Enable column resizing
    enableColumnResizing: true,
    // virtualization (scrolling instead of pagination)
    enablePagination: false,
    enableRowVirtualization: true,
    // toolbar
    enableBottomToolbar: false,
    enableTopToolbar: false,
    layoutMode: "grid",
  });

  return <MaterialReactTable table={table} />;
}

function ContentRenderer({ aspectId, sdocId }: { aspectId: number; sdocId: number }) {
  const content = TopicModellingHooks.useGetDocumentAspect(aspectId, sdocId);
  if (!content.data) return null;
  return content.data;
}

export default memo(DocAspectTable);
