import { Button, ButtonProps, Dialog, DialogActions, DialogTitle } from "@mui/material";
import { useState } from "react";
import { XYPosition } from "reactflow";
import { CodeRead } from "../../../api/openapi/models/CodeRead.ts";
import CodeSelector from "../../../components/Selectors/CodeSelector.tsx";
import { ReactFlowService } from "../hooks/ReactFlowService.ts";
import { AddNodeDialogProps } from "../types/AddNodeDialogProps.ts";
import { PendingAddNodeAction } from "../types/PendingAddNodeAction.ts";
import { createCodeNodes } from "../whiteboardUtils.ts";

export interface AddCodeNodeDialogProps extends AddNodeDialogProps {
  projectId: number;
  buttonProps?: Omit<ButtonProps, "onClick">;
}

function AddCodeNodeDialog({ projectId, buttonProps, onClick }: AddCodeNodeDialogProps) {
  const [open, setOpen] = useState(false);

  const onOpenDialogClick = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  const handleAddCodes = (codes: CodeRead[]) => {
    const addNode: PendingAddNodeAction = (position: XYPosition, reactFlowService: ReactFlowService) =>
      reactFlowService.addNodes(createCodeNodes({ codes, position: position }));
    onClick(addNode);
    handleClose();
  };

  return (
    <>
      <Button onClick={onOpenDialogClick} {...buttonProps}>
        Add codes
      </Button>
      <Dialog onClose={handleClose} open={open} maxWidth="lg" fullWidth>
        <DialogTitle>Select codes to add to Whiteboard</DialogTitle>
        <CodeSelector projectId={projectId} onAddCodes={handleAddCodes} />
        <DialogActions>
          <Button onClick={handleClose}>Close</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

export default AddCodeNodeDialog;
