import { QueryKey } from "@api/hooks/QueryKey";
import { WhiteboardRead } from "@api/models/WhiteboardRead";
import { queryClient } from "@api/queryClient";
import { WhiteboardService } from "@api/services/WhiteboardService";
import { useAppSelector } from "@store/storeHooks";
import { queryOptions, useMutation, useQuery } from "@tanstack/react-query";

export type WhiteboardMap = Record<number, WhiteboardRead>;

export const projectWhiteboardsQueryOptions = (projectId: number) =>
  queryOptions({
    queryKey: [QueryKey.PROJECT_WHITEBOARDS, projectId],
    queryFn: async () => {
      const data = await WhiteboardService.getByProject({ projectId });
      return data.reduce((acc, whiteboard) => {
        acc[whiteboard.id] = whiteboard;
        return acc;
      }, {} as WhiteboardMap);
    },
    staleTime: 1000 * 60 * 5,
  });

export const useCreateWhiteboard = () =>
  useMutation({
    mutationFn: WhiteboardService.create,
    onSuccess(data) {
      queryClient.setQueryData<WhiteboardMap>([QueryKey.PROJECT_WHITEBOARDS, data.project_id], (prev) =>
        prev ? { ...prev, [data.id]: data } : { [data.id]: data },
      );
    },
    meta: {
      successMessage: (whiteboard: WhiteboardRead) => `Created Whiteboard "${whiteboard.title}"`,
    },
  });

export const useUpdateWhiteboard = () =>
  useMutation({
    mutationFn: WhiteboardService.updateById,
    onSuccess(data) {
      queryClient.setQueryData<WhiteboardMap>([QueryKey.PROJECT_WHITEBOARDS, data.project_id], (prev) =>
        prev ? { ...prev, [data.id]: data } : { [data.id]: data },
      );
    },
    meta: {
      successMessage: (whiteboard: WhiteboardRead) => `Updated Whiteboard "${whiteboard.title}"`,
    },
  });

export const useDuplicateWhiteboard = (projectId: number) =>
  useMutation({
    mutationFn: WhiteboardService.duplicateById,
    onSuccess(data) {
      queryClient.setQueryData<WhiteboardMap>([QueryKey.PROJECT_WHITEBOARDS, projectId], (prev) =>
        prev ? { ...prev, [data.id]: data } : { [data.id]: data },
      );
    },
    meta: {
      successMessage: (whiteboard: WhiteboardRead) => `Duplicated Whiteboard "${whiteboard.title}"`,
    },
  });

export const useDeleteWhiteboard = (projectId: number) =>
  useMutation({
    mutationFn: WhiteboardService.deleteById,
    onSuccess(data) {
      queryClient.setQueryData<WhiteboardMap>([QueryKey.PROJECT_WHITEBOARDS, projectId], (prev) => {
        if (!prev) return prev;
        const next = { ...prev };
        delete next[data.id];
        return next;
      });
    },
    meta: {
      successMessage: (whiteboard: WhiteboardRead) => `Deleted Whiteboard "${whiteboard.title}"`,
    },
  });

/**
 * Convenience hook for components that need a single whiteboard by ID but have no route context
 * (e.g., the tab bar navigation). Reads projectId from Redux store.
 * For components that DO have route context, use useSuspenseQuery with projectWhiteboardsQueryOptions directly.
 */
export const useGetWhiteboardById = (whiteboardId: number | null | undefined) => {
  const projectId = useAppSelector((state) => state.project.projectId);
  return useQuery({
    ...projectWhiteboardsQueryOptions(projectId!),
    select: (data) => (whiteboardId != null ? data[whiteboardId] : undefined),
    enabled: !!projectId && whiteboardId != null,
  });
};
