import { SelectSentenceAnnotationsDialog } from "@core/sentence-annotation";
import { ButtonProps } from "@mui/material";
import { XYPosition } from "reactflow";
import { ReactFlowService } from "../../_hooks/ReactFlowService";
import { AddNodeDialogProps } from "../../_types/AddNodeDialogProps";
import { PendingAddNodeAction } from "../../_types/PendingAddNodeAction";
import { createSentenceAnnotationNodes } from "../../_utils/whiteboardUtils";

interface AddSentenceAnnotationNodeDialogProps extends AddNodeDialogProps {
  projectId: number;
  buttonProps?: Omit<ButtonProps, "onClick">;
}

export function AddSentenceAnnotationNodeDialog({
  projectId,
  buttonProps,
  onClick,
}: AddSentenceAnnotationNodeDialogProps) {
  const handleConfirmSelection = (annotationIds: number[]) => {
    const addNode: PendingAddNodeAction = (position: XYPosition, reactFlowService: ReactFlowService) =>
      reactFlowService.addNodes(createSentenceAnnotationNodes({ sentenceAnnotations: annotationIds, position }));
    onClick(addNode);
  };

  return (
    <SelectSentenceAnnotationsDialog
      title={"Select sentence annotations to add to Whiteboard"}
      projectId={projectId}
      buttonProps={buttonProps}
      onConfirmSelection={handleConfirmSelection}
    />
  );
}
