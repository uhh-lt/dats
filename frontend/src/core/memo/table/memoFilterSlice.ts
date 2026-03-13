import { MemoColumns } from "@api/models/MemoColumns";
import { StringOperator } from "@api/models/StringOperator";
import { createInitialFilterState, filterReducer, MyFilterExpression, resetProjectFilterState } from "@core/filter";
import { createSlice } from "@reduxjs/toolkit";
import { ProjectActions } from "@store/global/projectSlice";

const defaultFilterExpression: MyFilterExpression = {
  id: crypto.randomUUID(),
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

export const memoFilterReducer = { [memoFilterSlice.name]: memoFilterSlice.reducer };
