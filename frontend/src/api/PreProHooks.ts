import { useQuery } from "@tanstack/react-query";
import { QueryKey } from "./QueryKey.ts";
import { BackgroundJobStatus } from "./openapi/models/BackgroundJobStatus.ts";
import { PreProProjectStatus } from "./openapi/models/PreProProjectStatus.ts";
import { PreprocessingJobRead } from "./openapi/models/PreprocessingJobRead.ts";
import { PreproService } from "./openapi/services/PreproService.ts";

const useGetPreProProjectStatus = (projectId: number) =>
  useQuery<PreProProjectStatus, Error>({
    queryKey: [QueryKey.PREPRO_PROJECT_STATUS, projectId],
    queryFn: () => PreproService.getProjectPreproStatus({ projId: projectId }),
  });

const abortPreProJob = (preProJobId: string) => PreproService.abortPreproJob({ preproJobId: preProJobId });

const usePollPreProProjectStatus = (projectId: number) =>
  useQuery<PreProProjectStatus, Error>({
    queryKey: [QueryKey.PREPRO_PROJECT_STATUS, projectId],
    queryFn: () => PreproService.getProjectPreproStatus({ projId: projectId }),
    refetchInterval: (query) => {
      if (!query.state.data) {
        return 1000;
      }
      if (query.state.data.num_sdocs_total > query.state.data.num_sdocs_finished) {
        return 1000;
      }
      return false;
    },
  });

const usePollPreProJob = (preProJobId: string | undefined, initialData: PreprocessingJobRead | undefined) => {
  return useQuery<PreprocessingJobRead, Error>({
    queryKey: [QueryKey.PREPRO_JOB, preProJobId],
    queryFn: () =>
      PreproService.getPreproJob({
        preproJobId: preProJobId!,
      }),
    enabled: !!preProJobId,
    refetchInterval: (query) => {
      if (!query.state.data) {
        return 1000;
      }
      if (query.state.data.status) {
        switch (query.state.data.status) {
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
  });
};

const useGetAllPreProJobs = (projectId: number | null | undefined) => {
  return useQuery<PreprocessingJobRead[], Error>({
    queryKey: [QueryKey.PROJECT_PREPROCESSING_JOBS, projectId],
    queryFn: () =>
      PreproService.getAllPreproJobs({
        projectId: projectId!,
      }),
    enabled: !!projectId,
  });
};

const PreProHooks = {
  useGetPreProProjectStatus,
  usePollPreProProjectStatus,
  usePollPreProJob,
  useGetAllPreProJobs,
  abortPreProJob,
};

export default PreProHooks;
