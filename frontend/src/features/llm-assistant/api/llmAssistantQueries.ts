import { JobService } from "@api/services/JobService";
import { createJobQueries } from "@core/job";
import { LlmAssistantService } from "@api/services/LlmAssistantService";
import { TaskType } from "@models/TaskType";
import { queryOptions, skipToken } from "@tanstack/react-query";

export interface ExistingAnnotationCountParams {
  projectId: number;
  taskType: TaskType | undefined;
  // the virtual user the run writes into; a new one has no annotations yet
  virtualUserId: number | undefined;
  sdocIds: number[];
  codeIds: number[];
}

/**
 * Query factory for the LLM assistant.
 *
 *   llmAssistantQueries.all()                         ["llmAssistant"]
 *   llmAssistantQueries.projectScope(projectId)       ["llmAssistant", "project", projectId]
 *   llmAssistantQueries.existingAnnotationCount(...)  ["llmAssistant", "project", projectId, "existingAnnotationCount", ...]
 *   llmAssistantQueries.job.byId(projectId, jobId)    ["llmAssistant", "job", "project", projectId, "detail", jobId]
 *   llmAssistantQueries.job.byProject(projectId)      ["llmAssistant", "job", "project", projectId]
 */
export const llmAssistantQueries = {
  all: () => ["llmAssistant"] as const,
  // prefix of all LLM assistant queries of one project (the jobs have their own root, `job.all()`)
  projectScope: (projectId: number) => [...llmAssistantQueries.all(), "project", projectId] as const,

  existingAnnotationCountScope: (projectId: number) =>
    [...llmAssistantQueries.projectScope(projectId), "existingAnnotationCount"] as const,
  existingAnnotationCount: ({ projectId, taskType, virtualUserId, sdocIds, codeIds }: ExistingAnnotationCountParams) =>
    queryOptions({
      queryKey: [
        ...llmAssistantQueries.existingAnnotationCountScope(projectId),
        taskType,
        virtualUserId,
        sdocIds,
        codeIds,
      ] as const,
      queryFn:
        !taskType || virtualUserId === undefined
          ? skipToken
          : () =>
              LlmAssistantService.computeExistingAnnotationCounts({
                projectId,
                taskType,
                virtualUserId,
                requestBody: { sdoc_ids: sdocIds, code_ids: codeIds },
              }),
    }),

  // the background job of the LLM assistant
  job: createJobQueries(
    "llmAssistant",
    (job) => JobService.getLlmAssistantJobById(job),
    (projectId) => JobService.getLlmAssistantJobsByProject({ projectId }),
    {
      abort: (job) => JobService.abortLlmAssistantJob(job),
      retry: (job) => JobService.retryLlmAssistantJob(job),
    },
  ),
};
