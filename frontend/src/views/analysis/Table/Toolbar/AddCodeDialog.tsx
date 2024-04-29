import { Button, ButtonGroup, ButtonProps, Dialog, DialogActions, DialogTitle } from "@mui/material";
import { useState } from "react";
import { CodeRead } from "../../../../api/openapi/models/CodeRead.ts";
import CodeSelector from "../../../../components/Selectors/CodeSelector.tsx";

export interface AddCodeDialogProps extends ButtonProps {
  projectId: number;
  shouldOpen: () => boolean;
  onConfirmSelection: (codes: CodeRead[], addRows: boolean) => void;
  buttonProps?: Omit<ButtonProps, "onClick">;
}

function AddCodeDialog({ projectId, shouldOpen, onConfirmSelection, buttonProps }: AddCodeDialogProps) {
  const [open, setOpen] = useState(false);
  const [isAddCodesToCell, setIsAddCodesToCell] = useState(true);

  const onOpenDialogClick = () => {
    setOpen(shouldOpen());
  };

  const handleClose = () => {
    setOpen(false);
  };

  const handleAddCodes = (codes: CodeRead[]) => {
    onConfirmSelection(codes, !isAddCodesToCell);
    handleClose();
  };

  return (
    <>
      <Button onClick={onOpenDialogClick} {...buttonProps}>
        Add codes
      </Button>
      <Dialog onClose={() => setOpen(false)} open={open} maxWidth="lg" fullWidth>
        <DialogTitle>Select codes to add to table</DialogTitle>
        <CodeSelector projectId={projectId} onAddCodes={handleAddCodes} />
        <DialogActions>
          <Button onClick={handleClose}>Close</Button>
          <ButtonGroup size="small">
            <Button variant={isAddCodesToCell ? "contained" : "outlined"} onClick={() => setIsAddCodesToCell(true)}>
              Add to cell
            </Button>
            <Button variant={!isAddCodesToCell ? "contained" : "outlined"} onClick={() => setIsAddCodesToCell(false)}>
              Add as rows
            </Button>
          </ButtonGroup>
        </DialogActions>
      </Dialog>
    </>
  );
}

export default AddCodeDialog;
