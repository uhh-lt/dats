import { SidebarContentLayout } from "@components/content-layouts";
import { useAuth } from "@core/auth";
import { getRouteApi } from "@tanstack/react-router";
import { MemoWorkspaceSidebar } from "../../_components/MemoWorkspaceSidebar";
import { MemoWorkspace } from "./_components/MemoWorkspace";

const routeApi = getRouteApi("/_auth/project/$projectId/memo-workspace");

export function MemoWorkspaceView() {
  const { user } = useAuth();
  const projectId = routeApi.useParams({ select: (params) => params.projectId });

  if (!user) return null;
  return (
    <SidebarContentLayout
      sidebar={<MemoWorkspaceSidebar projectId={projectId} scope={`${user.id}:${projectId}`} />}
      content={<MemoWorkspace projectId={projectId} userId={user.id} />}
    />
  );
}
