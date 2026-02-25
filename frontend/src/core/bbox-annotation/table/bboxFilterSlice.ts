import {
  createInitialFilterState,
  filterReducer,
  MyFilterExpression,
  resetProjectFilterState,
} from "@components/filter/redux-filter-dialog/index";
import { createSlice } from "@reduxjs/toolkit";
import { v4 as uuidv4 } from "uuid";
import { BBoxColumns } from "../../../api/openapi/models/BBoxColumns";
import { StringOperator } from "../../../api/openapi/models/StringOperator";
import { ProjectActions } from "../../../store/global/projectSlice";

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
export const bboxFilterReducer = bboxFilterSlice.reducer;
