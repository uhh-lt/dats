import { PayloadAction, createSlice } from "@reduxjs/toolkit/react";
import { ConfirmationEvent } from "./_types/ConfirmationEvent";

interface ConfirmationState {
  isConfirmationDialogOpen: boolean;
  confirmationData: ConfirmationEvent | undefined;
}

const initialState: ConfirmationState = {
  isConfirmationDialogOpen: false,
  confirmationData: undefined,
};

const confirmationSlice = createSlice({
  name: "confirmation",
  initialState,
  reducers: {
    openConfirmationDialog: (state, action: PayloadAction<ConfirmationEvent>) => {
      state.isConfirmationDialogOpen = true;
      state.confirmationData = action.payload;
    },
    closeConfirmationDialog: (state) => {
      state.isConfirmationDialogOpen = false;
      state.confirmationData = undefined;
    },
  },
});

export const ConfirmationActions = confirmationSlice.actions;
export const confirmationReducer = confirmationSlice.reducer;
