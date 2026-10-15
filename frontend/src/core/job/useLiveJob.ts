import { JobStatus } from "@models/JobStatus";
import { type QueryKey, type UseQueryOptions, useQuery } from "@tanstack/react-query";
import { useJobRefetchInterval } from "./useJobRefetchInterval";

/**
 * Live state of one background job: `useLiveJob(llmAssistantQueries.job.byId(jobId), initialJob)`.
 * The job is kept up to date by the cache-sync code; see useJobRefetchInterval for the fallback when the websocket is down.
 */
export const useLiveJob = <TJob extends { status: JobStatus }, TKey extends QueryKey>(
  jobOptions: UseQueryOptions<TJob, Error, TJob, TKey>,
  initialData?: TJob,
) => {
  const jobRefetchInterval = useJobRefetchInterval<TJob>();
  return useQuery({
    ...jobOptions,
    refetchInterval: jobRefetchInterval,
    initialData,
  });
};
