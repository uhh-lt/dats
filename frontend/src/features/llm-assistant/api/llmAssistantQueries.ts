import { createJobQueries } from "@core/job";
import { LlmAssistantService } from "@api/services/LlmAssistantService";
import { ApproachType } from "@models/ApproachType";
import type { LLMAssistantPromptPreviewRequest } from "@models/LLMAssistantPromptPreviewRequest";
import { TaskType } from "@models/TaskType";
import { keepPreviousData, queryOptions, skipToken } from "@tanstack/react-query";

export interface ExistingAnnotationCountParams {
  taskType: TaskType | undefined;
  approachType: ApproachType;
  sdocIds: number[];
  codeIds: number[];
}

/**
 * Query factory for the LLM assistant.
 *
 *   llmAssistantQueries.all()                         ["llmAssistant"]
 *   llmAssistantQueries.strategies(taskType)          ["llmAssistant", "strategies", taskType]
 *   llmAssistantQueries.existingAnnotationCount(...)  ["llmAssistant", "existingAnnotationCount", ...]
 *   llmAssistantQueries.promptPreview(request)        ["llmAssistant", "promptPreview", request]
 *   llmAssistantQueries.job.byId(jobId)               ["llmAssistant", "job", "detail", jobId]
 *   llmAssistantQueries.job.byProject(projectId)      ["llmAssistant", "job", "project", projectId]
 */
export const llmAssistantQueries = {
  all: () => ["llmAssistant"] as const,

  strategiesScope: () => [...llmAssistantQueries.all(), "strategies"] as const,
  strategies: (taskType: TaskType | undefined) =>
    queryOptions({
      queryKey: [...llmAssistantQueries.strategiesScope(), taskType] as const,
      queryFn: !taskType ? skipToken : () => LlmAssistantService.listStrategies({ taskType }),
    }),

  existingAnnotationCountScope: () => [...llmAssistantQueries.all(), "existingAnnotationCount"] as const,
  existingAnnotationCount: ({ taskType, approachType, sdocIds, codeIds }: ExistingAnnotationCountParams) =>
    queryOptions({
      queryKey: [
        ...llmAssistantQueries.existingAnnotationCountScope(),
        taskType,
        approachType,
        sdocIds,
        codeIds,
      ] as const,
      queryFn: !taskType
        ? skipToken
        : () =>
            LlmAssistantService.countExistingAssistantAnnotations({
              taskType,
              approachType,
              requestBody: { sdoc_ids: sdocIds, code_ids: codeIds },
            }),
    }),

  // the filled prompts of one message (sentence or chunk) of a document, rendered by the backend
  promptPreviewScope: () => [...llmAssistantQueries.all(), "promptPreview"] as const,
  promptPreview: (request: LLMAssistantPromptPreviewRequest | undefined) =>
    queryOptions({
      queryKey: [...llmAssistantQueries.promptPreviewScope(), request] as const,
      queryFn: !request ? skipToken : () => LlmAssistantService.previewPrompt({ requestBody: request }),
      retry: false,
      placeholderData: keepPreviousData,
    }),

  // the background job of the LLM assistant
  job: createJobQueries(
    "llmAssistant",
    (jobId) => LlmAssistantService.getLlmAssistantJobById({ jobId }),
    (projectId) => LlmAssistantService.getLlmAssistantJobsByProject({ projectId }),
  ),
};
