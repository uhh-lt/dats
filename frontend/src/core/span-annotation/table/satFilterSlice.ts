import { SpanColumns } from "@api/models/SpanColumns";
import { StringOperator } from "@api/models/StringOperator";
import { createInitialFilterState, filterReducer, MyFilterExpression, resetProjectFilterState } from "@core/filter";
import { createSlice } from "@reduxjs/toolkit";
import { ProjectActions } from "@store/global/projectSlice";

const defaultFilterExpression: MyFilterExpression = {
  id: crypto.randomUUID(),
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
export const satFilterReducer = { [satFilterSlice.name]: satFilterSlice.reducer };
