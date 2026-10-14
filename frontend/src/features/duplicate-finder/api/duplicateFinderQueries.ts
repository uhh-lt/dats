import { JobService } from "@api/services/JobService";
import { queryOptions, skipToken } from "@tanstack/react-query";

const duplicateFinderJobQueries = {
  all: () => [...duplicateFinderQueries.all(), "job"] as const,
  byId: (jobId: string | null | undefined) =>
    queryOptions({
      queryKey: [...duplicateFinderJobQueries.all(), "detail", jobId] as const,
      queryFn: !jobId ? skipToken : () => JobService.getDuplicateFinderJobById({ jobId }),
    }),
};

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
  job: duplicateFinderJobQueries,
};
