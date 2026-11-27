import { JobsService } from "@api/services/JobsService";
import { createJobQueries } from "@core/job";

/**
 * Query factory for the project import (import jobs of a project).
 *
 *   importQueries.all()            ["import"]
 *   importQueries.job.byId(projectId, jobId)  ["import", "job", "project", projectId, "detail", jobId]
 *
 * Job updates arrive via websocket (JOB_UPDATED) and are written into the job caches by the cache-sync code.
 */
export const importQueries = {
  all: () => ["import"] as const,

  // the background job of this domain
  job: createJobQueries(
    "import",
    (job) => JobsService.getImportJobById(job),
    (projectId) => JobsService.getImportJobsByProject({ projectId }),
  ),
};
