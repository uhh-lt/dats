import { Box } from "@mui/material";
import { MaterialReactTable, MRT_ColumnDef, useMaterialReactTable } from "material-react-table";
import { memo, useMemo } from "react";
import { TMDoc } from "../../api/openapi/models/TMDoc.ts";
import TopicModellingHooks from "../../api/TopicModellingHooks.ts";
import SdocRenderer from "../../components/SourceDocument/SdocRenderer.tsx";
import { useAppSelector } from "../../plugins/ReduxHooks.ts";
import { getIconComponent, Icon } from "../../utils/icons/iconUtils.tsx";

interface DocAspectTableProps {
  aspectId: number;
  height: number;
}

function DocAspectTable({ aspectId, height }: DocAspectTableProps) {
  // global server state
  const vis = TopicModellingHooks.useGetDocVisualization(aspectId);
  const colorScheme = useAppSelector((state) => state.atlas.colorScheme);

  // computed
  const { data, topic2Index } = useMemo(() => {
    if (!vis.data) return { data: [], topic2Index: {} };
    return {
      data: vis.data.docs.slice(0, 9),
      topic2Index: vis.data.topics.reduce(
        (acc, topic, index) => {
          if (!topic.is_outlier) {
            acc[topic.id] = index;
          }
          return acc;
        },
        {} as Record<number, number>,
      ),
    };
  }, [vis]);

  const columns: MRT_ColumnDef<TMDoc>[] = useMemo(
    () => [
      {
        id: "Filename",
        header: "Filename",
        minSize: 100,
        size: 200,
        grow: false,
        Cell: ({ row }) => <SdocRenderer sdoc={row.original.sdoc_id} link renderFilename />,
      },
      {
        id: "Topic",
        header: "Topic",
        minSize: 80,
        size: 80,
        grow: false,
        Cell: ({ row }) => (
          <Box width={42} height={42} display="flex" alignItems="center" justifyContent="flex-start">
            {getIconComponent(Icon.TOPIC, {
              style: { color: colorScheme[topic2Index[row.original.topic_id] % colorScheme.length] },
            })}
          </Box>
        ),
      },
      // {
      //   id: "Tags",
      //   header: "Tags",
      //   minSize: 70,
      //   size: 200,
      //   grow: false,
      //   Cell: ({ row }) => <SdocTagsRenderer sdocId={row.original.sdoc_id} />,
      // },
      {
        id: "Content",
        header: "Content",
        description: "Content of the document",
        grow: true, // Allow this column to fill remaining space
        enableResizing: false, // Enable resizing for this column
        Cell: ({ row }) => <ContentRenderer aspectId={aspectId} sdocId={row.original.sdoc_id} />,
      },
    ],
    [aspectId, colorScheme, topic2Index],
  );

  // table
  const table = useMaterialReactTable<TMDoc>({
    data: data,
    columns: columns,
    state: {
      isLoading: vis.isLoading || vis.isFetching,
      density: "compact",
    },
    getRowId: (row) => `${row.sdoc_id}`,
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
