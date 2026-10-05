import { queryClient } from "@api/queryClient";
import { DocprocessingService } from "@api/services/DocprocessingService";
import { JobService } from "@api/services/JobService";
import { Body_docprocessing_recompute_processing_step } from "@models/Body_docprocessing_recompute_processing_step";
import { CrawlerJobRead } from "@models/CrawlerJobRead";
import { SDocStatus } from "@models/SDocStatus";
import { SourceDocumentStatusSimple } from "@models/SourceDocumentStatusSimple";
import { Query, useMutation, useQuery } from "@tanstack/react-query";
import { useRef } from "react";
import { useJobRefetchInterval } from "./jobPolling";
import { QueryKey } from "./QueryKey";

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

const useLiveCrawlerJob = (crawlerJobId: string | undefined, initialData: CrawlerJobRead | undefined) => {
  const jobRefetchInterval = useJobRefetchInterval<CrawlerJobRead>();
  return useQuery<CrawlerJobRead, Error>({
    queryKey: [QueryKey.CRAWLER_JOB, crawlerJobId],
    queryFn: () =>
      JobService.getCrawlerJobById({
        jobId: crawlerJobId!,
      }),
    enabled: !!crawlerJobId,
    refetchInterval: jobRefetchInterval,
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

const useRecomputeDocProcessingJobs = () =>
  useMutation({
    mutationFn: DocprocessingService.recomputeProcessingStep,
    meta: {
      successMessage: (
        data: number,
        variables: { processingStep: string; requestBody: Body_docprocessing_recompute_processing_step },
      ) =>
        `Successfully started '${variables.processingStep}' recompute job for ${variables.requestBody.sdoc_ids.length} / ${data} documents!`,
    },
  });

export const DocProcessingHooks = {
  // crawler
  useStartCrawlerJob,
  useLiveCrawlerJob,
  useGetAllCrawlerJobs,
  useUploadDocument,
  usePollProcessingSimpleSdocStatus,
  // sdoc health
  useRetryDocProcessingJobs,
  useRecomputeDocProcessingJobs,
};
