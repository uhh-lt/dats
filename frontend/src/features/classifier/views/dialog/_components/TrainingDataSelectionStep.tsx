import { Box, Button, DialogActions, Divider } from "@mui/material";
import { useAppDispatch, useAppSelector } from "@plugins/redux";
import { useCallback } from "react";
import { ClassifierModel } from "../../../../api/openapi/models/ClassifierModel";
import { CRUDDialogActions } from "../../../../store/dialogSlice";
import { DataSelection } from "./DataSelection";

export function TrainingDataSelectionStep() {
  // dialog state
  const model = useAppSelector((state) => state.dialog.classifierModel);
  const classIds = useAppSelector((state) => state.dialog.classifierClassIds);
  const userIds = useAppSelector((state) => state.dialog.classifierUserIds);
  const tagIds = useAppSelector((state) => state.dialog.classifierTagIds);
  const dispatch = useAppDispatch();

  // dialog actions
  const handlePrev = useCallback(() => {
    dispatch(CRUDDialogActions.previousClassifierDialogStep());
  }, [dispatch]);
  const handleNext = useCallback(() => {
    dispatch(CRUDDialogActions.nextClassifierDialogStep());
  }, [dispatch]);

  const isNextDisabled =
    model === undefined ||
    (model === ClassifierModel.DOCUMENT
      ? tagIds.length === 0 || classIds.length === 0
      : tagIds.length === 0 || classIds.length === 0 || userIds.length === 0);
  return (
    <>
      <DataSelection />
      <Divider />
      <DialogActions sx={{ width: "100%" }}>
        <Box flexGrow={1} />
        <Button onClick={handlePrev}>Back</Button>
        <Button disabled={isNextDisabled} onClick={handleNext}>
          Next
        </Button>
      </DialogActions>
    </>
  );
}
