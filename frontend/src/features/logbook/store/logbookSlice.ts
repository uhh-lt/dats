import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { persistReducer } from "redux-persist";
import createWebStorage from "redux-persist/es/storage/createWebStorage";

const storage = createWebStorage("local");

export interface RecentMemo {
  id: number;
  title: string;
  icon?: string | null;
  updated: string;
}

interface WorkspacePreference {
  lastViewId?: number;
  recents: RecentMemo[];
}

interface LogbookState {
  workspaces: Record<string, WorkspacePreference>;
}

const initialState: LogbookState = { workspaces: {} };

const getWorkspace = (state: LogbookState, scope: string) => {
  state.workspaces[scope] ??= { recents: [] };
  return state.workspaces[scope];
};

const logbookSlice = createSlice({
  name: "logbook",
  initialState,
  reducers: {
    rememberView: (state, action: PayloadAction<{ scope: string; viewId?: number }>) => {
      getWorkspace(state, action.payload.scope).lastViewId = action.payload.viewId;
    },
    rememberMemo: (state, action: PayloadAction<{ scope: string; memo: RecentMemo }>) => {
      const workspace = getWorkspace(state, action.payload.scope);
      workspace.recents = [
        action.payload.memo,
        ...workspace.recents.filter((memo) => memo.id !== action.payload.memo.id),
      ].slice(0, 10);
    },
    removeMemo: (state, action: PayloadAction<{ scope: string; memoId: number }>) => {
      const workspace = getWorkspace(state, action.payload.scope);
      workspace.recents = workspace.recents.filter((memo) => memo.id !== action.payload.memoId);
    },
  },
});

export const LogbookActions = logbookSlice.actions;
export const logbookReducer = {
  [logbookSlice.name]: persistReducer({ key: logbookSlice.name, storage }, logbookSlice.reducer),
};
