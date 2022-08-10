import { Snackbar } from "@mui/material";
import React, { useCallback, useEffect } from "react";
import eventBus from "../../EventBus";
import MuiAlert, { AlertProps } from "@mui/material/Alert";
import { SnackbarEvent } from "./SnackbarAPI";

export default function SnackbarDialog() {
  const [open, setOpen] = React.useState(false);
  const [text, setText] = React.useState("");
  const [severity, setSeverity] = React.useState<AlertProps["severity"]>("success");

  const openSnackbar = useCallback((event: CustomEventInit) => {
    const snackbarEvent: SnackbarEvent = event.detail;
    setOpen(true);
    setText(snackbarEvent.text);
    setSeverity(snackbarEvent.severity);
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
      <MuiAlert elevation={6} variant="filled" onClose={closeSnackbar} severity={severity} sx={{ width: "100%" }}>
        {text}
      </MuiAlert>
    </Snackbar>
  );
}
