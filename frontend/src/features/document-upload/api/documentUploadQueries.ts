import { createJobQueries } from "@core/job";
import { JobService } from "@api/services/JobService";

/**
 * Query factory for the document upload (crawler jobs of a project).
 *
 *   documentUploadQueries.all()            ["documentUpload"]
 *   documentUploadQueries.job.byId(projectId, jobId)  ["documentUpload", "job", "detail", jobId, projectId]
 *
 * Job updates arrive via websocket (JOB_UPDATED) and are written into the job caches by the cache-sync code.
 */
export const documentUploadQueries = {
  all: () => ["documentUpload"] as const,

  // the background job of this domain
  job: createJobQueries(
    "documentUpload",
    (job) => JobService.getCrawlerJobById(job),
    (projectId) => JobService.getCrawlerJobsByProject({ projectId }),
    {
      abort: (job) => JobService.abortCrawlerJob(job),
      retry: (job) => JobService.retryCrawlerJob(job),
    },
  ),
};
