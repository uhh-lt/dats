import { createJobQueries } from "@core/job";
import { LlmAssistantService } from "@api/services/LlmAssistantService";
import { TaskType } from "@models/TaskType";
import { queryOptions, skipToken } from "@tanstack/react-query";

export interface ExistingAnnotationCountParams {
  taskType: TaskType | undefined;
  // the virtual annotator the run writes into; a new one has no annotations yet
  annotatorId: number | undefined;
  sdocIds: number[];
  codeIds: number[];
}

/**
 * Query factory for the LLM assistant.
 *
 *   llmAssistantQueries.all()                         ["llmAssistant"]
 *   llmAssistantQueries.existingAnnotationCount(...)  ["llmAssistant", "existingAnnotationCount", ...]
 *   llmAssistantQueries.job.byId(jobId)               ["llmAssistant", "job", "detail", jobId]
 *   llmAssistantQueries.job.byProject(projectId)      ["llmAssistant", "job", "project", projectId]
 */
export const llmAssistantQueries = {
  all: () => ["llmAssistant"] as const,

  existingAnnotationCountScope: () => [...llmAssistantQueries.all(), "existingAnnotationCount"] as const,
  existingAnnotationCount: ({ taskType, annotatorId, sdocIds, codeIds }: ExistingAnnotationCountParams) =>
    queryOptions({
      queryKey: [
        ...llmAssistantQueries.existingAnnotationCountScope(),
        taskType,
        annotatorId,
        sdocIds,
        codeIds,
      ] as const,
      queryFn:
        !taskType || annotatorId === undefined
          ? skipToken
          : () =>
              LlmAssistantService.countExistingAssistantAnnotations({
                taskType,
                annotatorId,
                requestBody: { sdoc_ids: sdocIds, code_ids: codeIds },
              }),
    }),

  // the background job of the LLM assistant
  job: createJobQueries(
    "llmAssistant",
    (jobId) => LlmAssistantService.getLlmAssistantJobById({ jobId }),
    (projectId) => LlmAssistantService.getLlmAssistantJobsByProject({ projectId }),
  ),
};
