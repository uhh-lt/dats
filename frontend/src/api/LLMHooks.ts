import { useMutation, useQuery } from "@tanstack/react-query";
import queryClient from "../plugins/ReactQueryClient.ts";
import { QueryKey } from "./QueryKey.ts";
import { ApproachType } from "./openapi/models/ApproachType.ts";
import { BackgroundJobStatus } from "./openapi/models/BackgroundJobStatus.ts";
import { LLMJobRead } from "./openapi/models/LLMJobRead.ts";
import { TaskType } from "./openapi/models/TaskType.ts";
import { LlmService } from "./openapi/services/LlmService.ts";

const useStartLLMJob = () =>
  useMutation({
    mutationFn: LlmService.startLlmJob,
    onSuccess: (job) => {
      // force refetch of all llm jobs when adding a new one
      queryClient.invalidateQueries({ queryKey: [QueryKey.PROJECT_LLM_JOBS, job.parameters.project_id] });
    },
    meta: {
      successMessage: (data: LLMJobRead) => `Started LLM Job as a new background task (ID: ${data.id})`,
    },
  });

const usePollLLMJob = (llmJobId: string | undefined, initialData: LLMJobRead | undefined) => {
  return useQuery<LLMJobRead, Error>({
    queryKey: [QueryKey.LLM_JOB, llmJobId],
    queryFn: () =>
      LlmService.getLlmJob({
        llmJobId: llmJobId!,
      }),
    enabled: !!llmJobId,
    refetchInterval: (query) => {
      if (!query.state.data) {
        return 1000;
      }
      if (query.state.data.status) {
        switch (query.state.data.status) {
          case BackgroundJobStatus.ERRORNEOUS:
          case BackgroundJobStatus.FINISHED:
            return false;
          case BackgroundJobStatus.WAITING:
          case BackgroundJobStatus.RUNNING:
            return 1000;
        }
      }
      return false;
    },
    initialData,
  });
};

const useGetAllLLMJobs = (projectId: number) => {
  return useQuery<LLMJobRead[], Error>({
    queryKey: [QueryKey.PROJECT_LLM_JOBS, projectId],
    queryFn: () =>
      LlmService.getAllLlmJobs({
        projectId: projectId!,
      }),
    enabled: !!projectId,
  });
};

const useCreatePromptTemplates = () =>
  useMutation({
    mutationFn: LlmService.createPromptTemplates,
    meta: {
      successMessage: () => `Created prompt templates`,
    },
  });

const useCreateTrainingParameters = () =>
  useMutation({
    mutationFn: LlmService.createTrainingParameters,
    meta: {
      successMessage: () => `Created training parameters`,
    },
  });

const useDetermineApproach = () =>
  useMutation({
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
    enabled: taskType === TaskType.SENTENCE_ANNOTATION,
  });
};

const LLMHooks = {
  usePollLLMJob,
  useStartLLMJob,
  useGetAllLLMJobs,
  useDetermineApproach,
  useCreatePromptTemplates,
  useCreateTrainingParameters,
  useCountExistingAssistantAnnotations,
};

export default LLMHooks;
