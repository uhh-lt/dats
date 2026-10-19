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
      .addDefaultCase(() => {});
  },
});

export const SpanAnnotationsActions = SpanAnnotationsSlice.actions;
export const spanAnnotationAnalysisReducer = { [SpanAnnotationsSlice.name]: SpanAnnotationsSlice.reducer };
