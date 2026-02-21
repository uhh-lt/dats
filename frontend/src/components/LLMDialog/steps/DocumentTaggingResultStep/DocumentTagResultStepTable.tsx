import { Box, Button, Stack, Typography } from "@mui/material";
import {
  getMRT_RowSelectionHandler,
  MaterialReactTable,
  MRT_ColumnDef,
  MRT_RowModel,
  MRT_RowSelectionState,
  MRT_ShowHideColumnsButton,
  MRT_ToggleDensePaddingButton,
  useMaterialReactTable,
} from "material-react-table";
import { useMemo, useState } from "react";
import { TagRead } from "../../../../api/openapi/models/TagRead.ts";
import { SdocRenderer } from "../../../../core/source-document/renderer/SdocRenderer.tsx";
import { TagRenderer } from "../../../../core/tag/renderer/TagRenderer.tsx";
import { DocumentTaggingResultRow } from "./DocumentTaggingResultRow.ts";

function CustomTagsRenderer({ tags }: { tags: TagRead[] }) {
  if (tags.length === 0) {
    return <i>no tags</i>;
  }
  return (
    <Stack>
      {tags.map((tag) => (
        <TagRenderer key={tag.id} tag={tag} mr={0.5} sx={{ textWrap: "nowrap" }} />
      ))}
    </Stack>
  );
}

export function DocumentTagResultStepTable<T extends DocumentTaggingResultRow>({
  rows,
  onUpdateRows,
}: {
  rows: T[];
  onUpdateRows: React.Dispatch<React.SetStateAction<T[]>>;
}) {
  // local state
  const [rowSelectionModel, setRowSelectionModel] = useState<MRT_RowSelectionState>({});
  const buttonsDisabled = Object.keys(rowSelectionModel).length === 0;

  // columns
  const columns: MRT_ColumnDef<T>[] = useMemo(
    () => [
      {
        id: "Name",
        header: "Document",
        Cell: ({ row }) => <SdocRenderer sdoc={row.original.sdocId} renderName />,
      },
      {
        id: "CurrentTags",
        header: "Current Tags",
        Cell: ({ row }) => <CustomTagsRenderer tags={row.original.current_tags} />,
      },
      {
        id: "SuggestedTags",
        header: "Suggested Tags",
        Cell: ({ row }) => <CustomTagsRenderer tags={row.original.suggested_tags} />,
      },
      {
        id: "FinalTags",
        header: "Final Tags",
        Cell: ({ row }) => <CustomTagsRenderer tags={row.original.merged_tags} />,
      },
    ],
    [],
  );

  // actions
  const applyCurrentTags = (selectedRows: MRT_RowModel<T>) => () => {
    onUpdateRows((rows) => {
      const result = [...rows];
      selectedRows.rows.forEach((selectedRow) => {
        result[selectedRow.index] = {
          ...result[selectedRow.index],
          merged_tags: result[selectedRow.index].current_tags,
        };
      });
      return result;
    });
  };

  const applySuggestedTags = (selectedRows: MRT_RowModel<T>) => () => {
    onUpdateRows((rows) => {
      const result = [...rows];
      selectedRows.rows.forEach((selectedRow) => {
        result[selectedRow.index] = {
          ...result[selectedRow.index],
          merged_tags: result[selectedRow.index].suggested_tags,
        };
      });
      return result;
    });
  };

  const applyMergeTags = (selectedRows: MRT_RowModel<T>) => () => {
    onUpdateRows((rows) => {
      const result = [...rows];
      selectedRows.rows.forEach((selectedRow) => {
        result[selectedRow.index] = {
          ...result[selectedRow.index],
          merged_tags: [
            ...new Set([...result[selectedRow.index].current_tags, ...result[selectedRow.index].suggested_tags]),
          ],
        };
      });
      return result;
    });
  };

  // table
  const table = useMaterialReactTable<T>({
    data: rows,
    columns: columns,
    getRowId: (row) => `${row.sdocId}`,
    // state
    state: {
      rowSelection: rowSelectionModel,
    },
    // selection
    enableRowSelection: true,
    //clicking anywhere on the row will select it
    muiTableBodyRowProps: ({ row, staticRowIndex, table }) => ({
      onClick: (event) => getMRT_RowSelectionHandler({ row, staticRowIndex, table })(event),
      sx: { cursor: "pointer" },
    }),
    positionToolbarAlertBanner: "bottom",
    onRowSelectionChange: setRowSelectionModel,
    // expansion
    enableExpandAll: false, //disable expand all button
    positionExpandColumn: "last",
    muiExpandButtonProps: ({ row, table }) => ({
      onClick: () => table.setExpanded({ [row.id]: !row.getIsExpanded() }), //only 1 detail panel open at a time
      sx: {
        transform: row.getIsExpanded() ? "rotate(180deg)" : "rotate(90deg)",
        transition: "transform 0.2s",
      },
    }),
    renderDetailPanel: ({ row }) => (
      <Box
        sx={{
          width: "100%",
        }}
      >
        <Typography>{row.original.reasoning}</Typography>
      </Box>
    ),
    localization: {
      expand: "Explanation",
    },
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
    // toolbars
    enableBottomToolbar: false,
    renderTopToolbarCustomActions: ({ table }) => (
      <Stack direction="row" alignItems="center" gap={0.5} mx={1}>
        <Typography variant="body1" mr={1}>
          Merging strategy:
        </Typography>
        <Button disabled={buttonsDisabled} variant="contained" onClick={applyCurrentTags(table.getSelectedRowModel())}>
          Use Current
        </Button>
        <Button
          disabled={buttonsDisabled}
          variant="contained"
          onClick={applySuggestedTags(table.getSelectedRowModel())}
        >
          Use Suggested
        </Button>
        <Button disabled={buttonsDisabled} variant="contained" onClick={applyMergeTags(table.getSelectedRowModel())}>
          Merge Both
        </Button>
      </Stack>
    ),
    renderToolbarInternalActions: ({ table }) => (
      <Stack direction="row" spacing={1}>
        <MRT_ShowHideColumnsButton table={table} />
        <MRT_ToggleDensePaddingButton table={table} />
      </Stack>
    ),
  });

  return <MaterialReactTable table={table} />;
}
