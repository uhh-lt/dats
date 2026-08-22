import { MemoHooks } from "@api/hooks/MemoHooks";
import { SidebarContentLayout } from "@components/content-layouts";
import { useAuth } from "@core/auth";
import { MemoEditorPane } from "@core/memo";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { Box, Button } from "@mui/material";
import { useAppDispatch, useAppSelector } from "@store/storeHooks";
import { getRouteApi } from "@tanstack/react-router";
import { useCallback, useEffect } from "react";
import { MemoWorkspaceActions } from "../../store/memoWorkspaceSlice";
import { MemoWorkspace } from "./_components/MemoWorkspace";
import { MemoWorkspaceSidebar } from "./_components/MemoWorkspaceSidebar";

const routeApi = getRouteApi("/_auth/project/$projectId/memo-workspace");

export function MemoWorkspaceView() {
  const { user } = useAuth();
  const projectId = routeApi.useParams({ select: (params) => params.projectId });
  const dispatch = useAppDispatch();

  const scope = user ? `${user.id}:${projectId}` : "";
  const openMemoId = useAppSelector((state) => state.memoWorkspace.workspaces[scope]?.openMemoId);

  const memo = MemoHooks.useGetMemo(openMemoId);
  const { mutate: recordRecent } = MemoHooks.useRecordRecentMemo();

  // Record the opened memo as recently-opened (server-driven recents).
  useEffect(() => {
    if (!memo.data) return;
    recordRecent({ memoId: memo.data.id, projectId });
  }, [recordRecent, projectId, memo.data]);

  const handleBack = useCallback(() => {
    dispatch(MemoWorkspaceActions.closeMemo({ scope }));
  }, [dispatch, scope]);

  if (!user) return null;
  return (
    <SidebarContentLayout
      sidebar={<MemoWorkspaceSidebar projectId={projectId} scope={scope} />}
      content={
        <Box sx={{ height: "100%", bgcolor: "background.paper" }}>
          {openMemoId === undefined ? (
            <MemoWorkspace projectId={projectId} userId={user.id} />
          ) : (
            <MemoEditorPane
              memoId={openMemoId}
              onDelete={handleBack}
              renderToolbar={() => (
                <Button startIcon={<ArrowBackIcon />} onClick={handleBack}>
                  Back to workspace
                </Button>
              )}
            />
          )}
        </Box>
      }
    />
  );
}
