import { queryClient } from "@api/queryClient";
import { LlmService } from "@api/services/LlmService";
import { JobHooks, jobQueries } from "@core/job";
import { ApproachType } from "@models/ApproachType";
import { LlmAssistantJobRead } from "@models/LlmAssistantJobRead";
import { TaskType } from "@models/TaskType";
import { useMutation, useQuery } from "@tanstack/react-query";
import { llmQueries } from "./llmQueries";

const useLiveLLMJob = (llmJobId: string | undefined, initialData: LlmAssistantJobRead | undefined) => {
  const jobRefetchInterval = JobHooks.useJobRefetchInterval<LlmAssistantJobRead>();
  return useQuery({
    ...jobQueries.llm.byId(llmJobId),
    refetchInterval: jobRefetchInterval,
    initialData,
  });
};

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

const useGetAllLLMJobs = (projectId: number | undefined) => useQuery(jobQueries.llm.byProject(projectId));

const useCountExistingAssistantAnnotations = (params: {
  taskType: TaskType | undefined;
  approachType: ApproachType;
  sdocIds: number[];
  codeIds: number[];
}) =>
  useQuery({
    ...llmQueries.existingAnnotationCount(params),
    enabled: params.taskType === TaskType.SENTENCE_ANNOTATION || params.taskType === TaskType.ANNOTATION,
  });

const useGetAvailableLLMs = () => useQuery(llmQueries.availableModels());

const useListStrategies = (taskType: TaskType | undefined) => useQuery(llmQueries.strategies(taskType));

export const LLMHooks = {
  useLiveLLMJob,
  useStartLLMJob,
  useCreatePromptTemplates,
  useDetermineApproach,
  useGetAllLLMJobs,
  useCountExistingAssistantAnnotations,
  useGetAvailableLLMs,
  useListStrategies,
};
