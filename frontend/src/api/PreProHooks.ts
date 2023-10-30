import { useQuery } from "@tanstack/react-query";
import { PreProProjectStatus, PreproService, PreprocessingJobRead, BackgroundJobStatus } from "./openapi";
import { QueryKey } from "./QueryKey";

const useGetPreProProjectStatus = (projectId: number) =>
  useQuery<PreProProjectStatus, Error>([QueryKey.PREPRO_PROJECT_STATUS, projectId], () =>
    PreproService.getProjectPreproStatus({ projId: projectId }),
  );

const abortPreProJob = (preProJobId: string) => PreproService.abortPreproJob({ preproJobId: preProJobId });

const usePollPreProProjectStatus = (projectId: number) =>
  useQuery<PreProProjectStatus, Error>(
    [QueryKey.PREPRO_PROJECT_STATUS, projectId],
    () => PreproService.getProjectPreproStatus({ projId: projectId }),
    {
      refetchInterval(data, _) {
        if (!data) {
          return 1000;
        }
        if (data.num_sdocs_total > data.num_sdocs_finished) {
          return 1000;
        }
        return false;
      },
    },
  );

const usePollPreProJob = (preProJobId: string | undefined, initialData: PreprocessingJobRead | undefined) => {
  return useQuery<PreprocessingJobRead, Error>(
    [QueryKey.PREPRO_JOB, preProJobId],
    () =>
      PreproService.getPreproJob({
        preproJobId: preProJobId!,
      }),
    {
      enabled: !!preProJobId,
      refetchInterval(data, query) {
        if (!data) {
          return 1000;
        }
        if (data.status) {
          switch (data.status) {
            case BackgroundJobStatus.ERRORNEOUS:
            case BackgroundJobStatus.FINISHED:
              return false;
            case BackgroundJobStatus.WAITING:
            case BackgroundJobStatus.RUNNING:
              return 1000;
          }
        }
        return false;
      },
      initialData,
    },
  );
};

const useGetAllPreProJobs = (projectId: number | undefined) => {
  return useQuery<PreprocessingJobRead[], Error>(
    [QueryKey.PROJECT_PREPROCESSING_JOBS, projectId],
    () =>
      PreproService.getAllPreproJobs({
        projectId: projectId!,
      }),
    {
      enabled: !!projectId,
    },
  );
};

const PreProHooks = {
  useGetPreProProjectStatus,
  usePollPreProProjectStatus,
  usePollPreProJob,
  useGetAllPreProJobs,
  abortPreProJob,
};

export default PreProHooks;
