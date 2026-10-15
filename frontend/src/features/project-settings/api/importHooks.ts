import { queryClient } from "@api/queryClient";
import { ImportService } from "@api/services/ImportService";
import { useJobRefetchInterval } from "@core/job";
import { ImportJobRead } from "@models/ImportJobRead";
import { useMutation, useQuery } from "@tanstack/react-query";
import { importQueries } from "./importQueries";

// Job updates arrive via websocket (JOB_UPDATED); the completion side-effects
// (per-import-type invalidations) live in the JOB_UPDATED handler in
// frontend/src/plugins/websocket/websocketEventHandlers.ts.
const useLiveImportJob = (importJobId: string | undefined, initialData: ImportJobRead | undefined) => {
  const jobRefetchInterval = useJobRefetchInterval<ImportJobRead>();
  return useQuery({
    ...importQueries.job.byId(importJobId),
    refetchInterval: jobRefetchInterval,
    initialData,
  });
};

const useStartImportJob = () =>
  useMutation({
    mutationKey: [...importQueries.job.all(), "startImportJob"],
    mutationFn: ImportService.startImportJob,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: importQueries.job.byProject(variables.projectId).queryKey });
    },
    meta: {
      successMessage: "Import job started! Please wait...",
      errorMessage: "Failed to start import job",
    },
  });

export const ImportHooks = {
  useLiveImportJob,
  useStartImportJob,
};
