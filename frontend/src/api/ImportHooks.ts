import { useMutation, useQuery } from "@tanstack/react-query";
import queryClient from "../plugins/ReactQueryClient.ts";
import { dateToLocaleDate } from "../utils/DateUtils.ts";
import { QueryKey } from "./QueryKey.ts";
import { BackgroundJobStatus } from "./openapi/models/BackgroundJobStatus.ts";
import { ImportJobRead } from "./openapi/models/ImportJobRead.ts";
import { ImportJobType } from "./openapi/models/ImportJobType.ts";
import { ImportService } from "./openapi/services/ImportService.ts";

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
        // do invalidation if the status is FINISHED (and the job is max 3 minutes old)
        const localDate = new Date();
        const localUpdatedDate = dateToLocaleDate(query.state.data.updated);
        if (
          query.state.data.status === BackgroundJobStatus.FINISHED &&
          localDate.getTime() - localUpdatedDate.getTime() < 3 * 60 * 1000
        ) {
          const projectId = query.state.data.parameters.project_id;
          switch (query.state.data.parameters.import_job_type) {
            case ImportJobType.TAGS:
              console.log("Invalidating tags");
              queryClient.invalidateQueries({ queryKey: [QueryKey.PROJECT_TAGS, projectId] });
              break;
            case ImportJobType.CODES:
              console.log("Invalidating codes");
              queryClient.invalidateQueries({ queryKey: [QueryKey.PROJECT_CODES, projectId] });
              break;
            case ImportJobType.PROJECT_METADATA:
              console.log("Invalidating project metadata");
              queryClient.invalidateQueries({ queryKey: [QueryKey.PROJECT_METADATAS, projectId] });
              break;
            case ImportJobType.USERS:
              console.log("Invalidating users");
              queryClient.invalidateQueries({ queryKey: [QueryKey.PROJECT_USERS, projectId] });
              break;
            case ImportJobType.TIMELINE_ANALYSES:
              console.log("Invalidating timeline analyses");
              queryClient.invalidateQueries({ queryKey: [QueryKey.TIMELINE_ANALYSIS_PROJECT_USER, projectId] });
              break;
            case ImportJobType.BBOX_ANNOTATIONS:
            case ImportJobType.SPAN_ANNOTATIONS:
            case ImportJobType.SENTENCE_ANNOTATIONS:
            case ImportJobType.PROJECT:
              break;
            default:
              console.error("Unknown import job type");
              break;
          }
        }

        // determine the refetch interval based on the status
        switch (query.state.data.status) {
          case BackgroundJobStatus.ERRORNEOUS:
          case BackgroundJobStatus.FINISHED:
          case BackgroundJobStatus.ABORTED:
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
