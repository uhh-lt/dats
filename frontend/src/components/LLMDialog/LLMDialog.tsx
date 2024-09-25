import { ButtonProps, Dialog, DialogContent, DialogTitle, Step, StepLabel, Stepper } from "@mui/material";
import { useMemo } from "react";
import { LLMJobType } from "../../api/openapi/models/LLMJobType.ts";
import { useAppSelector } from "../../plugins/ReduxHooks.ts";
import AnnotationResultStep from "./steps/AnnotationResultStep/AnnotationResultStep.tsx";
import CodeSelectionStep from "./steps/CodeSelectionStep.tsx";
import DocumentTagResultStep from "./steps/DocumentTaggingResultStep/DocumentTagResultStep.tsx";
import DocumentTagSelectionStep from "./steps/DocumentTagSelectionStep.tsx";
import MetadataExtractionResultStep from "./steps/MetadataExtractionResultStep/MetadataExtractionResultStep.tsx";
import MethodSelectionStep from "./steps/MethodSelectionStep.tsx";
import ProjectMetadataSelectionStep from "./steps/ProjectMetadataSelectionStep.tsx";
import PromptEditorStep from "./steps/PromptEditorStep.tsx";
import StatusStep from "./steps/StatusStep.tsx";

export interface LLMDialogProps extends ButtonProps {
  projectId: number;
}

const title: Record<LLMJobType, string> = {
  [LLMJobType.DOCUMENT_TAGGING]: "Document Tagging",
  [LLMJobType.METADATA_EXTRACTION]: "Metadata Extraction",
  [LLMJobType.ANNOTATION]: "Annotation",
};

const steps: Record<LLMJobType, string[]> = {
  [LLMJobType.DOCUMENT_TAGGING]: ["Select method", "Select tags", "Edit prompts", "Wait", "View results"],
  [LLMJobType.METADATA_EXTRACTION]: ["Select method", "Select metadata", "Edit prompts", "Wait", "View results"],
  [LLMJobType.ANNOTATION]: ["Select method", "Select codes", "Edit prompts", "Wait", "View results"],
};

function LLMDialog({ projectId }: LLMDialogProps) {
  // global client state (redux)
  const open = useAppSelector((state) => state.dialog.isLLMDialogOpen);
  const method = useAppSelector((state) => state.dialog.llmMethod);
  const step = useAppSelector((state) => state.dialog.llmStep);

  // this defines the flow of the dialog
  const contentDict: Record<number, Record<LLMJobType, JSX.Element>> = useMemo(() => {
    return {
      0: {
        [LLMJobType.DOCUMENT_TAGGING]: <MethodSelectionStep />,
        [LLMJobType.METADATA_EXTRACTION]: <MethodSelectionStep />,
        [LLMJobType.ANNOTATION]: <MethodSelectionStep />,
      },
      1: {
        [LLMJobType.DOCUMENT_TAGGING]: <DocumentTagSelectionStep projectId={projectId} />,
        [LLMJobType.METADATA_EXTRACTION]: <ProjectMetadataSelectionStep projectId={projectId} />,
        [LLMJobType.ANNOTATION]: <CodeSelectionStep projectId={projectId} />,
      },
      2: {
        [LLMJobType.DOCUMENT_TAGGING]: <PromptEditorStep projectId={projectId} />,
        [LLMJobType.METADATA_EXTRACTION]: <PromptEditorStep projectId={projectId} />,
        [LLMJobType.ANNOTATION]: <PromptEditorStep projectId={projectId} />,
      },
      3: {
        [LLMJobType.DOCUMENT_TAGGING]: <StatusStep />,
        [LLMJobType.METADATA_EXTRACTION]: <StatusStep />,
        [LLMJobType.ANNOTATION]: <StatusStep />,
      },
      4: {
        [LLMJobType.DOCUMENT_TAGGING]: <DocumentTagResultStep projectId={projectId} />,
        [LLMJobType.METADATA_EXTRACTION]: <MetadataExtractionResultStep />,
        [LLMJobType.ANNOTATION]: <AnnotationResultStep />,
      },
    };
  }, [projectId]);

  return (
    <Dialog open={open} maxWidth="lg" fullWidth>
      <DialogTitle>LLM Assistant {method && <> - {title[method]}</>}</DialogTitle>

      <DialogContent sx={{ px: 2 }}>
        <Stepper activeStep={step}>
          {steps[method || LLMJobType.DOCUMENT_TAGGING].map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
      </DialogContent>
      {contentDict[step][method || LLMJobType.DOCUMENT_TAGGING]}
    </Dialog>
  );
}

export default LLMDialog;
