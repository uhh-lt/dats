import { AlertProps } from "@mui/material";

export interface SnackbarEvent {
  severity: AlertProps["severity"];
  text: string;
  title?: string;
}
