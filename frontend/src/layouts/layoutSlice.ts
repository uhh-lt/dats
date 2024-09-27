import { createSlice } from "@reduxjs/toolkit";
import { persistReducer } from "redux-persist";
import storage from "redux-persist/lib/storage";

export interface LayoutState {
  leftSidebarSize: number;
  rightSidebarSize: number;
  contentSize: number;
}

const initialState: LayoutState = {
  leftSidebarSize: 3,
  rightSidebarSize: 3,
  contentSize: 6,
};

export const layoutSlice = createSlice({
  name: "layout",
  initialState,
  reducers: {
    onIncreaseLeft: (state) => {
      if (state.contentSize === 3) return;
      state.leftSidebarSize += 1;
      state.contentSize -= 1;
    },
    onDecreaseLeft: (state) => {
      if (state.leftSidebarSize === 0) return;
      state.leftSidebarSize -= 1;
      state.contentSize += 1;
    },
    onIncreaseRight: (state) => {
      if (state.contentSize === 3) return;
      state.rightSidebarSize += 1;
      state.contentSize -= 1;
    },
    onDecreaseRight: (state) => {
      if (state.rightSidebarSize === 0) return;
      state.rightSidebarSize -= 1;
      state.contentSize += 1;
    },
  },
});

export const LayoutActions = layoutSlice.actions;

export default persistReducer(
  {
    key: "layout",
    storage,
  },
  layoutSlice.reducer,
);
