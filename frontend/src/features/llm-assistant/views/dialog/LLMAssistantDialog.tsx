import { DATSDialogHeader } from "@components/DATSDialogHeader";
import { Dialog, Divider, Step, StepLabel, Stepper } from "@mui/material";
import { useAppDispatch, useAppSelector } from "@plugins/redux";
import { memo, useCallback, useMemo } from "react";
import { TaskType } from "../../../../api/openapi/models/TaskType";
import { useDialogMaximize } from "../../../../hooks/useDialogMaximize";
import { LLMAssistantActions } from "../../store/llmAssistantSlice";
import { AnnotationResultStep } from "./_components/annotation-result-step/AnnotationResultStep";
import { ApproachSelectionStep } from "./_components/ApproachSelectionStep";
import { CodeSelectionStep } from "./_components/CodeSelectionStep";
import { DocumentTagResultStep } from "./_components/document-tagging-result-step/DocumentTagResultStep";
import { DocumentTagSelectionStep } from "./_components/DocumentTagSelectionStep";
import { EditorStep } from "./_components/editor-step/EditorStep";
import { MetadataExtractionResultStep } from "./_components/metadata-extraction-result-step/MetadataExtractionResultStep";
import { MethodSelectionStep } from "./_components/MethodSelectionStep";
import { ProjectMetadataSelectionStep } from "./_components/ProjectMetadataSelectionStep";
import { SentenceAnnotationResultStep } from "./_components/SentenceAnnotationResultStep";
import { StatusStep } from "./_components/StatusStep";

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

export const LLMAssistantDialog = memo(() => {
  // global client state (redux)
  const method = useAppSelector((state) => state.dialog.llmMethod);
  const step = useAppSelector((state) => state.dialog.llmStep);
  const dispatch = useAppDispatch();

  // open/close dialog
  const open = useAppSelector((state) => state.dialog.isLLMDialogOpen);
  const handleClose = useCallback(() => {
    dispatch(LLMAssistantActions.closeLLMDialog());
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
});
