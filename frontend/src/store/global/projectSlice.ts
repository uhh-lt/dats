import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface ProjectState {
  // app state:
  projectId?: number;
}

const initialState: ProjectState = {
  // app state:
  projectId: undefined,
};

const projectSlice = createSlice({
  name: "project",
  initialState,
  reducers: {
    changeProject: (state, action: PayloadAction<number | undefined>) => {
      console.log("Project changed!", action.payload);
      state.projectId = action.payload;
    },
  },
});

export const ProjectActions = projectSlice.actions;
// not persisted: the URL sets the project after every load, so that every persisted slice checks the project of its ids
export const projectReducer = {
  [projectSlice.name]: projectSlice.reducer,
};
