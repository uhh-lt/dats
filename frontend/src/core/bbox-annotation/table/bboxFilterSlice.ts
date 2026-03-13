import { BBoxColumns } from "@api/models/BBoxColumns";
import { StringOperator } from "@api/models/StringOperator";
import { createInitialFilterState, filterReducer, MyFilterExpression, resetProjectFilterState } from "@core/filter";
import { createSlice } from "@reduxjs/toolkit";
import { ProjectActions } from "@store/global/projectSlice";

const defaultFilterExpression: MyFilterExpression = {
  id: crypto.randomUUID(),
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
export const bboxFilterReducer = { [bboxFilterSlice.name]: bboxFilterSlice.reducer };
