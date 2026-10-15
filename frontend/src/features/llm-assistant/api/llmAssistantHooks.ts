import { queryClient } from "@api/queryClient";
import { LlmService } from "@api/services/LlmService";
import { ApproachType } from "@models/ApproachType";
import { LlmAssistantJobRead } from "@models/LlmAssistantJobRead";
import { TaskType } from "@models/TaskType";
import { useMutation, useQuery } from "@tanstack/react-query";
import { llmAssistantQueries } from "./llmAssistantQueries";

const useStartLLMJob = () =>
  useMutation({
    mutationKey: [...llmAssistantQueries.job.all(), "start"],
    mutationFn: LlmService.startLlmAssistantJob,
    onSuccess: (job) => {
      // force refetch of all llm jobs when adding a new one
      queryClient.invalidateQueries({ queryKey: llmAssistantQueries.job.byProject(job.project_id).queryKey });
    },
    meta: {
      successMessage: (data: LlmAssistantJobRead) => `Started LLM Job as a new background task (ID: ${data.job_id})`,
    },
  });

const useCreatePromptTemplates = () =>
  useMutation({
    mutationKey: [...llmAssistantQueries.all(), "createPromptTemplates"],
    mutationFn: LlmService.createPromptTemplates,
    meta: {
      successMessage: () => `Created prompt templates`,
    },
  });

const useDetermineApproach = () =>
  useMutation({
    mutationKey: [...llmAssistantQueries.all(), "determineApproach"],
    mutationFn: LlmService.determineApproach,
    meta: {
      successMessage: (data: ApproachType) => `Determined approach type: ${data}`,
    },
  });

const useCountExistingAssistantAnnotations = (params: {
  taskType: TaskType | undefined;
  approachType: ApproachType;
  sdocIds: number[];
  codeIds: number[];
}) =>
  useQuery({
    ...llmAssistantQueries.existingAnnotationCount(params),
    enabled: params.taskType === TaskType.SENTENCE_ANNOTATION || params.taskType === TaskType.ANNOTATION,
  });

export const LlmAssistantHooks = {
  useStartLLMJob,
  useCreatePromptTemplates,
  useDetermineApproach,
  useCountExistingAssistantAnnotations,
};
