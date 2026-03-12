import DeleteIcon from "@mui/icons-material/Delete";
import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from "@mui/material";
import { useAppDispatch, useAppSelector } from "@store/storeHooks";
import { memo, useCallback } from "react";
import { ConfirmationActions } from "./confirmationSlice";

export const ConfirmationDialog = memo(() => {
  const isConfirmationDialogOpen = useAppSelector((state) => state.confirmation.isConfirmationDialogOpen);
  const confirmationEventData = useAppSelector((state) => state.confirmation.confirmationData);
  const dispatch = useAppDispatch();

  // ui events
  const handleClose = useCallback(() => {
    dispatch(ConfirmationActions.closeConfirmationDialog());
  }, [dispatch]);

  const handleReject = useCallback(() => {
    handleClose();
    if (confirmationEventData?.onReject) confirmationEventData.onReject();
  }, [confirmationEventData, handleClose]);

  const handleAccept = useCallback(() => {
    handleClose();
    if (confirmationEventData?.onAccept) confirmationEventData.onAccept();
  }, [confirmationEventData, handleClose]);

  const cancelText = "Cancel";
  const confirmText = confirmationEventData?.type == "DELETE" ? "Delete" : "Confirm";

  return (
    <Dialog open={isConfirmationDialogOpen} onClose={handleClose} maxWidth="sm" fullWidth>
      {confirmationEventData && (
        <>
          <DialogTitle id="alert-dialog-title">{"Warning!"}</DialogTitle>
          <DialogContent>
            <DialogContentText id="alert-dialog-description">{confirmationEventData.text}</DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleReject}>{cancelText}</Button>
            <Button
              onClick={handleAccept}
              autoFocus
              variant="contained"
              startIcon={confirmationEventData.type == "DELETE" ? <DeleteIcon /> : null}
              color={confirmationEventData.type == "DELETE" ? "error" : "primary"}
            >
              {confirmText}
            </Button>
          </DialogActions>
        </>
      )}
    </Dialog>
  );
});
