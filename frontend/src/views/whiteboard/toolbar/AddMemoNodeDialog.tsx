import { Button, ButtonProps, Dialog, DialogActions, DialogTitle } from "@mui/material";
import { useState } from "react";
import { XYPosition } from "reactflow";
import { MemoRead } from "../../../api/openapi";
import MemoSelector from "../../../components/Selectors/MemoSelector";
import { ReactFlowService } from "../hooks/ReactFlowService";
import { AddNodeDialogProps } from "../types/AddNodeDialogProps";
import { createMemoNodes } from "../whiteboardUtils";

export interface AddMemoNodeDialogProps extends AddNodeDialogProps {
  projectId: number;
  userId: number;
  buttonProps?: Omit<ButtonProps, "onClick">;
}

function AddMemoNodeDialog({ projectId, userId, buttonProps, onClick }: AddMemoNodeDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedMemos, setSelectedMemos] = useState<MemoRead[]>([]);

  const handleOpenDialogClick = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setSelectedMemos([]);
  };

  const handleConfirmSelection = () => {
    const addNode = (position: XYPosition, reactFlowService: ReactFlowService) =>
      reactFlowService.addNodes(createMemoNodes({ memos: selectedMemos, position: position }));
    onClick(addNode);
    handleClose();
  };

  return (
    <>
      <Button onClick={handleOpenDialogClick} {...buttonProps}>
        Add memos
      </Button>
      <Dialog onClose={handleClose} open={open} maxWidth="lg" fullWidth>
        <DialogTitle>Select memos to add to Whiteboard</DialogTitle>
        <MemoSelector projectId={projectId} userId={userId} setSelectedMemos={setSelectedMemos} />
        <DialogActions>
          <Button onClick={handleClose}>Close</Button>
          <Button onClick={handleConfirmSelection} disabled={selectedMemos.length === 0}>
            Add {selectedMemos.length > 0 ? selectedMemos.length : null} Memos
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

export default AddMemoNodeDialog;
