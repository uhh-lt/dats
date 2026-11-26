import { PromptService } from "@api/services/PromptService";
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
 *   promptQueries.all()                                 ["prompt"]
 *   promptQueries.byProject(projectId)                  ["prompt", "project", projectId]
 *   promptQueries.taskInfo(projectId, taskType)                 ["prompt", "taskInfo", taskType, projectId]
 *   promptQueries.defaultPrompt(projectId, outputFormat, lang)  ["prompt", "default", outputFormat, lang, projectId]
 *   promptQueries.preview(projectId, request)                   ["prompt", "preview", request, projectId]
 */
export const promptQueries = {
  all: () => ["prompt"] as const,

  // all prompts of a project with all their versions, as a map by id
  byProjectScope: () => [...promptQueries.all(), "project"] as const,
  byProject: (projectId: number) =>
    queryOptions({
      queryKey: [...promptQueries.byProjectScope(), projectId] as const,
      queryFn: async () => {
        const prompts = await PromptService.getByProject({ projectId });
        return prompts.reduce<PromptMap>((acc, prompt) => {
          acc[prompt.id] = prompt;
          return acc;
        }, {});
      },
      staleTime: 1000 * 60 * 5,
    }),

  // the blocks that the prompts of a task can use (static per backend version)
  taskInfoScope: () => [...promptQueries.all(), "taskInfo"] as const,
  taskInfo: (projectId: number | undefined, taskType: TaskType | undefined) =>
    queryOptions({
      queryKey: [...promptQueries.taskInfoScope(), taskType, projectId] as const,
      queryFn: !projectId || !taskType ? skipToken : () => PromptService.getTaskInfo({ projectId, taskType }),
      staleTime: Infinity,
    }),

  // the default prompt of an output format in a language, the start of a new prompt
  defaultPromptScope: () => [...promptQueries.all(), "default"] as const,
  defaultPrompt: (
    projectId: number | undefined,
    outputFormat: OutputFormat | undefined,
    language: PromptLanguage | undefined,
  ) =>
    queryOptions({
      queryKey: [...promptQueries.defaultPromptScope(), outputFormat, language, projectId] as const,
      queryFn:
        !projectId || !outputFormat || !language
          ? skipToken
          : () => PromptService.getDefault({ projectId, outputFormat, language }),
      staleTime: Infinity,
    }),

  // the rendered prompt of one message (document, sentence or chunk) of a document
  previewScope: () => [...promptQueries.all(), "preview"] as const,
  preview: (projectId: number | undefined, request: PromptPreviewRequest | undefined) =>
    queryOptions({
      queryKey: [...promptQueries.previewScope(), request, projectId] as const,
      queryFn: !projectId || !request ? skipToken : () => PromptService.preview({ projectId, requestBody: request }),
      retry: false,
      placeholderData: keepPreviousData,
    }),
};
