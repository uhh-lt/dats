import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface AnnotatedSegmentsState {
  isSplitView: boolean;
  contextSize: number;
  selectedUserIds: number[];
}

const initialState: AnnotatedSegmentsState = {
  isSplitView: false,
  contextSize: 100,
  selectedUserIds: [],
};

export const AnnotatedSegmentsSlice = createSlice({
  name: "annotatedSegments",
  initialState,
  reducers: {
    toggleSplitView: (state) => {
      state.isSplitView = !state.isSplitView;
    },
    setContextSize: (state, action: PayloadAction<number>) => {
      state.contextSize = action.payload;
    },
    setSelectedUserIds: (state, action: PayloadAction<number[]>) => {
      state.selectedUserIds = action.payload;
    },
  },
});

export const AnnotatedSegmentsActions = AnnotatedSegmentsSlice.actions;

export default AnnotatedSegmentsSlice.reducer;
