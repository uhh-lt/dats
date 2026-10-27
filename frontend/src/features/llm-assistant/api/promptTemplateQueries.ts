import { PromptTemplateService } from "@api/services/PromptTemplateService";
import type { PromptTemplateRead } from "@models/PromptTemplateRead";
import { queryOptions, skipToken } from "@tanstack/react-query";

export type PromptTemplateMap = Record<number, PromptTemplateRead>;

/**
 * Query factory for the stored prompt templates of the LLM assistant.
 *
 *   promptTemplateQueries.all()                ["promptTemplate"]
 *   promptTemplateQueries.byProject(projectId) ["promptTemplate", "project", projectId]
 */
export const promptTemplateQueries = {
  all: () => ["promptTemplate"] as const,

  // all prompt templates of a project with all their versions, as a map by id
  byProjectScope: () => [...promptTemplateQueries.all(), "project"] as const,
  byProject: (projectId: number | null | undefined) =>
    queryOptions({
      queryKey: [...promptTemplateQueries.byProjectScope(), projectId] as const,
      queryFn:
        projectId === null || projectId === undefined
          ? skipToken
          : async () => {
              const templates = await PromptTemplateService.getByProject({ projectId });
              return templates.reduce<PromptTemplateMap>((acc, template) => {
                acc[template.id] = template;
                return acc;
              }, {});
            },
      staleTime: 1000 * 60 * 5,
    }),
};
