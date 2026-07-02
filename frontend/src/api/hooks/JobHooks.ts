import { DuplicateFinderJobRead } from "@models/DuplicateFinderJobRead";
import { ExportJobRead } from "@models/ExportJobRead";
import { JobStatus } from "@models/JobStatus";
import { JobService } from "@api/services/JobService";
import { useMutation, useQuery } from "@tanstack/react-query";
import { QueryKey } from "./QueryKey";

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

export const JobHooks = {
  useStartDuplicateFinderJob,
  usePollDuplicateFinderJob,
  useStartExportJob,
  usePollExportJob,
};
