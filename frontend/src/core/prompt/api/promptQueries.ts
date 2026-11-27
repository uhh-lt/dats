import { PromptsService } from "@api/services/PromptsService";
import type { OutputFormat } from "@models/OutputFormat";
import type { PromptLanguage } from "@models/PromptLanguage";
import type { PromptPreviewRequest } from "@models/PromptPreviewRequest";
import type { PromptRead } from "@models/PromptRead";
import type { TaskType } from "@models/TaskType";
import { keepPreviousData, queryOptions, skipToken } from "@tanstack/react-query";

export type PromptMap = Record<number, PromptRead>;

/**
 * Query factory for the prompts of a project and their blocks.
 *
 *   promptQueries.all()                                         ["prompt"]
 *   promptQueries.projectScope(projectId)                       ["prompt", "project", projectId]
 *   promptQueries.byProject(projectId)                          ["prompt", "project", projectId]
 *   promptQueries.taskInfo(projectId, taskType)                 ["prompt", "project", projectId, "taskInfo", taskType]
 *   promptQueries.defaultPrompt(projectId, outputFormat, lang)  ["prompt", "project", projectId, "default", outputFormat, lang]
 *   promptQueries.preview(projectId, request)                   ["prompt", "project", projectId, "preview", request]
 */
export const promptQueries = {
  all: () => ["prompt"] as const,
  // prefix of all prompt queries of one project
  projectScope: (projectId: number | undefined) => [...promptQueries.all(), "project", projectId] as const,

  // all prompts of a project with all their versions, as a map by id
  byProject: (projectId: number) =>
    queryOptions({
      queryKey: promptQueries.projectScope(projectId),
      queryFn: async () => {
        const prompts = await PromptsService.getByProject({ projectId });
        return prompts.reduce<PromptMap>((acc, prompt) => {
          acc[prompt.id] = prompt;
          return acc;
        }, {});
      },
      staleTime: 1000 * 60 * 5,
    }),

  // the blocks that the prompts of a task can use (static per backend version)
  taskInfoScope: (projectId: number | undefined) => [...promptQueries.projectScope(projectId), "taskInfo"] as const,
  taskInfo: (projectId: number | undefined, taskType: TaskType | undefined) =>
    queryOptions({
      queryKey: [...promptQueries.taskInfoScope(projectId), taskType] as const,
      queryFn: !projectId || !taskType ? skipToken : () => PromptsService.getTaskInfo({ projectId, taskType }),
      staleTime: Infinity,
    }),

  // the default prompt of an output format in a language, the start of a new prompt
  defaultPromptScope: (projectId: number | undefined) => [...promptQueries.projectScope(projectId), "default"] as const,
  defaultPrompt: (
    projectId: number | undefined,
    outputFormat: OutputFormat | undefined,
    language: PromptLanguage | undefined,
  ) =>
    queryOptions({
      queryKey: [...promptQueries.defaultPromptScope(projectId), outputFormat, language] as const,
      queryFn:
        !projectId || !outputFormat || !language
          ? skipToken
          : () => PromptsService.getDefault({ projectId, outputFormat, language }),
      staleTime: Infinity,
    }),

  // the rendered prompt of one message (document, sentence or chunk) of a document
  previewScope: (projectId: number | undefined) => [...promptQueries.projectScope(projectId), "preview"] as const,
  preview: (projectId: number | undefined, request: PromptPreviewRequest | undefined) =>
    queryOptions({
      queryKey: [...promptQueries.previewScope(projectId), request] as const,
      queryFn:
        !projectId || !request ? skipToken : () => PromptsService.computePreview({ projectId, requestBody: request }),
      retry: false,
      placeholderData: keepPreviousData,
    }),
};
