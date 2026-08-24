import { Draft, PayloadAction } from "@reduxjs/toolkit";

/** Per-scope workspace preferences (a scope is typically `${userId}:${projectId}`). */
export interface WorkspacePreference {
  lastViewId?: number;
  /** Expanded group keys per view id. Missing entry = never touched (defaults apply). */
  expandedGroups?: Record<number, string[]>;
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
  toggleGroup: (
    state: Draft<WorkspaceState>,
    action: PayloadAction<{
      scope: string;
      viewId: number;
      groupKey: string;
      expanded: boolean;
      allGroupKeys: string[];
    }>,
  ) => {
    const workspace = getWorkspace(state, action.payload.scope);
    const { viewId, groupKey, expanded, allGroupKeys } = action.payload;
    // Missing entry means "never touched": the first group is expanded by default.
    const current = workspace.expandedGroups?.[viewId] ?? allGroupKeys.slice(0, 1);
    const next = expanded ? [...new Set([...current, groupKey])] : current.filter((key) => key !== groupKey);
    workspace.expandedGroups = { ...workspace.expandedGroups, [viewId]: next };
  },
};
