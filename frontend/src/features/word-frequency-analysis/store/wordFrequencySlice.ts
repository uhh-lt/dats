import { queryClient } from "@api/queryClient";
import { ColumnInfo, tableInfoQueryKey } from "@core/filter";
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
  },
  extraReducers: (builder) => {
    builder
      .addCase(ProjectActions.changeProject, (state, action) => {
        resetProjectTableState(state);
        // reset column info
        const projectId = action.payload;
        state.column2Info = initialState.column2Info;
        if (projectId) {
          queryClient.removeQueries({ queryKey: tableInfoQueryKey("wordFrequency", projectId) });
        }
      })
      .addDefaultCase(() => {});
  },
});

export const WordFrequencyActions = WordFrequencySlice.actions;
export const wordFrequencyReducer = { [WordFrequencySlice.name]: WordFrequencySlice.reducer };
