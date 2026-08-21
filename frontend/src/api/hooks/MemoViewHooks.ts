import { queryClient } from "@api/queryClient";
import { SearchViewService } from "@api/services/SearchViewService";
import { MemoSearchViewRead } from "@models/MemoSearchViewRead";
import { SearchEntityType } from "@models/SearchEntityType";
import { useMutation, useQuery } from "@tanstack/react-query";
import { QueryKey } from "./QueryKey";

const ENTITY_TYPE = SearchEntityType.MEMO;

const useGetViews = (projectId: number) =>
  useQuery({
    queryKey: [QueryKey.MEMO_VIEWS, projectId],
    queryFn: async () =>
      (await SearchViewService.getByProject({ projectId, entityType: ENTITY_TYPE })) as MemoSearchViewRead[],
  });

const useCreateView = () =>
  useMutation({
    mutationFn: SearchViewService.create,
    onSuccess: (view) => {
      queryClient.setQueryData<MemoSearchViewRead[]>([QueryKey.MEMO_VIEWS, view.project_id], (views) => [
        ...(views ?? []),
        view as MemoSearchViewRead,
      ]);
    },
  });

const useUpdateView = () =>
  useMutation({
    mutationFn: SearchViewService.update,
    onSuccess: (view) => {
      queryClient.setQueryData<MemoSearchViewRead[]>([QueryKey.MEMO_VIEWS, view.project_id], (views) =>
        (views ?? []).map((candidate) => (candidate.id === view.id ? (view as MemoSearchViewRead) : candidate)),
      );
    },
  });

const useReorderViews = (projectId: number) =>
  useMutation({
    mutationFn: SearchViewService.reorder,
    scope: { id: `memo-view-order-${projectId}` },
    onMutate: async ({ requestBody }) => {
      const queryKey = [QueryKey.MEMO_VIEWS, projectId];
      await queryClient.cancelQueries({ queryKey });
      const previousViews = queryClient.getQueryData<MemoSearchViewRead[]>(queryKey);

      queryClient.setQueryData<MemoSearchViewRead[]>(queryKey, (views) => {
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
      queryClient.setQueryData([QueryKey.MEMO_VIEWS, projectId], context?.previousViews);
    },
    onSuccess: (views) => {
      queryClient.setQueryData<MemoSearchViewRead[]>([QueryKey.MEMO_VIEWS, projectId], views as MemoSearchViewRead[]);
    },
  });

const useDeleteView = () =>
  useMutation({
    mutationFn: SearchViewService.delete,
    onSuccess: (view) => {
      queryClient.setQueryData<MemoSearchViewRead[]>([QueryKey.MEMO_VIEWS, view.project_id], (views) =>
        (views ?? []).filter((candidate) => candidate.id !== view.id),
      );
    },
  });

export const MemoViewHooks = { useGetViews, useCreateView, useUpdateView, useReorderViews, useDeleteView };
