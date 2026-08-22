import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { workspaceReducer, WorkspaceState } from "@store/generic/workspaceSlice";
import { persistReducer } from "redux-persist";
import createWebStorage from "redux-persist/es/storage/createWebStorage";

const storage = createWebStorage("local");

/** Memo workspace preferences add the currently-opened memo to the generic workspace preference. */
export interface MemoWorkspacePreference {
  lastViewId?: number;
  /** The memo currently opened in the workspace's detail editor (not routed). */
  openMemoId?: number;
}

export interface MemoWorkspaceState extends WorkspaceState {
  workspaces: Record<string, MemoWorkspacePreference>;
}

const getWorkspace = (state: MemoWorkspaceState, scope: string): MemoWorkspacePreference => {
  state.workspaces[scope] ??= {};
  return state.workspaces[scope];
};

const initialState: MemoWorkspaceState = { workspaces: {} };

const memoWorkspaceSlice = createSlice({
  name: "memoWorkspace",
  initialState,
  reducers: {
    ...workspaceReducer,
    openMemo: (state, action: PayloadAction<{ scope: string; memoId: number }>) => {
      getWorkspace(state, action.payload.scope).openMemoId = action.payload.memoId;
    },
    closeMemo: (state, action: PayloadAction<{ scope: string }>) => {
      getWorkspace(state, action.payload.scope).openMemoId = undefined;
    },
  },
});

export const MemoWorkspaceActions = memoWorkspaceSlice.actions;
export const memoWorkspaceReducer = {
  [memoWorkspaceSlice.name]: persistReducer({ key: memoWorkspaceSlice.name, storage }, memoWorkspaceSlice.reducer),
};
