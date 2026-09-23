import { JobService } from "@api/services/JobService";
import { DuplicateFinderJobRead } from "@models/DuplicateFinderJobRead";
import { ExportJobRead } from "@models/ExportJobRead";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useJobRefetchInterval } from "./jobPolling";
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
  const jobRefetchInterval = useJobRefetchInterval<DuplicateFinderJobRead>();
  return useQuery<DuplicateFinderJobRead, Error>({
    queryKey: [QueryKey.DUPLICATE_FINDER_JOB, duplicateFinderJobId],
    queryFn: () =>
      JobService.getDuplicateFinderJobById({
        jobId: duplicateFinderJobId!,
      }),
    enabled: !!duplicateFinderJobId,
    refetchInterval: jobRefetchInterval,
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
  const jobRefetchInterval = useJobRefetchInterval<ExportJobRead>();
  return useQuery<ExportJobRead, Error>({
    queryKey: [QueryKey.EXPORT_JOB, exportJobId],
    queryFn: () =>
      JobService.getExportJobById({
        jobId: exportJobId!,
      }),
    enabled: !!exportJobId,
    refetchInterval: jobRefetchInterval,
  });
};

export const JobHooks = {
  useStartDuplicateFinderJob,
  usePollDuplicateFinderJob,
  useStartExportJob,
  usePollExportJob,
};
