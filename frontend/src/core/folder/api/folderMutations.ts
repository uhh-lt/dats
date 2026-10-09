import { FolderService } from "@api/services/FolderService";
import { FolderRead } from "@models/FolderRead";
import { useMutation } from "@tanstack/react-query";
import { folderQueries } from "./folderQueries";

// Folder MUTATIONS

export const useCreateFolder = () =>
  useMutation({
    mutationKey: [...folderQueries.all(), "createFolder"],
    mutationFn: FolderService.createFolder,
    meta: {
      datsEvent: "FOLDER_CREATED",
      successMessage: (folder: FolderRead) => `Created folder ${folder.name}`,
    },
  });

export const useUpdateFolder = () =>
  useMutation({
    mutationKey: [...folderQueries.all(), "updateFolder"],
    mutationFn: FolderService.updateById,
    meta: {
      datsEvent: "FOLDER_UPDATED",
      successMessage: (folder: FolderRead) => `Updated folder ${folder.name}`,
    },
  });

export const useUpdateFoldersBulk = () =>
  useMutation({
    mutationKey: [...folderQueries.all(), "updateFoldersBulk"],
    mutationFn: FolderService.updateFoldersBulk,
    meta: {
      datsEvent: "FOLDER_UPDATED_BATCH",
      successMessage: (data: FolderRead[]) => `Updated ${data.length} folder${data.length === 1 ? "" : "s"}!`,
    },
  });

export const useDeleteFolder = () =>
  useMutation({
    mutationKey: [...folderQueries.all(), "deleteFolder"],
    mutationFn: FolderService.deleteById,
    meta: {
      datsEvent: "FOLDER_DELETED",
      successMessage: (folder: FolderRead) => `Deleted folder ${folder.name}`,
    },
  });
