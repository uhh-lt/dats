import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { MRT_RowSelectionState, MRT_SortingState, MRT_VisibilityState } from "material-react-table";
import { v4 as uuidv4 } from "uuid";
import { StringOperator } from "../../../api/openapi/models/StringOperator.ts";
import { WordFrequencyColumns } from "../../../api/openapi/models/WordFrequencyColumns.ts";
import { createInitialFilterState, filterReducer, FilterState } from "../../../components/FilterDialog/filterSlice.ts";

export interface WordFrequencyState {
  rowSelectionModel: MRT_RowSelectionState;
  sortingModel: MRT_SortingState;
  columnVisibilityModel: MRT_VisibilityState;
}

const initialState: FilterState & WordFrequencyState = {
  rowSelectionModel: {},
  sortingModel: [
    {
      id: WordFrequencyColumns.WF_WORD_FREQUENCY,
      desc: true,
    },
  ],
  columnVisibilityModel: {},
  ...createInitialFilterState({
    id: uuidv4(),
    column: WordFrequencyColumns.WF_SOURCE_DOCUMENT_FILENAME,
    operator: StringOperator.STRING_CONTAINS,
    value: "",
  }),
};

export const WordFrequencySlice = createSlice({
  name: "wordFrequency",
  initialState,
  reducers: {
    ...filterReducer,
    onSelectionModelChange: (state, action: PayloadAction<MRT_RowSelectionState>) => {
      state.rowSelectionModel = action.payload;
    },
    onSortingModelChange: (state, action: PayloadAction<MRT_SortingState>) => {
      state.sortingModel = action.payload;
    },
    onColumnVisibilityModelChange: (state, action: PayloadAction<MRT_VisibilityState>) => {
      state.columnVisibilityModel = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
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
        // reset page when filter changes
        // state.paginationModel.pageIndex = 0;

        // reset selection when filter changes
        state.rowSelectionModel = {};
      })
      .addDefaultCase(() => {});
  },
});

export const WordFrequencyActions = WordFrequencySlice.actions;

export default WordFrequencySlice.reducer;
