import { Button, ButtonProps, Dialog, DialogActions, DialogTitle } from "@mui/material";
import { useState } from "react";
import { CodeRead } from "../../../../api/openapi";
import CodeSelector from "../../../../components/Selectors/CodeSelector";

export interface AddCodeDialogProps extends ButtonProps {
  projectId: number;
  shouldOpen: () => boolean;
  onConfirmSelection: (codes: CodeRead[], addRows: boolean) => void;
  buttonProps?: Omit<ButtonProps, "onClick">;
}

function AddCodeDialog({ projectId, shouldOpen, onConfirmSelection, buttonProps }: AddCodeDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedCodes, setSelectedCodes] = useState<CodeRead[]>([]);

  const onOpenDialogClick = () => {
    setOpen(shouldOpen());
  };

  const handleClose = () => {
    setOpen(false);
    setSelectedCodes([]);
  };

  const handleConfirmSelection = (addRows: boolean) => {
    onConfirmSelection(selectedCodes, addRows);
    handleClose();
  };

  return (
    <>
      <Button onClick={onOpenDialogClick} {...buttonProps}>
        Add codes
      </Button>
      <Dialog onClose={() => setOpen(false)} open={open} maxWidth="lg" fullWidth>
        <DialogTitle>Select codes to add to table</DialogTitle>
        <CodeSelector
          projectId={projectId}
          setSelectedCodes={setSelectedCodes}
          allowMultiselect={true}
          height="400px"
        />
        <DialogActions>
          <Button onClick={handleClose}>Close</Button>
          <Button onClick={() => handleConfirmSelection(false)} disabled={selectedCodes.length === 0}>
            Add {selectedCodes.length > 0 ? selectedCodes.length : null} Codes to cell
          </Button>
          <Button onClick={() => handleConfirmSelection(true)} disabled={selectedCodes.length === 0}>
            Add {selectedCodes.length > 0 ? selectedCodes.length : null} Codes as new rows below cell
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

export default AddCodeDialog;
