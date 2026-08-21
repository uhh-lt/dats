import { useAuth } from "@core/auth";
import { getRouteApi } from "@tanstack/react-router";
import { useCallback } from "react";
import { MemoWorkspace } from "./_components/MemoWorkspace";

const routeApi = getRouteApi("/_auth/project/$projectId/logbook");

export function LogbookView() {
  const { user } = useAuth();
  const projectId = routeApi.useParams({ select: (params) => params.projectId });
  const selectedMemoId = routeApi.useSearch({ select: (search) => search.memoId });
  const navigate = routeApi.useNavigate();
  const handleSelectMemo = useCallback(
    (memoId?: number) => {
      navigate({ search: memoId ? { memoId } : {} });
    },
    [navigate],
  );

  if (!user) return null;
  return (
    <MemoWorkspace
      projectId={projectId}
      userId={user.id}
      selectedMemoId={selectedMemoId}
      onSelectMemo={handleSelectMemo}
    />
  );
}
