import { createSlice } from "@reduxjs/toolkit";
import { v4 as uuidv4 } from "uuid";
import { AnnotatedSegmentsColumns } from "../../../api/openapi/models/AnnotatedSegmentsColumns.ts";
import { StringOperator } from "../../../api/openapi/models/StringOperator.ts";
import { createInitialFilterState, filterReducer } from "../../FilterDialog/filterSlice.ts";

const initialState = createInitialFilterState({
  id: uuidv4(),
  column: AnnotatedSegmentsColumns.ASC_SPAN_TEXT,
  operator: StringOperator.STRING_CONTAINS,
  value: "",
});

const satFilterSlice = createSlice({
  name: "satFilter",
  initialState,
  reducers: filterReducer,
});

export const SATFilterActions = satFilterSlice.actions;

export default satFilterSlice.reducer;
