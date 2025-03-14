import { createSlice } from "@reduxjs/toolkit";
import { persistReducer } from "redux-persist";
import storage from "redux-persist/lib/storage";

export interface LayoutState {
  leftSidebarWidth: number;
  rightSidebarWidth: number;
}

const initialState: LayoutState = {
  leftSidebarWidth: 300,
  rightSidebarWidth: 300,
};

export const layoutSlice = createSlice({
  name: "layout",
  initialState,
  reducers: {
    setLeftSidebarWidth: (state, action) => {
      state.leftSidebarWidth = action.payload;
    },
    setRightSidebarWidth: (state, action) => {
      state.rightSidebarWidth = action.payload;
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
