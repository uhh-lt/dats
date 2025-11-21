import { Query, useMutation, useQuery } from "@tanstack/react-query";
import { useRef } from "react";
import queryClient from "../plugins/ReactQueryClient.ts";
import { CrawlerJobRead } from "./openapi/models/CrawlerJobRead.ts";
import { JobStatus } from "./openapi/models/JobStatus.ts";
import { SDocStatus } from "./openapi/models/SDocStatus.ts";
import { SourceDocumentStatusSimple } from "./openapi/models/SourceDocumentStatusSimple.ts";
import { DocprocessingService } from "./openapi/services/DocprocessingService.ts";
import { JobService } from "./openapi/services/JobService.ts";
import { QueryKey } from "./QueryKey.ts";

const useStartCrawlerJob = () =>
  useMutation({
    mutationFn: JobService.startCrawlerJob,
    onSuccess: (job) => {
      setTimeout(() => {
        console.log("Invalidating project crawler jobs");
        queryClient.invalidateQueries({ queryKey: [QueryKey.PROJECT_CRAWLER_JOBS, job.input.project_id] });
      }, 1000);
    },
    meta: {
      successMessage: (data: CrawlerJobRead) => `Started Crawler Job as a new background task (ID: ${data.job_id})`,
    },
  });

const usePollCrawlerJob = (crawlerJobId: string | undefined, initialData: CrawlerJobRead | undefined) => {
  return useQuery<CrawlerJobRead, Error>({
    queryKey: [QueryKey.CRAWLER_JOB, crawlerJobId],
    queryFn: () =>
      JobService.getCrawlerJobById({
        jobId: crawlerJobId!,
      }),
    enabled: !!crawlerJobId,
    refetchInterval: (query) => {
      if (!query.state.data) {
        return 1000;
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

const useGetAllCrawlerJobs = (projectId: number) => {
  return useQuery<CrawlerJobRead[], Error>({
    queryKey: [QueryKey.PROJECT_CRAWLER_JOBS, projectId],
    queryFn: () =>
      JobService.getCrawlerJobsByProject({
        projectId: projectId!,
      }),
    enabled: !!projectId,
  });
};

const useUploadDocument = () =>
  useMutation({
    mutationFn: DocprocessingService.uploadFiles,
    meta: {
      successMessage: (data: number) =>
        `Successfully uploaded ${data} documents and started PreprocessingJob in the background!`,
    },
  });

interface UseAllSimpleSdocStatusQueryParams<T> {
  projectId: number;
  status: SDocStatus;
  select?: (data: SourceDocumentStatusSimple[]) => T;
  refetchInterval?: (query: Query<SourceDocumentStatusSimple[]>) => number | false;
}

const useAllSimpleSdocStatusQuery = <T = SourceDocumentStatusSimple[]>({
  projectId,
  status,
  select,
  refetchInterval,
}: UseAllSimpleSdocStatusQueryParams<T>) => {
  return useQuery({
    queryKey: [QueryKey.PROJECT_SDOC_STATUS_SIMPLE, projectId, status],
    queryFn: () =>
      DocprocessingService.getSimpleSdocStatusByProjectAndStatus({
        projId: projectId!,
        status: status!,
      }),
    select,
    refetchInterval,
  });
};

// this query is polling the processing status of simple SDocs every 3 seconds
const usePollProcessingSimpleSdocStatus = (projectId: number) => {
  const previousLengthRef = useRef<number>(0);
  return useAllSimpleSdocStatusQuery({
    projectId,
    status: SDocStatus._0,
    refetchInterval: (query) => {
      if (!query.state.data) {
        return 3000;
      }
      const currentLength = query.state.data.length;
      // Only invalidate if previous length > 0 and current length == 0
      if (previousLengthRef.current > 0 && currentLength === 0) {
        console.log("Invalidating documents");
        queryClient.invalidateQueries({ queryKey: [QueryKey.SEARCH_TABLE, projectId] });
      }
      previousLengthRef.current = currentLength;
      return 3000;
    },
  });
};

const useRetryDocProcessingJobs = () =>
  useMutation({
    mutationFn: DocprocessingService.retryFailedSdocs,
    meta: {
      successMessage: (data: string) => data,
    },
  });

const DocProcessingHooks = {
  // crawler
  useStartCrawlerJob,
  usePollCrawlerJob,
  useGetAllCrawlerJobs,
  useUploadDocument,
  usePollProcessingSimpleSdocStatus,
  // sdoc health
  useRetryDocProcessingJobs,
};

export default DocProcessingHooks;
