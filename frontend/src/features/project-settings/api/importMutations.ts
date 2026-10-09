import { queryClient } from "@api/queryClient";
import { ImportService } from "@api/services/ImportService";
import { jobQueries } from "@core/job";
import { useMutation } from "@tanstack/react-query";

export const useStartImportJob = () =>
  useMutation({
    mutationKey: [...jobQueries.import.all(), "startImportJob"],
    mutationFn: ImportService.startImportJob,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: jobQueries.import.byProject(variables.projectId).queryKey });
    },
    meta: {
      successMessage: "Import job started! Please wait...",
      errorMessage: "Failed to start import job",
    },
  });
