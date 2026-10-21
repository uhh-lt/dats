import { createSlice } from "@reduxjs/toolkit";
import { TableState, initialTableState, resetProjectTableState, tableReducer } from "@store/generic/tableSlice";
import { ProjectActions } from "@store/global/projectSlice";

const initialState: TableState = initialTableState;

const sentAnnotationAnalysisSlice = createSlice({
  name: "sentAnnotationAnalysis",
  initialState,
  reducers: {
    ...tableReducer,
  },
  extraReducers: (builder) => {
    builder.addCase(ProjectActions.changeProject, (state) => {
      console.log("Project changed! Resetting 'sentAnnotationAnalysis' state.");
      resetProjectTableState(state);
    });
  },
});

export const SentAnnotationAnalysisActions = sentAnnotationAnalysisSlice.actions;
export const sentAnnotationAnalysisReducer = {
  [sentAnnotationAnalysisSlice.name]: sentAnnotationAnalysisSlice.reducer,
};
