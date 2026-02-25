import { AlertProps } from "@mui/material";
import { PayloadAction, createSlice } from "@reduxjs/toolkit/react";
import { SnackbarEvent } from "./_types/SnackbarEvent";

interface SnackbarState {
  // snackbar
  isSnackbarOpen: boolean;
  snackbarData: SnackbarEvent;
}

const initialState: SnackbarState = {
  // snackbar
  isSnackbarOpen: false,
  snackbarData: {
    severity: "info",
    text: "",
    title: undefined,
  },
};

const snackbarSlice = createSlice({
  name: "snackbar",
  initialState,
  reducers: {
    openSnackbar: (
      state,
      action: PayloadAction<{ severity: AlertProps["severity"]; text: string; title?: string }>,
    ) => {
      state.isSnackbarOpen = true;
      state.snackbarData = action.payload;
    },
    closeSnackbar: (state) => {
      state.isSnackbarOpen = false;
    },
  },
});

export const SnackbarActions = snackbarSlice.actions;
export const snackbarReducer = snackbarSlice.reducer;
