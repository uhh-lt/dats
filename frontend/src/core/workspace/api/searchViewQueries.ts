import { SearchViewService } from "@api/services/SearchViewService";
import { SearchEntityType } from "@models/SearchEntityType";
import { queryOptions } from "@tanstack/react-query";
import { SearchViewBase } from "../types/SearchViewBase";

// the generated type of the endpoints: the union of the view types of all entities
type AnySearchViewRead = Awaited<ReturnType<typeof SearchViewService.getByProject>>[number];

/**
 * The search view endpoints return the views of one entity type only, but are generated with the union of all view
 * types; this narrows their result to the view type of the entity (the only cast of the search views).
 */
export const asViewsOfEntity = <TView extends SearchViewBase>(views: AnySearchViewRead[]) =>
  views as unknown as TView[];

/**
 * Query factory for the saved search views of the entity workspaces (memo, span, sentence, bbox).
 *
 *   searchViewQueries.all()                                  ["searchView"]
 *   searchViewQueries.byProject<TView>(entityType, projId)   ["searchView", entityType, projId]
 */
export const searchViewQueries = {
  all: () => ["searchView"] as const,

  // prefix of all views of one entity type (any project), for invalidation
  byProjectOfEntityScope: (entityType: SearchEntityType) => [...searchViewQueries.all(), entityType] as const,
  // TView: the view type of entityType (e.g. MemoSearchViewRead), so the cache entry is typed as TView[]
  byProject: <TView extends SearchViewBase = AnySearchViewRead>(entityType: SearchEntityType, projectId: number) =>
    queryOptions({
      queryKey: [...searchViewQueries.byProjectOfEntityScope(entityType), projectId] as const,
      queryFn: async () => asViewsOfEntity<TView>(await SearchViewService.getByProject({ projectId, entityType })),
    }),
};
