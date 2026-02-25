import {
  createInitialFilterState,
  filterReducer,
  MyFilterExpression,
  resetProjectFilterState,
} from "@components/filter/redux-filter-dialog/index";
import { createSlice } from "@reduxjs/toolkit";
import { v4 as uuidv4 } from "uuid";
import { SpanColumns } from "../../../api/openapi/models/SpanColumns";
import { StringOperator } from "../../../api/openapi/models/StringOperator";
import { ProjectActions } from "../../../store/global/projectSlice";

const defaultFilterExpression: MyFilterExpression = {
  id: uuidv4(),
  column: SpanColumns.SP_SPAN_TEXT,
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
export const satFilterReducer = satFilterSlice.reducer;
