import { Button, ButtonProps, Dialog, DialogActions, DialogTitle } from "@mui/material";
import { useState } from "react";
import { XYPosition } from "reactflow";
import { SourceDocumentRead } from "../../../api/openapi/models/SourceDocumentRead";
import DocumentSelector from "../../../components/Selectors/DocumentSelector";
import { ReactFlowService } from "../hooks/ReactFlowService";
import { AddNodeDialogProps } from "../types/AddNodeDialogProps";
import { createSdocNodes } from "../whiteboardUtils";

export interface AddDocumentNodeDialogProps extends AddNodeDialogProps {
  projectId: number;
  buttonProps?: Omit<ButtonProps, "onClick">;
}

function AddDocumentNodeDialog({ projectId, buttonProps, onClick }: AddDocumentNodeDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedDocuments, setSelectedDocuments] = useState<SourceDocumentRead[]>([]);

  const handleOpenDialogClick = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setSelectedDocuments([]);
  };

  const handleConfirmSelection = () => {
    const addNode = (position: XYPosition, reactFlowService: ReactFlowService) =>
      reactFlowService.addNodes(createSdocNodes({ sdocs: selectedDocuments, position: position }));
    onClick(addNode);
    handleClose();
  };

  return (
    <>
      <Button onClick={handleOpenDialogClick} {...buttonProps}>
        Add documents
      </Button>
      <Dialog onClose={handleClose} open={open} maxWidth="lg" fullWidth>
        <DialogTitle>Select documents to add to Whiteboard</DialogTitle>
        <DocumentSelector projectId={projectId} setSelectedDocuments={setSelectedDocuments} />
        <DialogActions>
          <Button onClick={handleClose}>Close</Button>
          <Button onClick={handleConfirmSelection} disabled={selectedDocuments.length === 0}>
            Add {selectedDocuments.length > 0 ? selectedDocuments.length : null} Documents
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

export default AddDocumentNodeDialog;
