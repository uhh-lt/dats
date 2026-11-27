import { JobsService } from "@api/services/JobsService";
import { useMutation } from "@tanstack/react-query";
import { importQueries } from "./importQueries";

const useStartImportJob = () =>
  useMutation({
    mutationKey: [...importQueries.job.all(), "start"],
    mutationFn: JobsService.startImportJob,
    meta: {
      datsEvent: "JOB_UPDATED",
      successMessage: "Import job started! Please wait...",
      errorMessage: "Failed to start import job",
    },
  });

export const ImportHooks = {
  useStartImportJob,
};
