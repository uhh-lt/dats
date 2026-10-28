import { DATSDialogHeader } from "@components/DATSDialogHeader";
import { useDialogMaximize } from "@hooks/useDialogMaximize";
import { TaskType } from "@models/TaskType";
import { Dialog, Divider, Step, StepLabel, Stepper } from "@mui/material";
import { useAppDispatch, useAppSelector } from "@store/storeHooks";
import { useCallback, useMemo } from "react";
import { LLMAssistantActions } from "../../store/llmAssistantSlice";
import { AnnotationResultStep } from "./_components/AnnotationResultStep";
import { CodeSelectionStep } from "./_components/CodeSelectionStep";
import { DocumentTagResultStep } from "./_components/document-tagging-result-step/DocumentTagResultStep";
import { DocumentTagSelectionStep } from "./_components/DocumentTagSelectionStep";
import { MetadataExtractionResultStep } from "./_components/metadata-extraction-result-step/MetadataExtractionResultStep";
import { MethodSelectionStep } from "./_components/MethodSelectionStep";
import { ProjectMetadataSelectionStep } from "./_components/ProjectMetadataSelectionStep";
import { ReviewStep } from "./_components/ReviewStep";
import { SentenceAnnotationResultStep } from "./_components/SentenceAnnotationResultStep";
import { SettingsStep } from "./_components/SettingsStep";
import { StatusStep } from "./_components/StatusStep";
import { TemplateSelectionStep } from "./_components/TemplateSelectionStep";
import { closeOnEscape } from "@utils/dialogUtils";

const title: Record<TaskType, string> = {
  [TaskType.TAGGING]: "Document Tagging",
  [TaskType.METADATA_EXTRACTION]: "Metadata Extraction",
  [TaskType.ANNOTATION]: "Annotation",
  [TaskType.SENTENCE_ANNOTATION]: "Sentence Annotation",
};

const guidedSteps: Record<TaskType, string[]> = {
  [TaskType.TAGGING]: ["Select method", "Select tags", "Edit settings", "Review prompt", "Wait", "View results"],
  [TaskType.METADATA_EXTRACTION]: [
    "Select method",
    "Select metadata",
    "Edit settings",
    "Review prompt",
    "Wait",
    "View results",
  ],
  [TaskType.ANNOTATION]: ["Select method", "Select codes", "Edit settings", "Review prompt", "Wait", "View results"],
  [TaskType.SENTENCE_ANNOTATION]: [
    "Select method",
    "Select codes",
    "Edit settings",
    "Review prompt",
    "Wait",
    "View results",
  ],
};
const templateSteps = [
  "Select method",
  "Select prompt template",
  "Select model",
  "Review prompt",
  "Wait",
  "View results",
];

// the step content per task; step 1 of a template run is the template selection
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
    [TaskType.TAGGING]: <SettingsStep />,
    [TaskType.METADATA_EXTRACTION]: <SettingsStep />,
    [TaskType.ANNOTATION]: <SettingsStep />,
    [TaskType.SENTENCE_ANNOTATION]: <SettingsStep />,
  },
  3: {
    [TaskType.TAGGING]: <ReviewStep />,
    [TaskType.METADATA_EXTRACTION]: <ReviewStep />,
    [TaskType.ANNOTATION]: <ReviewStep />,
    [TaskType.SENTENCE_ANNOTATION]: <ReviewStep />,
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

export function LLMAssistantDialog() {
  // global client state (redux)
  const method = useAppSelector((state) => state.llmAssistant.method);
  const mode = useAppSelector((state) => state.llmAssistant.mode);
  const step = useAppSelector((state) => state.llmAssistant.step);
  const dispatch = useAppDispatch();

  // open/close dialog
  const open = useAppSelector((state) => state.llmAssistant.isDialogOpen);
  const handleClose = useCallback(() => {
    dispatch(LLMAssistantActions.closeDialog());
  }, [dispatch]);

  // maximize
  const { isMaximized, toggleMaximize } = useDialogMaximize();

  // rendering
  const dialogTitle = `LLM Assistant${method ? ` - ${title[method]}` : ""}`;
  const stepLabels = useMemo(
    () =>
      (mode === "template" ? templateSteps : guidedSteps[method || TaskType.TAGGING]).map((label) => (
        <Step key={label}>
          <StepLabel>{label}</StepLabel>
        </Step>
      )),
    [mode, method],
  );

  return (
    <Dialog open={open} onClose={closeOnEscape(handleClose)} maxWidth="lg" fullWidth fullScreen={isMaximized}>
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
      {mode === "template" && step === 1 ? <TemplateSelectionStep /> : contentDict[step][method || TaskType.TAGGING]}
    </Dialog>
  );
}
