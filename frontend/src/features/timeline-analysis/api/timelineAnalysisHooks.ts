import { useAppSelector } from "@store/storeHooks";
import { useQuery } from "@tanstack/react-query";
import { timelineAnalysisQueries } from "./timelineAnalysisQueries";

/**
 * Convenience hook for components that need a single timeline analysis by ID but have no route context.
 * For route-backed components, use useSuspenseQuery with projectTimelineAnalysisQueryOptions directly.
 */
export const useGetTimelineAnalysisById = (analysisId: number | null | undefined) => {
  const projectId = useAppSelector((state) => state.project.projectId);

  return useQuery({
    ...timelineAnalysisQueries.byProject(projectId!),
    select: (data) => (analysisId != null ? data[analysisId] : undefined),
    enabled: projectId !== undefined && analysisId != null,
  });
};

export const useGetProjectTimelineAnalysisList = () => {
  const projectId = useAppSelector((state) => state.project.projectId);

  return useQuery({
    ...timelineAnalysisQueries.byProject(projectId!),
    select: (data) => Object.values(data),
    enabled: projectId !== undefined,
  });
};
