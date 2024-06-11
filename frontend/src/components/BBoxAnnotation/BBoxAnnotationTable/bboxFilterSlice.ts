import { createSlice } from "@reduxjs/toolkit";
import { v4 as uuidv4 } from "uuid";
import { AnnotatedImagesColumns } from "../../../api/openapi/models/AnnotatedImagesColumns.ts";
import { StringOperator } from "../../../api/openapi/models/StringOperator.ts";
import { createInitialFilterState, filterReducer } from "../../FilterDialog/filterSlice.ts";

const initialState = createInitialFilterState({
  id: uuidv4(),
  column: AnnotatedImagesColumns.AIC_SOURCE_SOURCE_DOCUMENT_FILENAME,
  operator: StringOperator.STRING_CONTAINS,
  value: "",
});

const bboxFilterSlice = createSlice({
  name: "bboxFilter",
  initialState,
  reducers: filterReducer,
});

export const BBoxFilterActions = bboxFilterSlice.actions;

export default bboxFilterSlice.reducer;
