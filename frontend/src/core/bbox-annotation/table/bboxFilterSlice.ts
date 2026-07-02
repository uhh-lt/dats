import { createInitialFilterState, filterReducer, MyFilterExpression, resetProjectFilterState } from "@core/filter";
import { BBoxColumns } from "@models/BBoxColumns";
import { StringOperator } from "@models/StringOperator";
import { createSlice } from "@reduxjs/toolkit";
import { ProjectActions } from "@store/global/projectSlice";

export const defaultBBoxFilterExpression: MyFilterExpression = {
  id: crypto.randomUUID(),
  column: BBoxColumns.BB_SOURCE_SOURCE_DOCUMENT_NAME,
  operator: StringOperator.STRING_CONTAINS,
  value: "",
};

const initialState = createInitialFilterState(defaultBBoxFilterExpression);

const bboxFilterSlice = createSlice({
  name: "bboxFilter",
  initialState,
  reducers: filterReducer,
  extraReducers(builder) {
    builder.addCase(ProjectActions.changeProject, (state, action) => {
      console.log("Project changed! Resetting 'bboxFilter' state.");
      resetProjectFilterState({
        state,
        defaultFilterExpression: defaultBBoxFilterExpression,
        projectId: action.payload,
        sliceName: "bboxFilter",
      });
    });
  },
});

export const BBoxFilterActions = bboxFilterSlice.actions;
export const bboxFilterReducer = { [bboxFilterSlice.name]: bboxFilterSlice.reducer };
