import { SentAnnoColumns } from "@api/models/SentAnnoColumns";
import { StringOperator } from "@api/models/StringOperator";
import { createInitialFilterState, filterReducer, MyFilterExpression, resetProjectFilterState } from "@core/filter";
import { createSlice } from "@reduxjs/toolkit";
import { ProjectActions } from "@store/global/projectSlice";

const defaultFilterExpression: MyFilterExpression = {
  id: crypto.randomUUID(),
  column: SentAnnoColumns.SENT_ANNO_SOURCE_SOURCE_DOCUMENT_NAME,
  operator: StringOperator.STRING_CONTAINS,
  value: "",
};

const initialState = createInitialFilterState(defaultFilterExpression);

const seatFilterSlice = createSlice({
  name: "seatFilter",
  initialState,
  reducers: filterReducer,
  extraReducers(builder) {
    builder.addCase(ProjectActions.changeProject, (state, action) => {
      console.log("Project changed! Resetting 'seatFilter' state.");
      resetProjectFilterState({ state, defaultFilterExpression, projectId: action.payload, sliceName: "seatFilter" });
    });
  },
});

export const SEATFilterActions = seatFilterSlice.actions;
export const seatFilterReducer = { [seatFilterSlice.name]: seatFilterSlice.reducer };
