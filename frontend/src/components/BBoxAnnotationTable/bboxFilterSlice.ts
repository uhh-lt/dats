import { createSlice } from "@reduxjs/toolkit";
import { v4 as uuidv4 } from "uuid";
import { AnnotatedImagesColumns } from "../../api/openapi/models/AnnotatedImagesColumns.ts";
import { LogicalOperator } from "../../api/openapi/models/LogicalOperator.ts";
import { StringOperator } from "../../api/openapi/models/StringOperator.ts";
import { FilterState, filterReducer } from "../../features/FilterDialog/filterSlice.ts";

const initialState: FilterState = {
  filter: {
    root: {
      id: "root",
      logic_operator: LogicalOperator.AND,
      items: [],
    },
  },
  editableFilter: {
    id: "root",
    logic_operator: LogicalOperator.AND,
    items: [],
  },
  defaultFilterExpression: {
    id: uuidv4(),
    column: AnnotatedImagesColumns.AIC_SOURCE_SOURCE_DOCUMENT_FILENAME,
    operator: StringOperator.STRING_CONTAINS,
    value: "",
  },
  column2Info: {},
  expertMode: false,
};

const bboxFilterSlice = createSlice({
  name: "bboxFilter",
  initialState,
  reducers: filterReducer,
});

export const BBoxFilterActions = bboxFilterSlice.actions;

export default bboxFilterSlice.reducer;
