import { Button, ButtonProps, Dialog, DialogActions, DialogTitle } from "@mui/material";
import { useState } from "react";
import { SourceDocumentRead } from "../../../../api/openapi";
import DocumentSelector from "../../../../components/Selectors/DocumentSelector";

export interface AddDocumentDialogProps {
  projectId: number;
  shouldOpen: () => boolean;
  onConfirmSelection: (documents: SourceDocumentRead[], addRows: boolean) => void;
  buttonProps?: Omit<ButtonProps, "onClick">;
}

function AddDocumentDialog({ projectId, shouldOpen, onConfirmSelection, buttonProps }: AddDocumentDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedDocuments, setSelectedDocuments] = useState<SourceDocumentRead[]>([]);

  const onOpenDialogClick = () => {
    setOpen(shouldOpen());
  };

  const handleClose = () => {
    setOpen(false);
    setSelectedDocuments([]);
  };

  const handleConfirmSelection = (addRows: boolean) => {
    onConfirmSelection(selectedDocuments, addRows);
    handleClose();
  };

  return (
    <>
      <Button onClick={onOpenDialogClick} {...buttonProps}>
        Add documents
      </Button>
      <Dialog onClose={handleClose} open={open} maxWidth="lg" fullWidth>
        <DialogTitle>Select documents to add to cell</DialogTitle>
        <DocumentSelector projectId={projectId} setSelectedDocuments={setSelectedDocuments} />
        <DialogActions>
          <Button onClick={handleClose}>Close</Button>
          <Button onClick={() => handleConfirmSelection(false)} disabled={selectedDocuments.length === 0}>
            Add {selectedDocuments.length > 0 ? selectedDocuments.length : null} Documents to cell
          </Button>
          <Button onClick={() => handleConfirmSelection(true)} disabled={selectedDocuments.length === 0}>
            Add {selectedDocuments.length > 0 ? selectedDocuments.length : null} Documents as new rows below cell
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

export default AddDocumentDialog;
