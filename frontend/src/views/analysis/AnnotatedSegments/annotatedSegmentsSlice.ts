import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { annotatedSegmentsFilterSlice } from "../../../features/FilterDialog/filterSlice";

export interface AnnotatedSegmentsState {
  isSplitView: boolean;
  contextSize: number;
  selectedUserIds: number[];
  paginationModel: { page: number; pageSize: number };
  rowSelectionModel: number[];
}

const initialState: AnnotatedSegmentsState = {
  isSplitView: false,
  contextSize: 100,
  selectedUserIds: [],
  paginationModel: { page: 0, pageSize: 5 },
  rowSelectionModel: [],
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
    onPaginationModelChange: (state, action: PayloadAction<{ page: number; pageSize: number }>) => {
      state.paginationModel = action.payload;
    },
    onSelectionModelChange: (state, action: PayloadAction<number[]>) => {
      state.rowSelectionModel = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(annotatedSegmentsFilterSlice.actions.onFinishFilterEdit, (state, action) => {
        // reset page when filter changes
        state.paginationModel.page = 0;

        // reset selection when filter changes
        state.rowSelectionModel = [];
      })
      .addDefaultCase((state) => {});
  },
});

export const AnnotatedSegmentsActions = AnnotatedSegmentsSlice.actions;

export default AnnotatedSegmentsSlice.reducer;
