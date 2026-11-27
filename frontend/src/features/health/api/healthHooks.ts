import { DocProcessingService } from "@api/services/DocProcessingService";
import { Body_docProcessing_recompute_processing_step } from "@models/Body_docProcessing_recompute_processing_step";
import { queryClient } from "@api/queryClient";
import { projectQueries } from "@core/project";
import { useMutation } from "@tanstack/react-query";
import { healthQueries } from "./healthQueries";

const useRetryDocProcessingJobs = () =>
  useMutation({
    mutationKey: [...healthQueries.all(), "retryDocProcessingJobs"],
    mutationFn: DocProcessingService.retryFailedSdocs,
    // the steps compute again: the features they belong to are computing (the steps send no events)
    onSuccess: (_data, { projectId }) =>
      queryClient.invalidateQueries({ queryKey: projectQueries.features(projectId).queryKey }),
    meta: {
      successMessage: (data: string) => data,
    },
  });

const useRecomputeDocProcessingJobs = () =>
  useMutation({
    mutationKey: [...healthQueries.all(), "recomputeDocProcessingJobs"],
    mutationFn: DocProcessingService.recomputeProcessingStep,
    // see useRetryDocProcessingJobs
    onSuccess: (_data, { projectId }) =>
      queryClient.invalidateQueries({ queryKey: projectQueries.features(projectId).queryKey }),
    meta: {
      successMessage: (
        data: number,
        variables: { processingStep: string; requestBody: Body_docProcessing_recompute_processing_step },
      ) =>
        `Successfully started '${variables.processingStep}' recompute job for ${variables.requestBody.sdoc_ids.length} / ${data} documents!`,
    },
  });

export const HealthHooks = {
  useRetryDocProcessingJobs,
  useRecomputeDocProcessingJobs,
};
