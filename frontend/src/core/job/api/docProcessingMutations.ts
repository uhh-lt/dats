import { queryClient } from "@api/queryClient";
import { DocprocessingService } from "@api/services/DocprocessingService";
import { JobService } from "@api/services/JobService";
import { Body_docprocessing_recompute_processing_step } from "@models/Body_docprocessing_recompute_processing_step";
import { CrawlerJobRead } from "@models/CrawlerJobRead";
import { useMutation } from "@tanstack/react-query";
import { jobQueries } from "./jobQueries";

export const useStartCrawlerJob = () =>
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

export const useUploadDocument = () =>
  useMutation({
    mutationKey: [...jobQueries.all(), "uploadDocument"],
    mutationFn: DocprocessingService.uploadFiles,
    meta: {
      successMessage: (data: number) =>
        `Successfully uploaded ${data} documents and started PreprocessingJob in the background!`,
    },
  });

export const useRetryDocProcessingJobs = () =>
  useMutation({
    mutationKey: [...jobQueries.all(), "retryDocProcessingJobs"],
    mutationFn: DocprocessingService.retryFailedSdocs,
    meta: {
      successMessage: (data: string) => data,
    },
  });

export const useRecomputeDocProcessingJobs = () =>
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
