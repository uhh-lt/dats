import { createSlice } from "@reduxjs/toolkit";
import { v4 as uuidv4 } from "uuid";
import { LogicalOperator } from "../../../api/openapi/models/LogicalOperator.ts";
import { StringOperator } from "../../../api/openapi/models/StringOperator.ts";
import { WordFrequencyColumns } from "../../../api/openapi/models/WordFrequencyColumns.ts";
import { FilterState, filterReducer } from "../../../features/FilterDialog/filterSlice.ts";

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
    column: WordFrequencyColumns.WF_SOURCE_DOCUMENT_FILENAME,
    operator: StringOperator.STRING_CONTAINS,
    value: "",
  },
  column2Info: {},
  expertMode: false,
};

const wordFrequencyFilterSlice = createSlice({
  name: "wordFrequencyFilter",
  initialState,
  reducers: filterReducer,
});

export const WordFrequencyFilterActions = wordFrequencyFilterSlice.actions;

export default wordFrequencyFilterSlice.reducer;
