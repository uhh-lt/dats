import { Dialog, Divider, Step, StepLabel, Stepper } from "@mui/material";
import { memo, useCallback, useMemo, useState } from "react";
import { ClassifierModel } from "../../../api/openapi/models/ClassifierModel.ts";
import { ClassifierTask } from "../../../api/openapi/models/ClassifierTask.ts";
import { useAppDispatch, useAppSelector } from "../../../plugins/ReduxHooks.ts";
import { CRUDDialogActions } from "../../dialogSlice.ts";
import DATSDialogHeader from "../../MUI/DATSDialogHeader.tsx";
import ClassSelectionStep from "./steps/ClassSelectionStep.tsx";
import EvalDataSelectionStep from "./steps/EvalDataSelectionStep.tsx";
import InferDataSelectionStep from "./steps/InferDataSelectionStep.tsx";
import InferenceSettingsStep from "./steps/InferSettingsStep.tsx";
import ResultStep from "./steps/ResultStep.tsx";
import StatusStep from "./steps/StatusStep.tsx";
import TrainingDataSelectionStep from "./steps/TrainingDataSelectionStep.tsx";
import TrainingSettingsStep from "./steps/TrainingSettingsStep.tsx";

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

const content: Record<ClassifierTask, JSX.Element[]> = {
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

function ClassifierDialog() {
  // dialog state
  const model = useAppSelector((state) => state.dialog.classifierModel);
  const task = useAppSelector((state) => state.dialog.classifierTask);
  const step = useAppSelector((state) => state.dialog.classifierStep);

  // open/close dialog
  const dispatch = useAppDispatch();
  const open = useAppSelector((state) => state.dialog.isClassifierDialogOpen);
  const handleClose = useCallback(() => {
    dispatch(CRUDDialogActions.closeClassifierDialog());
  }, [dispatch]);

  // maximize feature
  const [isMaximized, setIsMaximized] = useState(false);
  const handleToggleMaximize = () => {
    setIsMaximized((prev) => !prev);
  };

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
        onToggleMaximize={handleToggleMaximize}
      />
      <Stepper activeStep={step} sx={{ p: 2 }}>
        {stepLabels}
      </Stepper>
      <Divider />
      {content[task || ClassifierTask.TRAINING][step]}
    </Dialog>
  );
}

export default memo(ClassifierDialog);
