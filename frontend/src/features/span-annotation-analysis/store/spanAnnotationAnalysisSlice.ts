import { createSlice } from "@reduxjs/toolkit";
import { TableState, initialTableState, resetProjectTableState, tableReducer } from "@store/generic/tableSlice";
import { ProjectActions } from "@store/global/projectSlice";

const initialState: TableState = initialTableState;

const spanAnnotationAnalysisSlice = createSlice({
  name: "spanAnnotationAnalysis",
  initialState,
  reducers: {
    ...tableReducer,
  },
  extraReducers: (builder) => {
    builder.addCase(ProjectActions.changeProject, (state) => {
      console.log("Project changed! Resetting 'spanAnnotationAnalysis' state.");
      resetProjectTableState(state);
    });
  },
});

export const SpanAnnotationAnalysisActions = spanAnnotationAnalysisSlice.actions;
export const spanAnnotationAnalysisReducer = {
  [spanAnnotationAnalysisSlice.name]: spanAnnotationAnalysisSlice.reducer,
};
