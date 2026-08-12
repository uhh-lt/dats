import { CodeTable } from "@core/code";
import { TagTable } from "@core/tag";
import { ClassifierModel } from "@models/ClassifierModel";
import {
  Alert,
  Box,
  Button,
  Card,
  CardHeader,
  DialogActions,
  Divider,
  FormControlLabel,
  Stack,
  Switch,
} from "@mui/material";
import { useAppDispatch, useAppSelector } from "@store/storeHooks";
import { MRT_RowSelectionState } from "material-react-table";
import { useCallback, useState } from "react";
import { ClassifierActions } from "../../../store/classifierSlice";

export function ClassSelectionStep() {
  // dialog state
  const model = useAppSelector((state) => state.classifier.context.model);
  const projectId = useAppSelector((state) => state.classifier.context.projectId);
  const classIds = useAppSelector((state) => state.classifier.dataset.classIds);
  const storedMergeChildren = useAppSelector((state) => state.classifier.dataset.mergeChildren);

  // selection state
  const [rowSelectionModel, setRowSelectionModel] = useState<MRT_RowSelectionState>(() =>
    Object.fromEntries(classIds.map((classId) => [classId, true])),
  );
  const selectedClassIds = Object.entries(rowSelectionModel)
    .filter(([, selected]) => selected)
    .map(([key]) => parseInt(key));
  const [mergeChildren, setMergeChildren] = useState(storedMergeChildren);

  // actions
  const dispatch = useAppDispatch();
  const handleNext = useCallback(() => {
    if (selectedClassIds.length === 0) return;
    dispatch(ClassifierActions.setClassSelection({ classIds: selectedClassIds, mergeChildren }));
    dispatch(ClassifierActions.nextClassifierDialogStep());
  }, [dispatch, selectedClassIds, mergeChildren]);

  const handleClose = useCallback(() => {
    dispatch(ClassifierActions.closeClassifierDialog());
  }, [dispatch]);

  if (model === undefined) return null;

  return (
    <>
      <Stack spacing={2} p={2} className="myFlexFillAllContainer" sx={{ backgroundColor: "grey.100" }}>
        <Alert variant="standard" severity="info" sx={{ border: "1px solid", borderColor: "info.main" }}>
          Choose one or more classes for the classifier to learn during training.
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
            <>
              <CodeTable
                projectId={projectId}
                rowSelectionModel={rowSelectionModel}
                onRowSelectionChange={setRowSelectionModel}
              />
              <FormControlLabel
                sx={{ margin: 1 }}
                control={<Switch checked={mergeChildren} onChange={(_, checked) => setMergeChildren(checked)} />}
                label="Merge child codes into parent?"
              />
            </>
          )}
        </Card>
      </Stack>
      <Divider />
      <DialogActions sx={{ width: "100%" }}>
        <Box flexGrow={1} />
        <Button onClick={handleClose}>Close</Button>
        <Button disabled={selectedClassIds.length === 0} onClick={handleNext}>
          Next
        </Button>
      </DialogActions>
    </>
  );
}
