import { JobService } from "@api/services/JobService";
import { useMutation } from "@tanstack/react-query";
import { jobQueries } from "./jobQueries";

export const useStartDuplicateFinderJob = () =>
  useMutation({
    mutationKey: [...jobQueries.all(), "startDuplicateFinderJob"],
    mutationFn: JobService.startDuplicateFinderJob,
    meta: {
      successMessage: () => `Started Duplicate Finder Job. Please wait & do not leave this page!`,
    },
  });

export const useStartExportJob = () =>
  useMutation({
    mutationKey: [...jobQueries.all(), "startExportJob"],
    mutationFn: JobService.startExportJob,
    meta: {
      successMessage: "Export job started! Please wait...",
      errorMessage: "Failed to gather documents for export",
    },
  });
