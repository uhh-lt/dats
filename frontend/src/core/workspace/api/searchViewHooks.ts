import { queryClient } from "@api/queryClient";
import { SearchViewService } from "@api/services/SearchViewService";
import { SearchEntityType } from "@models/SearchEntityType";
import { useMutation, useQuery } from "@tanstack/react-query";
import { searchViewQueries } from "./searchViewQueries";

/**
 * Minimal structural shape every search view satisfies, regardless of entity.
 * The generated per-entity view types (MemoSearchViewRead, SpanSearchViewRead, ...)
 * are all assignable to this.
 */
export interface SearchViewBase {
  id: number;
  project_id: number;
  position: number;
}

/**
 * Factory for per-entity search-view hooks. The backend search-view CRUD is already
 * entity-agnostic (discriminated by `entityType`); this just scopes the entity type
 * so each entity gets its own typed hooks
 * (e.g. `MemoViewHooks`, `SpanAnnotationViewHooks`).
 */
export const createSearchViewHooks = <TView extends SearchViewBase>(entityType: SearchEntityType) => {
  // the service returns the union of all view types, the entity type selects the one of this hook
  const asViews = (views: Awaited<ReturnType<typeof SearchViewService.getByProject>>) => views as unknown as TView[];

  const useGetViews = (projectId: number) =>
    useQuery({
      ...searchViewQueries.byProject(entityType, projectId),
      select: asViews,
    });

  const useCreateView = () =>
    useMutation({
      mutationKey: [...searchViewQueries.byEntity(entityType), "create"],
      mutationFn: SearchViewService.create,
      meta: {
        datsEvent: "SEARCH_VIEW_CREATED",
      },
    });

  const useUpdateView = () =>
    useMutation({
      mutationKey: [...searchViewQueries.byEntity(entityType), "update"],
      mutationFn: SearchViewService.update,
      // Serialize updates per entity: rapid successive patches (e.g. toggling properties)
      // must reach the server in click order, since each patch is merged onto server state.
      scope: { id: `searchViews-update-${entityType}` },
      onMutate: async ({ viewId, requestBody }) => {
        // Optimistically merge the patch into every cached view list containing this view
        // (the update DTO carries no project_id, so match by view id). This makes the UI
        // react instantly and ensures the next click reads fresh state.
        const key = searchViewQueries.byEntity(entityType);
        await queryClient.cancelQueries({ queryKey: key });
        const previousEntries = queryClient.getQueriesData<TView[]>({ queryKey: key });
        queryClient.setQueriesData<TView[]>({ queryKey: key }, (views) =>
          (views ?? []).map((candidate) =>
            candidate.id === viewId ? ({ ...candidate, ...requestBody } as TView) : candidate,
          ),
        );
        return { previousEntries };
      },
      onError: (error, _variables, context) => {
        for (const [key, views] of context?.previousEntries ?? []) {
          queryClient.setQueryData(key, views);
        }
        console.error("Failed to update search view:", error);
      },
      meta: {
        datsEvent: "SEARCH_VIEW_UPDATED",
      },
    });

  const useReorderViews = (projectId: number) =>
    useMutation({
      mutationKey: [...searchViewQueries.byEntity(entityType), "reorder"],
      mutationFn: SearchViewService.reorder,
      scope: { id: `searchViews-order-${projectId}` },
      onMutate: ({ requestBody }) => {
        // untagged key: the cache of this hook is typed as TView[] (see useGetViews)
        const key = [...searchViewQueries.byEntity(entityType), projectId];
        queryClient.cancelQueries({ queryKey: key });
        const previousViews = queryClient.getQueryData<TView[]>(key);

        queryClient.setQueryData<TView[]>(key, (views) => {
          if (!views) return views;
          const viewById = new Map(views.map((view) => [view.id, view]));
          const reorderedViews = requestBody.view_ids.flatMap((viewId) => {
            const view = viewById.get(viewId);
            return view ? [view] : [];
          });
          if (reorderedViews.length !== views.length) return views;
          return reorderedViews.map((view, position) => ({ ...view, position }));
        });

        return { previousViews };
      },
      onError: (_error, _variables, context) => {
        queryClient.setQueryData<TView[]>(
          [...searchViewQueries.byEntity(entityType), projectId],
          (context as { previousViews?: TView[] })?.previousViews,
        );
      },
      onSuccess: (views) => {
        queryClient.setQueryData<TView[]>([...searchViewQueries.byEntity(entityType), projectId], asViews(views));
      },
    });

  const useDeleteView = () =>
    useMutation({
      mutationKey: [...searchViewQueries.byEntity(entityType), "delete"],
      mutationFn: SearchViewService.delete,
      meta: {
        datsEvent: "SEARCH_VIEW_DELETED",
      },
    });

  return { useGetViews, useCreateView, useUpdateView, useReorderViews, useDeleteView };
};
