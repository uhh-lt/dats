import { MemoColumns } from "@api/models/MemoColumns";
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
  column: MemoColumns.M_CONTENT,
  operator: StringOperator.STRING_CONTAINS,
  value: "",
};

const initialState = createInitialFilterState(defaultFilterExpression);

const memoFilterSlice = createSlice({
  name: "memoFilter",
  initialState,
  reducers: filterReducer,
  extraReducers(builder) {
    builder.addCase(ProjectActions.changeProject, (state, action) => {
      console.log("Project changed! Resetting 'memoFilter' state.");
      resetProjectFilterState({ state, defaultFilterExpression, projectId: action.payload, sliceName: "memoFilter" });
    });
  },
});

export const MemoFilterActions = memoFilterSlice.actions;

export const memoFilterReducer = memoFilterSlice.reducer;
