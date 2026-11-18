import { useMutation } from "@tanstack/react-query";
import type { JobQueriesWithActions } from "./createJobQueries";

// Stops a started job through the generated abort endpoint of its type; its STOPPED state arrives as a job update.
const useAbortJob = (jobQueries: JobQueriesWithActions) =>
  useMutation({
    mutationKey: [...jobQueries.all(), "abortJob"],
    mutationFn: jobQueries.actions.abort,
    meta: {
      successMessage: (stopped: boolean) => (stopped ? "Stopping the job" : "The job is not running anymore"),
    },
  });

// Requeues a failed or stopped job through the generated retry endpoint of its type; its state arrives as job updates.
const useRetryJob = (jobQueries: JobQueriesWithActions) =>
  useMutation({
    mutationKey: [...jobQueries.all(), "retryJob"],
    mutationFn: jobQueries.actions.retry,
    meta: {
      successMessage: (requeued: boolean) => (requeued ? "Retrying the job" : "The job cannot be retried anymore"),
    },
  });

export const JobHooks = { useAbortJob, useRetryJob };
