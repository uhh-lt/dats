import { JobService } from "@api/services/JobService";
import { queryOptions, skipToken } from "@tanstack/react-query";

const crawlerJobQueries = {
  all: () => [...documentUploadQueries.all(), "job"] as const,
  byId: (jobId: string | null | undefined) =>
    queryOptions({
      queryKey: [...crawlerJobQueries.all(), "detail", jobId] as const,
      queryFn: !jobId ? skipToken : () => JobService.getCrawlerJobById({ jobId }),
    }),
  byProjectScope: () => [...crawlerJobQueries.all(), "project"] as const,
  byProject: (projectId: number | null | undefined) =>
    queryOptions({
      queryKey: [...crawlerJobQueries.byProjectScope(), projectId] as const,
      queryFn: !projectId ? skipToken : () => JobService.getCrawlerJobsByProject({ projectId }),
    }),
};

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
  job: crawlerJobQueries,
};
