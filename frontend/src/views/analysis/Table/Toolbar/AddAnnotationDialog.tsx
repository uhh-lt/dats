import { Button, ButtonProps, Dialog, DialogActions, DialogTitle } from "@mui/material";
import { useState } from "react";
import { AnnotationOccurrence } from "../../../../api/openapi";
import AnnotationSelector from "../../../../components/Selectors/AnnotationSelector";

export interface AddAnnotationDialogProps {
  projectId: number;
  userIds: number[];
  shouldOpen: () => boolean;
  onConfirmSelection: (annotations: AnnotationOccurrence[], addRows: boolean) => void;
  buttonProps?: Omit<ButtonProps, "onClick">;
}

function AddAnnotationDialog({
  projectId,
  userIds,
  onConfirmSelection,
  shouldOpen,
  buttonProps,
}: AddAnnotationDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedAnnotations, setSelectedAnnotations] = useState<AnnotationOccurrence[]>([]);

  const onOpenDialogClick = () => {
    setOpen(shouldOpen());
  };

  const handleClose = () => {
    setOpen(false);
    setSelectedAnnotations([]);
  };

  const handleConfirmSelection = (addRows: boolean) => {
    onConfirmSelection(selectedAnnotations, addRows);
    handleClose();
  };

  return (
    <>
      <Button onClick={onOpenDialogClick} {...buttonProps}>
        Add annotations
      </Button>
      <Dialog onClose={handleClose} open={open} maxWidth="lg" fullWidth>
        <DialogTitle>Select annotations to add to table</DialogTitle>
        <AnnotationSelector projectId={projectId} userIds={userIds} setSelectedAnnotations={setSelectedAnnotations} />
        <DialogActions>
          <Button onClick={handleClose}>Close</Button>
          <Button onClick={() => handleConfirmSelection(false)} disabled={selectedAnnotations.length === 0}>
            Add {selectedAnnotations.length > 0 ? selectedAnnotations.length : null} Annotations to cell
          </Button>
          <Button onClick={() => handleConfirmSelection(true)} disabled={selectedAnnotations.length === 0}>
            Add {selectedAnnotations.length > 0 ? selectedAnnotations.length : null} Annotations as new rows below cell
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

export default AddAnnotationDialog;
