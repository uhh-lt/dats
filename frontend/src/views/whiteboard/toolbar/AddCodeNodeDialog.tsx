import { Button, ButtonProps, Dialog, DialogActions, DialogTitle } from "@mui/material";
import { useState } from "react";
import CodeSelector from "../../../components/Selectors/CodeSelector";
import { CodeRead } from "../../../api/openapi";
import { useReactFlow } from "reactflow";
import { useReactFlowService } from "../hooks/ReactFlowService";
import { createCodeNodes } from "../whiteboardUtils";

export interface AddCodeNodeDialogProps extends ButtonProps {
  projectId: number;
  buttonProps?: Omit<ButtonProps, "onClick">;
}

function AddCodeNodeDialog({ projectId, buttonProps }: AddCodeNodeDialogProps) {
  // whiteboard (react-flow)
  const reactFlowInstance = useReactFlow();
  const reactFlowService = useReactFlowService(reactFlowInstance);

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
    reactFlowService.addNodes(createCodeNodes({ codes: selectedCodes }));
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
