import { createInitialFilterState, filterReducer, MyFilterExpression, resetProjectFilterState } from "@core/filter";
import { SpanColumns } from "@models/SpanColumns";
import { StringOperator } from "@models/StringOperator";
import { createSlice } from "@reduxjs/toolkit";
import { ProjectActions } from "@store/global/projectSlice";

export const defaultSATFilterExpression: MyFilterExpression = {
  id: crypto.randomUUID(),
  column: SpanColumns.SP_SPAN_TEXT,
  operator: StringOperator.STRING_CONTAINS,
  value: "",
};

const initialState = createInitialFilterState(defaultSATFilterExpression);

const satFilterSlice = createSlice({
  name: "satFilter",
  initialState,
  reducers: filterReducer,
  extraReducers(builder) {
    builder.addCase(ProjectActions.changeProject, (state, action) => {
      console.log("Project changed! Resetting 'satFilter' state.");
      resetProjectFilterState({
        state,
        defaultFilterExpression: defaultSATFilterExpression,
        projectId: action.payload,
        sliceName: "satFilter",
      });
    });
  },
});

export const SATFilterActions = satFilterSlice.actions;
export const satFilterReducer = { [satFilterSlice.name]: satFilterSlice.reducer };
