import { JobService } from "@api/services/JobService";
import { useJobRefetchInterval } from "@core/job";
import { ExportJobRead } from "@models/ExportJobRead";
import { useMutation, useQuery } from "@tanstack/react-query";
import { exportQueries } from "./exportQueries";

const useLiveExportJob = (exportJobId: string | undefined) => {
  const jobRefetchInterval = useJobRefetchInterval<ExportJobRead>();
  return useQuery({
    ...exportQueries.job.byId(exportJobId),
    refetchInterval: jobRefetchInterval,
  });
};

const useStartExportJob = () =>
  useMutation({
    mutationKey: [...exportQueries.job.all(), "start"],
    mutationFn: JobService.startExportJob,
    meta: {
      successMessage: "Export job started! Please wait...",
      errorMessage: "Failed to gather documents for export",
    },
  });

export const ExportHooks = {
  useLiveExportJob,
  useStartExportJob,
};
