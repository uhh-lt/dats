import { createJobQueries } from "@core/job";
import { JobService } from "@api/services/JobService";

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
  job: createJobQueries("export", (jobId) => JobService.getExportJobById({ jobId })),
};
