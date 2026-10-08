import { jobQueries } from "@api/queries/jobQueries";
import { queryClient } from "@api/queryClient";
import { LlmService } from "@api/services/LlmService";
import { ApproachType } from "@models/ApproachType";
import { LlmAssistantJobRead } from "@models/LlmAssistantJobRead";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useJobRefetchInterval } from "./jobPolling";

const useStartLLMJob = () =>
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

const useLiveLLMJob = (llmJobId: string | undefined, initialData: LlmAssistantJobRead | undefined) => {
  const jobRefetchInterval = useJobRefetchInterval<LlmAssistantJobRead>();
  return useQuery({
    ...jobQueries.llm.byId(llmJobId),
    refetchInterval: jobRefetchInterval,
    initialData,
  });
};

const useCreatePromptTemplates = () =>
  useMutation({
    mutationKey: [...jobQueries.llm.all(), "createPromptTemplates"],
    mutationFn: LlmService.createPromptTemplates,
    meta: {
      successMessage: () => `Created prompt templates`,
    },
  });

const useDetermineApproach = () =>
  useMutation({
    mutationKey: [...jobQueries.llm.all(), "determineApproach"],
    mutationFn: LlmService.determineApproach,
    meta: {
      successMessage: (data: ApproachType) => `Determined approach type: ${data}`,
    },
  });

export const LLMHooks = {
  useLiveLLMJob,
  useStartLLMJob,
  useDetermineApproach,
  useCreatePromptTemplates,
};
