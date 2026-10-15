import { createJobQueries } from "@core/job";
import { JobService } from "@api/services/JobService";

/**
 * Query factory for the duplicate finder (the duplicate finder job).
 *
 *   duplicateFinderQueries.all()            ["duplicateFinder"]
 *   duplicateFinderQueries.job.byId(jobId)  ["duplicateFinder", "job", "detail", jobId]
 *
 * Job updates arrive via websocket (JOB_UPDATED) and are written into the job caches by the cache-sync code.
 */
export const duplicateFinderQueries = {
  all: () => ["duplicateFinder"] as const,

  // the background job of this domain
  job: createJobQueries("duplicateFinder", (jobId) => JobService.getDuplicateFinderJobById({ jobId })),
};
