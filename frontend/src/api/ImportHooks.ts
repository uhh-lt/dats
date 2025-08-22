import { useMutation, useQuery } from "@tanstack/react-query";
import queryClient from "../plugins/ReactQueryClient.ts";
import { dateToLocaleDate } from "../utils/DateUtils.ts";
import { QueryKey } from "./QueryKey.ts";
import { ImportJobRead } from "./openapi/models/ImportJobRead.ts";
import { ImportJobType } from "./openapi/models/ImportJobType.ts";
import { JobStatus } from "./openapi/models/JobStatus.ts";
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

      // do invalidation if the status is FINISHED (and the job is max 3 minutes old)
      const localDate = new Date();
      if (
        query.state.data.finished &&
        localDate.getTime() - dateToLocaleDate(query.state.data.finished).getTime() < 3 * 60 * 1000
      ) {
        const projectId = query.state.data.input.project_id;
        switch (query.state.data.input.import_job_type) {
          case ImportJobType.TAGS:
            console.log("Invalidating tags");
            queryClient.invalidateQueries({ queryKey: [QueryKey.PROJECT_TAGS, projectId] });
            break;
          case ImportJobType.CODES:
            console.log("Invalidating codes");
            queryClient.invalidateQueries({ queryKey: [QueryKey.PROJECT_CODES, projectId] });
            break;
          case ImportJobType.FOLDERS:
            console.log("Invalidating folders");
            queryClient.invalidateQueries({ queryKey: [QueryKey.PROJECT_FOLDERS, projectId] });
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
            queryClient.invalidateQueries({ queryKey: [QueryKey.PROJECT_TIMELINE_ANALYSIS, projectId] });
            break;
          case ImportJobType.WHITEBOARDS:
            console.log("Invalidating whiteboads");
            queryClient.invalidateQueries({ queryKey: [QueryKey.PROJECT_WHITEBOARDS, projectId] });
            break;
          case ImportJobType.COTA:
            console.log("Invalidating cota");
            queryClient.invalidateQueries({ queryKey: [QueryKey.PROJECT_COTAS, projectId] });
            break;
          case ImportJobType.DOCUMENTS:
            console.log("Invalidating search documents");
            queryClient.invalidateQueries({ queryKey: [QueryKey.SEARCH_TABLE, projectId] });
            break;
          case ImportJobType.MEMOS:
            queryClient.invalidateQueries({ queryKey: [QueryKey.USER_MEMO] });
            queryClient.invalidateQueries({ queryKey: [QueryKey.MEMO] });
            queryClient.invalidateQueries({ queryKey: [QueryKey.MEMO_TABLE] });
            queryClient.invalidateQueries({ queryKey: [QueryKey.OBJECT_MEMOS] });
            break;
          case ImportJobType.PROJECT:
            console.log("Invalidating project");
            queryClient.invalidateQueries({ queryKey: [QueryKey.PROJECT_TAGS, projectId] });
            queryClient.invalidateQueries({ queryKey: [QueryKey.PROJECT_CODES, projectId] });
            queryClient.invalidateQueries({ queryKey: [QueryKey.PROJECT_METADATAS, projectId] });
            queryClient.invalidateQueries({ queryKey: [QueryKey.PROJECT_USERS, projectId] });
            queryClient.invalidateQueries({ queryKey: [QueryKey.PROJECT_TIMELINE_ANALYSIS, projectId] });
            queryClient.invalidateQueries({ queryKey: [QueryKey.PROJECT_WHITEBOARDS, projectId] });
            queryClient.invalidateQueries({ queryKey: [QueryKey.PROJECT_COTAS, projectId] });
            queryClient.invalidateQueries({ queryKey: [QueryKey.SEARCH_TABLE, projectId] });
            queryClient.invalidateQueries({ queryKey: [QueryKey.USER_MEMO] });
            queryClient.invalidateQueries({ queryKey: [QueryKey.MEMO] });
            queryClient.invalidateQueries({ queryKey: [QueryKey.MEMO_TABLE] });
            queryClient.invalidateQueries({ queryKey: [QueryKey.OBJECT_MEMOS] });
            break;
          case ImportJobType.BBOX_ANNOTATIONS:
          case ImportJobType.SPAN_ANNOTATIONS:
          case ImportJobType.SENTENCE_ANNOTATIONS:
            break;
          default:
            console.error("Unknown import job type");
            break;
        }
      }

      switch (query.state.data.status) {
        case JobStatus.CANCELED:
        case JobStatus.FAILED:
        case JobStatus.FINISHED:
        case JobStatus.STOPPED:
          return false;
        case JobStatus.DEFERRED:
        case JobStatus.QUEUED:
        case JobStatus.SCHEDULED:
        case JobStatus.STARTED:
          return 1000;
        default:
          return false;
      }
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
