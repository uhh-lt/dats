import { AnnoscalingService } from "@api/services/AnnoscalingService";
import { queryOptions, skipToken } from "@tanstack/react-query";

/**
 * Query factory for the annotation scaling suggestions.
 *
 *   annoscalingQueries.all()                                 ["annoscaling"]
 *   annoscalingQueries.suggest(projId, codeId, antiCodeId)   ["annoscaling", "suggest", projId, codeId, antiCodeId]
 */
export const annoscalingQueries = {
  all: () => ["annoscaling"] as const,

  suggestScope: () => [...annoscalingQueries.all(), "suggest"] as const,
  suggest: (projectId: number, codeId: number | undefined, antiCodeId: number | undefined) =>
    queryOptions({
      queryKey: [...annoscalingQueries.suggestScope(), projectId, codeId, antiCodeId] as const,
      queryFn:
        !codeId || !antiCodeId
          ? skipToken
          : () =>
              AnnoscalingService.suggest({
                requestBody: { code_id: codeId, project_id: projectId, reject_cide_id: antiCodeId, top_k: 10 },
              }),
    }),
};
