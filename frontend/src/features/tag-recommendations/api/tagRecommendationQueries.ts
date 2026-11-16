import { JobService } from "@api/services/JobService";
import { TagRecommendationService } from "@api/services/TagRecommendationService";
import { createJobQueries } from "@core/job";
import { queryOptions, skipToken } from "@tanstack/react-query";

/**
 * Query factory for tag recommendations.
 *
 *   tagRecommendationQueries.all()                      ["tagRecommendation"]
 *   tagRecommendationQueries.job.byId(jobId)            ["tagRecommendation", "job", "detail", jobId]
 *   tagRecommendationQueries.job.byProject(projectId)   ["tagRecommendation", "job", "project", projectId]
 *   tagRecommendationQueries.byJob(mlJobId)             ["tagRecommendation", "recommendations", mlJobId]
 *
 * Job updates arrive via websocket (JOB_UPDATED) and are written into the job caches by the cache-sync code.
 */
export const tagRecommendationQueries = {
  all: () => ["tagRecommendation"] as const,

  // the tag recommendation jobs
  job: createJobQueries(
    "tagRecommendation",
    (jobId) => JobService.getTagRecommendationJobById({ jobId }),
    (projectId) => JobService.getTagRecommendationJobsByProject({ projectId }),
  ),

  // the recommendations of one job
  byJobScope: () => [...tagRecommendationQueries.all(), "recommendations"] as const,
  byJob: (mlJobId: string | null | undefined) =>
    queryOptions({
      queryKey: [...tagRecommendationQueries.byJobScope(), mlJobId] as const,
      queryFn: !mlJobId ? skipToken : () => TagRecommendationService.getAllTagrecommendationsFromJob({ mlJobId }),
      staleTime: 1000 * 60 * 5,
    }),
};
