import { DATSDialogHeader } from "@components/DATSDialogHeader";
import { useDialogMaximize } from "@hooks/useDialogMaximize";
import { ClassifierModel } from "@models/ClassifierModel";
import { ClassifierTask } from "@models/ClassifierTask";
import { Dialog, Divider, Step, StepLabel, Stepper } from "@mui/material";
import { useAppDispatch, useAppSelector } from "@store/storeHooks";
import { memo, useCallback, useMemo } from "react";
import { ClassifierActions } from "../../store/classifierSlice";
import { ClassSelectionStep } from "./_components/ClassSelectionStep";
import { EvalDataSelectionStep } from "./_components/EvalDataSelectionStep";
import { InferDataSelectionStep } from "./_components/InferDataSelectionStep";
import { InferenceSettingsStep } from "./_components/InferSettingsStep";
import { ResultStep } from "./_components/ResultStep";
import { StatusStep } from "./_components/StatusStep";
import { TrainingDataSelectionStep } from "./_components/TrainingDataSelectionStep";
import { TrainingSettingsStep } from "./_components/TrainingSettingsStep";

const taskTitle: Record<ClassifierTask, string> = {
  [ClassifierTask.TRAINING]: "Training",
  [ClassifierTask.EVALUATION]: "Evaluation",
  [ClassifierTask.INFERENCE]: "Inference",
};

const modelTitle: Record<ClassifierModel, string> = {
  [ClassifierModel.DOCUMENT]: "Document Classification Model",
  [ClassifierModel.SENTENCE]: "Sentence Classification Model",
  [ClassifierModel.SPAN]: "Span Classification Model",
};

const steps: Record<ClassifierTask, string[]> = {
  [ClassifierTask.TRAINING]: [
    "Select classes", // show code / tag selection
    "Select data", // show document selection, annotator selection & statistics.
    "Training settings", // show training settings
    "Wait", // start job & show training process
    "View results", // show the training results, finished!
  ],
  [ClassifierTask.EVALUATION]: [
    "Select data", // show document selection, annotator selection & statistics.
    "Wait", // start job & show eval process
    "View results", // show the evaluation results, finished!
  ],
  [ClassifierTask.INFERENCE]: [
    "Select data", // show document selection, annotator selection & statistics.
    "Inference settings", // show inference settings
    "Wait", // start job & show inference process
    "View results", // show the inference results, finished!
  ],
};

const content: Record<ClassifierTask, React.ReactNode[]> = {
  [ClassifierTask.TRAINING]: [
    <ClassSelectionStep />,
    <TrainingDataSelectionStep />,
    <TrainingSettingsStep />,
    <StatusStep />,
    <ResultStep />,
  ],
  [ClassifierTask.EVALUATION]: [<EvalDataSelectionStep />, <StatusStep />, <ResultStep />],
  [ClassifierTask.INFERENCE]: [<InferDataSelectionStep />, <InferenceSettingsStep />, <StatusStep />, <ResultStep />],
};

export const ClassifierDialog = memo(() => {
  // dialog state
  const model = useAppSelector((state) => state.classifier.classifierModel);
  const task = useAppSelector((state) => state.classifier.classifierTask);
  const step = useAppSelector((state) => state.classifier.classifierStep);

  // open/close dialog
  const dispatch = useAppDispatch();
  const open = useAppSelector((state) => state.classifier.isClassifierDialogOpen);
  const handleClose = useCallback(() => {
    dispatch(ClassifierActions.closeClassifierDialog());
  }, [dispatch]);

  // maximize
  const { isMaximized, toggleMaximize } = useDialogMaximize();

  const dialogTitle = `${model ? `${modelTitle[model]}` : ""} - ${task ? `${taskTitle[task]}` : ""}`;
  const stepLabels = useMemo(
    () =>
      steps[task || ClassifierTask.TRAINING].map((label) => (
        <Step key={label}>
          <StepLabel>{label}</StepLabel>
        </Step>
      )),
    [task],
  );
  return (
    <Dialog open={open} maxWidth="lg" fullWidth fullScreen={isMaximized}>
      <DATSDialogHeader
        title={dialogTitle}
        onClose={handleClose}
        isMaximized={isMaximized}
        onToggleMaximize={toggleMaximize}
      />
      <Stepper activeStep={step} sx={{ p: 2 }}>
        {stepLabels}
      </Stepper>
      <Divider />
      {content[task || ClassifierTask.TRAINING][step]}
    </Dialog>
  );
});
