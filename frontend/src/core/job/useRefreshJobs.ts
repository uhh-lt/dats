import { useIsFetching, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import type { JobQueriesWithoutList } from "./createJobQueries";

/**
 * The refresh of a job list: `useRefreshJobs(llmAssistantQueries.job, projectId)` refetches the list and every job
 * that its items follow with useLiveJob (`xQueries.job.byId`), i.e. all queries of the job type in the project, which
 * may have missed an update.
 */
export const useRefreshJobs = <TJob>(jobQueries: JobQueriesWithoutList<TJob>, projectId: number | undefined) => {
  const queryClient = useQueryClient();
  const isFetching = useIsFetching({ queryKey: jobQueries.projectScope(projectId) }) > 0;
  const refresh = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: jobQueries.projectScope(projectId) });
  }, [queryClient, jobQueries, projectId]);
  return { refresh, isFetching };
};
