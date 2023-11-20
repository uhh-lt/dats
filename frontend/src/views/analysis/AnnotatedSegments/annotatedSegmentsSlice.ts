import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { GridPaginationModel, GridSortModel } from "@mui/x-data-grid";
import { AnnotatedSegmentsFilterActions } from "./annotatedSegmentsFilterSlice";

export interface AnnotatedSegmentsState {
  isSplitView: boolean;
  contextSize: number;
  selectedUserIds: number[];
  paginationModel: GridPaginationModel;
  rowSelectionModel: number[];
  sortModel: GridSortModel;
}

const initialState: AnnotatedSegmentsState = {
  isSplitView: false,
  contextSize: 100,
  selectedUserIds: [],
  paginationModel: { page: 0, pageSize: 5 },
  rowSelectionModel: [],
  sortModel: [],
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
    onSortModelChange: (state, action: PayloadAction<GridSortModel>) => {
      state.sortModel = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(AnnotatedSegmentsFilterActions.onFinishFilterEdit, (state, action) => {
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
