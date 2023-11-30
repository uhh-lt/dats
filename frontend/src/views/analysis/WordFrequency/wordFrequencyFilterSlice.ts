import { v4 as uuidv4 } from "uuid";
import { LogicalOperator, StringOperator, WordFrequencyColumns } from "../../../api/openapi";
import { createFilterSlice } from "../../../features/FilterDialog/filterSlice";

const wordFrequencyFilterSlice = createFilterSlice({
  name: "wordFrequencyFilter",
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
      column: WordFrequencyColumns.WF_SOURCE_DOCUMENT_FILENAME,
      operator: StringOperator.STRING_CONTAINS,
      value: "",
    },
    column2Info: {},
    expertMode: false,
  },
});

export const WordFrequencyFilterActions = wordFrequencyFilterSlice.actions;

export default wordFrequencyFilterSlice.reducer;
