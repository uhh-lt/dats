import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { MRT_PaginationState, MRT_RowSelectionState, MRT_SortingState } from "material-react-table";
import { WordFrequencyColumns } from "../../../api/openapi/models/WordFrequencyColumns.ts";
import { WordFrequencyFilterActions } from "./wordFrequencyFilterSlice.ts";

export interface WordFrequencyState {
  paginationModel: MRT_PaginationState;
  rowSelectionModel: MRT_RowSelectionState;
  sortingModel: MRT_SortingState;
}

const initialState: WordFrequencyState = {
  paginationModel: { pageIndex: 0, pageSize: 5 },
  rowSelectionModel: {},
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
    onPaginationModelChange: (state, action: PayloadAction<MRT_PaginationState>) => {
      state.paginationModel = action.payload;
    },
    onSelectionModelChange: (state, action: PayloadAction<MRT_RowSelectionState>) => {
      state.rowSelectionModel = action.payload;
    },
    onSortingModelChange: (state, action: PayloadAction<MRT_SortingState>) => {
      state.sortingModel = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(WordFrequencyFilterActions.onFinishFilterEdit, (state) => {
        // reset page when filter changes
        state.paginationModel.pageIndex = 0;

        // reset selection when filter changes
        state.rowSelectionModel = {};
      })
      .addDefaultCase(() => {});
  },
});

export const WordFrequencyActions = WordFrequencySlice.actions;

export default WordFrequencySlice.reducer;
