import { WhiteboardsService } from "@api/services/WhiteboardsService";
import { WhiteboardRead } from "@models/WhiteboardRead";
import { useMutation } from "@tanstack/react-query";
import { whiteboardQueries } from "./whiteboardQueries";

const useCreateWhiteboard = () =>
  useMutation({
    mutationKey: [...whiteboardQueries.all(), "createWhiteboard"],
    mutationFn: WhiteboardsService.create,
    meta: {
      datsEvent: "WHITEBOARD_CREATED",
      successMessage: (whiteboard: WhiteboardRead) => `Created Whiteboard "${whiteboard.title}"`,
    },
  });

const useUpdateWhiteboard = () =>
  useMutation({
    mutationKey: [...whiteboardQueries.all(), "updateWhiteboard"],
    mutationFn: WhiteboardsService.updateById,
    meta: {
      datsEvent: "WHITEBOARD_UPDATED",
      successMessage: (whiteboard: WhiteboardRead) => `Updated Whiteboard "${whiteboard.title}"`,
    },
  });

const useDuplicateWhiteboard = () =>
  useMutation({
    mutationKey: [...whiteboardQueries.all(), "duplicateWhiteboard"],
    mutationFn: WhiteboardsService.duplicate,
    meta: {
      datsEvent: "WHITEBOARD_CREATED",
      successMessage: (whiteboard: WhiteboardRead) => `Duplicated Whiteboard "${whiteboard.title}"`,
    },
  });

const useDeleteWhiteboard = () =>
  useMutation({
    mutationKey: [...whiteboardQueries.all(), "deleteWhiteboard"],
    mutationFn: WhiteboardsService.deleteById,
    meta: {
      datsEvent: "WHITEBOARD_DELETED",
      successMessage: (whiteboard: WhiteboardRead) => `Deleted Whiteboard "${whiteboard.title}"`,
    },
  });

export const WhiteboardHooks = {
  useCreateWhiteboard,
  useUpdateWhiteboard,
  useDuplicateWhiteboard,
  useDeleteWhiteboard,
};
