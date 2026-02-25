import { createSlice } from "@reduxjs/toolkit";
import { persistReducer } from "redux-persist";
import storage from "redux-persist/lib/storage";

interface LayoutState {
  // Stores percentage values (0-100) for resizable components
  verticalPercentages: Record<string, number>;
  // Stores pixel values for resizable components
  sizes: Record<string, number>;
}

const initialState: LayoutState = {
  verticalPercentages: {},
  sizes: {},
};

const layoutSlice = createSlice({
  name: "layout",
  initialState,
  reducers: {
    setPercentage: (state, action: { payload: { componentName: string; percentage: number } }) => {
      // round the percentage to prevent floating point errors
      const roundedPercentage = Math.round(action.payload.percentage);

      // only update the state if the percentage has changed
      if (roundedPercentage !== state.verticalPercentages[action.payload.componentName]) {
        state.verticalPercentages[action.payload.componentName] = roundedPercentage;
      }
    },
    setSize: (state, action: { payload: { componentName: string; size: number } }) => {
      // round the size to prevent floating point errors
      const roundedSize = Math.round(action.payload.size);

      // only update the state if the size has changed
      if (roundedSize !== state.sizes[action.payload.componentName]) {
        state.sizes[action.payload.componentName] = roundedSize;
      }
    },
  },
});

export const LayoutActions = layoutSlice.actions;
export const layoutReducer = persistReducer(
  {
    key: "layout",
    storage,
  },
  layoutSlice.reducer,
);
