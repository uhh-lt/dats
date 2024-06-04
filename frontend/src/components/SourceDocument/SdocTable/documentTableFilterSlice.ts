import { createSlice } from "@reduxjs/toolkit";
import { v4 as uuidv4 } from "uuid";
import { LogicalOperator } from "../../../api/openapi/models/LogicalOperator.ts";
import { SearchColumns } from "../../../api/openapi/models/SearchColumns.ts";
import { StringOperator } from "../../../api/openapi/models/StringOperator.ts";
import { FilterState, filterReducer } from "../../FilterDialog/filterSlice.ts";

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
    column: SearchColumns.SC_SOURCE_DOCUMENT_FILENAME,
    operator: StringOperator.STRING_CONTAINS,
    value: "",
  },
  column2Info: {},
  expertMode: false,
};

const documentTableFilterSlice = createSlice({
  name: "documentTableFilter",
  initialState,
  reducers: filterReducer,
});

export const DocumentTableFilterActions = documentTableFilterSlice.actions;
export default documentTableFilterSlice.reducer;
