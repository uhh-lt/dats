import { ColumnInfo } from "@core/filter";
import { PayloadAction, createSlice } from "@reduxjs/toolkit";
import { TableState, initialTableState, resetProjectTableState, tableReducer } from "@store/generic/tableSlice";
import { ProjectActions } from "@store/global/projectSlice";

export interface WordFrequencyState extends TableState {
  column2Info: Record<string, ColumnInfo>;
}

const initialState: WordFrequencyState = {
  ...initialTableState,
  column2Info: {},
};

const WordFrequencySlice = createSlice({
  name: "wordFrequency",
  initialState,
  reducers: {
    ...tableReducer,
    init: (state, action: PayloadAction<{ columnInfoMap: Record<string, ColumnInfo> }>) => {
      state.column2Info = action.payload.columnInfoMap;
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
    // preserve legacy behavior from onFinishFilterEdit after URL-state migration:
    // when filter criteria change, reset state that depends on result-set identity
    onURLFilterChange: (state) => {
      state.rowSelectionModel = initialTableState.rowSelectionModel;
      state.fetchSize = initialTableState.fetchSize;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(ProjectActions.changeProject, (state) => {
        resetProjectTableState(state);
        state.column2Info = initialState.column2Info;
      })
      .addDefaultCase(() => {});
  },
});

export const WordFrequencyActions = WordFrequencySlice.actions;
export const wordFrequencyReducer = { [WordFrequencySlice.name]: WordFrequencySlice.reducer };
