import { Box, Button, DialogActions, Divider } from "@mui/material";
import { useCallback } from "react";
import ClassifierHooks from "../../../../api/ClassifierHooks.ts";
import { ClassifierEvaluationParams } from "../../../../api/openapi/models/ClassifierEvaluationParams.ts";
import { ClassifierModel } from "../../../../api/openapi/models/ClassifierModel.ts";
import { useAppDispatch, useAppSelector } from "../../../../plugins/ReduxHooks.ts";
import { CRUDDialogActions } from "../../../dialogSlice.ts";
import DataSelection from "./DataSelection.tsx";

function EvalDataSelectionStep() {
  // dialog state
  const model = useAppSelector((state) => state.dialog.classifierModel);
  const task = useAppSelector((state) => state.dialog.classifierTask);
  const classifierId = useAppSelector((state) => state.dialog.classifierId);
  const projectId = useAppSelector((state) => state.dialog.classifierProjectId);
  const classIds = useAppSelector((state) => state.dialog.classifierClassIds);
  const userIds = useAppSelector((state) => state.dialog.classifierUserIds);
  const tagIds = useAppSelector((state) => state.dialog.classifierTagIds);
  const dispatch = useAppDispatch();

  // dialog actions
  const handleClose = useCallback(() => {
    dispatch(CRUDDialogActions.closeClassifierDialog());
  }, [dispatch]);

  const { mutate: startClassifierJobMutation, isPending } = ClassifierHooks.useStartClassifierJob();
  const handleNext = () => {
    if (model === undefined || classifierId === undefined || task === undefined) return;

    const evalParams: ClassifierEvaluationParams = {
      task_type: task,
      classifier_id: classifierId,
      tag_ids: tagIds,
      user_ids: userIds,
    };

    startClassifierJobMutation(
      {
        requestBody: {
          model_type: model,
          task_type: task,
          project_id: projectId,
          task_parameters: evalParams,
        },
      },
      {
        onSuccess: (data) => {
          dispatch(CRUDDialogActions.onClassifierDialogStartJob(data.job_id));
        },
      },
    );
  };

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
        <Button onClick={handleClose}>Close</Button>
        <Button onClick={handleNext} disabled={isNextDisabled} loading={isPending} loadingPosition="start">
          Next
        </Button>
      </DialogActions>
    </>
  );
}

export default EvalDataSelectionStep;
