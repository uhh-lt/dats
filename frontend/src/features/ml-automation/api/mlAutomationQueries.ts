import { JobService } from "@api/services/JobService";
import { queryOptions, skipToken } from "@tanstack/react-query";

const mlJobQueries = {
  all: () => [...mlAutomationQueries.all(), "job"] as const,
  byId: (jobId: string | null | undefined) =>
    queryOptions({
      queryKey: [...mlJobQueries.all(), "detail", jobId] as const,
      queryFn: !jobId ? skipToken : () => JobService.getMlJobById({ jobId }),
    }),
  byProjectScope: () => [...mlJobQueries.all(), "project"] as const,
  byProject: (projectId: number) =>
    queryOptions({
      queryKey: [...mlJobQueries.byProjectScope(), projectId] as const,
      queryFn: () => JobService.getMlJobsByProject({ projectId }),
    }),
};

/**
 * Query factory for the ML automation (ML jobs of a project).
 *
 *   mlAutomationQueries.all()            ["mlAutomation"]
 *   mlAutomationQueries.job.byId(jobId)  ["mlAutomation", "job", "detail", jobId]
 *
 * Job updates arrive via websocket (JOB_UPDATED) and are written into the job caches by the cache-sync code.
 */
export const mlAutomationQueries = {
  all: () => ["mlAutomation"] as const,

  // the background job of this domain
  job: mlJobQueries,
};
