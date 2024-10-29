import { createSlice } from "@reduxjs/toolkit";
import { v4 as uuidv4 } from "uuid";
import { AnnotatedSegmentsColumns } from "../../../api/openapi/models/AnnotatedSegmentsColumns.ts";
import { StringOperator } from "../../../api/openapi/models/StringOperator.ts";
import { createInitialFilterState, filterReducer, resetProjectFilterState } from "../../FilterDialog/filterSlice.ts";
import { MyFilterExpression } from "../../FilterDialog/filterUtils.ts";
import { ProjectActions } from "../../Project/projectSlice.ts";

const defaultFilterExpression: MyFilterExpression = {
  id: uuidv4(),
  column: AnnotatedSegmentsColumns.ASC_SPAN_TEXT,
  operator: StringOperator.STRING_CONTAINS,
  value: "",
};

const initialState = createInitialFilterState(defaultFilterExpression);

const satFilterSlice = createSlice({
  name: "satFilter",
  initialState,
  reducers: filterReducer,
  extraReducers(builder) {
    builder.addCase(ProjectActions.changeProject, (state, action) => {
      console.log("Project changed! Resetting 'satFilter' state.");
      resetProjectFilterState({ state, defaultFilterExpression, projectId: action.payload, sliceName: "satFilter" });
    });
  },
});

export const SATFilterActions = satFilterSlice.actions;

export default satFilterSlice.reducer;
