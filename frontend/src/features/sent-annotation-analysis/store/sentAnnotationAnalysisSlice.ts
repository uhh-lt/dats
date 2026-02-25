import { createSlice } from "@reduxjs/toolkit";
import { SentAnnoColumns } from "../../../api/openapi/models/SentAnnoColumns";
import { SEATFilterActions } from "../../../core/sentence-annotation/table/seatFilterSlice";
import { initialTableState, resetProjectTableState, tableReducer } from "../../../store/generic/tableSlice";
import { ProjectActions } from "../../../store/global/projectSlice";

const SentAnnotationsSlice = createSlice({
  name: "sentAnnotationAnalysis",
  initialState: {
    ...initialTableState,
  },
  reducers: {
    ...tableReducer,
  },
  extraReducers: (builder) => {
    builder
      .addCase(ProjectActions.changeProject, (state) => {
        console.log("Project changed! Resetting 'sentAnnotationAnalysis' state.");
        resetProjectTableState(state);
      })
      .addCase(SEATFilterActions.init, (state, action) => {
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
          { [SentAnnoColumns.SENT_ANNO_MEMO_CONTENT]: false },
        );
      })
      .addCase(SEATFilterActions.onFinishFilterEdit, (state) => {
        // reset variables that depend on search parameters
        state.rowSelectionModel = initialTableState.rowSelectionModel;
        state.fetchSize = initialTableState.fetchSize;
      })
      .addDefaultCase(() => {});
  },
});

export const SentAnnotationsActions = SentAnnotationsSlice.actions;
export const sentAnnotationAnalysisReducer = SentAnnotationsSlice.reducer;
