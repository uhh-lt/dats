import { ClassifierEvaluationParams } from "@api/models/ClassifierEvaluationParams";
import { ClassifierModel } from "@api/models/ClassifierModel";
import { Box, Button, DialogActions, Divider } from "@mui/material";
import { useAppDispatch, useAppSelector } from "@store/storeHooks";
import { useCallback } from "react";
import { ClassifierHooks } from "../../../_api/classifierQueryOptions";
import { ClassifierActions } from "../../../store/classifierSlice";
import { DataSelection } from "./DataSelection";

export function EvalDataSelectionStep() {
  // dialog state
  const model = useAppSelector((state) => state.classifier.classifierModel);
  const task = useAppSelector((state) => state.classifier.classifierTask);
  const classifierId = useAppSelector((state) => state.classifier.classifierId);
  const projectId = useAppSelector((state) => state.classifier.classifierProjectId);
  const classIds = useAppSelector((state) => state.classifier.classifierClassIds);
  const userIds = useAppSelector((state) => state.classifier.classifierUserIds);
  const tagIds = useAppSelector((state) => state.classifier.classifierTagIds);
  const dispatch = useAppDispatch();

  // dialog actions
  const handleClose = useCallback(() => {
    dispatch(ClassifierActions.closeClassifierDialog());
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
          dispatch(ClassifierActions.onClassifierDialogStartJob(data.job_id));
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
