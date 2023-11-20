import { v4 as uuidv4 } from "uuid";
import { createFilterSlice } from "../../../features/FilterDialog/filterSlice";
import { LogicalOperator, TimelineAnalysisColumns, StringOperator } from "../../../api/openapi";

const timelineAnalysisFilterSlice = createFilterSlice({
  name: "timelineAnalysisFilter",
  initialState: {
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
  },
});

export const TimelineAnalysisFilterActions = timelineAnalysisFilterSlice.actions;

export default timelineAnalysisFilterSlice.reducer;
