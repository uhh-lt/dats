import { Button, ButtonProps, Dialog, DialogActions, DialogTitle } from "@mui/material";
import { useState } from "react";
import { useReactFlow } from "reactflow";
import { MemoRead } from "../../../api/openapi";
import MemoSelector from "../../../components/Selectors/MemoSelector";
import { useReactFlowService } from "../hooks/ReactFlowService";
import { createMemoNodes } from "../whiteboardUtils";

export interface AddMemoNodeDialogProps {
  projectId: number;
  userId: number;
  buttonProps?: Omit<ButtonProps, "onClick">;
}

function AddMemoNodeDialog({ projectId, userId, buttonProps }: AddMemoNodeDialogProps) {
  // whiteboard (react-flow)
  const reactFlowInstance = useReactFlow();
  const reactFlowService = useReactFlowService(reactFlowInstance);

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
    reactFlowService.addNodes(createMemoNodes({ memos: selectedMemos }));
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
