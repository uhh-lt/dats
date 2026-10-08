import { LlmService } from "@api/services/LlmService";
import { RagService } from "@api/services/RagService";
import { ApproachType } from "@models/ApproachType";
import { TaskType } from "@models/TaskType";
import { queryOptions, skipToken } from "@tanstack/react-query";

interface ExistingAnnotationCountParams {
  taskType: TaskType | undefined;
  approachType: ApproachType;
  sdocIds: number[];
  codeIds: number[];
}

/**
 * Query factory for the LLM assistant.
 *
 *   llmQueries.all()                         ["llm"]
 *   llmQueries.availableModels()             ["llm", "availableModels"]
 *   llmQueries.strategies(taskType)          ["llm", "strategies", taskType]
 *   llmQueries.existingAnnotationCount(...)  ["llm", "existingAnnotationCount", taskType, approachType, sdocIds, codeIds]
 */
export const llmQueries = {
  all: () => ["llm"] as const,

  availableModelsScope: () => [...llmQueries.all(), "availableModels"] as const,
  availableModels: () =>
    queryOptions({
      queryKey: llmQueries.availableModelsScope(),
      queryFn: () => RagService.getAvailableModels(),
    }),

  strategiesScope: () => [...llmQueries.all(), "strategies"] as const,
  strategies: (taskType: TaskType | undefined) =>
    queryOptions({
      queryKey: [...llmQueries.strategiesScope(), taskType] as const,
      queryFn: !taskType ? skipToken : () => LlmService.listStrategies({ taskType }),
    }),

  existingAnnotationCountScope: () => [...llmQueries.all(), "existingAnnotationCount"] as const,
  existingAnnotationCount: ({ taskType, approachType, sdocIds, codeIds }: ExistingAnnotationCountParams) =>
    queryOptions({
      queryKey: [...llmQueries.existingAnnotationCountScope(), taskType, approachType, sdocIds, codeIds] as const,
      queryFn: !taskType
        ? skipToken
        : () =>
            LlmService.countExistingAssistantAnnotations({
              taskType,
              approachType,
              requestBody: { sdoc_ids: sdocIds, code_ids: codeIds },
            }),
    }),
};
