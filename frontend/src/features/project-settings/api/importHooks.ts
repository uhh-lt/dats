import { JobService } from "@api/services/JobService";
import { useMutation } from "@tanstack/react-query";
import { importQueries } from "./importQueries";

const useStartImportJob = () =>
  useMutation({
    mutationKey: [...importQueries.job.all(), "start"],
    mutationFn: JobService.startImportJob,
    meta: {
      datsEvent: "JOB_UPDATED",
      successMessage: "Import job started! Please wait...",
      errorMessage: "Failed to start import job",
    },
  });

export const ImportHooks = {
  useStartImportJob,
};
