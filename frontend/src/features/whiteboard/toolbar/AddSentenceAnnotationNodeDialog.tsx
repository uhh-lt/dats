import { ButtonProps } from "@mui/material";
import { XYPosition } from "reactflow";
import { SelectSentenceAnnotationsDialog } from "../../../core/sentence-annotation/dialog/SelectSentenceAnnotationsDialog.tsx";
import { ReactFlowService } from "../hooks/ReactFlowService.ts";
import { AddNodeDialogProps } from "../types/AddNodeDialogProps.ts";
import { PendingAddNodeAction } from "../types/PendingAddNodeAction.ts";
import { createSentenceAnnotationNodes } from "../whiteboardUtils.ts";

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
