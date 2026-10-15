import { createJobQueries } from "@core/job";
import { ImportService } from "@api/services/ImportService";

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
  job: createJobQueries(
    "import",
    (jobId) => ImportService.getImportJob({ importJobId: jobId }),
    (projectId) => ImportService.getAllImportJobs({ projectId }),
  ),
};
