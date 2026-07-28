import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { persistReducer } from "redux-persist";
import createWebStorage from "redux-persist/es/storage/createWebStorage";
const storage = createWebStorage("local");

export interface ProjectState {
  // app state:
  projectId?: number;
  codeBranchByProject: Record<number, number | null>;
}

const initialState: ProjectState = {
  // app state:
  projectId: undefined,
  codeBranchByProject: {},
};

const projectSlice = createSlice({
  name: "project",
  initialState,
  reducers: {
    changeProject: (state, action: PayloadAction<number | undefined>) => {
      console.log("Project changed!", action.payload);
      state.projectId = action.payload;
    },
    selectCodeBranch: (state, action: PayloadAction<{ projectId: number; branchId: number | null }>) => {
      state.codeBranchByProject[action.payload.projectId] = action.payload.branchId;
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
