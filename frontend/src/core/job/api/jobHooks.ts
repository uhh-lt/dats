import { queryClient } from "@api/queryClient";
import { DocprocessingService } from "@api/services/DocprocessingService";
import { JobService } from "@api/services/JobService";
import { projectQueries } from "@core/project";
import { searchQueries } from "@core/source-document";
import { Body_docprocessing_recompute_processing_step } from "@models/Body_docprocessing_recompute_processing_step";
import { CrawlerJobRead } from "@models/CrawlerJobRead";
import { DuplicateFinderJobRead } from "@models/DuplicateFinderJobRead";
import { ExportJobRead } from "@models/ExportJobRead";
import { JobStatus } from "@models/JobStatus";
import { SDocStatus } from "@models/SDocStatus";
import { useAppSelector } from "@store/storeHooks";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useRef } from "react";
import { jobQueries } from "./jobQueries";

const useLiveDuplicateFinderJob = (
  duplicateFinderJobId: string | undefined,
  initialData: DuplicateFinderJobRead | undefined,
) => {
  const jobRefetchInterval = useJobRefetchInterval<DuplicateFinderJobRead>();
  return useQuery({
    ...jobQueries.duplicateFinder.byId(duplicateFinderJobId),
    refetchInterval: jobRefetchInterval,
    initialData,
  });
};

const useLiveExportJob = (exportJobId: string | undefined) => {
  const jobRefetchInterval = useJobRefetchInterval<ExportJobRead>();
  return useQuery({
    ...jobQueries.export.byId(exportJobId),
    refetchInterval: jobRefetchInterval,
  });
};

const useStartDuplicateFinderJob = () =>
  useMutation({
    mutationKey: [...jobQueries.all(), "startDuplicateFinderJob"],
    mutationFn: JobService.startDuplicateFinderJob,
    meta: {
      successMessage: () => `Started Duplicate Finder Job. Please wait & do not leave this page!`,
    },
  });

const useStartExportJob = () =>
  useMutation({
    mutationKey: [...jobQueries.all(), "startExportJob"],
    mutationFn: JobService.startExportJob,
    meta: {
      successMessage: "Export job started! Please wait...",
      errorMessage: "Failed to gather documents for export",
    },
  });

const useLiveCrawlerJob = (crawlerJobId: string | undefined, initialData: CrawlerJobRead | undefined) => {
  const jobRefetchInterval = useJobRefetchInterval<CrawlerJobRead>();
  return useQuery({
    ...jobQueries.crawler.byId(crawlerJobId),
    refetchInterval: jobRefetchInterval,
    initialData,
  });
};

// this query is polling the processing status of simple SDocs every 3 seconds
const usePollProcessingSimpleSdocStatus = (projectId: number) => {
  const previousLengthRef = useRef<number>(0);
  return useQuery({
    ...projectQueries.sdocStatusSimple(projectId, SDocStatus._0),
    refetchInterval: (query) => {
      if (!query.state.data) {
        return 3000;
      }
      const currentLength = query.state.data.length;
      // Only invalidate if previous length > 0 and current length == 0
      if (previousLengthRef.current > 0 && currentLength === 0) {
        console.log("Invalidating documents");
        queryClient.invalidateQueries({ queryKey: searchQueries.documentsByProject(projectId) });
      }
      previousLengthRef.current = currentLength;
      return 3000;
    },
  });
};

const useStartCrawlerJob = () =>
  useMutation({
    mutationKey: [...jobQueries.all(), "startCrawlerJob"],
    mutationFn: JobService.startCrawlerJob,
    onSuccess: (job) => {
      setTimeout(() => {
        console.log("Invalidating project crawler jobs");
        queryClient.invalidateQueries({ queryKey: jobQueries.crawler.byProject(job.input.project_id).queryKey });
      }, 1000);
    },
    meta: {
      successMessage: (data: CrawlerJobRead) => `Started Crawler Job as a new background task (ID: ${data.job_id})`,
    },
  });

const useUploadDocument = () =>
  useMutation({
    mutationKey: [...jobQueries.all(), "uploadDocument"],
    mutationFn: DocprocessingService.uploadFiles,
    meta: {
      successMessage: (data: number) =>
        `Successfully uploaded ${data} documents and started PreprocessingJob in the background!`,
    },
  });

const useRetryDocProcessingJobs = () =>
  useMutation({
    mutationKey: [...jobQueries.all(), "retryDocProcessingJobs"],
    mutationFn: DocprocessingService.retryFailedSdocs,
    meta: {
      successMessage: (data: string) => data,
    },
  });

const useRecomputeDocProcessingJobs = () =>
  useMutation({
    mutationKey: [...jobQueries.all(), "recomputeDocProcessingJobs"],
    mutationFn: DocprocessingService.recomputeProcessingStep,
    meta: {
      successMessage: (
        data: number,
        variables: { processingStep: string; requestBody: Body_docprocessing_recompute_processing_step },
      ) =>
        `Successfully started '${variables.processingStep}' recompute job for ${variables.requestBody.sdoc_ids.length} / ${data} documents!`,
    },
  });

// Minimal structural view of a react-query Query's state. react-query's `Query`
// type is invariant in its data type, so we cannot type the callback parameter
// as `Query<T | null>` — a structural type keeps the helper assignable to every
// `refetchInterval` signature.
interface QueryStateLike<T> {
  state: {
    data?: T | null;
    error: unknown;
  };
}

// Job updates arrive via websocket (JOB_UPDATED) and are written directly into
// the query cache, so no polling is needed while the websocket is connected.
// When the websocket is down, fall back to polling until the job reaches a
// terminal state.
function useJobRefetchInterval<T extends { status: JobStatus }>(intervalMs = 1000) {
  const isConnected = useAppSelector((state) => state.websocket.status === "connected");
  return (query: QueryStateLike<T>): number | false => {
    if (!isConnected) {
      if (query.state.error) return false;
      const status = query.state.data?.status;
      if (!status) return intervalMs;
      switch (status) {
        case JobStatus.CANCELED:
        case JobStatus.FAILED:
        case JobStatus.FINISHED:
        case JobStatus.STOPPED:
          return false;
        case JobStatus.DEFERRED:
        case JobStatus.QUEUED:
        case JobStatus.SCHEDULED:
        case JobStatus.STARTED:
          return intervalMs;
        default:
          return false;
      }
    }
    // Websocket is connected: only poll until the first data arrives (the
    // initial fetch may race the QUEUED event); updates come via JOB_UPDATED.
    return query.state.data ? false : intervalMs;
  };
}

export const JobHooks = {
  useLiveDuplicateFinderJob,
  useLiveExportJob,
  useStartDuplicateFinderJob,
  useStartExportJob,
  useLiveCrawlerJob,
  usePollProcessingSimpleSdocStatus,
  useStartCrawlerJob,
  useUploadDocument,
  useRetryDocProcessingJobs,
  useRecomputeDocProcessingJobs,
  useJobRefetchInterval,
};
