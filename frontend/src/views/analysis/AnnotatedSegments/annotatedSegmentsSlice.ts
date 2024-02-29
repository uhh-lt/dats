import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { AnnotatedSegmentsFilterActions } from "./annotatedSegmentsFilterSlice.ts";
import { MRT_PaginationState, MRT_RowSelectionState, MRT_SortingState } from "material-react-table";
import { RootState } from "../../../store/store.ts";

export interface AnnotatedSegmentsState {
  isSplitView: boolean;
  contextSize: number;
  selectedUserIds: number[];
  paginationModel: MRT_PaginationState;
  rowSelectionModel: MRT_RowSelectionState;
  sortModel: MRT_SortingState;
}

const initialState: AnnotatedSegmentsState = {
  isSplitView: false,
  contextSize: 100,
  selectedUserIds: [],
  paginationModel: { pageIndex: 0, pageSize: 5 },
  rowSelectionModel: {},
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
    onPaginationModelChange: (state, action: PayloadAction<MRT_PaginationState>) => {
      state.paginationModel = action.payload;
    },
    onSelectionModelChange: (state, action: PayloadAction<MRT_RowSelectionState>) => {
      state.rowSelectionModel = action.payload;
    },
    onSortModelChange: (state, action: PayloadAction<MRT_SortingState>) => {
      state.sortModel = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(AnnotatedSegmentsFilterActions.onFinishFilterEdit, (state) => {
        // reset page when filter changes
        state.paginationModel.pageIndex = 0;

        // reset selection when filter changes
        state.rowSelectionModel = {};
      })
      .addDefaultCase(() => {});
  },
});

export const AnnotatedSegmentsActions = AnnotatedSegmentsSlice.actions;

// selectors
export const selectAnnotationIds = (state: RootState) =>
  Object.entries(state.annotatedSegments.rowSelectionModel)
    .filter(([, value]) => value)
    .map(([key]) => parseInt(key));

export default AnnotatedSegmentsSlice.reducer;
