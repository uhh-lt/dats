import { createSlice } from "@reduxjs/toolkit";
import { v4 as uuidv4 } from "uuid";
import { LogicalOperator } from "../../../api/openapi/models/LogicalOperator.ts";
import { StringOperator } from "../../../api/openapi/models/StringOperator.ts";
import { TimelineAnalysisColumns } from "../../../api/openapi/models/TimelineAnalysisColumns.ts";
import { FilterState, filterReducer } from "../../../features/FilterDialog/filterSlice.ts";

const initialState: FilterState = {
  filter: {},
  editableFilter: {
    id: "root",
    logic_operator: LogicalOperator.AND,
    items: [],
  },
  defaultFilterExpression: {
    id: uuidv4(),
    column: TimelineAnalysisColumns.TA_SOURCE_DOCUMENT_FILENAME,
    operator: StringOperator.STRING_CONTAINS,
    value: "",
  },
  column2Info: {},
  expertMode: true,
};

const timelineAnalysisFilterSlice = createSlice({
  name: "timelineAnalysisFilter",
  initialState: initialState,
  reducers: filterReducer,
});

export const TimelineAnalysisFilterActions = timelineAnalysisFilterSlice.actions;

export default timelineAnalysisFilterSlice.reducer;
