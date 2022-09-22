import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from "@mui/material";
import React, { useCallback, useEffect, useState } from "react";
import eventBus from "../../EventBus";
import { ConfirmationEvent } from "./ConfirmationAPI";

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

  const handleAccept = useCallback(() => {
    handleClose();
    if (confirmationEventData?.onAccept) confirmationEventData.onAccept();
  }, [confirmationEventData]);

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      {confirmationEventData && (
        <>
          <DialogTitle id="alert-dialog-title">{"Warning!"}</DialogTitle>
          <DialogContent>
            <DialogContentText id="alert-dialog-description">{confirmationEventData.text}</DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleClose}>Cancel</Button>
            <Button onClick={handleAccept} autoFocus>
              Confirm
            </Button>
          </DialogActions>
        </>
      )}
    </Dialog>
  );
}
