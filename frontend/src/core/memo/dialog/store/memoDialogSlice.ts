import { PayloadAction, createSlice } from "@reduxjs/toolkit/react";
import { MemoEvent } from "../_types/MemoEvent";

interface MemoDialogState {
  isMemoDialogOpen: boolean;
  memoEventData: MemoEvent | undefined;
}

const initialState: MemoDialogState = {
  isMemoDialogOpen: false,
  memoEventData: undefined,
};

const memoDialogSlice = createSlice({
  name: "memoDialog",
  initialState,
  reducers: {
    openMemoDialog: (state, action: PayloadAction<MemoEvent>) => {
      if (action.payload.memoId === undefined && action.payload.attachedObjectId === undefined) {
        throw new Error("You have to provide a memoId or an attachedObjectId!");
      }
      state.isMemoDialogOpen = true;
      state.memoEventData = action.payload;
    },
    closeMemoDialog: (state) => {
      state.isMemoDialogOpen = false;
    },
  },
});

export const MemoDialogActions = memoDialogSlice.actions;
export const memoDialogReducer = {
  [memoDialogSlice.name]: memoDialogSlice.reducer,
};
