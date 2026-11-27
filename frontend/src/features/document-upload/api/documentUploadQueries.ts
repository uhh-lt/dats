import { createJobQueries } from "@core/job";
import { JobsService } from "@api/services/JobsService";

/**
 * Query factory for the document upload (crawler jobs of a project).
 *
 *   documentUploadQueries.all()            ["documentUpload"]
 *   documentUploadQueries.job.byId(projectId, jobId)  ["documentUpload", "job", "project", projectId, "detail", jobId]
 *
 * Job updates arrive via websocket (JOB_UPDATED) and are written into the job caches by the cache-sync code.
 */
export const documentUploadQueries = {
  all: () => ["documentUpload"] as const,

  // the background job of this domain
  job: createJobQueries(
    "documentUpload",
    (job) => JobsService.getCrawlerJobById(job),
    (projectId) => JobsService.getCrawlerJobsByProject({ projectId }),
    {
      abort: (job) => JobsService.abortCrawlerJob(job),
      retry: (job) => JobsService.retryCrawlerJob(job),
    },
  ),
};
