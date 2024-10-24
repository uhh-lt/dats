import { createSlice } from "@reduxjs/toolkit";
import { v4 as uuidv4 } from "uuid";
import { StringOperator } from "../../../api/openapi/models/StringOperator.ts";
import { WordFrequencyColumns } from "../../../api/openapi/models/WordFrequencyColumns.ts";
import {
  FilterState,
  createInitialFilterState,
  filterReducer,
  resetProjectFilterState,
} from "../../../components/FilterDialog/filterSlice.ts";
import { MyFilterExpression } from "../../../components/FilterDialog/filterUtils.ts";
import { ProjectActions } from "../../../components/Project/projectSlice.ts";
import { TableState, initialTableState, resetProjectTableState, tableReducer } from "../../../components/tableSlice.ts";

const defaultFilterExpression: MyFilterExpression = {
  id: uuidv4(),
  column: WordFrequencyColumns.WF_SOURCE_DOCUMENT_FILENAME,
  operator: StringOperator.STRING_CONTAINS,
  value: "",
};

const initialState: FilterState & TableState = {
  ...createInitialFilterState(defaultFilterExpression),
  ...initialTableState,
  // project state:
  // override initial table state
  sortingModel: [
    {
      id: WordFrequencyColumns.WF_WORD_FREQUENCY,
      desc: true,
    },
  ],
};

export const WordFrequencySlice = createSlice({
  name: "wordFrequency",
  initialState,
  reducers: {
    ...filterReducer,
    ...tableReducer,
  },
  extraReducers: (builder) => {
    builder
      .addCase(ProjectActions.changeProject, (state) => {
        console.log("Project changed! Resetting 'wordFrequency' state.");
        resetProjectFilterState(state, defaultFilterExpression);
        resetProjectTableState(state);
        state.sortingModel = initialState.sortingModel;
      })
      .addCase(WordFrequencyActions.init, (state, action) => {
        state.columnVisibilityModel = Object.values(action.payload.columnInfoMap).reduce((acc, column) => {
          if (!column.column) return acc;
          // this is a normal column
          if (isNaN(parseInt(column.column))) {
            return acc;
            // this is a metadata column
          } else {
            return {
              ...acc,
              [column.column]: false,
            };
          }
        }, {});
      })
      .addCase(WordFrequencyActions.onFinishFilterEdit, (state) => {
        // reset selection when filter changes
        state.rowSelectionModel = {};
      })
      .addDefaultCase(() => {});
  },
});

export const WordFrequencyActions = WordFrequencySlice.actions;

export default WordFrequencySlice.reducer;
