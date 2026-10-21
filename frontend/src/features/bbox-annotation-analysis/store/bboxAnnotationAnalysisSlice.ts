import { createSlice } from "@reduxjs/toolkit";
import { TableState, initialTableState, resetProjectTableState, tableReducer } from "@store/generic/tableSlice";
import { ProjectActions } from "@store/global/projectSlice";

const initialState: TableState = initialTableState;

const bboxAnnotationAnalysisSlice = createSlice({
  name: "bboxAnnotationAnalysis",
  initialState,
  reducers: {
    ...tableReducer,
  },
  extraReducers: (builder) => {
    builder.addCase(ProjectActions.changeProject, (state) => {
      console.log("Project changed! Resetting 'bboxAnnotationAnalysis' state.");
      resetProjectTableState(state);
    });
  },
});

export const BBoxAnnotationAnalysisActions = bboxAnnotationAnalysisSlice.actions;
export const bboxAnnotationAnalysisReducer = {
  [bboxAnnotationAnalysisSlice.name]: bboxAnnotationAnalysisSlice.reducer,
};
