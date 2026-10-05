import { queryClient } from "@api/queryClient";
import { ImportService } from "@api/services/ImportService";
import { ImportJobRead } from "@models/ImportJobRead";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useJobRefetchInterval } from "./jobPolling";
import { QueryKey } from "./QueryKey";

const useStartImportJob = () =>
  useMutation({
    mutationFn: ImportService.startImportJob,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [QueryKey.PROJECT_IMPORT_JOBS, variables.projectId] });
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
  return useQuery<ImportJobRead, Error>({
    queryKey: [QueryKey.IMPORT_JOB, importJobId],
    queryFn: () =>
      ImportService.getImportJob({
        importJobId: importJobId!,
      }),
    enabled: !!importJobId,
    refetchInterval: jobRefetchInterval,
    initialData,
  });
};

const useGetAllImportJobs = (projectId: number | null | undefined) => {
  return useQuery<ImportJobRead[], Error>({
    queryKey: [QueryKey.PROJECT_IMPORT_JOBS, projectId],
    queryFn: () =>
      ImportService.getAllImportJobs({
        projectId: projectId!,
      }),
    enabled: !!projectId,
  });
};

export const ImportHooks = {
  useStartImportJob,
  useLiveImportJob,
  useGetAllImportJobs,
};
