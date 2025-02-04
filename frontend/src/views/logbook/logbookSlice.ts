import { PayloadAction, createSlice } from "@reduxjs/toolkit";
import { v4 as uuidv4 } from "uuid";
import { MemoColumns } from "../../api/openapi/models/MemoColumns.ts";
import { StringOperator } from "../../api/openapi/models/StringOperator.ts";
import {
  FilterState,
  createInitialFilterState,
  filterReducer,
  resetProjectFilterState,
} from "../../components/FilterDialog/filterSlice.ts";
import { MyFilterExpression } from "../../components/FilterDialog/filterUtils.ts";
import { ProjectActions } from "../../components/Project/projectSlice.ts";
import { TableState, initialTableState, resetProjectTableState, tableReducer } from "../../components/tableSlice.ts";

interface MemoSearchState {
  // app state:
  isSearchContent: boolean; // whether to search in the content or the title of the memos.
}

const defaultFilterExpression: MyFilterExpression = {
  id: uuidv4(),
  column: MemoColumns.M_CONTENT,
  operator: StringOperator.STRING_CONTAINS,
  value: "",
};

const initialState: FilterState & TableState & MemoSearchState = {
  ...createInitialFilterState(defaultFilterExpression),
  ...initialTableState,
  // app state:
  isSearchContent: false,
};

const logbookSlice = createSlice({
  name: "logbook",
  initialState: initialState,
  reducers: {
    ...filterReducer,
    ...tableReducer,
    // extend filterReducer's onFinishFilterEdit
    onFinishFilterEdit: (state) => {
      filterReducer.onFinishFilterEdit(state);
      // reset variables that depend on search parameters
      state.rowSelectionModel = initialTableState.rowSelectionModel;
      state.fetchSize = initialTableState.fetchSize;
    },
    // memo search
    onChangeIsSearchContent: (state, action: PayloadAction<boolean>) => {
      state.isSearchContent = action.payload;
    },
  },
  extraReducers(builder) {
    builder.addCase(ProjectActions.changeProject, (state, action) => {
      console.log("Project changed! Resetting 'logbook' state.");
      resetProjectFilterState({ state, defaultFilterExpression, projectId: action.payload, sliceName: "logbook" });
      resetProjectTableState(state);
    });
  },
});

export const LogbookActions = logbookSlice.actions;

export default logbookSlice.reducer;
