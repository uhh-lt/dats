import { DocprocessingService } from "@api/services/DocprocessingService";
import { Body_docprocessing_recompute_processing_step } from "@models/Body_docprocessing_recompute_processing_step";
import { queryClient } from "@api/queryClient";
import { projectQueries } from "@core/project";
import { useMutation } from "@tanstack/react-query";
import { healthQueries } from "./healthQueries";

const useRetryDocProcessingJobs = () =>
  useMutation({
    mutationKey: [...healthQueries.all(), "retryDocProcessingJobs"],
    mutationFn: DocprocessingService.retryFailedSdocs,
    // the steps compute again: the features they belong to are computing (the steps send no events)
    onSuccess: () => queryClient.invalidateQueries({ queryKey: projectQueries.featuresScope() }),
    meta: {
      successMessage: (data: string) => data,
    },
  });

const useRecomputeDocProcessingJobs = () =>
  useMutation({
    mutationKey: [...healthQueries.all(), "recomputeDocProcessingJobs"],
    mutationFn: DocprocessingService.recomputeProcessingStep,
    // see useRetryDocProcessingJobs
    onSuccess: () => queryClient.invalidateQueries({ queryKey: projectQueries.featuresScope() }),
    meta: {
      successMessage: (
        data: number,
        variables: { processingStep: string; requestBody: Body_docprocessing_recompute_processing_step },
      ) =>
        `Successfully started '${variables.processingStep}' recompute job for ${variables.requestBody.sdoc_ids.length} / ${data} documents!`,
    },
  });

export const HealthHooks = {
  useRetryDocProcessingJobs,
  useRecomputeDocProcessingJobs,
};
