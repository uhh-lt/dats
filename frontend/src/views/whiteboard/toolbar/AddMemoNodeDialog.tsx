import { Button, ButtonProps, Dialog, DialogActions, DialogTitle } from "@mui/material";
import { useState } from "react";
import { XYPosition } from "reactflow";
import { MemoRead } from "../../../api/openapi/models/MemoRead.ts";
import MemoSelector from "../../../components/Selectors/MemoSelector.tsx";
import { ReactFlowService } from "../hooks/ReactFlowService.ts";
import { AddNodeDialogProps } from "../types/AddNodeDialogProps.ts";
import { PendingAddNodeAction } from "../types/PendingAddNodeAction.ts";
import { createMemoNodes } from "../whiteboardUtils.ts";

export interface AddMemoNodeDialogProps extends AddNodeDialogProps {
  projectId: number;
  userId: number;
  buttonProps?: Omit<ButtonProps, "onClick">;
}

function AddMemoNodeDialog({ projectId, userId, buttonProps, onClick }: AddMemoNodeDialogProps) {
  const [open, setOpen] = useState(false);

  const handleOpenDialogClick = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  const handleAddMemos = (memos: MemoRead[]) => {
    const addNode: PendingAddNodeAction = (position: XYPosition, reactFlowService: ReactFlowService) =>
      reactFlowService.addNodes(createMemoNodes({ memos, position: position }));
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
        <MemoSelector projectId={projectId} userId={userId} onAddMemos={handleAddMemos} />
        <DialogActions>
          <Button onClick={handleClose}>Close</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

export default AddMemoNodeDialog;
