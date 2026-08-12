import { ClassifierModel } from "@models/ClassifierModel";
import { ClassifierTrainingParams } from "@models/ClassifierTrainingParams";
import { Box, Button, DialogActions, Divider } from "@mui/material";
import { useAppDispatch, useAppSelector } from "@store/storeHooks";
import { useCallback } from "react";
import { ClassifierHooks } from "../../../_api/classifierQueryOptions";
import { useDatasetStatistics } from "../../../_api/useDatasetStatistics";
import { ClassifierActions } from "../../../store/classifierSlice";
import { DataSelection } from "./DataSelection";

export function TrainingDataSelectionStep() {
  // dialog state
  const model = useAppSelector((state) => state.classifier.context.model);
  const task = useAppSelector((state) => state.classifier.context.task);
  const projectId = useAppSelector((state) => state.classifier.context.projectId);
  const classIds = useAppSelector((state) => state.classifier.dataset.classIds);
  const userIds = useAppSelector((state) => state.classifier.dataset.userIds);
  const tagIds = useAppSelector((state) => state.classifier.dataset.tagIds);
  const mergeChildren = useAppSelector((state) => state.classifier.dataset.mergeChildren);
  const trainingSettings = useAppSelector((state) => state.classifier.drafts.trainingSettings);
  const dispatch = useAppDispatch();

  // dialog actions
  const handlePrev = useCallback(() => {
    dispatch(ClassifierActions.previousClassifierDialogStep());
  }, [dispatch]);

  const { mutate: startClassifierJobMutation, isPending } = ClassifierHooks.useStartClassifierJob();

  // dataset statistics (shared with DataSelection via props)
  const { datasetStats } = useDatasetStatistics();

  const handleNext = () => {
    if (model === undefined || task === undefined || trainingSettings === undefined) return;

    const trainingParams: ClassifierTrainingParams = {
      task_type: task,
      ...trainingSettings,
      class_ids: classIds,
      tag_ids: tagIds,
      user_ids: userIds,
      merge_children_into_parent: mergeChildren,
    };

    startClassifierJobMutation(
      {
        requestBody: {
          model_type: model,
          task_type: task,
          project_id: projectId,
          task_parameters: trainingParams,
        },
      },
      {
        onSuccess: (data) => {
          dispatch(ClassifierActions.setClassifierJobId(data.job_id));
          dispatch(ClassifierActions.nextClassifierDialogStep());
        },
      },
    );
  };

  const isNextDisabled =
    model === undefined ||
    trainingSettings === undefined ||
    datasetStats.data === undefined ||
    datasetStats.data.total_units === 0 ||
    (model === ClassifierModel.DOCUMENT
      ? tagIds.length === 0 || classIds.length === 0
      : tagIds.length === 0 || classIds.length === 0 || userIds.length === 0);
  return (
    <>
      <DataSelection model={model} datasetStats={datasetStats} />
      <Divider />
      <DialogActions sx={{ width: "100%" }}>
        <Box flexGrow={1} />
        <Button onClick={handlePrev}>Back</Button>
        <Button disabled={isNextDisabled} onClick={handleNext} loading={isPending} loadingPosition="start">
          Next
        </Button>
      </DialogActions>
    </>
  );
}
