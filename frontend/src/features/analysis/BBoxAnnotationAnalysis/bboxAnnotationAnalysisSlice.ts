import { createSlice } from "@reduxjs/toolkit";
import { BBoxColumns } from "../../../api/openapi/models/BBoxColumns.ts";
import { BBoxFilterActions } from "../../../core/bbox-annotation/table/bboxFilterSlice.ts";
import { ProjectActions } from "../../../core/project/projectSlice.ts";
import { initialTableState, resetProjectTableState, tableReducer } from "../../../store/tableSlice.ts";

export const BBoxAnnotationsSlice = createSlice({
  name: "bboxAnnotationAnalysis",
  initialState: {
    ...initialTableState,
  },
  reducers: {
    ...tableReducer,
  },
  extraReducers: (builder) => {
    builder
      .addCase(ProjectActions.changeProject, (state) => {
        console.log("Project changed! Resetting 'bboxAnnotationAnalysis' state.");
        resetProjectTableState(state);
      })
      .addCase(BBoxFilterActions.init, (state, action) => {
        state.columnVisibilityModel = Object.values(action.payload.columnInfoMap).reduce(
          (acc, column) => {
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
          },
          {
            [BBoxColumns.BB_MEMO_CONTENT]: false,
          },
        );
      })
      .addCase(BBoxFilterActions.onFinishFilterEdit, (state) => {
        // reset variables that depend on search parameters
        state.rowSelectionModel = initialTableState.rowSelectionModel;
        state.fetchSize = initialTableState.fetchSize;
      })
      .addDefaultCase(() => {});
  },
});

export const BBoxAnnotationsActions = BBoxAnnotationsSlice.actions;
export const bboxAnnotationAnalysisReducer = BBoxAnnotationsSlice.reducer;
