import { SdocColumns } from "@api/models/SdocColumns";
import { StringOperator } from "@api/models/StringOperator";
import {
  createInitialFilterState,
  filterReducer,
  MyFilterExpression,
  resetProjectFilterState,
} from "@components/filter";
import { createSlice } from "@reduxjs/toolkit";
import { ProjectActions } from "@store/global/projectSlice";
import { v4 as uuidv4 } from "uuid";

const defaultFilterExpression: MyFilterExpression = {
  id: uuidv4(),
  column: SdocColumns.SD_SOURCE_DOCUMENT_NAME,
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
export const documentTableFilterReducer = documentTableFilterSlice.reducer;
