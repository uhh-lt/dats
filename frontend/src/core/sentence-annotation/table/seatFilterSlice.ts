import { createSlice } from "@reduxjs/toolkit";
import { v4 as uuidv4 } from "uuid";
import { SentAnnoColumns } from "../../../api/openapi/models/SentAnnoColumns.ts";
import { StringOperator } from "../../../api/openapi/models/StringOperator.ts";
import {
  createInitialFilterState,
  filterReducer,
  resetProjectFilterState,
} from "../../../components/FilterDialog/filterSlice.ts";
import { MyFilterExpression } from "../../../components/FilterDialog/filterUtils.ts";
import { ProjectActions } from "../../project/projectSlice.ts";

const defaultFilterExpression: MyFilterExpression = {
  id: uuidv4(),
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
export const seatFilterReducer = seatFilterSlice.reducer;
