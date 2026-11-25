import { JobService } from "@api/services/JobService";
import { TagRecommendationService } from "@api/services/TagRecommendationService";
import { createJobQueries } from "@core/job";
import { queryOptions, skipToken } from "@tanstack/react-query";

/**
 * Query factory for tag recommendations.
 *
 *   tagRecommendationQueries.all()                      ["tagRecommendation"]
 *   tagRecommendationQueries.job.byId(projectId, jobId) ["tagRecommendation", "job", "detail", jobId, projectId]
 *   tagRecommendationQueries.job.byProject(projectId)   ["tagRecommendation", "job", "project", projectId]
 *   tagRecommendationQueries.byJob(projectId, jobId)    ["tagRecommendation", "recommendations", jobId, projectId]
 *
 * Job updates arrive via websocket (JOB_UPDATED) and are written into the job caches by the cache-sync code.
 */
export const tagRecommendationQueries = {
  all: () => ["tagRecommendation"] as const,

  // the tag recommendation jobs
  job: createJobQueries(
    "tagRecommendation",
    (job) => JobService.getTagRecommendationJobById(job),
    (projectId) => JobService.getTagRecommendationJobsByProject({ projectId }),
  ),

  // the recommendations of one job
  byJobScope: () => [...tagRecommendationQueries.all(), "recommendations"] as const,
  byJobOfJobScope: (jobId: string) => [...tagRecommendationQueries.byJobScope(), jobId] as const,
  byJob: (projectId: number, jobId: string | null | undefined) =>
    queryOptions({
      queryKey: [...tagRecommendationQueries.byJobScope(), jobId, projectId] as const,
      queryFn: !jobId
        ? skipToken
        : () => TagRecommendationService.getAllTagrecommendationsFromJob({ projectId, jobId }),
      staleTime: 1000 * 60 * 5,
    }),
};
