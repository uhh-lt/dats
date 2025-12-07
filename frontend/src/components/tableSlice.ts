import { Draft, PayloadAction, createSelector } from "@reduxjs/toolkit";
import {
  MRT_ColumnSizingState,
  MRT_DensityState,
  MRT_ExpandedState,
  MRT_RowSelectionState,
  MRT_SortingState,
  MRT_VisibilityState,
} from "material-react-table";

export interface TableState {
  searchQuery?: string;
  rowSelectionModel: MRT_RowSelectionState;
  sortingModel: MRT_SortingState;
  columnVisibilityModel: MRT_VisibilityState;
  columnSizingModel: MRT_ColumnSizingState;
  gridDensityModel: MRT_DensityState;
  expandedModel: MRT_ExpandedState;
  fetchSize: number;
}

export const initialTableState: TableState = {
  // project state:
  searchQuery: "",
  rowSelectionModel: {},
  sortingModel: [],
  columnVisibilityModel: {},
  columnSizingModel: {},
  expandedModel: {},
  fetchSize: 20,
  // app state:
  gridDensityModel: "comfortable",
};

export const tableReducer = {
  // query
  onSearchQueryChange: (state: Draft<TableState>, action: PayloadAction<string | undefined>) => {
    state.searchQuery = action.payload;
    // reset variables that depend on search parameters
    state.rowSelectionModel = initialTableState.rowSelectionModel;
    state.fetchSize = initialTableState.fetchSize;
  },
  // selection
  onRowSelectionChange: (state: Draft<TableState>, action: PayloadAction<MRT_RowSelectionState>) => {
    state.rowSelectionModel = action.payload;
  },
  onClearRowSelection: (state: Draft<TableState>) => {
    state.rowSelectionModel = {};
  },
  // sorting
  onSortChange: (state: Draft<TableState>, action: PayloadAction<MRT_SortingState>) => {
    state.sortingModel = action.payload;
  },
  // column visibility
  onColumnVisibilityChange: (state: Draft<TableState>, action: PayloadAction<MRT_VisibilityState>) => {
    state.columnVisibilityModel = action.payload;
  },
  // expanded
  onExpandedChange: (state: Draft<TableState>, action: PayloadAction<MRT_ExpandedState>) => {
    state.expandedModel = action.payload;
  },
  // column sizing
  onColumnSizingChange: (state: Draft<TableState>, action: PayloadAction<MRT_ColumnSizingState>) => {
    state.columnSizingModel = action.payload;
  },
  // density
  onGridDensityChange: (state: Draft<TableState>, action: PayloadAction<MRT_DensityState>) => {
    state.gridDensityModel = action.payload;
  },
  // fetch sizse
  onFetchSizeChange: (state: Draft<TableState>, action: PayloadAction<number>) => {
    state.fetchSize = action.payload;
  },
};

// reset table state
export const resetProjectTableState = (state: Draft<TableState>) => {
  state.searchQuery = initialTableState.searchQuery;
  state.rowSelectionModel = initialTableState.rowSelectionModel;
  state.sortingModel = initialTableState.sortingModel;
  state.columnVisibilityModel = initialTableState.columnVisibilityModel;
  state.columnSizingModel = initialTableState.columnSizingModel;
  state.fetchSize = initialTableState.fetchSize;
};

// selectors
export const selectRowSelectionModel = (state: TableState) => state.rowSelectionModel;

export const selectSelectedRows = createSelector([selectRowSelectionModel], (rowSelectionModel) => {
  return Object.keys(rowSelectionModel).filter((key) => rowSelectionModel[key]);
});

export const selectSelectedIds = createSelector([selectRowSelectionModel], (rowSelectionModel) => {
  return Object.keys(rowSelectionModel)
    .filter((key) => rowSelectionModel[key])
    .map((key) => parseInt(key))
    .filter((id) => !isNaN(id));
});
