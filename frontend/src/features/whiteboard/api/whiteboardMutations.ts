import { WhiteboardService } from "@api/services/WhiteboardService";
import { WhiteboardRead } from "@models/WhiteboardRead";
import { useMutation } from "@tanstack/react-query";
import { whiteboardQueries } from "./whiteboardQueries";

export const useCreateWhiteboard = () =>
  useMutation({
    mutationKey: [...whiteboardQueries.all(), "createWhiteboard"],
    mutationFn: WhiteboardService.create,
    meta: {
      datsEvent: "WHITEBOARD_CREATED",
      successMessage: (whiteboard: WhiteboardRead) => `Created Whiteboard "${whiteboard.title}"`,
    },
  });

export const useUpdateWhiteboard = () =>
  useMutation({
    mutationKey: [...whiteboardQueries.all(), "updateWhiteboard"],
    mutationFn: WhiteboardService.updateById,
    meta: {
      datsEvent: "WHITEBOARD_UPDATED",
      successMessage: (whiteboard: WhiteboardRead) => `Updated Whiteboard "${whiteboard.title}"`,
    },
  });

export const useDuplicateWhiteboard = () =>
  useMutation({
    mutationKey: [...whiteboardQueries.all(), "duplicateWhiteboard"],
    mutationFn: WhiteboardService.duplicateById,
    meta: {
      datsEvent: "WHITEBOARD_CREATED",
      successMessage: (whiteboard: WhiteboardRead) => `Duplicated Whiteboard "${whiteboard.title}"`,
    },
  });

export const useDeleteWhiteboard = () =>
  useMutation({
    mutationKey: [...whiteboardQueries.all(), "deleteWhiteboard"],
    mutationFn: WhiteboardService.deleteById,
    meta: {
      datsEvent: "WHITEBOARD_DELETED",
      successMessage: (whiteboard: WhiteboardRead) => `Deleted Whiteboard "${whiteboard.title}"`,
    },
  });
