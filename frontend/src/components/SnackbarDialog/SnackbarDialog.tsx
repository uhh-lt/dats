import { AlertTitle, Snackbar } from "@mui/material";
import MuiAlert from "@mui/material/Alert";
import { useCallback } from "react";
import { useAppDispatch, useAppSelector } from "../../plugins/ReduxHooks.ts";
import { CRUDDialogActions } from "../../store/dialogSlice.ts";

export function SnackbarDialog() {
  const isSnackbarOpen = useAppSelector((state) => state.dialog.isSnackbarOpen);
  const event = useAppSelector((state) => state.dialog.snackbarData);
  const dispatch = useAppDispatch();

  const closeSnackbar = useCallback(() => {
    dispatch(CRUDDialogActions.closeSnackbar());
  }, [dispatch]);

  return (
    <Snackbar
      open={isSnackbarOpen}
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
