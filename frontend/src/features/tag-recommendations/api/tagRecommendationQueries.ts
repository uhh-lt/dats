import { JobsService } from "@api/services/JobsService";
import { createJobQueries } from "@core/job";
import { queryOptions, skipToken } from "@tanstack/react-query";

/**
 * Query factory for tag recommendations.
 *
 *   tagRecommendationQueries.all()                       ["tagRecommendation"]
 *   tagRecommendationQueries.projectScope(projectId)     ["tagRecommendation", "project", projectId]
 *   tagRecommendationQueries.job.byId(projectId, jobId)  ["tagRecommendation", "job", "project", projectId, "detail", jobId]
 *   tagRecommendationQueries.job.byProject(projectId)    ["tagRecommendation", "job", "project", projectId]
 *   tagRecommendationQueries.byJob(projectId, jobId)     ["tagRecommendation", "project", projectId, "recommendations", jobId]
 *
 * Job updates arrive via websocket (JOB_UPDATED) and are written into the job caches by the cache-sync code.
 */
export const tagRecommendationQueries = {
  all: () => ["tagRecommendation"] as const,
  // prefix of all tag recommendation queries of one project (the jobs have their own root, `job.all()`)
  projectScope: (projectId: number) => [...tagRecommendationQueries.all(), "project", projectId] as const,

  // the tag recommendation jobs
  job: createJobQueries(
    "tagRecommendation",
    (job) => JobsService.getTagRecommendationJobById(job),
    (projectId) => JobsService.getTagRecommendationJobsByProject({ projectId }),
  ),

  // the recommendations of one job
  byJobScope: (projectId: number) => [...tagRecommendationQueries.projectScope(projectId), "recommendations"] as const,
  byJob: (projectId: number, jobId: string | null | undefined) =>
    queryOptions({
      queryKey: [...tagRecommendationQueries.byJobScope(projectId), jobId] as const,
      queryFn: !jobId ? skipToken : () => JobsService.getAllTagrecommendationsFromJob({ projectId, jobId }),
      staleTime: 1000 * 60 * 5,
    }),
};
