import { createSlice } from "@reduxjs/toolkit";
import { persistReducer } from "redux-persist";
import storage from "redux-persist/lib/storage";

export interface LayoutState {
  leftSidebarWidth: number;
  rightSidebarWidth: number;
  verticalContentPercentage: number;
  horizontalContentPercentage: number;
}

const initialState: LayoutState = {
  leftSidebarWidth: 300,
  rightSidebarWidth: 300,
  verticalContentPercentage: 50,
  horizontalContentPercentage: 50,
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
    setVerticalContentPercentage: (state, action) => {
      state.verticalContentPercentage = action.payload;
    },
    setHorizontalContentPercentage: (state, action) => {
      state.horizontalContentPercentage = action.payload;
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
