import { SdocColumns } from "@api/models/SdocColumns";
import { StringOperator } from "@api/models/StringOperator";
import type { MyFilterExpression } from "@core/filter";
import { createInitialFilterState, filterReducer, resetProjectFilterState } from "@core/filter";
import { createSlice } from "@reduxjs/toolkit";
import { ProjectActions } from "@store/global/projectSlice";

const defaultFilterExpression: MyFilterExpression = {
  id: crypto.randomUUID(),
  column: SdocColumns.SD_SOURCE_DOCUMENT_NAME,
  operator: StringOperator.STRING_CONTAINS,
  value: "",
};

const initialState = createInitialFilterState(defaultFilterExpression);

const documentTableFilterSlice = createSlice({
  name: "documentTableFilter",
  initialState,
  reducers: filterReducer,
  extraReducers(builder) {
    builder.addCase(ProjectActions.changeProject, (state, action) => {
      console.log("Project changed! Resetting 'documentTableFilter' state.");
      resetProjectFilterState({
        state,
        defaultFilterExpression,
        sliceName: "documentTableFilter",
        projectId: action.payload,
      });
    });
  },
});

export const SdocTableFilterActions = documentTableFilterSlice.actions;
export const sdocTableFilterReducer = { [documentTableFilterSlice.name]: documentTableFilterSlice.reducer };
