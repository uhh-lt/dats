import { createSlice } from "@reduxjs/toolkit";
import { SpanColumns } from "../../../api/openapi/models/SpanColumns.ts";
import { ProjectActions } from "../../../components/Project/projectSlice.ts";
import { SATFilterActions } from "../../../components/SpanAnnotation/SpanAnnotationTable/satFilterSlice.ts";
import { initialTableState, resetProjectTableState, tableReducer } from "../../../components/tableSlice.ts";

export const SpanAnnotationsSlice = createSlice({
  name: "spanAnnotationAnalysis",
  initialState: {
    ...initialTableState,
  },
  reducers: {
    ...tableReducer,
  },
  extraReducers: (builder) => {
    builder
      .addCase(ProjectActions.changeProject, (state) => {
        console.log("Project changed! Resetting 'spanAnnotationAnalysis' state.");
        resetProjectTableState(state);
      })
      .addCase(SATFilterActions.init, (state, action) => {
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
            [SpanColumns.SP_MEMO_CONTENT]: false,
          },
        );
      })
      .addCase(SATFilterActions.onFinishFilterEdit, (state) => {
        // reset variables that depend on search parameters
        state.rowSelectionModel = initialTableState.rowSelectionModel;
        state.fetchSize = initialTableState.fetchSize;
      })
      .addDefaultCase(() => {});
  },
});

export const SpanAnnotationsActions = SpanAnnotationsSlice.actions;
export default SpanAnnotationsSlice.reducer;
