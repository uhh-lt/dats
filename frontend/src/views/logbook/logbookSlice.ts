import { PayloadAction, createSlice } from "@reduxjs/toolkit";
import { v4 as uuidv4 } from "uuid";
import { MemoColumns } from "../../api/openapi/models/MemoColumns.ts";
import { StringOperator } from "../../api/openapi/models/StringOperator.ts";
import { FilterState, createInitialFilterState, filterReducer } from "../../components/FilterDialog/filterSlice.ts";
import { TableState, initialTableState, tableReducer } from "../../components/tableSlice.ts";

interface MemoSearchState {
  isSearchContent: boolean;
}

const initialState: FilterState & TableState & MemoSearchState = {
  ...createInitialFilterState({
    id: uuidv4(),
    column: MemoColumns.M_CONTENT,
    operator: StringOperator.STRING_CONTAINS,
    value: "",
  }),
  ...initialTableState,
  isSearchContent: false,
};

const logbookSlice = createSlice({
  name: "logbook",
  initialState: initialState,
  reducers: {
    ...filterReducer,
    ...tableReducer,
    // memo search
    onChangeIsSearchContent: (state, action: PayloadAction<boolean>) => {
      state.isSearchContent = action.payload;
    },
  },
});

export const LogbookActions = logbookSlice.actions;

export default logbookSlice.reducer;
