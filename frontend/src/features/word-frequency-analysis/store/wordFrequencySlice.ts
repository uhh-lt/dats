import { createSlice } from "@reduxjs/toolkit";
import { TableState, initialTableState, resetProjectTableState, tableReducer } from "@store/generic/tableSlice";
import { ProjectActions } from "@store/global/projectSlice";

const initialState: TableState = initialTableState;

const wordFrequencySlice = createSlice({
  name: "wordFrequency",
  initialState,
  reducers: {
    ...tableReducer,
  },
  extraReducers: (builder) => {
    builder.addCase(ProjectActions.changeProject, (state) => {
      console.log("Project changed! Resetting 'wordFrequency' state.");
      resetProjectTableState(state);
    });
  },
});

export const WordFrequencyActions = wordFrequencySlice.actions;
export const wordFrequencyReducer = { [wordFrequencySlice.name]: wordFrequencySlice.reducer };
