import { AlertProps } from "@mui/material/Alert";
import eventBus from "../../EventBus";

export interface SnackbarEvent {
  severity: AlertProps["severity"];
  text: string;
}

function openSnackbar(data: SnackbarEvent) {
  eventBus.dispatch("open-snackbar", data);
}

const SnackbarAPI = { openSnackbar };

export default SnackbarAPI;
