import { ImportService } from "@api/services/ImportService";
import { queryOptions, skipToken } from "@tanstack/react-query";

const importJobQueries = {
  all: () => [...importQueries.all(), "job"] as const,
  byId: (jobId: string | null | undefined) =>
    queryOptions({
      queryKey: [...importJobQueries.all(), "detail", jobId] as const,
      queryFn: !jobId ? skipToken : () => ImportService.getImportJob({ importJobId: jobId }),
    }),
  byProjectScope: () => [...importJobQueries.all(), "project"] as const,
  byProject: (projectId: number | null | undefined) =>
    queryOptions({
      queryKey: [...importJobQueries.byProjectScope(), projectId] as const,
      queryFn: !projectId ? skipToken : () => ImportService.getAllImportJobs({ projectId }),
    }),
};

/**
 * Query factory for the project import (import jobs of a project).
 *
 *   importQueries.all()            ["import"]
 *   importQueries.job.byId(jobId)  ["import", "job", "detail", jobId]
 *
 * Job updates arrive via websocket (JOB_UPDATED) and are written into the job caches by the cache-sync code.
 */
export const importQueries = {
  all: () => ["import"] as const,

  // the background job of this domain
  job: importJobQueries,
};
