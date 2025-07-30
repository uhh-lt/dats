import { useMutation, useQuery } from "@tanstack/react-query";
import { QueryKey } from "./QueryKey.ts";
import { DuplicateFinderJobRead } from "./openapi/models/DuplicateFinderJobRead.ts";
import { JobStatus } from "./openapi/models/JobStatus.ts";
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
      if (!query.state.data) {
        return 1000;
      }
      if (query.state.data.status) {
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
        }
      }
      return false;
    },
    initialData,
  });
};

const JobHooks = {
  usePollDuplicateFinderJob,
  useStartDuplicateFinderJob,
};

export default JobHooks;
