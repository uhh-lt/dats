import { queryClient } from "@api/queryClient";
import { SearchViewService } from "@api/services/SearchViewService";
import { SearchEntityType } from "@models/SearchEntityType";
import { useMutation, useQuery } from "@tanstack/react-query";
import { QueryKey } from "./QueryKey";

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
 * entity-agnostic (discriminated by `entityType`); this just scopes the query cache
 * key and the entity type so each entity gets its own typed hooks
 * (e.g. `MemoViewHooks`, `SpanAnnotationViewHooks`).
 */
export const createSearchViewHooks = <TView extends SearchViewBase>(
  entityType: SearchEntityType,
  queryKey: (typeof QueryKey)[keyof typeof QueryKey],
) => {
  const useGetViews = (projectId: number) =>
    useQuery<TView[], Error>({
      queryKey: [queryKey, entityType, projectId],
      queryFn: async () => (await SearchViewService.getByProject({ projectId, entityType })) as unknown as TView[],
    });

  const useCreateView = () =>
    useMutation({
      mutationFn: SearchViewService.create,
      onSuccess: (view) => {
        const typedView = view as unknown as TView;
        queryClient.setQueryData<TView[]>([queryKey, entityType, view.project_id], (views) => [
          ...(views ?? []),
          typedView,
        ]);
      },
    });

  const useUpdateView = () =>
    useMutation({
      mutationFn: SearchViewService.update,
      onSuccess: (view) => {
        const typedView = view as unknown as TView;
        queryClient.setQueryData<TView[]>([queryKey, entityType, view.project_id], (views) =>
          (views ?? []).map((candidate) => (candidate.id === view.id ? typedView : candidate)),
        );
      },
    });

  const useReorderViews = (projectId: number) =>
    useMutation({
      mutationFn: SearchViewService.reorder,
      scope: { id: `${queryKey}-order-${projectId}` },
      onMutate: ({ requestBody }) => {
        const key = [queryKey, entityType, projectId];
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
        queryClient.setQueryData(
          [queryKey, entityType, projectId],
          (context as { previousViews?: TView[] })?.previousViews,
        );
      },
      onSuccess: (views) => {
        queryClient.setQueryData<TView[]>([queryKey, entityType, projectId], views as unknown as TView[]);
      },
    });

  const useDeleteView = () =>
    useMutation({
      mutationFn: SearchViewService.delete,
      onSuccess: (view) => {
        queryClient.setQueryData<TView[]>([queryKey, entityType, view.project_id], (views) =>
          (views ?? []).filter((candidate) => candidate.id !== view.id),
        );
      },
    });

  return { useGetViews, useCreateView, useUpdateView, useReorderViews, useDeleteView };
};
