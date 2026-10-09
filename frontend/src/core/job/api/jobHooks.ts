import { DuplicateFinderJobRead } from "@models/DuplicateFinderJobRead";
import { ExportJobRead } from "@models/ExportJobRead";
import { useQuery } from "@tanstack/react-query";
import { useJobRefetchInterval } from "./jobPolling";
import { jobQueries } from "./jobQueries";

export const useLiveDuplicateFinderJob = (
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

export const useLiveExportJob = (exportJobId: string | undefined) => {
  const jobRefetchInterval = useJobRefetchInterval<ExportJobRead>();
  return useQuery({
    ...jobQueries.export.byId(exportJobId),
    refetchInterval: jobRefetchInterval,
  });
};
