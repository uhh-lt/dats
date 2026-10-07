import { jobQueries } from "@api/queries/jobQueries";
import { queryClient } from "@api/queryClient";
import { LlmService } from "@api/services/LlmService";
import { RagService } from "@api/services/RagService";
import { ApproachType } from "@models/ApproachType";
import { LlmAssistantJobRead } from "@models/LlmAssistantJobRead";
import { StrategyInfo } from "@models/StrategyInfo";
import { TaskType } from "@models/TaskType";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useJobRefetchInterval } from "./jobPolling";
import { QueryKey } from "./QueryKey";

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

const useCountExistingAssistantAnnotations = ({
  taskType,
  approachType,
  sdocIds,
  codeIds,
}: {
  taskType?: TaskType;
  approachType: ApproachType;
  sdocIds: number[];
  codeIds: number[];
}) => {
  return useQuery<Record<string, number>, Error>({
    queryKey: ["Existing-Annotation-Count", taskType, approachType, sdocIds, codeIds],
    queryFn: () =>
      LlmService.countExistingAssistantAnnotations({
        taskType: taskType!,
        approachType,
        requestBody: {
          sdoc_ids: sdocIds,
          code_ids: codeIds,
        },
      }),
    enabled: taskType === TaskType.SENTENCE_ANNOTATION || taskType === TaskType.ANNOTATION,
  });
};

const useGetAvailableLLMs = () =>
  useQuery<string[], Error>({
    queryKey: [QueryKey.AVAILABLE_LLMS],
    queryFn: () => RagService.getAvailableModels(),
  });

const useListStrategies = (taskType: TaskType | undefined) =>
  useQuery<StrategyInfo[], Error>({
    queryKey: [QueryKey.LLM_STRATEGIES, taskType],
    queryFn: () => LlmService.listStrategies({ taskType: taskType! }),
    enabled: !!taskType,
  });

export const LLMHooks = {
  useLiveLLMJob,
  useStartLLMJob,
  useDetermineApproach,
  useCreatePromptTemplates,
  useCountExistingAssistantAnnotations,
  useGetAvailableLLMs,
  useListStrategies,
};
