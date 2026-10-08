import { jobQueries } from "@api/queries/jobQueries";
import { projectQueries } from "@api/queries/projectQueries";
import { searchQueries } from "@api/queries/searchQueries";
import { queryClient } from "@api/queryClient";
import { DocprocessingService } from "@api/services/DocprocessingService";
import { JobService } from "@api/services/JobService";
import { Body_docprocessing_recompute_processing_step } from "@models/Body_docprocessing_recompute_processing_step";
import { CrawlerJobRead } from "@models/CrawlerJobRead";
import { SDocStatus } from "@models/SDocStatus";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useRef } from "react";
import { useJobRefetchInterval } from "./jobPolling";

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

const useLiveCrawlerJob = (crawlerJobId: string | undefined, initialData: CrawlerJobRead | undefined) => {
  const jobRefetchInterval = useJobRefetchInterval<CrawlerJobRead>();
  return useQuery({
    ...jobQueries.crawler.byId(crawlerJobId),
    refetchInterval: jobRefetchInterval,
    initialData,
  });
};

const useUploadDocument = () =>
  useMutation({
    mutationKey: [...jobQueries.all(), "uploadDocument"],
    mutationFn: DocprocessingService.uploadFiles,
    meta: {
      successMessage: (data: number) =>
        `Successfully uploaded ${data} documents and started PreprocessingJob in the background!`,
    },
  });

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

export const DocProcessingHooks = {
  // crawler
  useStartCrawlerJob,
  useLiveCrawlerJob,
  useUploadDocument,
  usePollProcessingSimpleSdocStatus,
  // sdoc health
  useRetryDocProcessingJobs,
  useRecomputeDocProcessingJobs,
};
