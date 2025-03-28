import { useMutation, useQuery } from "@tanstack/react-query";
import { QueryKey } from "./QueryKey.ts";
import { BackgroundJobStatus } from "./openapi/models/BackgroundJobStatus.ts";
import { ImportJobRead } from "./openapi/models/ImportJobRead.ts";
import { ImportService } from "./openapi/services/ImportService.ts";

const useStartImportJob = () =>
  useMutation({
    mutationFn: ImportService.startImportJob,
    meta: {
      successMessage: "Import job started! Please wait...",
      errorMessage: "Failed to start import job",
    },
  });

const usePollImportJob = (importJobId: string | undefined, initialData: ImportJobRead | undefined) => {
  return useQuery<ImportJobRead, Error>({
    queryKey: [QueryKey.IMPORT_JOB, importJobId],
    queryFn: () =>
      ImportService.getImportJob({
        importJobId: importJobId!,
      }),
    enabled: !!importJobId,
    refetchInterval: (query) => {
      if (!query.state.data) {
        return 1000;
      }
      if (query.state.data.status) {
        switch (query.state.data.status) {
          case BackgroundJobStatus.ERRORNEOUS:
          case BackgroundJobStatus.FINISHED:
            return false;
          case BackgroundJobStatus.WAITING:
          case BackgroundJobStatus.RUNNING:
            return 1000;
        }
      }
      return false;
    },
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

const ImportHooks = {
  useStartImportJob,
  usePollImportJob,
  useGetAllImportJobs,
};

export default ImportHooks;
