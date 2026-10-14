import { queryClient } from "@api/queryClient";
import { LlmService } from "@api/services/LlmService";
import { useJobRefetchInterval } from "@core/job";
import { ApproachType } from "@models/ApproachType";
import { LlmAssistantJobRead } from "@models/LlmAssistantJobRead";
import { TaskType } from "@models/TaskType";
import { useMutation, useQuery } from "@tanstack/react-query";
import { llmAssistantQueries } from "./llmAssistantQueries";

const useLiveLLMJob = (llmJobId: string | undefined, initialData: LlmAssistantJobRead | undefined) => {
  const jobRefetchInterval = useJobRefetchInterval<LlmAssistantJobRead>();
  return useQuery({
    ...llmAssistantQueries.job.byId(llmJobId),
    refetchInterval: jobRefetchInterval,
    initialData,
  });
};

const useStartLLMJob = () =>
  useMutation({
    mutationKey: [...llmAssistantQueries.job.all(), "startLLMJob"],
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
    mutationKey: [...llmAssistantQueries.job.all(), "createPromptTemplates"],
    mutationFn: LlmService.createPromptTemplates,
    meta: {
      successMessage: () => `Created prompt templates`,
    },
  });

const useDetermineApproach = () =>
  useMutation({
    mutationKey: [...llmAssistantQueries.job.all(), "determineApproach"],
    mutationFn: LlmService.determineApproach,
    meta: {
      successMessage: (data: ApproachType) => `Determined approach type: ${data}`,
    },
  });

const useGetAllLLMJobs = (projectId: number | undefined) => useQuery(llmAssistantQueries.job.byProject(projectId));

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

const useListStrategies = (taskType: TaskType | undefined) => useQuery(llmAssistantQueries.strategies(taskType));

export const LlmAssistantHooks = {
  useLiveLLMJob,
  useStartLLMJob,
  useCreatePromptTemplates,
  useDetermineApproach,
  useGetAllLLMJobs,
  useCountExistingAssistantAnnotations,
  useListStrategies,
};
