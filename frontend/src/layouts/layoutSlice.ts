import { createSlice } from "@reduxjs/toolkit";
import { persistReducer } from "redux-persist";
import storage from "redux-persist/lib/storage";

export interface LayoutState {
  leftSidebarWidth: number;
  rightSidebarWidth: number;
  verticalPercentages: Record<string, number>;
  horizontalContentPercentage: number;
}

const initialState: LayoutState = {
  leftSidebarWidth: 300,
  rightSidebarWidth: 300,
  verticalPercentages: {},
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
    setVerticalPercentage: (state, action: { payload: { componentName: string; percentage: number } }) => {
      state.verticalPercentages[action.payload.componentName] = action.payload.percentage;
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
