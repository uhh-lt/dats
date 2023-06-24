import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface AnalysisState {
  selectedUserIds: number[] | undefined;
}

const initialState: AnalysisState = {
  selectedUserIds: undefined,
};

export const analysisSlice = createSlice({
  name: "analysis",
  initialState,
  reducers: {
    setSelectedUserIds: (state, action: PayloadAction<number[]>) => {
      state.selectedUserIds = action.payload;
    },
  },
});

export const AnalysisActions = analysisSlice.actions;

export default analysisSlice.reducer;
