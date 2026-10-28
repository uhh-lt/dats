import { createJobQueries } from "@core/job";
import { LlmAssistantService } from "@api/services/LlmAssistantService";
import { ApproachType } from "@models/ApproachType";
import { TaskType } from "@models/TaskType";
import { queryOptions, skipToken } from "@tanstack/react-query";

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
 *   llmAssistantQueries.existingAnnotationCount(...)  ["llmAssistant", "existingAnnotationCount", ...]
 *   llmAssistantQueries.job.byId(jobId)               ["llmAssistant", "job", "detail", jobId]
 *   llmAssistantQueries.job.byProject(projectId)      ["llmAssistant", "job", "project", projectId]
 */
export const llmAssistantQueries = {
  all: () => ["llmAssistant"] as const,

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

  // the background job of the LLM assistant
  job: createJobQueries(
    "llmAssistant",
    (jobId) => LlmAssistantService.getLlmAssistantJobById({ jobId }),
    (projectId) => LlmAssistantService.getLlmAssistantJobsByProject({ projectId }),
  ),
};
