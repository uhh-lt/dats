import { TimelineAnalysisService } from "@api/services/TimelineAnalysisService";
import type { TimelineAnalysisRead } from "@models/TimelineAnalysisRead";
import { queryOptions, skipToken } from "@tanstack/react-query";

export type TimelineMap = Record<number, TimelineAnalysisRead>;

const fetchTimelineAnalyses = async (projectId: number) => {
  const data = await TimelineAnalysisService.getByProject({ projectId });
  return data.reduce<TimelineMap>((acc, timeline) => {
    acc[timeline.id] = timeline;
    return acc;
  }, {});
};

/**
 * Query factory for timeline analyses.
 *
 *   timelineAnalysisQueries.all()                  ["timelineAnalyses"]
 *   timelineAnalysisQueries.byProject(projectId)   ["timelineAnalyses", "project", projectId]
 */
export const timelineAnalysisQueries = {
  all: () => ["timelineAnalyses"] as const,

  // all timeline analyses of a project, as a map by id
  byProjectScope: () => [...timelineAnalysisQueries.all(), "project"] as const,
  byProject: (projectId: number | undefined) =>
    queryOptions({
      queryKey: [...timelineAnalysisQueries.byProjectScope(), projectId] as const,
      queryFn: projectId === undefined ? skipToken : () => fetchTimelineAnalyses(projectId),
      staleTime: 1000 * 60 * 5,
    }),
  // same as `byProject`, for useSuspenseQuery / route loaders (no skipToken)
  byProjectRequired: (projectId: number) =>
    queryOptions({
      queryKey: [...timelineAnalysisQueries.byProjectScope(), projectId] as const,
      queryFn: () => fetchTimelineAnalyses(projectId),
      staleTime: 1000 * 60 * 5,
    }),
};
