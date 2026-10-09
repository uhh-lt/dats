import { queryClient } from "@api/queryClient";
import { LlmService } from "@api/services/LlmService";
import { jobQueries } from "@core/job";
import { ApproachType } from "@models/ApproachType";
import { LlmAssistantJobRead } from "@models/LlmAssistantJobRead";
import { useMutation } from "@tanstack/react-query";

export const useStartLLMJob = () =>
  useMutation({
    mutationKey: [...jobQueries.llm.all(), "startLLMJob"],
    mutationFn: LlmService.startLlmAssistantJob,
    onSuccess: (job) => {
      // force refetch of all llm jobs when adding a new one
      queryClient.invalidateQueries({ queryKey: jobQueries.llm.byProject(job.project_id).queryKey });
    },
    meta: {
      successMessage: (data: LlmAssistantJobRead) => `Started LLM Job as a new background task (ID: ${data.job_id})`,
    },
  });

export const useCreatePromptTemplates = () =>
  useMutation({
    mutationKey: [...jobQueries.llm.all(), "createPromptTemplates"],
    mutationFn: LlmService.createPromptTemplates,
    meta: {
      successMessage: () => `Created prompt templates`,
    },
  });

export const useDetermineApproach = () =>
  useMutation({
    mutationKey: [...jobQueries.llm.all(), "determineApproach"],
    mutationFn: LlmService.determineApproach,
    meta: {
      successMessage: (data: ApproachType) => `Determined approach type: ${data}`,
    },
  });
