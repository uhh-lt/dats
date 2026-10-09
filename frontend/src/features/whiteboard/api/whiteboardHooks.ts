import { useAppSelector } from "@store/storeHooks";
import { useQuery } from "@tanstack/react-query";
import { whiteboardQueries } from "./whiteboardQueries";

/**
 * Convenience hook for components that need a single whiteboard by ID but have no route context
 * (e.g., the tab bar navigation). Reads projectId from Redux store.
 * For components that DO have route context, use useSuspenseQuery with projectWhiteboardsQueryOptions directly.
 */
export const useGetWhiteboardById = (whiteboardId: number | null | undefined) => {
  const projectId = useAppSelector((state) => state.project.projectId);
  return useQuery({
    ...whiteboardQueries.byProject(projectId!),
    select: (data) => (whiteboardId != null ? data[whiteboardId] : undefined),
    enabled: projectId !== undefined && whiteboardId != null,
  });
};
