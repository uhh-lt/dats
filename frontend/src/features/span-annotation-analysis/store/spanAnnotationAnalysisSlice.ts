import { SpanColumns } from "@api/models/SpanColumns";
import { SATFilterActions } from "@core/span-annotation";
import { createSlice } from "@reduxjs/toolkit";
import { initialTableState, resetProjectTableState, tableReducer } from "@store/generic/tableSlice";
import { ProjectActions } from "@store/global/projectSlice";

const SpanAnnotationsSlice = createSlice({
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
export const spanAnnotationAnalysisReducer = { [SpanAnnotationsSlice.name]: SpanAnnotationsSlice.reducer };
