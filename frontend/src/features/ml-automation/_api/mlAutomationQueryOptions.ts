import { QueryKey } from "@api/hooks/QueryKey";
import { JobStatus } from "@api/models/JobStatus";
import { MlJobRead } from "@api/models/MlJobRead";
import { queryClient } from "@api/queryClient";
import { JobService } from "@api/services/JobService";
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

export const usePollMLJob = (mlJobId: string | undefined, initialData: MlJobRead | undefined) => {
  return useQuery<MlJobRead, Error>({
    queryKey: [QueryKey.ML_JOB, mlJobId],
    queryFn: () =>
      JobService.getMlJobById({
        jobId: mlJobId!,
      }),
    enabled: !!mlJobId,
    refetchInterval: (query) => {
      if (query.state.error) {
        return false;
      }
      if (!query.state.data) {
        return 1000;
      }
      switch (query.state.data.status) {
        case JobStatus.CANCELED:
        case JobStatus.FAILED:
        case JobStatus.FINISHED:
        case JobStatus.STOPPED:
          return false;
        case JobStatus.DEFERRED:
        case JobStatus.QUEUED:
        case JobStatus.SCHEDULED:
        case JobStatus.STARTED:
          return 1000;
        default:
          return false;
      }
    },
    initialData,
  });
};
