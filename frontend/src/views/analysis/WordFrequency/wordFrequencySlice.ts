import { PayloadAction, createSlice } from "@reduxjs/toolkit";
import { v4 as uuidv4 } from "uuid";
import { StringOperator } from "../../../api/openapi/models/StringOperator.ts";
import { WordFrequencyColumns } from "../../../api/openapi/models/WordFrequencyColumns.ts";
import {
  FilterState,
  createInitialFilterState,
  filterReducer,
  resetProjectFilterState,
} from "../../../components/FilterDialog/filterSlice.ts";
import { ColumnInfo, MyFilterExpression } from "../../../components/FilterDialog/filterUtils.ts";
import { ProjectActions } from "../../../components/Project/projectSlice.ts";
import { TableState, initialTableState, resetProjectTableState, tableReducer } from "../../../components/tableSlice.ts";

const defaultFilterExpression: MyFilterExpression = {
  id: uuidv4(),
  column: WordFrequencyColumns.WF_SOURCE_DOCUMENT_NAME,
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
    // extend filterReducer's init
    init: (state, action: PayloadAction<{ columnInfoMap: Record<string, ColumnInfo> }>) => {
      filterReducer.init(state, action);
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
    },
    // extend filterReducer's onFinishFilterEdit
    onFinishFilterEdit: (state) => {
      filterReducer.onFinishFilterEdit(state);
      // reset variables that depend on search parameters
      state.rowSelectionModel = initialTableState.rowSelectionModel;
      state.fetchSize = initialTableState.fetchSize;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(ProjectActions.changeProject, (state, action) => {
        console.log("Project changed! Resetting 'wordFrequency' state.");
        resetProjectFilterState({
          state,
          defaultFilterExpression,
          projectId: action.payload,
          sliceName: "wordFrequency",
        });
        resetProjectTableState(state);
        state.sortingModel = initialState.sortingModel;
      })
      .addDefaultCase(() => {});
  },
});

export const WordFrequencyActions = WordFrequencySlice.actions;

export default WordFrequencySlice.reducer;
