/* eslint-disable local/dialog-conventions -- a confirmation is a small alert dialog: DialogTitle, no maximize */
import DeleteIcon from "@mui/icons-material/Delete";
import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from "@mui/material";
import { useAppDispatch, useAppSelector } from "@store/storeHooks";
import { useCallback } from "react";
import { ConfirmationActions } from "./confirmationSlice";

export function ConfirmationDialog() {
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

  return (
    <Dialog open={isConfirmationDialogOpen} onClose={handleClose} maxWidth="sm" fullWidth>
      {confirmationEventData && (
        <>
          <DialogTitle id="alert-dialog-title">{"Warning!"}</DialogTitle>
          <DialogContent>
            <DialogContentText id="alert-dialog-description">{confirmationEventData.text}</DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleReject}>Cancel</Button>
            <Button
              onClick={handleAccept}
              autoFocus
              variant="contained"
              startIcon={confirmationEventData.type == "DELETE" ? <DeleteIcon /> : null}
              color={confirmationEventData.type == "DELETE" ? "error" : "primary"}
            >
              {confirmationEventData.type == "DELETE" ? "Delete" : "Confirm"}
            </Button>
          </DialogActions>
        </>
      )}
    </Dialog>
  );
}
