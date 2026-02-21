import { PayloadAction, createSlice } from "@reduxjs/toolkit";
import { ProjectActions } from "../../../core/project/projectSlice.ts";

interface DuplicateFinderState {
  // project state:
  lastDuplicateFinderJobId: string | undefined;
}

const initialState: DuplicateFinderState = {
  lastDuplicateFinderJobId: undefined,
};

export const duplicateFinderSlice = createSlice({
  name: "duplicateFinder",
  initialState,
  reducers: {
    setLastDuplicateFinderJobId: (state, action: PayloadAction<string>) => {
      state.lastDuplicateFinderJobId = action.payload;
    },
  },
  extraReducers(builder) {
    builder.addCase(ProjectActions.changeProject, (state) => {
      console.log("Project changed! Resetting 'duplicateFinder' state.");
      state.lastDuplicateFinderJobId = initialState.lastDuplicateFinderJobId;
    });
  },
});

// actions
export const DuplicateFinderActions = duplicateFinderSlice.actions;
export const duplicateFinderReducer = duplicateFinderSlice.reducer;
