import { v4 as uuidv4 } from "uuid";
import { LogicalOperator, AnnotatedSegmentsColumns, StringOperator } from "../../../api/openapi";
import { createFilterSlice } from "../../../features/FilterDialog/filterSlice";

const annotatedSegmentsFilterSlice = createFilterSlice({
  name: "annotatedSegmentsFilter",
  initialState: {
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
      column: AnnotatedSegmentsColumns.ASC_SOURCE_SOURCE_DOCUMENT_FILENAME,
      operator: StringOperator.STRING_CONTAINS,
      value: "",
    },
    column2Info: {},
    expertMode: false,
  },
});

export const AnnotatedSegmentsFilterActions = annotatedSegmentsFilterSlice.actions;

export default annotatedSegmentsFilterSlice.reducer;
