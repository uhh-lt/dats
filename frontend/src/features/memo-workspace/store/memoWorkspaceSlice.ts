import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import {
  initialWorkspaceState,
  WorkspacePreference,
  workspaceReducer,
  WorkspaceState,
} from "@store/generic/workspaceSlice";
import { persistReducer } from "redux-persist";
import { persistStorage } from "@store/persistStorage";

/** Memo workspace preferences add the currently-opened memo to the generic workspace preference. */
export interface MemoWorkspacePreference extends WorkspacePreference {
  /** Column widths (column id -> px) per view id. Missing entry = never resized (defaults apply). */
  columnSizing?: Record<number, Record<string, number>>;
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

const initialState: MemoWorkspaceState = initialWorkspaceState;

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
    setColumnSizing: (
      state,
      action: PayloadAction<{ scope: string; viewId: number; columnSizing: Record<string, number> }>,
    ) => {
      const workspace = getWorkspace(state, action.payload.scope);
      const { viewId, columnSizing } = action.payload;
      workspace.columnSizing = { ...workspace.columnSizing, [viewId]: columnSizing };
    },
  },
});

export const MemoWorkspaceActions = memoWorkspaceSlice.actions;
export const memoWorkspaceReducer = {
  [memoWorkspaceSlice.name]: persistReducer(
    { key: memoWorkspaceSlice.name, storage: persistStorage },
    memoWorkspaceSlice.reducer,
  ),
};
