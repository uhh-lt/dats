import { PromptTemplateService } from "@api/services/PromptTemplateService";
import type { OutputFormat } from "@models/OutputFormat";
import type { PromptLanguage } from "@models/PromptLanguage";
import type { PromptPreviewRequest } from "@models/PromptPreviewRequest";
import type { PromptTemplateRead } from "@models/PromptTemplateRead";
import type { TaskType } from "@models/TaskType";
import { keepPreviousData, queryOptions, skipToken } from "@tanstack/react-query";

export type PromptTemplateMap = Record<number, PromptTemplateRead>;

/**
 * Query factory for the prompt templates of a project and their blocks.
 *
 *   promptTemplateQueries.all()                                 ["promptTemplate"]
 *   promptTemplateQueries.byProject(projectId)                  ["promptTemplate", "project", projectId]
 *   promptTemplateQueries.taskInfo(taskType)                    ["promptTemplate", "taskInfo", taskType]
 *   promptTemplateQueries.defaultPrompt(outputFormat, lang)     ["promptTemplate", "default", outputFormat, lang]
 *   promptTemplateQueries.preview(request)                      ["promptTemplate", "preview", request]
 */
export const promptTemplateQueries = {
  all: () => ["promptTemplate"] as const,

  // all prompt templates of a project with all their versions, as a map by id
  byProjectScope: () => [...promptTemplateQueries.all(), "project"] as const,
  byProject: (projectId: number) =>
    queryOptions({
      queryKey: [...promptTemplateQueries.byProjectScope(), projectId] as const,
      queryFn: async () => {
        const templates = await PromptTemplateService.getByProject({ projectId });
        return templates.reduce<PromptTemplateMap>((acc, template) => {
          acc[template.id] = template;
          return acc;
        }, {});
      },
      staleTime: 1000 * 60 * 5,
    }),

  // the blocks that the prompts of a task can use (static per backend version)
  taskInfoScope: () => [...promptTemplateQueries.all(), "taskInfo"] as const,
  taskInfo: (taskType: TaskType | undefined) =>
    queryOptions({
      queryKey: [...promptTemplateQueries.taskInfoScope(), taskType] as const,
      queryFn: !taskType ? skipToken : () => PromptTemplateService.getTaskInfo({ taskType }),
      staleTime: Infinity,
    }),

  // the default prompt of an output format in a language, the start of a new prompt
  defaultPromptScope: () => [...promptTemplateQueries.all(), "default"] as const,
  defaultPrompt: (outputFormat: OutputFormat | undefined, language: PromptLanguage | undefined) =>
    queryOptions({
      queryKey: [...promptTemplateQueries.defaultPromptScope(), outputFormat, language] as const,
      queryFn:
        !outputFormat || !language ? skipToken : () => PromptTemplateService.getDefault({ outputFormat, language }),
      staleTime: Infinity,
    }),

  // the rendered prompt of one message (document, sentence or chunk) of a document
  previewScope: () => [...promptTemplateQueries.all(), "preview"] as const,
  preview: (request: PromptPreviewRequest | undefined) =>
    queryOptions({
      queryKey: [...promptTemplateQueries.previewScope(), request] as const,
      queryFn: !request ? skipToken : () => PromptTemplateService.preview({ requestBody: request }),
      retry: false,
      placeholderData: keepPreviousData,
    }),
};
