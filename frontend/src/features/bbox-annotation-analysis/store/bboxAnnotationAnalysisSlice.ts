import { createSlice } from "@reduxjs/toolkit";
import { initialTableState, resetProjectTableState, tableReducer } from "@store/generic/tableSlice";
import { ProjectActions } from "@store/global/projectSlice";

const BBoxAnnotationsSlice = createSlice({
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
      .addDefaultCase(() => {});
  },
});

export const BBoxAnnotationsActions = BBoxAnnotationsSlice.actions;
export const bboxAnnotationAnalysisReducer = { [BBoxAnnotationsSlice.name]: BBoxAnnotationsSlice.reducer };
