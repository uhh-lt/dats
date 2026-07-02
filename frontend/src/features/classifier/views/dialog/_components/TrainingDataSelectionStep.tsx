import { ClassifierModel } from "@models/ClassifierModel";
import { Box, Button, DialogActions, Divider } from "@mui/material";
import { useAppDispatch, useAppSelector } from "@store/storeHooks";
import { useCallback } from "react";
import { ClassifierActions } from "../../../store/classifierSlice";
import { DataSelection } from "./DataSelection";

export function TrainingDataSelectionStep() {
  // dialog state
  const model = useAppSelector((state) => state.classifier.classifierModel);
  const classIds = useAppSelector((state) => state.classifier.classifierClassIds);
  const userIds = useAppSelector((state) => state.classifier.classifierUserIds);
  const tagIds = useAppSelector((state) => state.classifier.classifierTagIds);
  const dispatch = useAppDispatch();

  // dialog actions
  const handlePrev = useCallback(() => {
    dispatch(ClassifierActions.previousClassifierDialogStep());
  }, [dispatch]);
  const handleNext = useCallback(() => {
    dispatch(ClassifierActions.nextClassifierDialogStep());
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
