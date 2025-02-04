import { createSlice } from "@reduxjs/toolkit";
import { persistReducer } from "redux-persist";
import storage from "redux-persist/lib/storage";

const MIN_CONTENT_SIZE = 3;

export interface LayoutState {
  // app state:
  leftSidebarSize: number;
  rightSidebarSize: number;
  contentSize: number;
}

const initialState: LayoutState = {
  // app state:
  leftSidebarSize: 3,
  rightSidebarSize: 3,
  contentSize: 6,
};

export const layoutSlice = createSlice({
  name: "layout",
  initialState,
  reducers: {
    onIncreaseLeft: (state) => {
      if (state.contentSize === MIN_CONTENT_SIZE) return;
      state.leftSidebarSize += 1;
      state.contentSize -= 1;
    },
    onDecreaseLeft: (state) => {
      if (state.leftSidebarSize === 0) return;
      state.leftSidebarSize -= 1;
      state.contentSize += 1;
    },
    onIncreaseRight: (state) => {
      if (state.contentSize === MIN_CONTENT_SIZE) return;
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
