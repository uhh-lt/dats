import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { persistReducer } from "redux-persist";
import createWebStorage from "redux-persist/es/storage/createWebStorage";
const storage = createWebStorage("local");

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
export const projectReducer = {
  [projectSlice.name]: persistReducer(
    {
      key: projectSlice.name,
      storage,
    },
    projectSlice.reducer,
  ),
};
