import { PayloadAction, createSlice } from "@reduxjs/toolkit/react";
import { MemoDialogEvent } from "./_types/MemoDialogEvent";

interface MemoDialogState {
  isMemoDialogOpen: boolean;
  memoEventData: MemoDialogEvent | undefined;
}

const initialState: MemoDialogState = {
  isMemoDialogOpen: false,
  memoEventData: undefined,
};

const memoDialogSlice = createSlice({
  name: "memoDialog",
  initialState,
  reducers: {
    openMemoDialog: (state, action: PayloadAction<MemoDialogEvent>) => {
      if (action.payload.memoId === undefined && action.payload.attachedObjectId === undefined) {
        throw new Error("You have to provide a memoId or an attachedObjectId!");
      }
      state.isMemoDialogOpen = true;
      state.memoEventData = action.payload;
    },
    closeMemoDialog: (state) => {
      // keep memoEventData so the content can unmount gracefully (flushing pending changes)
      state.isMemoDialogOpen = false;
    },
  },
});

export const MemoDialogActions = memoDialogSlice.actions;
export const memoDialogReducer = {
  [memoDialogSlice.name]: memoDialogSlice.reducer,
};
