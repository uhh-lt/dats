import { createInitialFilterState, filterReducer, MyFilterExpression, resetProjectFilterState } from "@core/filter";
import { SentAnnoColumns } from "@models/SentAnnoColumns";
import { StringOperator } from "@models/StringOperator";
import { createSlice } from "@reduxjs/toolkit";
import { ProjectActions } from "@store/global/projectSlice";

export const defaultSEATFilterExpression: MyFilterExpression = {
  id: crypto.randomUUID(),
  column: SentAnnoColumns.SENT_ANNO_SOURCE_SOURCE_DOCUMENT_NAME,
  operator: StringOperator.STRING_CONTAINS,
  value: "",
};

const initialState = createInitialFilterState(defaultSEATFilterExpression);

const seatFilterSlice = createSlice({
  name: "seatFilter",
  initialState,
  reducers: filterReducer,
  extraReducers(builder) {
    builder.addCase(ProjectActions.changeProject, (state, action) => {
      console.log("Project changed! Resetting 'seatFilter' state.");
      resetProjectFilterState({
        state,
        defaultFilterExpression: defaultSEATFilterExpression,
        projectId: action.payload,
        sliceName: "seatFilter",
      });
    });
  },
});

export const SEATFilterActions = seatFilterSlice.actions;
export const seatFilterReducer = { [seatFilterSlice.name]: seatFilterSlice.reducer };
