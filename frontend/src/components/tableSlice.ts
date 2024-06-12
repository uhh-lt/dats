import { Draft, PayloadAction, createSelector } from "@reduxjs/toolkit";
import {
  MRT_ColumnSizingState,
  MRT_DensityState,
  MRT_PaginationState,
  MRT_RowSelectionState,
  MRT_SortingState,
  MRT_VisibilityState,
} from "material-react-table";

export interface TableState {
  searchQuery: string;
  rowSelectionModel: MRT_RowSelectionState;
  paginationModel: MRT_PaginationState;
  sortingModel: MRT_SortingState;
  columnVisibilityModel: MRT_VisibilityState;
  columnSizingModel: MRT_ColumnSizingState;
  gridDensityModel: MRT_DensityState;
}

export const initialTableState: TableState = {
  searchQuery: "",
  rowSelectionModel: {},
  paginationModel: {
    pageIndex: 0,
    pageSize: 10,
  },
  sortingModel: [],
  columnVisibilityModel: {},
  columnSizingModel: {},
  gridDensityModel: "comfortable",
};

export const tableReducer = {
  // query
  onSearchQueryChange: (state: Draft<TableState>, action: PayloadAction<string>) => {
    state.searchQuery = action.payload;
  },
  // selection
  onRowSelectionChange: (state: Draft<TableState>, action: PayloadAction<MRT_RowSelectionState>) => {
    state.rowSelectionModel = action.payload;
  },
  onClearRowSelection: (state: Draft<TableState>) => {
    state.rowSelectionModel = {};
  },
  // pagination
  onPaginationChange: (state: Draft<TableState>, action: PayloadAction<MRT_PaginationState>) => {
    state.paginationModel = action.payload;
  },
  // sorting
  onSortChange: (state: Draft<TableState>, action: PayloadAction<MRT_SortingState>) => {
    state.sortingModel = action.payload;
  },
  // column visibility
  onColumnVisibilityChange: (state: Draft<TableState>, action: PayloadAction<MRT_VisibilityState>) => {
    state.columnVisibilityModel = action.payload;
  },
  // column sizing
  onColumnSizingChange: (state: Draft<TableState>, action: PayloadAction<MRT_ColumnSizingState>) => {
    state.columnSizingModel = action.payload;
  },
  // density
  onGridDensityChange: (state: Draft<TableState>, action: PayloadAction<MRT_DensityState>) => {
    state.gridDensityModel = action.payload;
  },
};

// selectors
export const selectRowSelectionModel = (state: TableState) => state.rowSelectionModel;

export const selectSelectedDocumentIds = createSelector([selectRowSelectionModel], (rowSelectionModel) => {
  return Object.keys(rowSelectionModel)
    .filter((key) => rowSelectionModel[key])
    .map((key) => parseInt(key));
});
