import { AlertTitle, Snackbar } from "@mui/material";
import MuiAlert from "@mui/material/Alert";
import { useCallback, useEffect, useState } from "react";
import eventBus from "../../EventBus.ts";
import { SnackbarEvent } from "./SnackbarAPI.ts";

export default function SnackbarDialog() {
  const [event, setEvent] = useState<SnackbarEvent | undefined>();
  const [open, setOpen] = useState(false);

  const openSnackbar = useCallback((event: CustomEventInit) => {
    const snackbarEvent: SnackbarEvent = event.detail;
    setOpen(true);
    setEvent(snackbarEvent);
  }, []);

  useEffect(() => {
    eventBus.on("open-snackbar", openSnackbar);

    return () => {
      eventBus.remove("open-snackbar", openSnackbar);
    };
  }, [openSnackbar]);

  const closeSnackbar = () => {
    setOpen(false);
  };

  return (
    <Snackbar
      open={open}
      autoHideDuration={6000}
      onClose={closeSnackbar}
      anchorOrigin={{ vertical: "top", horizontal: "center" }}
    >
      {event && (
        <MuiAlert
          elevation={6}
          variant="filled"
          onClose={closeSnackbar}
          severity={event.severity}
          sx={{ width: "100%" }}
        >
          {event.title ? <AlertTitle>{event.title}</AlertTitle> : <></>}
          {event.text}
        </MuiAlert>
      )}
    </Snackbar>
  );
}
