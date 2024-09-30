import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { persistReducer } from "redux-persist";
import storage from "redux-persist/lib/storage";

export interface ProjectState {
  // app state:
  projectId?: number;
}

const initialState: ProjectState = {
  // app state:
  projectId: undefined,
};

export const projectSlice = createSlice({
  name: "project",
  initialState,
  reducers: {
    changeProject: (state, action: PayloadAction<number>) => {
      console.log("Project changed!", action.payload);
      state.projectId = action.payload;
    },
  },
});

export const ProjectActions = projectSlice.actions;

export default persistReducer(
  {
    key: "project",
    storage,
  },
  projectSlice.reducer,
);
