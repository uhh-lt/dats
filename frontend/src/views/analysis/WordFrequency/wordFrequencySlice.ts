import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { GridPaginationModel, GridSortModel } from "@mui/x-data-grid";
import { WordFrequencyFilterActions } from "./wordFrequencyFilterSlice";
import { SortDirection, WordFrequencyColumns } from "../../../api/openapi";

export interface WordFrequencyState {
  paginationModel: GridPaginationModel;
  rowSelectionModel: number[];
  sortModel: GridSortModel;
}

const initialState: WordFrequencyState = {
  paginationModel: { page: 0, pageSize: 5 },
  rowSelectionModel: [],
  sortModel: [
    {
      field: WordFrequencyColumns.WF_WORD_FREQUENCY,
      sort: SortDirection.DESC,
    },
  ],
};

export const WordFrequencySlice = createSlice({
  name: "wordFrequency",
  initialState,
  reducers: {
    onPaginationModelChange: (state, action: PayloadAction<{ page: number; pageSize: number }>) => {
      state.paginationModel = action.payload;
    },
    onSelectionModelChange: (state, action: PayloadAction<number[]>) => {
      state.rowSelectionModel = action.payload;
    },
    onSortModelChange: (state, action: PayloadAction<GridSortModel>) => {
      state.sortModel = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(WordFrequencyFilterActions.onFinishFilterEdit, (state, action) => {
        // reset page when filter changes
        state.paginationModel.page = 0;

        // reset selection when filter changes
        state.rowSelectionModel = [];
      })
      .addDefaultCase((state) => {});
  },
});

export const WordFrequencyActions = WordFrequencySlice.actions;

export default WordFrequencySlice.reducer;
