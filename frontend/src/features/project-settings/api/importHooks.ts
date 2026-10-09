import { queryClient } from "@api/queryClient";
import { ImportService } from "@api/services/ImportService";
import { jobQueries, useJobRefetchInterval } from "@core/job";
import { ImportJobRead } from "@models/ImportJobRead";
import { useMutation, useQuery } from "@tanstack/react-query";

const useStartImportJob = () =>
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

// Job updates arrive via websocket (JOB_UPDATED); the completion side-effects
// (per-import-type invalidations) live in the JOB_UPDATED handler in
// frontend/src/plugins/websocket/websocketEventHandlers.ts.
const useLiveImportJob = (importJobId: string | undefined, initialData: ImportJobRead | undefined) => {
  const jobRefetchInterval = useJobRefetchInterval<ImportJobRead>();
  return useQuery({
    ...jobQueries.import.byId(importJobId),
    refetchInterval: jobRefetchInterval,
    initialData,
  });
};

export const ImportHooks = {
  useStartImportJob,
  useLiveImportJob,
};
