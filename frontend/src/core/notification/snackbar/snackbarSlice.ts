import { PayloadAction, createSlice } from "@reduxjs/toolkit/react";
import { SnackbarEvent } from "./_types/SnackbarEvent";

interface SnackbarState {
  isSnackbarOpen: boolean;
  snackbarData: SnackbarEvent;
}

const initialState: SnackbarState = {
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
    openSnackbar: (state, action: PayloadAction<SnackbarEvent>) => {
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
