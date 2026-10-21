import { FolderService } from "@api/services/FolderService";
import { FolderRead } from "@models/FolderRead";
import { FolderType } from "@models/FolderType";
import { useAppSelector } from "@store/storeHooks";
import { useMutation, useQuery } from "@tanstack/react-query";
import { FolderMap, folderQueries } from "./folderQueries";

// Folder QUERIES
// The queries themselves live in folderQueries. The hooks below only derive data from them.

const useGetAllFoldersMap = <T = FolderMap>({
  select,
  folderType,
  enabled,
}: {
  select?: (data: FolderMap) => T;
  folderType: FolderType;
  enabled?: boolean;
}) => {
  const projectId = useAppSelector((state) => state.project.projectId);
  return useQuery({
    ...folderQueries.byProject(projectId, folderType),
    select,
    enabled,
  });
};

const useGetFolder = (folderId: number | null | undefined) =>
  useGetAllFoldersMap({
    select: (data) => data[folderId!],
    folderType: FolderType.NORMAL,
    enabled: !!folderId,
  });

const useGetAllFolders = () =>
  useGetAllFoldersMap({ select: (data) => Object.values(data), folderType: FolderType.NORMAL });

const useGetSdocFolder = (folderId: number | null | undefined) =>
  useGetAllFoldersMap({
    select: (data) => data[folderId!],
    folderType: FolderType.SDOC_FOLDER,
    enabled: !!folderId,
  });

// Folder MUTATIONS

const useCreateFolder = () =>
  useMutation({
    mutationKey: [...folderQueries.all(), "createFolder"],
    mutationFn: FolderService.createFolder,
    meta: {
      datsEvent: "FOLDER_CREATED",
      successMessage: (folder: FolderRead) => `Created folder ${folder.name}`,
    },
  });

const useUpdateFolder = () =>
  useMutation({
    mutationKey: [...folderQueries.all(), "updateFolder"],
    mutationFn: FolderService.updateById,
    meta: {
      datsEvent: "FOLDER_UPDATED",
      successMessage: (folder: FolderRead) => `Updated folder ${folder.name}`,
    },
  });

const useUpdateFoldersBulk = () =>
  useMutation({
    mutationKey: [...folderQueries.all(), "updateFoldersBulk"],
    mutationFn: FolderService.updateFoldersBulk,
    meta: {
      datsEvent: "FOLDER_UPDATED_BATCH",
      successMessage: (data: FolderRead[]) => `Updated ${data.length} folder${data.length === 1 ? "" : "s"}!`,
    },
  });

const useDeleteFolder = () =>
  useMutation({
    mutationKey: [...folderQueries.all(), "deleteFolder"],
    mutationFn: FolderService.deleteById,
    meta: {
      datsEvent: "FOLDER_DELETED",
      successMessage: (folder: FolderRead) => `Deleted folder ${folder.name}`,
    },
  });

export const FolderHooks = {
  useGetAllFoldersMap,
  useGetFolder,
  useGetAllFolders,
  useGetSdocFolder,
  useCreateFolder,
  useUpdateFolder,
  useUpdateFoldersBulk,
  useDeleteFolder,
};
