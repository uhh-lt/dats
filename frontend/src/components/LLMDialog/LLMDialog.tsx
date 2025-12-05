import { Dialog, Divider, Step, StepLabel, Stepper } from "@mui/material";
import { memo, useCallback, useMemo } from "react";
import { TaskType } from "../../api/openapi/models/TaskType.ts";
import { useDialogMaximize } from "../../hooks/useDialogMaximize.ts";
import { useAppDispatch, useAppSelector } from "../../plugins/ReduxHooks.ts";
import { CRUDDialogActions } from "../dialogSlice.ts";
import DATSDialogHeader from "../MUI/DATSDialogHeader.tsx";
import AnnotationResultStep from "./steps/AnnotationResultStep/AnnotationResultStep.tsx";
import ApproachSelectionStep from "./steps/ApproachSelectionStep.tsx";
import CodeSelectionStep from "./steps/CodeSelectionStep.tsx";
import DocumentTagResultStep from "./steps/DocumentTaggingResultStep/DocumentTagResultStep.tsx";
import DocumentTagSelectionStep from "./steps/DocumentTagSelectionStep.tsx";
import EditorStep from "./steps/EditorStep/EditorStep.tsx";
import MetadataExtractionResultStep from "./steps/MetadataExtractionResultStep/MetadataExtractionResultStep.tsx";
import MethodSelectionStep from "./steps/MethodSelectionStep.tsx";
import ProjectMetadataSelectionStep from "./steps/ProjectMetadataSelectionStep.tsx";
import SentenceAnnotationResultStep from "./steps/SentenceAnnotationResultStep/SentenceAnnotationResultStep.tsx";
import StatusStep from "./steps/StatusStep.tsx";

const title: Record<TaskType, string> = {
  [TaskType.TAGGING]: "Document Tagging",
  [TaskType.METADATA_EXTRACTION]: "Metadata Extraction",
  [TaskType.ANNOTATION]: "Annotation",
  [TaskType.SENTENCE_ANNOTATION]: "Sentence Annotation",
};

const steps: Record<TaskType, string[]> = {
  [TaskType.TAGGING]: ["Select method", "Select tags", "Select appproach", "Edit settings", "Wait", "View results"],
  [TaskType.METADATA_EXTRACTION]: [
    "Select method",
    "Select metadata",
    "Select appproach",
    "Edit settings",
    "Wait",
    "View results",
  ],
  [TaskType.ANNOTATION]: ["Select method", "Select codes", "Select appproach", "Edit settings", "Wait", "View results"],
  [TaskType.SENTENCE_ANNOTATION]: [
    "Select method",
    "Select codes",
    "Select appproach",
    "Edit settings",
    "Wait",
    "View results",
  ],
};

const contentDict: Record<number, Record<TaskType, JSX.Element>> = {
  0: {
    [TaskType.TAGGING]: <MethodSelectionStep />,
    [TaskType.METADATA_EXTRACTION]: <MethodSelectionStep />,
    [TaskType.ANNOTATION]: <MethodSelectionStep />,
    [TaskType.SENTENCE_ANNOTATION]: <MethodSelectionStep />,
  },
  1: {
    [TaskType.TAGGING]: <DocumentTagSelectionStep />,
    [TaskType.METADATA_EXTRACTION]: <ProjectMetadataSelectionStep />,
    [TaskType.ANNOTATION]: <CodeSelectionStep />,
    [TaskType.SENTENCE_ANNOTATION]: <CodeSelectionStep />,
  },
  2: {
    [TaskType.TAGGING]: <ApproachSelectionStep />,
    [TaskType.METADATA_EXTRACTION]: <ApproachSelectionStep />,
    [TaskType.ANNOTATION]: <ApproachSelectionStep />,
    [TaskType.SENTENCE_ANNOTATION]: <ApproachSelectionStep />,
  },
  3: {
    [TaskType.TAGGING]: <EditorStep />,
    [TaskType.METADATA_EXTRACTION]: <EditorStep />,
    [TaskType.ANNOTATION]: <EditorStep />,
    [TaskType.SENTENCE_ANNOTATION]: <EditorStep />,
  },
  4: {
    [TaskType.TAGGING]: <StatusStep />,
    [TaskType.METADATA_EXTRACTION]: <StatusStep />,
    [TaskType.ANNOTATION]: <StatusStep />,
    [TaskType.SENTENCE_ANNOTATION]: <StatusStep />,
  },
  5: {
    [TaskType.TAGGING]: <DocumentTagResultStep />,
    [TaskType.METADATA_EXTRACTION]: <MetadataExtractionResultStep />,
    [TaskType.ANNOTATION]: <AnnotationResultStep />,
    [TaskType.SENTENCE_ANNOTATION]: <SentenceAnnotationResultStep />,
  },
};

function LLMDialog() {
  // global client state (redux)
  const method = useAppSelector((state) => state.dialog.llmMethod);
  const step = useAppSelector((state) => state.dialog.llmStep);
  const dispatch = useAppDispatch();

  // open/close dialog
  const open = useAppSelector((state) => state.dialog.isLLMDialogOpen);
  const handleClose = useCallback(() => {
    dispatch(CRUDDialogActions.closeLLMDialog());
  }, [dispatch]);

  // maximize
  const { isMaximized, toggleMaximize } = useDialogMaximize();

  // rendering
  const dialogTitle = `LLM Assistant${method ? ` - ${title[method]}` : ""}`;
  const stepLabels = useMemo(
    () =>
      steps[method || TaskType.TAGGING].map((label) => (
        <Step key={label}>
          <StepLabel>{label}</StepLabel>
        </Step>
      )),
    [method],
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
      {contentDict[step][method || TaskType.TAGGING]}
    </Dialog>
  );
}

export default memo(LLMDialog);
