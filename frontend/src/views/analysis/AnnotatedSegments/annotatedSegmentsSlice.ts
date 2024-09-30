import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { ProjectActions } from "../../../components/Project/projectSlice.ts";
import { SATFilterActions } from "../../../components/SpanAnnotation/SpanAnnotationTable/satFilterSlice.ts";
import { initialTableState, resetProjectTableState, tableReducer, TableState } from "../../../components/tableSlice.ts";

interface AnnotatedSegmentsState {
  // app state:
  isSplitView: boolean;
  contextSize: number;
}

const initialState: TableState & AnnotatedSegmentsState = {
  ...initialTableState,
  // app state:
  isSplitView: false,
  contextSize: 100,
};

export const AnnotatedSegmentsSlice = createSlice({
  name: "annotatedSegments",
  initialState,
  reducers: {
    ...tableReducer,
    toggleSplitView: (state) => {
      state.isSplitView = !state.isSplitView;
    },
    setContextSize: (state, action: PayloadAction<number>) => {
      state.contextSize = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(ProjectActions.changeProject, (state) => {
        console.log("Project changed! Resetting 'annotatedSegments' state.");
        resetProjectTableState(state);
      })
      .addCase(SATFilterActions.init, (state, action) => {
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
      })
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
