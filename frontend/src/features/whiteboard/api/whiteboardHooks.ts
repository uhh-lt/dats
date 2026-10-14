import { WhiteboardService } from "@api/services/WhiteboardService";
import { WhiteboardRead } from "@models/WhiteboardRead";
import { useAppSelector } from "@store/storeHooks";
import { useMutation, useQuery } from "@tanstack/react-query";
import { whiteboardQueries } from "./whiteboardQueries";

/**
 * Convenience hook for components that need a single whiteboard by ID but have no route context
 * (e.g., the tab bar navigation). Reads projectId from Redux store.
 * For components that DO have route context, use useSuspenseQuery with projectWhiteboardsQueryOptions directly.
 */
const useGetWhiteboardById = (whiteboardId: number | null | undefined) => {
  const projectId = useAppSelector((state) => state.project.projectId);
  return useQuery({
    ...whiteboardQueries.byProject(projectId!),
    select: (data) => (whiteboardId != null ? data[whiteboardId] : undefined),
    enabled: projectId !== undefined && whiteboardId != null,
  });
};

const useCreateWhiteboard = () =>
  useMutation({
    mutationKey: [...whiteboardQueries.all(), "createWhiteboard"],
    mutationFn: WhiteboardService.create,
    meta: {
      datsEvent: "WHITEBOARD_CREATED",
      successMessage: (whiteboard: WhiteboardRead) => `Created Whiteboard "${whiteboard.title}"`,
    },
  });

const useUpdateWhiteboard = () =>
  useMutation({
    mutationKey: [...whiteboardQueries.all(), "updateWhiteboard"],
    mutationFn: WhiteboardService.updateById,
    meta: {
      datsEvent: "WHITEBOARD_UPDATED",
      successMessage: (whiteboard: WhiteboardRead) => `Updated Whiteboard "${whiteboard.title}"`,
    },
  });

const useDuplicateWhiteboard = () =>
  useMutation({
    mutationKey: [...whiteboardQueries.all(), "duplicateWhiteboard"],
    mutationFn: WhiteboardService.duplicateById,
    meta: {
      datsEvent: "WHITEBOARD_CREATED",
      successMessage: (whiteboard: WhiteboardRead) => `Duplicated Whiteboard "${whiteboard.title}"`,
    },
  });

const useDeleteWhiteboard = () =>
  useMutation({
    mutationKey: [...whiteboardQueries.all(), "deleteWhiteboard"],
    mutationFn: WhiteboardService.deleteById,
    meta: {
      datsEvent: "WHITEBOARD_DELETED",
      successMessage: (whiteboard: WhiteboardRead) => `Deleted Whiteboard "${whiteboard.title}"`,
    },
  });

export const WhiteboardHooks = {
  useGetWhiteboardById,
  useCreateWhiteboard,
  useUpdateWhiteboard,
  useDuplicateWhiteboard,
  useDeleteWhiteboard,
};
