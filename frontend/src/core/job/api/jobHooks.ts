import { JobService } from "@api/services/JobService";
import { DuplicateFinderJobRead } from "@models/DuplicateFinderJobRead";
import { ExportJobRead } from "@models/ExportJobRead";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useJobRefetchInterval } from "./jobPolling";
import { jobQueries } from "./jobQueries";

const useStartDuplicateFinderJob = () =>
  useMutation({
    mutationKey: [...jobQueries.all(), "startDuplicateFinderJob"],
    mutationFn: JobService.startDuplicateFinderJob,
    meta: {
      successMessage: () => `Started Duplicate Finder Job. Please wait & do not leave this page!`,
    },
  });

const useLiveDuplicateFinderJob = (
  duplicateFinderJobId: string | undefined,
  initialData: DuplicateFinderJobRead | undefined,
) => {
  const jobRefetchInterval = useJobRefetchInterval<DuplicateFinderJobRead>();
  return useQuery({
    ...jobQueries.duplicateFinder.byId(duplicateFinderJobId),
    refetchInterval: jobRefetchInterval,
    initialData,
  });
};

const useStartExportJob = () =>
  useMutation({
    mutationKey: [...jobQueries.all(), "startExportJob"],
    mutationFn: JobService.startExportJob,
    meta: {
      successMessage: "Export job started! Please wait...",
      errorMessage: "Failed to gather documents for export",
    },
  });

const useLiveExportJob = (exportJobId: string | undefined) => {
  const jobRefetchInterval = useJobRefetchInterval<ExportJobRead>();
  return useQuery({
    ...jobQueries.export.byId(exportJobId),
    refetchInterval: jobRefetchInterval,
  });
};

export const JobHooks = {
  useStartDuplicateFinderJob,
  useLiveDuplicateFinderJob,
  useStartExportJob,
  useLiveExportJob,
};
