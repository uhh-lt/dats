import { DATSDialogHeader } from "@components/DATSDialogHeader";
import { useDialogMaximize } from "@hooks/useDialogMaximize";
import DeleteIcon from "@mui/icons-material/Delete";
import { Button, Dialog, DialogActions, DialogContent, DialogContentText } from "@mui/material";
import { useDialogBus } from "@store/global/dialogBusHooks";
import { useCallback } from "react";

export function ConfirmationDialog() {
  const { isOpen, data: dialogData, close: handleClose, onSuccess } = useDialogBus("confirmation");
  const { isMaximized, toggleMaximize } = useDialogMaximize();

  const handleReject = useCallback(() => {
    handleClose();
    onSuccess(false);
  }, [handleClose, onSuccess]);

  const handleAccept = useCallback(() => {
    handleClose();
    onSuccess(true);
  }, [handleClose, onSuccess]);

  const isDelete = dialogData?.type === "DELETE";
  return (
    <Dialog open={isOpen} onClose={handleClose} maxWidth="sm" fullWidth fullScreen={isMaximized}>
      <DATSDialogHeader
        title="Warning!"
        onClose={handleClose}
        isMaximized={isMaximized}
        onToggleMaximize={toggleMaximize}
      />
      {dialogData && (
        <>
          <DialogContent>
            <DialogContentText>{dialogData.text}</DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleReject}>Cancel</Button>
            <Button
              onClick={handleAccept}
              autoFocus
              variant="contained"
              startIcon={isDelete ? <DeleteIcon /> : null}
              color={isDelete ? "error" : "primary"}
            >
              {isDelete ? "Delete" : "Confirm"}
            </Button>
          </DialogActions>
        </>
      )}
    </Dialog>
  );
}
