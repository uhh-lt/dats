import { LlmService } from "@api/services/LlmService";
import { ApproachType } from "@models/ApproachType";
import { TaskType } from "@models/TaskType";
import { queryOptions, skipToken } from "@tanstack/react-query";

interface ExistingAnnotationCountParams {
  taskType: TaskType | undefined;
  approachType: ApproachType;
  sdocIds: number[];
  codeIds: number[];
}

const llmJobQueries = {
  all: () => [...llmAssistantQueries.all(), "job"] as const,
  byId: (jobId: string | null | undefined) =>
    queryOptions({
      queryKey: [...llmJobQueries.all(), "detail", jobId] as const,
      queryFn: !jobId ? skipToken : () => LlmService.getLlmAssistantJobById({ jobId }),
    }),
  byProjectScope: () => [...llmJobQueries.all(), "project"] as const,
  byProject: (projectId: number | null | undefined) =>
    queryOptions({
      queryKey: [...llmJobQueries.byProjectScope(), projectId] as const,
      queryFn: !projectId ? skipToken : () => LlmService.getLlmAssistantJobsByProject({ projectId }),
    }),
};

/**
 * Query factory for the LLM assistant.
 *
 *   llmAssistantQueries.all()                         ["llmAssistant"]
 *   llmAssistantQueries.strategies(taskType)          ["llmAssistant", "strategies", taskType]
 *   llmAssistantQueries.existingAnnotationCount(...)  ["llmAssistant", "existingAnnotationCount", ...]
 *   llmAssistantQueries.job.byId(jobId)               ["llmAssistant", "job", "detail", jobId]
 *   llmAssistantQueries.job.byProject(projectId)      ["llmAssistant", "job", "project", projectId]
 */
export const llmAssistantQueries = {
  all: () => ["llmAssistant"] as const,

  strategiesScope: () => [...llmAssistantQueries.all(), "strategies"] as const,
  strategies: (taskType: TaskType | undefined) =>
    queryOptions({
      queryKey: [...llmAssistantQueries.strategiesScope(), taskType] as const,
      queryFn: !taskType ? skipToken : () => LlmService.listStrategies({ taskType }),
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
            LlmService.countExistingAssistantAnnotations({
              taskType,
              approachType,
              requestBody: { sdoc_ids: sdocIds, code_ids: codeIds },
            }),
    }),

  // the background job of the LLM assistant
  job: llmJobQueries,
};
