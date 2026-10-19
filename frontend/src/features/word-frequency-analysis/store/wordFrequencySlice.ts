import { createSlice } from "@reduxjs/toolkit";
import { TableState, initialTableState, resetProjectTableState, tableReducer } from "@store/generic/tableSlice";
import { ProjectActions } from "@store/global/projectSlice";

const WordFrequencySlice = createSlice({
  name: "wordFrequency",
  initialState: initialTableState as TableState,
  reducers: {
    ...tableReducer,
  },
  extraReducers: (builder) => {
    builder
      .addCase(ProjectActions.changeProject, (state) => {
        resetProjectTableState(state);
      })
      .addDefaultCase(() => {});
  },
});

export const WordFrequencyActions = WordFrequencySlice.actions;
export const wordFrequencyReducer = { [WordFrequencySlice.name]: WordFrequencySlice.reducer };
