import { Box, Button, Stack, Typography } from "@mui/material";
import {
  MaterialReactTable,
  MRT_ColumnDef,
  MRT_RowModel,
  MRT_RowSelectionState,
  MRT_ShowHideColumnsButton,
  MRT_ToggleDensePaddingButton,
  useMaterialReactTable,
} from "material-react-table";
import { useEffect, useState } from "react";
import { DocumentTaggingResult } from "../../../../api/openapi/models/DocumentTaggingResult.ts";
import { DocumentTagRead } from "../../../../api/openapi/models/DocumentTagRead.ts";
import SdocRenderer from "../../../SourceDocument/SdocRenderer.tsx";
import TagRenderer from "../../../Tag/TagRenderer.tsx";
import { DocumentTaggingResultRow } from "./DocumentTaggingResultRow.ts";

function CustomTagsRenderer({ tags }: { tags: DocumentTagRead[] }) {
  if (tags.length === 0) {
    return <i>no tags</i>;
  }
  return (
    <Stack>
      {tags.map((tag) => (
        <TagRenderer key={typeof tag === "number" ? tag : tag.id} tag={tag} mr={0.5} sx={{ textWrap: "nowrap" }} />
      ))}
    </Stack>
  );
}

const columns: MRT_ColumnDef<DocumentTaggingResultRow>[] = [
  {
    id: "Filename",
    header: "Document",
    Cell: ({ row }) => <SdocRenderer sdoc={row.original.sdocId} renderFilename />,
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
    id: "NewTags",
    header: "New Tags",
    Cell: ({ row }) => <CustomTagsRenderer tags={row.original.merged_tags} />,
  },
];

function DocumentTagResultStepTable({
  data,
  projectTags,
  rows,
  onUpdateRows,
}: {
  data: DocumentTaggingResult[];
  projectTags: DocumentTagRead[];
  rows: DocumentTaggingResultRow[];
  onUpdateRows: React.Dispatch<React.SetStateAction<DocumentTaggingResultRow[]>>;
}) {
  // local state
  const [rowSelectionModel, setRowSelectionModel] = useState<MRT_RowSelectionState>({});
  const buttonsDisabled = Object.keys(rowSelectionModel).length === 0;

  // init rows
  useEffect(() => {
    const tagId2Tag = projectTags.reduce(
      (acc, tag) => {
        acc[tag.id] = tag;
        return acc;
      },
      {} as Record<number, DocumentTagRead>,
    );

    onUpdateRows(
      data.map((result) => {
        return {
          sdocId: result.sdoc_id,
          current_tags: result.current_tag_ids.map((tagId) => tagId2Tag[tagId]),
          suggested_tags: result.suggested_tag_ids.map((tagId) => tagId2Tag[tagId]),
          merged_tags: [...new Set([...result.current_tag_ids, ...result.suggested_tag_ids])].map(
            (tagId) => tagId2Tag[tagId],
          ),
          reasoning: result.reasoning,
        };
      }),
    );
  }, [data, onUpdateRows, projectTags]);

  // actions
  const applyCurrentTags = (selectedRows: MRT_RowModel<DocumentTaggingResultRow>) => () => {
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

  const applySuggestedTags = (selectedRows: MRT_RowModel<DocumentTaggingResultRow>) => () => {
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

  const applyMergeTags = (selectedRows: MRT_RowModel<DocumentTaggingResultRow>) => () => {
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
  const table = useMaterialReactTable<DocumentTaggingResultRow>({
    data: rows,
    columns: columns,
    getRowId: (row) => `${row.sdocId}`,
    // state
    state: {
      rowSelection: rowSelectionModel,
    },
    // selection
    enableRowSelection: true,
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
    enableBottomToolbar: true,
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

export default DocumentTagResultStepTable;
