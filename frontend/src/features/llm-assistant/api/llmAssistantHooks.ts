import { LlmAssistantService } from "@api/services/LlmAssistantService";
import { LlmAssistantJobRead } from "@models/LlmAssistantJobRead";
import { TaskType } from "@models/TaskType";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ExistingAnnotationCountParams, llmAssistantQueries } from "./llmAssistantQueries";

const useStartLLMAssistantJob = () =>
  useMutation({
    mutationKey: [...llmAssistantQueries.job.all(), "start"],
    mutationFn: LlmAssistantService.startLlmAssistantJob,
    meta: {
      datsEvent: "JOB_UPDATED",
      successMessage: (data: LlmAssistantJobRead) =>
        `Started LLM Assistant Job as a new background task (ID: ${data.job_id})`,
    },
  });

const useGetExistingAnnotationCount = (params: ExistingAnnotationCountParams) =>
  useQuery({
    ...llmAssistantQueries.existingAnnotationCount(params),
    enabled:
      params.virtualUserId !== undefined &&
      (params.taskType === TaskType.SENTENCE_ANNOTATION || params.taskType === TaskType.ANNOTATION),
  });

export const LlmAssistantHooks = {
  useStartLLMAssistantJob,
  useGetExistingAnnotationCount,
};
