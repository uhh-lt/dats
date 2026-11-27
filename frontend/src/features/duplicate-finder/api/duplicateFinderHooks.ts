import { JobsService } from "@api/services/JobsService";
import { useMutation } from "@tanstack/react-query";
import { duplicateFinderQueries } from "./duplicateFinderQueries";

const useStartDuplicateFinderJob = () =>
  useMutation({
    mutationKey: [...duplicateFinderQueries.job.all(), "start"],
    mutationFn: JobsService.startDuplicateFinderJob,
    meta: {
      successMessage: () => `Started Duplicate Finder Job. Please wait & do not leave this page!`,
    },
  });

export const DuplicateFinderHooks = {
  useStartDuplicateFinderJob,
};
