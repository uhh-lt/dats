import { Button, ButtonProps, Dialog, DialogActions, DialogTitle } from "@mui/material";
import { useState } from "react";
import { useReactFlow } from "reactflow";
import { AnnotationOccurrence, DocType } from "../../../api/openapi";
import AnnotationSelector from "../../../components/Selectors/AnnotationSelector";
import { useReactFlowService } from "../hooks/ReactFlowService";
import { createBBoxAnnotationNodes, createSpanAnnotationNodes } from "../whiteboardUtils";

export interface AddAnnotationNodeDialogProps {
  projectId: number;
  userIds: number[];
  buttonProps?: Omit<ButtonProps, "onClick">;
}

function AddAnnotationNodeDialog({ projectId, userIds, buttonProps }: AddAnnotationNodeDialogProps) {
  // whiteboard (react-flow)
  const reactFlowInstance = useReactFlow();
  const reactFlowService = useReactFlowService(reactFlowInstance);

  const [open, setOpen] = useState(false);
  const [selectedAnnotations, setSelectedAnnotations] = useState<AnnotationOccurrence[]>([]);

  const onOpenDialogClick = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setSelectedAnnotations([]);
  };

  const handleConfirmSelection = () => {
    const spanAnnotations = selectedAnnotations
      .filter((annotation) => annotation.sdoc.doctype === DocType.TEXT)
      .map((annotation) => annotation.annotation.id);
    const bboxAnnotations = selectedAnnotations
      .filter((annotation) => annotation.sdoc.doctype === DocType.IMAGE)
      .map((annotation) => annotation.annotation.id);

    reactFlowService.addNodes([
      ...createSpanAnnotationNodes({ spanAnnotations }),
      ...createBBoxAnnotationNodes({ bboxAnnotations }),
    ]);
    handleClose();
  };

  return (
    <>
      <Button onClick={onOpenDialogClick} {...buttonProps}>
        Add annotations
      </Button>
      <Dialog onClose={handleClose} open={open} maxWidth="lg" fullWidth>
        <DialogTitle>Select annotations to add to Whiteboard</DialogTitle>
        <AnnotationSelector projectId={projectId} userIds={userIds} setSelectedAnnotations={setSelectedAnnotations} />
        <DialogActions>
          <Button onClick={handleClose}>Close</Button>
          <Button onClick={handleConfirmSelection} disabled={selectedAnnotations.length === 0}>
            Add {selectedAnnotations.length > 0 ? selectedAnnotations.length : null} Annotations
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

export default AddAnnotationNodeDialog;
