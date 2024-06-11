import { createSlice } from "@reduxjs/toolkit";
import { v4 as uuidv4 } from "uuid";
import { SearchColumns } from "../../../api/openapi/models/SearchColumns.ts";
import { StringOperator } from "../../../api/openapi/models/StringOperator.ts";
import { createInitialFilterState, filterReducer } from "../../FilterDialog/filterSlice.ts";

const initialState = createInitialFilterState({
  id: uuidv4(),
  column: SearchColumns.SC_SOURCE_DOCUMENT_FILENAME,
  operator: StringOperator.STRING_CONTAINS,
  value: "",
});

const documentTableFilterSlice = createSlice({
  name: "documentTableFilter",
  initialState,
  reducers: filterReducer,
});

export const DocumentTableFilterActions = documentTableFilterSlice.actions;
export default documentTableFilterSlice.reducer;
