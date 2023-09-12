import { Button, ButtonProps, Dialog, DialogActions, DialogTitle } from "@mui/material";
import { useState } from "react";
import DocumentSelector from "../../../components/Selectors/DocumentSelector";
import { SourceDocumentRead } from "../../../api/openapi/models/SourceDocumentRead";
import { useReactFlow } from "reactflow";
import { useReactFlowService } from "../hooks/ReactFlowService";
import { createSdocNodes } from "../whiteboardUtils";

export interface AddDocumentNodeDialogProps {
  projectId: number;
  buttonProps?: Omit<ButtonProps, "onClick">;
}

function AddDocumentNodeDialog({ projectId, buttonProps }: AddDocumentNodeDialogProps) {
  const reactFlowInstance = useReactFlow();
  const reactFlowService = useReactFlowService(reactFlowInstance);

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
    reactFlowService.addNodes(createSdocNodes({ sdocs: selectedDocuments }));
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
