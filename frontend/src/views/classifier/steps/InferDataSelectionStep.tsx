import { Alert, Box, Button, Card, CardHeader, DialogActions, Divider } from "@mui/material";
import Stack from "@mui/material/Stack/Stack";
import { MRT_RowSelectionState, MRT_SortingState, MRT_VisibilityState } from "material-react-table";
import { useCallback, useMemo, useState } from "react";
import MetadataHooks from "../../../api/MetadataHooks.ts";
import { ProjectMetadataRead } from "../../../api/openapi/models/ProjectMetadataRead.ts";
import { CRUDDialogActions } from "../../../components/dialogSlice.ts";
import SdocTable from "../../../components/SourceDocument/SdocTable/SdocTable.tsx";
import { useAppDispatch, useAppSelector } from "../../../plugins/ReduxHooks.ts";

function InferDataSelectionStep() {
  // dialog state
  const projectId = useAppSelector((state) => state.dialog.classifierProjectId);
  const dispatch = useAppDispatch();

  // global server state
  const projectMetadata = MetadataHooks.useGetProjectMetadataList();

  // selection state
  const [rowSelectionModel, setRowSelectionModel] = useState<MRT_RowSelectionState>({});
  const selectedSdocIds = useMemo(() => {
    return Object.keys(rowSelectionModel)
      .filter((key) => rowSelectionModel[key])
      .map((key) => parseInt(key))
      .filter((id) => !isNaN(id));
  }, [rowSelectionModel]);

  // dialog actions
  const handleClose = useCallback(() => {
    dispatch(CRUDDialogActions.closeClassifierDialog());
  }, [dispatch]);
  const handleNext = useCallback(() => {
    dispatch(CRUDDialogActions.onClassifierDialogSelectSdocs(selectedSdocIds));
  }, [dispatch, selectedSdocIds]);

  return (
    <>
      <Stack spacing={2} p={2} className="myFlexFillAllContainer" sx={{ backgroundColor: "grey.100" }}>
        <Alert variant="standard" severity="info" sx={{ border: "1px solid", borderColor: "info.main" }}>
          This is an info Alert.
        </Alert>
        <Card className="myFlexContainer myFlexFillAllContainer" sx={{ width: "100%" }} variant="outlined">
          <CardHeader
            title="Select documents"
            slotProps={{
              title: {
                variant: "h6",
              },
            }}
            sx={{ py: 1 }}
          />
          <Divider />
          {projectMetadata.isSuccess && (
            <DocumentSelector
              metadata={projectMetadata.data}
              projectId={projectId}
              rowSelectionModel={rowSelectionModel}
              onRowSelectionChange={setRowSelectionModel}
            />
          )}
        </Card>
      </Stack>
      <DialogActions sx={{ width: "100%" }}>
        <Box flexGrow={1} />
        <Button onClick={handleClose}>Close</Button>
        <Button disabled={selectedSdocIds.length === 0} onClick={handleNext}>
          Next
        </Button>
      </DialogActions>
    </>
  );
}

const filterName = "classifierDialogDocumentSelection";

interface DocumentSelectorProps {
  projectId: number;
  metadata: ProjectMetadataRead[];
  rowSelectionModel: MRT_RowSelectionState;
  onRowSelectionChange: React.Dispatch<React.SetStateAction<MRT_RowSelectionState>>;
}

function DocumentSelector({ projectId, metadata, rowSelectionModel, onRowSelectionChange }: DocumentSelectorProps) {
  // local state
  const [fetchSize, setFetchSize] = useState(20);
  const [sortingModel, setSortingModel] = useState<MRT_SortingState>([]);
  const [visibilityModel, setVisibilityModel] = useState<MRT_VisibilityState>(() =>
    // init visibility (disable metadata)
    metadata.reduce((acc, curr) => {
      return {
        ...acc,
        [curr.id]: false,
      };
    }, {}),
  );

  return (
    <SdocTable
      projectId={projectId}
      filterName={filterName}
      rowSelectionModel={rowSelectionModel}
      onRowSelectionChange={onRowSelectionChange}
      sortingModel={sortingModel}
      onSortingChange={setSortingModel}
      columnVisibilityModel={visibilityModel}
      onColumnVisibilityChange={setVisibilityModel}
      fetchSize={fetchSize}
      onFetchSizeChange={setFetchSize}
    />
  );
}

export default InferDataSelectionStep;
