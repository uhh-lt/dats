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

  return (
    <EntityWorkspace
      projectId={projectId}
      config={config}
      onSelect={handleSelectMemo}
      lastViewId={preferences?.lastViewId}
      onRememberView={handleRememberView}
    />
  );
}
