import { createSlice } from "@reduxjs/toolkit";
import { v4 as uuidv4 } from "uuid";
import { BBoxColumns } from "../../../api/openapi/models/BBoxColumns.ts";
import { StringOperator } from "../../../api/openapi/models/StringOperator.ts";
import { createInitialFilterState, filterReducer, resetProjectFilterState } from "../../FilterDialog/filterSlice.ts";
import { MyFilterExpression } from "../../FilterDialog/filterUtils.ts";
import { ProjectActions } from "../../Project/projectSlice.ts";

const defaultFilterExpression: MyFilterExpression = {
  id: uuidv4(),
  column: BBoxColumns.BB_SOURCE_SOURCE_DOCUMENT_NAME,
  operator: StringOperator.STRING_CONTAINS,
  value: "",
};

const initialState = createInitialFilterState(defaultFilterExpression);

const bboxFilterSlice = createSlice({
  name: "bboxFilter",
  initialState,
  reducers: filterReducer,
  extraReducers(builder) {
    builder.addCase(ProjectActions.changeProject, (state, action) => {
      console.log("Project changed! Resetting 'bboxFilter' state.");
      resetProjectFilterState({ state, defaultFilterExpression, projectId: action.payload, sliceName: "bboxFilter" });
    });
  },
});

export const BBoxFilterActions = bboxFilterSlice.actions;

export default bboxFilterSlice.reducer;
