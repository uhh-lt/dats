import { createInitialFilterState, filterReducer, MyFilterExpression, resetProjectFilterState } from "@core/filter";
import { SdocColumns } from "@models/SdocColumns";
import { StringOperator } from "@models/StringOperator";
import { createSlice } from "@reduxjs/toolkit";
import { ProjectActions } from "@store/global/projectSlice";

export const defaultSdocFilterExpression: MyFilterExpression = {
  id: crypto.randomUUID(),
  column: SdocColumns.SD_SOURCE_DOCUMENT_NAME,
  operator: StringOperator.STRING_CONTAINS,
  value: "",
};

const initialState = createInitialFilterState(defaultSdocFilterExpression);

const sdocFilterSlice = createSlice({
  name: "sdocFilter",
  initialState,
  reducers: filterReducer,
  extraReducers(builder) {
    builder.addCase(ProjectActions.changeProject, (state) => {
      console.log("Project changed! Resetting 'sdocFilter' state.");
      resetProjectFilterState({
        state,
        defaultFilterExpression: defaultSdocFilterExpression,
      });
    });
  },
});

export const SdocFilterActions = sdocFilterSlice.actions;
export const sdocFilterReducer = { [sdocFilterSlice.name]: sdocFilterSlice.reducer };
