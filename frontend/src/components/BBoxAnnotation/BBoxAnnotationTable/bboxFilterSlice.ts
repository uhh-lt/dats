import { createSlice } from "@reduxjs/toolkit";
import { v4 as uuidv4 } from "uuid";
import { AnnotatedImagesColumns } from "../../../api/openapi/models/AnnotatedImagesColumns.ts";
import { StringOperator } from "../../../api/openapi/models/StringOperator.ts";
import { createInitialFilterState, filterReducer, resetProjectFilterState } from "../../FilterDialog/filterSlice.ts";
import { MyFilterExpression } from "../../FilterDialog/filterUtils.ts";
import { ProjectActions } from "../../Project/projectSlice.ts";

const defaultFilterExpression: MyFilterExpression = {
  id: uuidv4(),
  column: AnnotatedImagesColumns.AIC_SOURCE_SOURCE_DOCUMENT_FILENAME,
  operator: StringOperator.STRING_CONTAINS,
  value: "",
};

const initialState = createInitialFilterState(defaultFilterExpression);

const bboxFilterSlice = createSlice({
  name: "bboxFilter",
  initialState,
  reducers: filterReducer,
  extraReducers(builder) {
    builder.addCase(ProjectActions.changeProject, (state) => {
      console.log("Project changed! Resetting 'bboxFilter' state.");
      resetProjectFilterState(state, defaultFilterExpression);
    });
  },
});

export const BBoxFilterActions = bboxFilterSlice.actions;

export default bboxFilterSlice.reducer;
