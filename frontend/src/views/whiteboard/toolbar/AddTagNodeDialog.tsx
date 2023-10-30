import { Button, ButtonProps, Dialog, DialogActions, DialogTitle } from "@mui/material";
import { useState } from "react";
import { XYPosition, useReactFlow } from "reactflow";
import { DocumentTagRead } from "../../../api/openapi";
import TagSelector from "../../../components/Selectors/TagSelector";
import { useReactFlowService } from "../hooks/ReactFlowService";
import { AddNodeDialogProps } from "../types/AddNodeDialogProps";
import { createTagNodes } from "../whiteboardUtils";

export interface AddTagNodeDialogProps extends AddNodeDialogProps {
  projectId: number;
  buttonProps?: Omit<ButtonProps, "onClick">;
}

function AddTagNodeDialog({ projectId, buttonProps, onClick }: AddTagNodeDialogProps) {
  // whiteboard (react-flow)
  const reactFlowInstance = useReactFlow();
  const reactFlowService = useReactFlowService(reactFlowInstance);

  const [open, setOpen] = useState(false);
  const [selectedTags, setSelectedTags] = useState<DocumentTagRead[]>([]);

  const handleOpenDialogClick = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setSelectedTags([]);
  };

  const handleConfirmSelection = () => {
    const addTagNode = (position: XYPosition) =>
      reactFlowService.addNodes(createTagNodes({ tags: selectedTags, position: position }));
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
        <TagSelector projectId={projectId} setSelectedTags={setSelectedTags} />
        <DialogActions>
          <Button onClick={handleClose}>Close</Button>
          <Button onClick={handleConfirmSelection} disabled={selectedTags.length === 0}>
            Add {selectedTags.length > 0 ? selectedTags.length : null} Tags
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

export default AddTagNodeDialog;
