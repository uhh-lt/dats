import { Button, ButtonProps, Dialog, DialogActions, DialogTitle } from "@mui/material";
import { useState } from "react";
import { XYPosition } from "reactflow";
import { CodeRead } from "../../../api/openapi/models/CodeRead.ts";
import CodeSelector from "../../../components/Selectors/CodeSelector.tsx";
import { ReactFlowService } from "../hooks/ReactFlowService.ts";
import { AddNodeDialogProps } from "../types/AddNodeDialogProps.ts";
import { createCodeNodes } from "../whiteboardUtils.ts";

export interface AddCodeNodeDialogProps extends AddNodeDialogProps {
  projectId: number;
  buttonProps?: Omit<ButtonProps, "onClick">;
}

function AddCodeNodeDialog({ projectId, buttonProps, onClick }: AddCodeNodeDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedCodes, setSelectedCodes] = useState<CodeRead[]>([]);

  const onOpenDialogClick = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setSelectedCodes([]);
  };

  const handleConfirmSelection = () => {
    const addNode = (position: XYPosition, reactFlowService: ReactFlowService) =>
      reactFlowService.addNodes(createCodeNodes({ codes: selectedCodes, position: position }));
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
        <CodeSelector
          projectId={projectId}
          setSelectedCodes={setSelectedCodes}
          allowMultiselect={true}
          height="400px"
        />
        <DialogActions>
          <Button onClick={handleClose}>Close</Button>
          <Button onClick={handleConfirmSelection} disabled={selectedCodes.length === 0}>
            Add {selectedCodes.length > 0 ? selectedCodes.length : null} Codes
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

export default AddCodeNodeDialog;
