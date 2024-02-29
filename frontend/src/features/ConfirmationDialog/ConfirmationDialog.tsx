import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from "@mui/material";
import { useCallback, useEffect, useState } from "react";
import eventBus from "../../EventBus.ts";
import { ConfirmationEvent } from "./ConfirmationAPI.ts";

export default function ConfirmationDialog() {
  // state
  const [open, setOpen] = useState(false);
  const [confirmationEventData, setConfirmationEventData] = useState<ConfirmationEvent>();

  // listen to open-memo event and open the dialog
  const openModal = useCallback((event: CustomEventInit<ConfirmationEvent>) => {
    setOpen(true);
    setConfirmationEventData(event.detail);
  }, []);

  useEffect(() => {
    eventBus.on("open-confirmation-dialog", openModal);
    return () => {
      eventBus.remove("open-confirmation-dialog", openModal);
    };
  }, [openModal]);

  // ui events
  const handleClose = useCallback(() => {
    setOpen(false);
    setConfirmationEventData(undefined);
  }, []);

  const handleReject = useCallback(() => {
    handleClose();
    if (confirmationEventData?.onReject) confirmationEventData.onReject();
  }, [confirmationEventData, handleClose]);

  const handleAccept = useCallback(() => {
    handleClose();
    if (confirmationEventData?.onAccept) confirmationEventData.onAccept();
  }, [confirmationEventData, handleClose]);

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      {confirmationEventData && (
        <>
          <DialogTitle id="alert-dialog-title">{"Warning!"}</DialogTitle>
          <DialogContent>
            <DialogContentText id="alert-dialog-description">{confirmationEventData.text}</DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleReject}>Cancel</Button>
            <Button onClick={handleAccept} autoFocus>
              Confirm
            </Button>
          </DialogActions>
        </>
      )}
    </Dialog>
  );
}
