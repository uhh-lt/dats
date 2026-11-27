import { AnnotationScalingService } from "@api/services/AnnotationScalingService";
import { queryOptions, skipToken } from "@tanstack/react-query";

/**
 * Query factory for the annotation scaling suggestions.
 *
 *   annoscalingQueries.all()                                 ["annoscaling"]
 *   annoscalingQueries.projectScope(projId)                  ["annoscaling", "project", projId]
 *   annoscalingQueries.suggest(projId, codeId, antiCodeId)   ["annoscaling", "project", projId, "suggest", codeId, antiCodeId]
 */
export const annoscalingQueries = {
  all: () => ["annoscaling"] as const,
  // prefix of all annotation scaling queries of one project
  projectScope: (projectId: number) => [...annoscalingQueries.all(), "project", projectId] as const,

  suggestScope: (projectId: number) => [...annoscalingQueries.projectScope(projectId), "suggest"] as const,
  suggest: (projectId: number, codeId: number | undefined, antiCodeId: number | undefined) =>
    queryOptions({
      queryKey: [...annoscalingQueries.suggestScope(projectId), codeId, antiCodeId] as const,
      queryFn:
        !codeId || !antiCodeId
          ? skipToken
          : () =>
              AnnotationScalingService.computeSuggestions({
                projectId,
                requestBody: { code_id: codeId, reject_code_id: antiCodeId, top_k: 10 },
              }),
    }),
};
