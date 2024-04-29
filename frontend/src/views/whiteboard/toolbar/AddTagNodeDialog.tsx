import { Button, ButtonProps, Dialog, DialogActions, DialogTitle } from "@mui/material";
import { useState } from "react";
import { XYPosition } from "reactflow";
import { DocumentTagRead } from "../../../api/openapi/models/DocumentTagRead.ts";
import TagSelector from "../../../components/Selectors/TagSelector.tsx";
import { ReactFlowService } from "../hooks/ReactFlowService.ts";
import { AddNodeDialogProps } from "../types/AddNodeDialogProps.ts";
import { PendingAddNodeAction } from "../types/PendingAddNodeAction.ts";
import { createTagNodes } from "../whiteboardUtils.ts";

export interface AddTagNodeDialogProps extends AddNodeDialogProps {
  projectId: number;
  buttonProps?: Omit<ButtonProps, "onClick">;
}

function AddTagNodeDialog({ projectId, buttonProps, onClick }: AddTagNodeDialogProps) {
  const [open, setOpen] = useState(false);

  const handleOpenDialogClick = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  const handleAddTags = (tags: DocumentTagRead[]) => {
    const addTagNode: PendingAddNodeAction = (position: XYPosition, reactFlowService: ReactFlowService) =>
      reactFlowService.addNodes(createTagNodes({ tags, position: position }));
    onClick(addTagNode);
    handleClose();
  };

  return (
    <>
      <Button onClick={handleOpenDialogClick} {...buttonProps}>
        Add tags
      </Button>
      <Dialog onClose={handleClose} open={open} maxWidth="lg" fullWidth>
        <DialogTitle>Select tags to add to Whiteboard</DialogTitle>
        <TagSelector projectId={projectId} onAddTags={handleAddTags} />
        <DialogActions>
          <Button onClick={handleClose}>Close</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

export default AddTagNodeDialog;
