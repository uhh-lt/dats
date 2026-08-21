import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { workspaceReducer, WorkspaceState } from "@store/generic/workspaceSlice";
import { persistReducer } from "redux-persist";
import createWebStorage from "redux-persist/es/storage/createWebStorage";

const storage = createWebStorage("local");

/** A recently-opened memo shown in the workspace's "Recents" list. */
export interface RecentMemo {
  id: number;
  title: string;
  updated: string;
  icon?: string | null;
}

/** Memo workspace preferences add a recents list to the generic workspace preference. */
export interface MemoWorkspacePreference {
  lastViewId?: number;
  recents: RecentMemo[];
}

export interface MemoWorkspaceState extends WorkspaceState {
  workspaces: Record<string, MemoWorkspacePreference>;
}

const getWorkspace = (state: MemoWorkspaceState, scope: string): MemoWorkspacePreference => {
  state.workspaces[scope] ??= { recents: [] };
  return state.workspaces[scope];
};

const initialState: MemoWorkspaceState = { workspaces: {} };

const memoWorkspaceSlice = createSlice({
  name: "memoWorkspace",
  initialState,
  reducers: {
    ...workspaceReducer,
    rememberRecent: (state, action: PayloadAction<{ scope: string; recent: RecentMemo }>) => {
      const workspace = getWorkspace(state, action.payload.scope);
      const kept = workspace.recents.filter((recent) => recent.id !== action.payload.recent.id);
      workspace.recents = [action.payload.recent, ...kept].slice(0, 10);
    },
    removeRecent: (state, action: PayloadAction<{ scope: string; recentId: number }>) => {
      const workspace = getWorkspace(state, action.payload.scope);
      workspace.recents = workspace.recents.filter((recent) => recent.id !== action.payload.recentId);
    },
  },
});

export const MemoWorkspaceActions = memoWorkspaceSlice.actions;
export const memoWorkspaceReducer = {
  [memoWorkspaceSlice.name]: persistReducer({ key: memoWorkspaceSlice.name, storage }, memoWorkspaceSlice.reducer),
};
