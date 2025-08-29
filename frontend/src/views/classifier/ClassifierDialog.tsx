import { Dialog, Divider, Step, StepLabel, Stepper } from "@mui/material";
import { useCallback, useMemo, useState } from "react";
import { ClassifierModel } from "../../api/openapi/models/ClassifierModel.ts";
import { ClassifierTask } from "../../api/openapi/models/ClassifierTask.ts";
import { CRUDDialogActions } from "../../components/dialogSlice.ts";
import DATSDialogHeader from "../../components/MUI/DATSDialogHeader.tsx";
import { useAppDispatch, useAppSelector } from "../../plugins/ReduxHooks.ts";
import ClassSelectionStep from "./steps/ClassSelectionStep.tsx";
import DataSelectionStep from "./steps/DataSelectionStep.tsx";
import ResultStep from "./steps/ResultStep.tsx";
import StatusStep from "./steps/StatusStep.tsx";

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
    "Wait", // start job & show inference process
    "View results", // show the inference results, finished!
  ],
};

const content: Record<ClassifierTask, JSX.Element[]> = {
  [ClassifierTask.TRAINING]: [<ClassSelectionStep />, <DataSelectionStep />, <StatusStep />, <ResultStep />],
  [ClassifierTask.EVALUATION]: [<DataSelectionStep />, <StatusStep />, <ResultStep />],
  [ClassifierTask.INFERENCE]: [<DataSelectionStep />, <StatusStep />, <ResultStep />],
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

export default ClassifierDialog;
