import { QueryKey } from "@api/hooks/QueryKey";
import { useJobRefetchInterval } from "@api/hooks/jobPolling";
import { queryClient } from "@api/queryClient";
import { JobService } from "@api/services/JobService";
import { MlJobRead } from "@models/MlJobRead";
import { queryOptions, useMutation, useQuery } from "@tanstack/react-query";

export const projectMLJobsQueryOptions = (projectId: number) =>
  queryOptions({
    queryKey: [QueryKey.PROJECT_ML_JOBS, projectId],
    queryFn: () =>
      JobService.getMlJobsByProject({
        projectId,
      }),
  });

export const useStartMLJob = () =>
  useMutation({
    mutationFn: JobService.startMlJob,
    onSuccess: (job) => {
      // Force refetch of all ML jobs when adding a new one.
      queryClient.invalidateQueries({ queryKey: [QueryKey.PROJECT_ML_JOBS, job.input.project_id] });
    },
    meta: {
      successMessage: (data: MlJobRead) => `Started ML Job as a new background task (ID: ${data.job_id})`,
    },
  });

export const useLiveMLJob = (mlJobId: string | undefined, initialData: MlJobRead | undefined) => {
  const jobRefetchInterval = useJobRefetchInterval<MlJobRead>();
  return useQuery<MlJobRead, Error>({
    queryKey: [QueryKey.ML_JOB, mlJobId],
    queryFn: () =>
      JobService.getMlJobById({
        jobId: mlJobId!,
      }),
    enabled: !!mlJobId,
    refetchInterval: jobRefetchInterval,
    initialData,
  });
};
