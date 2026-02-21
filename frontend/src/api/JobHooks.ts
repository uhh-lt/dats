import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient } from "../plugins/ReactQueryClient.ts";
import { QueryKey } from "./QueryKey.ts";
import { DuplicateFinderJobRead } from "./openapi/models/DuplicateFinderJobRead.ts";
import { ExportJobRead } from "./openapi/models/ExportJobRead.ts";
import { JobStatus } from "./openapi/models/JobStatus.ts";
import { MlJobRead } from "./openapi/models/MlJobRead.ts";
import { JobService } from "./openapi/services/JobService.ts";

const useStartDuplicateFinderJob = () =>
  useMutation({
    mutationFn: JobService.startDuplicateFinderJob,
    meta: {
      successMessage: () => `Started Duplicate Finder Job. Please wait & do not leave this page!`,
    },
  });

const usePollDuplicateFinderJob = (
  duplicateFinderJobId: string | undefined,
  initialData: DuplicateFinderJobRead | undefined,
) => {
  return useQuery<DuplicateFinderJobRead, Error>({
    queryKey: [QueryKey.DUPLICATE_FINDER_JOB, duplicateFinderJobId],
    queryFn: () =>
      JobService.getDuplicateFinderJobById({
        jobId: duplicateFinderJobId!,
      }),
    enabled: !!duplicateFinderJobId,
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

const useStartExportJob = () =>
  useMutation({
    mutationFn: JobService.startExportJob,
    meta: {
      successMessage: "Export job started! Please wait...",
      errorMessage: "Failed to gather documents for export",
    },
  });

const usePollExportJob = (exportJobId: string | undefined) => {
  return useQuery<ExportJobRead, Error>({
    queryKey: [QueryKey.EXPORT_JOB, exportJobId],
    queryFn: () =>
      JobService.getExportJobById({
        jobId: exportJobId!,
      }),
    enabled: !!exportJobId,
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
  });
};

const useStartMLJob = () =>
  useMutation({
    mutationFn: JobService.startMlJob,
    onSuccess: (job) => {
      // force refetch of all ml jobs when adding a new one
      queryClient.invalidateQueries({ queryKey: [QueryKey.PROJECT_ML_JOBS, job.input.project_id] });
    },
    meta: {
      successMessage: (data: MlJobRead) => `Started ML Job as a new background task (ID: ${data.job_id})`,
    },
  });

const usePollMLJob = (mlJobId: string | undefined, initialData: MlJobRead | undefined) => {
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

const useGetAllMLJobs = (projectId: number) => {
  return useQuery<MlJobRead[], Error>({
    queryKey: [QueryKey.PROJECT_ML_JOBS, projectId],
    queryFn: () =>
      JobService.getMlJobsByProject({
        projectId: projectId!,
      }),
    enabled: !!projectId,
  });
};

export const JobHooks = {
  useStartDuplicateFinderJob,
  usePollDuplicateFinderJob,
  useStartExportJob,
  usePollExportJob,
  useStartMLJob,
  usePollMLJob,
  useGetAllMLJobs,
};
