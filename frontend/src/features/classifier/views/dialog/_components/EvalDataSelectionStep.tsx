import { ClassifierModel } from "@models/ClassifierModel";
import { Box, Button, DialogActions, Divider, FormControlLabel, Switch } from "@mui/material";
import { useAppDispatch, useAppSelector } from "@store/storeHooks";
import { useCallback } from "react";
import type { ChangeEvent } from "react";
import { useDatasetStatistics } from "../../../_api/useDatasetStatistics";
import { ClassifierActions } from "../../../store/classifierSlice";
import { DataSelection } from "./DataSelection";

export function EvalDataSelectionStep() {
  // dialog state
  const model = useAppSelector((state) => state.classifier.context.model);
  const classIds = useAppSelector((state) => state.classifier.dataset.classIds);
  const userIds = useAppSelector((state) => state.classifier.dataset.userIds);
  const tagIds = useAppSelector((state) => state.classifier.dataset.tagIds);
  const mergeChildren = useAppSelector((state) => state.classifier.dataset.mergeChildren);
  const dispatch = useAppDispatch();

  // dialog actions
  const handleClose = useCallback(() => {
    dispatch(ClassifierActions.closeClassifierDialog());
  }, [dispatch]);

  // dataset statistics (shared with DataSelection via props)
  const { datasetStats } = useDatasetStatistics();

  const handleNext = () => {
    dispatch(ClassifierActions.nextClassifierDialogStep());
  };
  const handleMergeChildrenChange = (event: ChangeEvent<HTMLInputElement>) => {
    dispatch(ClassifierActions.setMergeChildren(event.target.checked));
  };

  const isNextDisabled =
    model === undefined ||
    datasetStats.data === undefined ||
    datasetStats.data.total_units === 0 ||
    (model === ClassifierModel.DOCUMENT
      ? tagIds.length === 0 || classIds.length === 0
      : tagIds.length === 0 || classIds.length === 0 || userIds.length === 0);
  return (
    <>
      {model !== ClassifierModel.DOCUMENT && (
        <Box px={2} pt={2} sx={{ backgroundColor: "grey.100" }}>
          <FormControlLabel
            control={<Switch checked={mergeChildren} onChange={handleMergeChildrenChange} />}
            label="Count annotations of descendant codes as their selected parent class"
          />
        </Box>
      )}
      <DataSelection model={model} datasetStats={datasetStats} />
      <Divider />
      <DialogActions sx={{ width: "100%" }}>
        <Box flexGrow={1} />
        <Button onClick={handleClose}>Close</Button>
        <Button onClick={handleNext} disabled={isNextDisabled}>
          Next
        </Button>
      </DialogActions>
    </>
  );
}
