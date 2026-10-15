import { createJobQueries } from "@core/job";
import { JobService } from "@api/services/JobService";

/**
 * Query factory for the document upload (crawler jobs of a project).
 *
 *   documentUploadQueries.all()            ["documentUpload"]
 *   documentUploadQueries.job.byId(jobId)  ["documentUpload", "job", "detail", jobId]
 *
 * Job updates arrive via websocket (JOB_UPDATED) and are written into the job caches by the cache-sync code.
 */
export const documentUploadQueries = {
  all: () => ["documentUpload"] as const,

  // the background job of this domain
  job: createJobQueries(
    "documentUpload",
    (jobId) => JobService.getCrawlerJobById({ jobId }),
    (projectId) => JobService.getCrawlerJobsByProject({ projectId }),
  ),
};
