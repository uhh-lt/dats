import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import {
  MRT_PaginationState,
  MRT_RowSelectionState,
  MRT_SortingState,
  MRT_VisibilityState,
} from "material-react-table";
import { SATFilterActions } from "../../../components/SpanAnnotationTable/satFilterSlice.ts";

export interface AnnotatedSegmentsState {
  isSplitView: boolean;
  contextSize: number;
  paginationModel: MRT_PaginationState;
  rowSelectionModel: MRT_RowSelectionState;
  sortModel: MRT_SortingState;
  columnVisibilityModel: MRT_VisibilityState;
}

const initialState: AnnotatedSegmentsState = {
  isSplitView: false,
  contextSize: 100,
  paginationModel: { pageIndex: 0, pageSize: 5 },
  rowSelectionModel: {},
  sortModel: [],
  columnVisibilityModel: {},
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
    onPaginationModelChange: (state, action: PayloadAction<MRT_PaginationState>) => {
      state.paginationModel = action.payload;
    },
    onSelectionModelChange: (state, action: PayloadAction<MRT_RowSelectionState>) => {
      state.rowSelectionModel = action.payload;
    },
    onSortModelChange: (state, action: PayloadAction<MRT_SortingState>) => {
      state.sortModel = action.payload;
    },
    // column visibility
    onColumnVisibilityChange: (state, action: PayloadAction<MRT_VisibilityState>) => {
      state.columnVisibilityModel = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(SATFilterActions.init, (state, action) => {
      state.columnVisibilityModel = Object.values(action.payload.columnInfoMap).reduce((acc, column) => {
        if (!column.column) return acc;
        // this is a normal column
        if (isNaN(parseInt(column.column))) {
          return acc;
          // this is a metadata column
        } else {
          return {
            ...acc,
            [column.column]: false,
          };
        }
      }, {});
    });
    builder
      .addCase(SATFilterActions.onFinishFilterEdit, (state) => {
        // reset page when filter changes
        state.paginationModel.pageIndex = 0;

        // reset selection when filter changes
        state.rowSelectionModel = {};
      })
      .addDefaultCase(() => {});
  },
});

export const AnnotatedSegmentsActions = AnnotatedSegmentsSlice.actions;
export default AnnotatedSegmentsSlice.reducer;
