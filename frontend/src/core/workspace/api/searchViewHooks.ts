import { queryClient } from "@api/queryClient";
import { SearchViewService } from "@api/services/SearchViewService";
import { SearchEntityType } from "@models/SearchEntityType";
import { useMutation } from "@tanstack/react-query";
import { asViewsOfEntity, SearchViewBase, searchViewQueries } from "./searchViewQueries";

/**
 * Factory for per-entity search-view hooks. The backend search-view CRUD is already
 * entity-agnostic (discriminated by `entityType`); this just scopes the entity type
 * so each entity gets its own typed hooks
 * (e.g. `MemoViewHooks` in the memo workspace).
 */
export const createSearchViewHooks = <TView extends SearchViewBase>(entityType: SearchEntityType) => {
  const useCreateView = () =>
    useMutation({
      mutationKey: [...searchViewQueries.all(), entityType, "createView"],
      mutationFn: SearchViewService.create,
      meta: {
        datsEvent: "SEARCH_VIEW_CREATED",
      },
    });

  const useUpdateView = () =>
    useMutation({
      mutationKey: [...searchViewQueries.all(), entityType, "updateView"],
      mutationFn: SearchViewService.update,
      // Serialize updates per entity: rapid successive patches (e.g. toggling properties)
      // must reach the server in click order, since each patch is merged onto server state.
      scope: { id: `searchViews-update-${entityType}` },
      onMutate: async ({ viewId, requestBody }) => {
        // Optimistically merge the patch into every cached view list containing this view
        // (the update DTO carries no project_id, so match by view id). This makes the UI
        // react instantly and ensures the next click reads fresh state.
        const key = searchViewQueries.byProjectOfEntityScope(entityType);
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
      mutationKey: [...searchViewQueries.all(), entityType, "reorderViews"],
      mutationFn: SearchViewService.reorder,
      scope: { id: `searchViews-order-${projectId}` },
      onMutate: async ({ requestBody }) => {
        const key = searchViewQueries.byProject<TView>(entityType, projectId).queryKey;
        await queryClient.cancelQueries({ queryKey: key });
        const previousViews = queryClient.getQueryData(key);

        queryClient.setQueryData(key, (views) => {
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
        queryClient.setQueryData(
          searchViewQueries.byProject<TView>(entityType, projectId).queryKey,
          context?.previousViews,
        );
      },
      onSuccess: (views) => {
        queryClient.setQueryData(
          searchViewQueries.byProject<TView>(entityType, projectId).queryKey,
          asViewsOfEntity<TView>(views),
        );
      },
    });

  const useDeleteView = () =>
    useMutation({
      mutationKey: [...searchViewQueries.all(), entityType, "deleteView"],
      mutationFn: SearchViewService.delete,
      meta: {
        datsEvent: "SEARCH_VIEW_DELETED",
      },
    });

  return { useCreateView, useUpdateView, useReorderViews, useDeleteView };
};
