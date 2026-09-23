import { QueryKey } from "@api/hooks/QueryKey";
import { WhiteboardService } from "@api/services/WhiteboardService";
import { WhiteboardRead } from "@models/WhiteboardRead";
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
    meta: {
      entityEvent: "WHITEBOARD_CREATED",
      successMessage: (whiteboard: WhiteboardRead) => `Created Whiteboard "${whiteboard.title}"`,
    },
  });

export const useUpdateWhiteboard = () =>
  useMutation({
    mutationFn: WhiteboardService.updateById,
    meta: {
      entityEvent: "WHITEBOARD_UPDATED",
      successMessage: (whiteboard: WhiteboardRead) => `Updated Whiteboard "${whiteboard.title}"`,
    },
  });

export const useDuplicateWhiteboard = () =>
  useMutation({
    mutationFn: WhiteboardService.duplicateById,
    meta: {
      entityEvent: "WHITEBOARD_CREATED",
      successMessage: (whiteboard: WhiteboardRead) => `Duplicated Whiteboard "${whiteboard.title}"`,
    },
  });

export const useDeleteWhiteboard = () =>
  useMutation({
    mutationFn: WhiteboardService.deleteById,
    meta: {
      entityEvent: "WHITEBOARD_DELETED",
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
