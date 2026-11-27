import { createJobQueries } from "@core/job";
import { JobsService } from "@api/services/JobsService";

/**
 * Query factory for the export (the export job).
 *
 *   exportQueries.all()            ["export"]
 *   exportQueries.job.byId(projectId, jobId)  ["export", "job", "project", projectId, "detail", jobId]
 *
 * Job updates arrive via websocket (JOB_UPDATED) and are written into the job caches by the cache-sync code.
 */
export const exportQueries = {
  all: () => ["export"] as const,

  // the background job of this domain
  job: createJobQueries("export", (job) => JobsService.getExportJobById(job)),
};
