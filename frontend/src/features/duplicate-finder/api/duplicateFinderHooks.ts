import { JobService } from "@api/services/JobService";
import { useMutation } from "@tanstack/react-query";
import { duplicateFinderQueries } from "./duplicateFinderQueries";

const useStartDuplicateFinderJob = () =>
  useMutation({
    mutationKey: [...duplicateFinderQueries.job.all(), "start"],
    mutationFn: JobService.startDuplicateFinderJob,
    meta: {
      successMessage: () => `Started Duplicate Finder Job. Please wait & do not leave this page!`,
    },
  });

export const DuplicateFinderHooks = {
  useStartDuplicateFinderJob,
};
