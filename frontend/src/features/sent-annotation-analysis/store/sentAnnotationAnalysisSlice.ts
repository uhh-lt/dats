import { createSlice } from "@reduxjs/toolkit";
import { initialTableState, resetProjectTableState, tableReducer } from "@store/generic/tableSlice";
import { ProjectActions } from "@store/global/projectSlice";

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
      .addDefaultCase(() => {});
  },
});

export const SentAnnotationsActions = SentAnnotationsSlice.actions;
export const sentAnnotationAnalysisReducer = { [SentAnnotationsSlice.name]: SentAnnotationsSlice.reducer };
