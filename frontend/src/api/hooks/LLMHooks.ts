import { ApproachType } from "@api/models/ApproachType";
import { JobStatus } from "@api/models/JobStatus";
import { LlmAssistantJobRead } from "@api/models/LlmAssistantJobRead";
import { TaskType } from "@api/models/TaskType";
import { queryClient } from "@api/queryClient";
import { LlmService } from "@api/services/LlmService";
import { RagService } from "@api/services/RagService";
import { useMutation, useQuery } from "@tanstack/react-query";
import { QueryKey } from "./QueryKey";

const useStartLLMJob = () =>
  useMutation({
    mutationFn: LlmService.startLlmAssistantJob,
    onSuccess: (job) => {
      // force refetch of all llm jobs when adding a new one
      queryClient.invalidateQueries({ queryKey: [QueryKey.PROJECT_LLM_JOBS, job.project_id] });
    },
    meta: {
      successMessage: (data: LlmAssistantJobRead) => `Started LLM Job as a new background task (ID: ${data.job_id})`,
    },
  });

const usePollLLMJob = (llmJobId: string | undefined, initialData: LlmAssistantJobRead | undefined) => {
  return useQuery<LlmAssistantJobRead, Error>({
    queryKey: [QueryKey.LLM_JOB, llmJobId],
    queryFn: () =>
      LlmService.getLlmAssistantJobById({
        jobId: llmJobId!,
      }),
    enabled: !!llmJobId,
    refetchInterval: (query) => {
      if (!query.state.data) {
        return 1000;
      }
      switch (query.state.data.status) {
        case JobStatus.CANCELED:
        case JobStatus.FAILED:
        case JobStatus.FINISHED:
        case JobStatus.STOPPED:
          return false;
        case JobStatus.DEFERRED:
        case JobStatus.QUEUED:
        case JobStatus.SCHEDULED:
        case JobStatus.STARTED:
          return 1000;
        default:
          return false;
      }
    },
    initialData,
  });
};

const useGetAllLLMJobs = (projectId: number | undefined) => {
  return useQuery<LlmAssistantJobRead[], Error>({
    queryKey: [QueryKey.PROJECT_LLM_JOBS, projectId],
    queryFn: () =>
      LlmService.getLlmAssistantJobsByProject({
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

const useGetAvailableLLMs = () =>
  useQuery<string[], Error>({
    queryKey: [QueryKey.AVAILABLE_LLMS],
    queryFn: () => RagService.getAvailableModels(),
  });

export const LLMHooks = {
  usePollLLMJob,
  useStartLLMJob,
  useGetAllLLMJobs,
  useDetermineApproach,
  useCreatePromptTemplates,
  useCountExistingAssistantAnnotations,
  useGetAvailableLLMs,
};
