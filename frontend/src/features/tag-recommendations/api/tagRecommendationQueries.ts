import { TagRecommendationService } from "@api/services/TagRecommendationService";
import type { MlJobRead } from "@models/MlJobRead";
import { queryOptions, skipToken } from "@tanstack/react-query";

/**
 * Query factory for tag recommendations.
 *
 *   tagRecommendationQueries.all()                   ["tagRecommendation"]
 *   tagRecommendationQueries.jobsByProject(pid)      ["tagRecommendation", "jobs", pid]
 *   tagRecommendationQueries.byJob(mlJobId)          ["tagRecommendation", "job", mlJobId]
 */
export const tagRecommendationQueries = {
  all: () => ["tagRecommendation"] as const,

  // the tag recommendation jobs of a project
  jobsByProjectScope: () => [...tagRecommendationQueries.all(), "jobs"] as const,
  jobsByProject: (projectId: number | undefined) =>
    queryOptions({
      queryKey: [...tagRecommendationQueries.jobsByProjectScope(), projectId] as const,
      queryFn: projectId === undefined ? skipToken : (): MlJobRead[] => [],
      // TODO: FIX ME!!! Should call TagRecommendationService.getAllTagrecommendationJobs({ projectId })
    }),

  // the recommendations of one ML job
  byJobScope: () => [...tagRecommendationQueries.all(), "job"] as const,
  byJob: (mlJobId: string | null | undefined) =>
    queryOptions({
      queryKey: [...tagRecommendationQueries.byJobScope(), mlJobId] as const,
      queryFn: !mlJobId ? skipToken : () => TagRecommendationService.getAllTagrecommendationsFromJob({ mlJobId }),
      staleTime: 1000 * 60 * 5,
    }),
};
