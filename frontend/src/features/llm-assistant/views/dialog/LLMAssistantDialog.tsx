import { DATSDialogHeader } from "@components/DATSDialogHeader";
import { useDialogMaximize } from "@hooks/useDialogMaximize";
import { TaskType } from "@models/TaskType";
import { Dialog, Divider, Step, StepLabel, Stepper } from "@mui/material";
import { useAppDispatch, useAppSelector } from "@store/storeHooks";
import { memo, useCallback, useMemo } from "react";
import { LLMAssistantActions } from "../../store/llmAssistantSlice";
import { AnnotationResultStep } from "./_components/AnnotationResultStep";
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
import { StrategySelectionStep } from "./_components/StrategySelectionStep";

const title: Record<TaskType, string> = {
  [TaskType.TAGGING]: "Document Tagging",
  [TaskType.METADATA_EXTRACTION]: "Metadata Extraction",
  [TaskType.ANNOTATION]: "Annotation",
  [TaskType.SENTENCE_ANNOTATION]: "Sentence Annotation",
};

const steps: Record<TaskType, string[]> = {
  [TaskType.TAGGING]: [
    "Select method",
    "Select tags",
    "Select strategy",
    "Select appproach",
    "Edit settings",
    "Wait",
    "View results",
  ],
  [TaskType.METADATA_EXTRACTION]: [
    "Select method",
    "Select metadata",
    "Select strategy",
    "Select appproach",
    "Edit settings",
    "Wait",
    "View results",
  ],
  [TaskType.ANNOTATION]: [
    "Select method",
    "Select codes",
    "Select strategy",
    "Select appproach",
    "Edit settings",
    "Wait",
    "View results",
  ],
  [TaskType.SENTENCE_ANNOTATION]: [
    "Select method",
    "Select codes",
    "Select strategy",
    "Select appproach",
    "Edit settings",
    "Wait",
    "View results",
  ],
};

const contentDict: Record<number, Record<TaskType, React.ReactNode>> = {
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
    [TaskType.TAGGING]: <StrategySelectionStep />,
    [TaskType.METADATA_EXTRACTION]: <StrategySelectionStep />,
    [TaskType.ANNOTATION]: <StrategySelectionStep />,
    [TaskType.SENTENCE_ANNOTATION]: <StrategySelectionStep />,
  },
  3: {
    [TaskType.TAGGING]: <ApproachSelectionStep />,
    [TaskType.METADATA_EXTRACTION]: <ApproachSelectionStep />,
    [TaskType.ANNOTATION]: <ApproachSelectionStep />,
    [TaskType.SENTENCE_ANNOTATION]: <ApproachSelectionStep />,
  },
  4: {
    [TaskType.TAGGING]: <EditorStep />,
    [TaskType.METADATA_EXTRACTION]: <EditorStep />,
    [TaskType.ANNOTATION]: <EditorStep />,
    [TaskType.SENTENCE_ANNOTATION]: <EditorStep />,
  },
  5: {
    [TaskType.TAGGING]: <StatusStep />,
    [TaskType.METADATA_EXTRACTION]: <StatusStep />,
    [TaskType.ANNOTATION]: <StatusStep />,
    [TaskType.SENTENCE_ANNOTATION]: <StatusStep />,
  },
  6: {
    [TaskType.TAGGING]: <DocumentTagResultStep />,
    [TaskType.METADATA_EXTRACTION]: <MetadataExtractionResultStep />,
    [TaskType.ANNOTATION]: <AnnotationResultStep />,
    [TaskType.SENTENCE_ANNOTATION]: <SentenceAnnotationResultStep />,
  },
};

export const LLMAssistantDialog = memo(() => {
  // global client state (redux)
  const method = useAppSelector((state) => state.llmAssistant.llmMethod);
  const step = useAppSelector((state) => state.llmAssistant.llmStep);
  const dispatch = useAppDispatch();

  // open/close dialog
  const open = useAppSelector((state) => state.llmAssistant.isLLMDialogOpen);
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
