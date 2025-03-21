import TroubleshootIcon from "@mui/icons-material/Troubleshoot";
import { LoadingButton } from "@mui/lab";
import { Box, Button, Card, CardContent, CardHeader, TextField } from "@mui/material";
import {
  MRT_ColumnDef,
  MRT_RowSelectionState,
  MRT_ShowHideColumnsButton,
  MRT_ToggleDensePaddingButton,
  MaterialReactTable,
  useMaterialReactTable,
} from "material-react-table";
import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import ProjectHooks from "../../../api/ProjectHooks.ts";
import SdocHooks from "../../../api/SdocHooks.ts";
import SdocRenderer from "../../../components/SourceDocument/SdocRenderer.tsx";
import SdocTagsRenderer from "../../../components/SourceDocument/SdocTagRenderer.tsx";
import ContentContainerLayout from "../../../layouts/ContentLayouts/ContentContainerLayout.tsx";

interface DuplicateDocumentData {
  sdocId: string;
  subRows?: DuplicateDocumentData[];
}

const columns: MRT_ColumnDef<DuplicateDocumentData>[] = [
  {
    header: "File name",
    Cell: ({ row }) =>
      row.original.subRows ? (
        <>{`${row.originalSubRows?.length} duplicate documents`}</>
      ) : (
        <SdocRenderer sdoc={parseInt(row.original.sdocId.split("-")[1])} renderFilename link />
      ),
  },
  {
    header: "Tags",
    Cell: ({ row }) =>
      row.original.subRows ? <></> : <SdocTagsRenderer sdocId={parseInt(row.original.sdocId.split("-")[1])} />,
  },
];

function ProjectDuplicateDocuments() {
  const projectId = parseInt(useParams<{ projectId: string }>().projectId!);

  // local state
  const [maxDifferentWords, setMaxDifferentWords] = useState<number>(10);
  const [rowSelection, setRowSelection] = useState<MRT_RowSelectionState>({});

  // actions
  const findDuplicateDocumentsMutation = ProjectHooks.useFindDuplicateTextDocuments();
  const handleClickFindDuplicateTextDocuments = () => {
    findDuplicateDocumentsMutation.mutate({
      projId: projectId,
      maxDifferentWords: maxDifferentWords,
    });
  };
  const deleteDocumentsMutation = SdocHooks.useDeleteDocuments();
  const handleDeleteClick = (sdocIds: number[]) => {
    deleteDocumentsMutation.mutate(
      {
        sdocIds: sdocIds,
      },
      {
        onSuccess: () => {
          setRowSelection({});
          findDuplicateDocumentsMutation.mutate({
            projId: projectId,
            maxDifferentWords: maxDifferentWords,
          });
        },
      },
    );
  };
  const handleSelectAllButOnePerGroup = () => {
    let selectedSdocIds: string[] = [];
    data.forEach((duplicateDocGroup) => {
      if (duplicateDocGroup.subRows) {
        selectedSdocIds = selectedSdocIds.concat(duplicateDocGroup.subRows.map((subRow) => subRow.sdocId).slice(1));
      }
    });
    console.log(data);
    console.log(selectedSdocIds);
    setRowSelection(
      selectedSdocIds.reduce((acc, sdocId) => ({ ...acc, [sdocId]: true }), {} as Record<string, boolean>),
    );
  };

  // computed
  const data = useMemo(() => {
    if (findDuplicateDocumentsMutation.data === undefined) {
      return [];
    }

    const result: DuplicateDocumentData[] = [];
    findDuplicateDocumentsMutation.data.forEach((duplicateDocGroup, index) => {
      const duplicateDocGroupData: DuplicateDocumentData = {
        sdocId: index.toString(),
        subRows: duplicateDocGroup.length > 0 ? [] : undefined,
      };
      duplicateDocGroup.forEach((duplicateDoc) => {
        duplicateDocGroupData.subRows?.push({
          sdocId: `${index}-${duplicateDoc}`,
        });
      });
      result.push(duplicateDocGroupData);
    });

    return result;
  }, [findDuplicateDocumentsMutation.data]);

  // table
  const table = useMaterialReactTable<DuplicateDocumentData>({
    columns,
    data,
    getRowId: (row) => row.sdocId,
    // expansion
    enableExpandAll: false, //hide expand all double arrow in column header
    enableExpanding: true,
    // pagination
    enablePagination: true,
    paginateExpandedRows: false,
    // selection
    enableRowSelection(row) {
      return !row.original.subRows;
    },
    onRowSelectionChange: setRowSelection, //connect internal row selection state to your own
    state: {
      rowSelection,
      isLoading: findDuplicateDocumentsMutation.isPending,
    }, //pass our managed row selection state to the table to use
    // other
    filterFromLeafRows: true, //apply filtering to all rows instead of just parent rows
    getSubRows: (row) => row.subRows, //default
    initialState: { expanded: true }, //expand all rows by default
    enableStickyHeader: true, //sticky header
    // style
    muiTablePaperProps: {
      sx: { height: "100%", display: "flex", flexDirection: "column" },
    },
    muiTableContainerProps: {
      sx: { flexGrow: 1 },
    },
    // toolbar(s)
    positionToolbarAlertBanner: "bottom",
    renderTopToolbarCustomActions: ({ table }) => (
      <Box sx={{ display: "flex", gap: "1rem", p: "4px" }}>
        <Button
          color="warning"
          disabled={table.getIsSomeRowsSelected()}
          onClick={handleSelectAllButOnePerGroup}
          variant="contained"
        >
          Select all but 1 document per group
        </Button>
        <Button
          color="error"
          disabled={!table.getIsSomeRowsSelected()}
          onClick={() => {
            const selectedSdocIds = table
              .getSelectedRowModel()
              .flatRows.map((row) => parseInt(row.original.sdocId.split("-")[1]));
            handleDeleteClick(selectedSdocIds);
          }}
          variant="contained"
        >
          Delete Selected Documents
        </Button>
      </Box>
    ),
    renderToolbarInternalActions: ({ table }) => (
      <Box>
        {/* along-side built-in buttons in whatever order you want them */}
        <MRT_ToggleDensePaddingButton table={table} />
        <MRT_ShowHideColumnsButton table={table} />
      </Box>
    ),
  });

  return (
    <ContentContainerLayout>
      <Card
        sx={{ width: "100%", minHeight: "225.5px" }}
        elevation={2}
        className="myFlexFillAllContainer myFlexContainer"
      >
        <CardHeader
          title="Duplicate Finder"
          subheader="Find duplicate documents based on their text content"
          action={
            <>
              <TextField
                label={"Max. different words"}
                variant="outlined"
                value={maxDifferentWords}
                onChange={(event) => setMaxDifferentWords(parseInt(event.target.value))}
                type="number"
                inputProps={{ min: 1, max: 10000 }}
                size="small"
                sx={{ width: 150 }}
              />
              <LoadingButton
                variant="contained"
                startIcon={<TroubleshootIcon />}
                sx={{ ml: 1 }}
                onClick={handleClickFindDuplicateTextDocuments}
                loading={findDuplicateDocumentsMutation.isPending}
                loadingPosition="start"
              >
                Start
              </LoadingButton>
            </>
          }
        />
        <CardContent className="myFlexFillAllContainer" style={{ padding: 0 }}>
          <div className="h100" style={{ width: "100%" }}>
            <MaterialReactTable table={table} />
          </div>
        </CardContent>
      </Card>
    </ContentContainerLayout>
  );
}

export default ProjectDuplicateDocuments;
