import { EntityWorkspace } from "@core/workspace";
import { useAppDispatch, useAppSelector } from "@store/storeHooks";
import { useCallback, useMemo } from "react";
import { MemoWorkspaceActions } from "../../../store/memoWorkspaceSlice";
import { createMemoWorkspaceConfig } from "./memoWorkspaceConfig";

interface MemoWorkspaceProps {
  projectId: number;
  userId: number;
}

export function MemoWorkspace({ projectId, userId }: MemoWorkspaceProps) {
  const scope = `${userId}:${projectId}`;
  const dispatch = useAppDispatch();
  const preferences = useAppSelector((state) => state.memoWorkspace.workspaces[scope]);

  const config = useMemo(() => createMemoWorkspaceConfig(userId), [userId]);

  const handleRememberView = useCallback(
    (viewId?: number) => {
      dispatch(MemoWorkspaceActions.rememberView({ scope, viewId }));
    },
    [dispatch, scope],
  );

  const handleSelectMemo = useCallback(
    (memoId: number) => {
      dispatch(MemoWorkspaceActions.openMemo({ scope, memoId }));
    },
    [dispatch, scope],
  );

  const handleToggleGroup = useCallback(
    (viewId: number, groupKey: string, expanded: boolean, allGroupKeys: string[]) => {
      dispatch(MemoWorkspaceActions.toggleGroup({ scope, viewId, groupKey, expanded, allGroupKeys }));
    },
    [dispatch, scope],
  );

  const handleColumnSizingChange = useCallback(
    (viewId: number, columnSizing: Record<string, number>) => {
      dispatch(MemoWorkspaceActions.setColumnSizing({ scope, viewId, columnSizing }));
    },
    [dispatch, scope],
  );

  return (
    <EntityWorkspace
      projectId={projectId}
      config={config}
      onSelect={handleSelectMemo}
      lastViewId={preferences?.lastViewId}
      onRememberView={handleRememberView}
      expandedGroups={preferences?.expandedGroups}
      onToggleGroup={handleToggleGroup}
      columnSizing={preferences?.columnSizing}
      onColumnSizingChange={handleColumnSizingChange}
    />
  );
}
