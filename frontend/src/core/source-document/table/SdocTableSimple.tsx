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
import { SdocRenderer, SdocTagsRenderer } from "../renderer";

interface SdocTableRow {
  sdocId: number;
}

const renderToolbarActions = ({ table }: { table: MRT_TableInstance<SdocTableRow> }) => (
  <Stack direction="row" spacing={1}>
    <MRT_ShowHideColumnsButton table={table} />
    <MRT_ToggleDensePaddingButton table={table} />
  </Stack>
);

const columns: MRT_ColumnDef<SdocTableRow>[] = [
  {
    header: "Type",
    id: "Type",
    Cell: ({ row }) => <SdocRenderer sdoc={row.original.sdocId} renderDoctypeIcon />,
  },
  {
    id: "Name",
    header: "Document",
    Cell: ({ row }) => <SdocRenderer sdoc={row.original.sdocId} link renderName />,
  },
  {
    id: "Tags",
    header: "Tags",
    Cell: ({ row }) => <SdocTagsRenderer sdocId={row.original.sdocId} />,
  },
  {
    id: "Memo",
    header: "Memo",
    Cell: ({ row }) => <SdocRenderer sdoc={row.original.sdocId} renderMemoIndicator />,
  },
];

export const SdocTableSimple = memo(({ sdocIds }: { sdocIds: number[] }) => {
  // computed
  const data = useMemo(() => sdocIds.map((sdocId) => ({ sdocId })), [sdocIds]);

  // table
  const table = useMaterialReactTable<SdocTableRow>({
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
        Memo: false,
      },
    },
    // toolbar
    enableBottomToolbar: false,
    renderToolbarInternalActions: renderToolbarActions,
  });

  return <MaterialReactTable table={table} />;
});
