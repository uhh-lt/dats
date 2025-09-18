import { Box } from "@mui/material";
import { MaterialReactTable, MRT_ColumnDef, useMaterialReactTable } from "material-react-table";
import { memo, useMemo } from "react";
import { ClusterRead } from "../../../api/openapi/models/ClusterRead.ts";
import { PerspectivesDoc } from "../../../api/openapi/models/PerspectivesDoc.ts";
import PerspectivesHooks from "../../../api/PerspectivesHooks.ts";
import SdocRenderer from "../../../components/SourceDocument/SdocRenderer.tsx";
import { useAppSelector } from "../../../plugins/ReduxHooks.ts";
import { getIconComponent, Icon } from "../../../utils/icons/iconUtils.tsx";

interface DocAspectTableProps {
  aspectId: number;
  height: number;
  cluster?: ClusterRead;
}

function DocAspectTable({ aspectId, height, cluster }: DocAspectTableProps) {
  // global server state
  const vis = PerspectivesHooks.useGetDocVisualization(aspectId);
  const colorScheme = useAppSelector((state) => state.perspectives.colorScheme);

  // computed
  const { data, cluster2Index } = useMemo(() => {
    if (!vis.data) return { data: [], cluster2Index: {} };

    let data: PerspectivesDoc[] = [];

    if (cluster) {
      // data = vis.data.docs.filter((doc) => doc.cluster_id === cluster.id);
      if (cluster.top_docs) {
        const sdocId2PerspectivesDoc: Record<number, PerspectivesDoc> = vis.data.docs.reduce(
          (acc, doc) => {
            acc[doc.sdoc_id] = doc;
            return acc;
          },
          {} as Record<number, PerspectivesDoc>,
        );
        cluster.top_docs.forEach((sdocId) => {
          data.push(sdocId2PerspectivesDoc[sdocId]);
        });
      }
    } else {
      data = vis.data.docs.slice(0, 9); // default to first 9 documents if no sdocIds provided
    }
    return {
      data,
      cluster2Index: vis.data.clusters.reduce(
        (acc, cluster, index) => {
          acc[cluster.id] = index;
          return acc;
        },
        {} as Record<number, number>,
      ),
    };
  }, [vis.data, cluster]);

  const columns: MRT_ColumnDef<PerspectivesDoc>[] = useMemo(
    () => [
      {
        id: "Name",
        header: "Name",
        minSize: 100,
        size: 200,
        grow: false,
        Cell: ({ row }) => <SdocRenderer sdoc={row.original.sdoc_id} link renderName />,
      },
      {
        id: "Cluster",
        header: "Cluster",
        minSize: 90,
        size: 90,
        grow: false,
        Cell: ({ row }) => (
          <Box width={42} height={42} display="flex" alignItems="center" justifyContent="flex-start">
            {getIconComponent(Icon.CLUSTER, {
              style: { color: colorScheme[cluster2Index[row.original.cluster_id] % colorScheme.length] },
            })}
          </Box>
        ),
      },
      {
        id: "Content",
        header: "Content",
        description: "Content of the document",
        grow: true, // Allow this column to fill remaining space
        enableResizing: false, // Enable resizing for this column
        Cell: ({ row }) => <ContentRenderer aspectId={aspectId} sdocId={row.original.sdoc_id} />,
      },
    ],
    [aspectId, colorScheme, cluster2Index],
  );

  // table
  const table = useMaterialReactTable<PerspectivesDoc>({
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
      sx: {
        borderColor: "grey.500",
      },
    },
    muiTableContainerProps: {
      style: {
        height: height,
      },
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
  const content = PerspectivesHooks.useGetDocumentAspect(aspectId, sdocId);
  if (!content.data) return null;
  return content.data;
}

export default memo(DocAspectTable);
