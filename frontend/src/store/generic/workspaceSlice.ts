import { Draft, PayloadAction } from "@reduxjs/toolkit";

/** Per-scope workspace preferences (a scope is typically `${userId}:${projectId}`). */
export interface WorkspacePreference {
  lastViewId?: number;
}

export interface WorkspaceState {
  workspaces: Record<string, WorkspacePreference>;
}

export const initialWorkspaceState: WorkspaceState = { workspaces: {} };

const getWorkspace = (state: WorkspaceState, scope: string): WorkspacePreference => {
  state.workspaces[scope] ??= {};
  return state.workspaces[scope];
};

/**
 * Generic workspace preference reducers (last-active view), mirroring the
 * `tableSlice`/`filterSlice` composition pattern. Each entity workspace (memo,
 * span annotation, ...) spreads these into its own persisted slice and adds
 * entity-specific state/reducers on top.
 */
export const workspaceReducer = {
  rememberView: (state: Draft<WorkspaceState>, action: PayloadAction<{ scope: string; viewId?: number }>) => {
    getWorkspace(state, action.payload.scope).lastViewId = action.payload.viewId;
  },
};
