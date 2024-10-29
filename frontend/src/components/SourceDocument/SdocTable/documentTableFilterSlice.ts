import { createSlice } from "@reduxjs/toolkit";
import { v4 as uuidv4 } from "uuid";
import { SearchColumns } from "../../../api/openapi/models/SearchColumns.ts";
import { StringOperator } from "../../../api/openapi/models/StringOperator.ts";
import { createInitialFilterState, filterReducer, resetProjectFilterState } from "../../FilterDialog/filterSlice.ts";
import { MyFilterExpression } from "../../FilterDialog/filterUtils.ts";
import { ProjectActions } from "../../Project/projectSlice.ts";

const defaultFilterExpression: MyFilterExpression = {
  id: uuidv4(),
  column: SearchColumns.SC_SOURCE_DOCUMENT_FILENAME,
  operator: StringOperator.STRING_CONTAINS,
  value: "",
};

const initialState = createInitialFilterState(defaultFilterExpression);

const documentTableFilterSlice = createSlice({
  name: "documentTableFilter",
  initialState,
  reducers: filterReducer,
  extraReducers(builder) {
    builder.addCase(ProjectActions.changeProject, (state, action) => {
      console.log("Project changed! Resetting 'documentTableFilter' state.");
      resetProjectFilterState({
        state,
        defaultFilterExpression,
        sliceName: "documentTableFilter",
        projectId: action.payload,
      });
    });
  },
});

export const DocumentTableFilterActions = documentTableFilterSlice.actions;
export default documentTableFilterSlice.reducer;
