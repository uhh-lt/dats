import { JobService } from "@api/services/JobService";
import { queryOptions, skipToken } from "@tanstack/react-query";

const exportJobQueries = {
  all: () => [...exportQueries.all(), "job"] as const,
  byId: (jobId: string | null | undefined) =>
    queryOptions({
      queryKey: [...exportJobQueries.all(), "detail", jobId] as const,
      queryFn: !jobId ? skipToken : () => JobService.getExportJobById({ jobId }),
    }),
};

/**
 * Query factory for the export (the export job).
 *
 *   exportQueries.all()            ["export"]
 *   exportQueries.job.byId(jobId)  ["export", "job", "detail", jobId]
 *
 * Job updates arrive via websocket (JOB_UPDATED) and are written into the job caches by the cache-sync code.
 */
export const exportQueries = {
  all: () => ["export"] as const,

  // the background job of this domain
  job: exportJobQueries,
};
