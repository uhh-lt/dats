import { JobService } from "@api/services/JobService";
import { useMutation } from "@tanstack/react-query";
import { exportQueries } from "./exportQueries";

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
  useStartExportJob,
};
