import { JobService } from "@api/services/JobService";
import { useJobRefetchInterval } from "@core/job";
import { DuplicateFinderJobRead } from "@models/DuplicateFinderJobRead";
import { useMutation, useQuery } from "@tanstack/react-query";
import { duplicateFinderQueries } from "./duplicateFinderQueries";

const useLiveDuplicateFinderJob = (
  duplicateFinderJobId: string | undefined,
  initialData: DuplicateFinderJobRead | undefined,
) => {
  const jobRefetchInterval = useJobRefetchInterval<DuplicateFinderJobRead>();
  return useQuery({
    ...duplicateFinderQueries.job.byId(duplicateFinderJobId),
    refetchInterval: jobRefetchInterval,
    initialData,
  });
};

const useStartDuplicateFinderJob = () =>
  useMutation({
    mutationKey: [...duplicateFinderQueries.job.all(), "start"],
    mutationFn: JobService.startDuplicateFinderJob,
    meta: {
      successMessage: () => `Started Duplicate Finder Job. Please wait & do not leave this page!`,
    },
  });

export const DuplicateFinderHooks = {
  useLiveDuplicateFinderJob,
  useStartDuplicateFinderJob,
};
