import { SearchViewService } from "@api/services/SearchViewService";
import { SearchEntityType } from "@models/SearchEntityType";
import { queryOptions } from "@tanstack/react-query";

/**
 * Query factory for the saved search views of the entity workspaces (memo, span, sentence, bbox).
 *
 *   searchViewQueries.all()                          ["searchViews"]
 *   searchViewQueries.byEntity(entityType)           ["searchViews", entityType]
 *   searchViewQueries.byProject(entityType, projId)  ["searchViews", entityType, projId]
 */
export const searchViewQueries = {
  all: () => ["searchViews"] as const,

  // prefix of all views of one entity type (any project), for invalidation
  byEntity: (entityType: SearchEntityType) => [...searchViewQueries.all(), entityType] as const,
  byProject: (entityType: SearchEntityType, projectId: number) =>
    queryOptions({
      queryKey: [...searchViewQueries.byEntity(entityType), projectId] as const,
      queryFn: () => SearchViewService.getByProject({ projectId, entityType }),
    }),
};
