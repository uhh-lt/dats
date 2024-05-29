import { Stack } from "@mui/material";
import {
  MRT_ColumnDef,
  MRT_ShowHideColumnsButton,
  MRT_ToggleDensePaddingButton,
  MaterialReactTable,
  useMaterialReactTable,
} from "material-react-table";
import { useMemo } from "react";
import { AttachedObjectType } from "../../api/openapi/models/AttachedObjectType.ts";
import { useAuth } from "../../auth/useAuth.ts";
import MemoRenderer2 from "../DataGrid/MemoRenderer2.tsx";
import SdocRenderer from "../DataGrid/SdocRenderer.tsx";
import SdocTagsRenderer from "../DataGrid/SdocTagRenderer.tsx";

interface SdocTableRow {
  sdocId: number;
}

function SimpleSdocTable({ sdocIds }: { sdocIds: number[] }) {
  // global client state (react router)
  const { user } = useAuth();

  // computed
  const data = useMemo(() => sdocIds.map((sdocId) => ({ sdocId })), [sdocIds]);
  const columns: MRT_ColumnDef<SdocTableRow>[] = useMemo(
    () => [
      {
        header: "Type",
        id: "Type",

        Cell: ({ row }) => <SdocRenderer sdoc={row.original.sdocId} renderDoctypeIcon />,
      },
      {
        id: "Filename",
        header: "Document",
        Cell: ({ row }) => <SdocRenderer sdoc={row.original.sdocId} link renderFilename />,
      },
      {
        id: "Tags",
        header: "Tags",
        Cell: ({ row }) => <SdocTagsRenderer sdocId={row.original.sdocId} />,
      },
      {
        id: "Memo",
        header: "Memo",
        description: "Your comments on the document",
        Cell: ({ row }) =>
          user ? (
            <MemoRenderer2
              attachedObjectType={AttachedObjectType.SOURCE_DOCUMENT}
              attachedObjectId={row.original.sdocId}
              userId={user.id}
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
  const table = useMaterialReactTable({
    data: data,
    columns: columns,
    getRowId: (row) => `${row.sdocId}`,
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
        id: false,
      },
    },
    // toolbar
    enableBottomToolbar: false,
    renderToolbarInternalActions: ({ table }) => (
      <Stack direction="row" spacing={1}>
        <MRT_ShowHideColumnsButton table={table} />
        <MRT_ToggleDensePaddingButton table={table} />
      </Stack>
    ),
  });

  return <MaterialReactTable table={table} />;
}

export default SimpleSdocTable;
