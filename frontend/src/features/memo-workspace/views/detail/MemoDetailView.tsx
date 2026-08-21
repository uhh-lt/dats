import { MemoHooks } from "@api/hooks/MemoHooks";
import { SidebarContentLayout } from "@components/content-layouts";
import { useAuth } from "@core/auth";
import { MemoEditorPane } from "@core/memo";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { Button } from "@mui/material";
import { useAppDispatch } from "@store/storeHooks";
import { getRouteApi } from "@tanstack/react-router";
import { useCallback, useEffect } from "react";
import { MemoWorkspaceSidebar } from "../../_components/MemoWorkspaceSidebar";
import { MemoWorkspaceActions } from "../../store/memoWorkspaceSlice";

const routeApi = getRouteApi("/_auth/project/$projectId/memo-workspace/detail");

export function MemoDetailView() {
  const { user } = useAuth();
  const projectId = routeApi.useParams({ select: (params) => params.projectId });
  const memoId = routeApi.useSearch({ select: (search) => search.memoId });
  const navigate = routeApi.useNavigate();
  const dispatch = useAppDispatch();

  const memo = MemoHooks.useGetMemo(memoId);

  // Remember the opened memo in the recents list.
  useEffect(() => {
    if (!user || !memo.data) return;
    dispatch(
      MemoWorkspaceActions.rememberRecent({
        scope: `${user.id}:${projectId}`,
        recent: {
          id: memo.data.id,
          title: memo.data.title,
          icon: memo.data.icon,
          updated: memo.data.updated,
        },
      }),
    );
  }, [dispatch, user, projectId, memo.data]);

  const handleBack = useCallback(() => {
    navigate({ to: "/project/$projectId/memo-workspace", params: { projectId }, search: {} });
  }, [navigate, projectId]);

  if (!user || memoId === undefined) return null;
  return (
    <SidebarContentLayout
      sidebar={<MemoWorkspaceSidebar projectId={projectId} scope={`${user.id}:${projectId}`} />}
      content={
        <MemoEditorPane
          memoId={memoId}
          onDelete={handleBack}
          renderToolbar={() => (
            <Button startIcon={<ArrowBackIcon />} onClick={handleBack}>
              Back to workspace
            </Button>
          )}
        />
      }
    />
  );
}
