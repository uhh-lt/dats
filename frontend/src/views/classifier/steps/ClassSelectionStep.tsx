import { Alert, Box, Button, Card, CardHeader, DialogActions, Divider, Stack } from "@mui/material";
import { MRT_RowSelectionState } from "material-react-table";
import { useCallback, useState } from "react";
import { ClassifierModel } from "../../../api/openapi/models/ClassifierModel.ts";
import CodeTable from "../../../components/Code/CodeTable.tsx";
import { CRUDDialogActions } from "../../../components/dialogSlice.ts";
import TagTable from "../../../components/Tag/TagTable.tsx";
import { useAppDispatch, useAppSelector } from "../../../plugins/ReduxHooks.ts";

function ClassSelectionStep() {
  // dialog state
  const model = useAppSelector((state) => state.dialog.classifierModel);
  const projectId = useAppSelector((state) => state.dialog.classifierProjectId);

  // selection state
  const [rowSelectionModel, setRowSelectionModel] = useState<MRT_RowSelectionState>({});
  const selectedClassIds = Object.keys(rowSelectionModel).map((key) => parseInt(key));

  // actions
  const dispatch = useAppDispatch();
  const handleNext = useCallback(() => {
    if (selectedClassIds.length === 0) return;
    dispatch(CRUDDialogActions.onClassifierDialogSelectClasses(selectedClassIds));
  }, [dispatch, selectedClassIds]);

  const handleBack = useCallback(() => {
    dispatch(CRUDDialogActions.previousClassifierDialogStep());
  }, [dispatch]);

  if (model === undefined) return null;

  return (
    <>
      <Stack spacing={2} p={2} className="myFlexFillAllContainer" sx={{ backgroundColor: "grey.100" }}>
        <Alert variant="standard" severity="info" sx={{ border: "1px solid", borderColor: "info.main" }}>
          This is an info Alert.
        </Alert>
        <Card className="myFlexContainer myFlexFillAllContainer" sx={{ width: "100%" }} variant="outlined">
          <CardHeader
            title="Select codes"
            slotProps={{
              title: {
                variant: "h6",
              },
            }}
            sx={{ py: 1 }}
          />
          <Divider />
          {model === ClassifierModel.DOCUMENT ? (
            <TagTable
              projectId={projectId}
              rowSelectionModel={rowSelectionModel}
              onRowSelectionChange={setRowSelectionModel}
            />
          ) : (
            <CodeTable
              projectId={projectId}
              rowSelectionModel={rowSelectionModel}
              onRowSelectionChange={setRowSelectionModel}
            />
          )}
        </Card>
      </Stack>
      <DialogActions sx={{ width: "100%" }}>
        <Box flexGrow={1} />
        <Button onClick={handleBack}>Back</Button>
        <Button disabled={selectedClassIds.length === 0} onClick={handleNext}>
          Next!
        </Button>
      </DialogActions>
    </>
  );
}

export default ClassSelectionStep;
