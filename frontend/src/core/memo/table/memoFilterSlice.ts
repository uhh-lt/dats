import { createInitialFilterState, filterReducer, MyFilterExpression, resetProjectFilterState } from "@core/filter";
import { MemoColumns } from "@models/MemoColumns";
import { StringOperator } from "@models/StringOperator";
import { createSlice } from "@reduxjs/toolkit";
import { ProjectActions } from "@store/global/projectSlice";

export const defaultMemoFilterExpression: MyFilterExpression = {
  id: crypto.randomUUID(),
  column: MemoColumns.M_CONTENT,
  operator: StringOperator.STRING_CONTAINS,
  value: "",
};

const initialState = createInitialFilterState(defaultMemoFilterExpression);

const memoFilterSlice = createSlice({
  name: "memoFilter",
  initialState,
  reducers: filterReducer,
  extraReducers(builder) {
    builder.addCase(ProjectActions.changeProject, (state) => {
      console.log("Project changed! Resetting 'memoFilter' state.");
      resetProjectFilterState({
        state,
        defaultFilterExpression: defaultMemoFilterExpression,
      });
    });
  },
});

export const MemoFilterActions = memoFilterSlice.actions;
export const memoFilterReducer = { [memoFilterSlice.name]: memoFilterSlice.reducer };
