import { createJobQueries } from "@core/job";
import { JobService } from "@api/services/JobService";

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
  job: createJobQueries(
    "mlAutomation",
    (jobId) => JobService.getMlJobById({ jobId }),
    (projectId) => JobService.getMlJobsByProject({ projectId }),
  ),
};
