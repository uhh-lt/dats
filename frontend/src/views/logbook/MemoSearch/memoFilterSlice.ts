import { PayloadAction, createSlice } from "@reduxjs/toolkit";
import {
  MRT_ColumnSizingState,
  MRT_DensityState,
  MRT_PaginationState,
  MRT_RowSelectionState,
  MRT_SortingState,
  MRT_VisibilityState,
} from "material-react-table";
import { v4 as uuidv4 } from "uuid";
import { LogicalOperator } from "../../../api/openapi/models/LogicalOperator.ts";
import { MemoColumns } from "../../../api/openapi/models/MemoColumns.ts";
import { StringOperator } from "../../../api/openapi/models/StringOperator.ts";
import { FilterState, filterReducer } from "../../../components/FilterDialog/filterSlice.ts";

interface MemoSearchState {
  isSearchContent: boolean;
}

interface SearchState {
  searchQuery: string;
  rowSelectionModel: MRT_RowSelectionState;
  paginationModel: MRT_PaginationState;
  sortingModel: MRT_SortingState;
  columnVisibilityModel: MRT_VisibilityState;
  columnSizingModel: MRT_ColumnSizingState;
  gridDensity: MRT_DensityState;
}

const initialSearchState: SearchState = {
  searchQuery: "",
  rowSelectionModel: {},
  paginationModel: {
    pageIndex: 0,
    pageSize: 10,
  },
  sortingModel: [],
  columnVisibilityModel: {},
  columnSizingModel: {},
  gridDensity: "comfortable",
};

const initialState: FilterState & SearchState & MemoSearchState = {
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
    column: MemoColumns.M_CONTENT,
    operator: StringOperator.STRING_CONTAINS,
    value: "",
  },
  column2Info: {},
  expertMode: false,
  ...initialSearchState,
  isSearchContent: false,
};

const memoFilterSlice = createSlice({
  name: "memoFilter",
  initialState: initialState,
  reducers: {
    ...filterReducer,
    // query
    onSearchQueryChange: (state, action: PayloadAction<string>) => {
      state.searchQuery = action.payload;
    },
    // selection
    onRowSelectionModelChange: (state, action: PayloadAction<MRT_RowSelectionState>) => {
      state.rowSelectionModel = action.payload;
    },
    // pagination
    onPaginationModelChange: (state, action: PayloadAction<MRT_PaginationState>) => {
      state.paginationModel = action.payload;
    },
    // sorting
    onSortModelChange: (state, action: PayloadAction<MRT_SortingState>) => {
      state.sortingModel = action.payload;
    },
    // column visibility
    onColumnVisibilityChange: (state, action: PayloadAction<MRT_VisibilityState>) => {
      state.columnVisibilityModel = action.payload;
    },
    // column sizing
    onColumnSizingChange: (state, action: PayloadAction<MRT_ColumnSizingState>) => {
      state.columnSizingModel = action.payload;
    },
    // density
    onGridDensityChange: (state, action: PayloadAction<MRT_DensityState>) => {
      state.gridDensity = action.payload;
    },
    // memo search
    onChangeIsSearchContent: (state, action: PayloadAction<boolean>) => {
      state.isSearchContent = action.payload;
    },
  },
});

export const MemoFilterActions = memoFilterSlice.actions;

export default memoFilterSlice.reducer;
