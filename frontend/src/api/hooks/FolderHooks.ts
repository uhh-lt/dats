import { handleEntityEvent } from "@api/entity-events/brain";
import { queryClient } from "@api/queryClient";
import { FolderService } from "@api/services/FolderService";
import { FolderRead } from "@models/FolderRead";
import { FolderType } from "@models/FolderType";
import { useAppSelector } from "@store/storeHooks";
import { queryOptions, useMutation, useQuery } from "@tanstack/react-query";
import { QueryKey } from "./QueryKey";

// Folder QUERIES

export type FolderMap = Record<number, FolderRead>;

export const projectFoldersQueryOptions = (projectId: number | undefined, folderType: FolderType) =>
  queryOptions({
    queryKey: [QueryKey.PROJECT_FOLDERS, projectId, folderType],
    queryFn: async () => {
      const folders = await FolderService.getFoldersByProjectAndType({
        projectId: projectId!,
        folderType,
      });
      return folders.reduce((acc, folder) => {
        acc[folder.id] = folder;
        return acc;
      }, {} as FolderMap);
    },
    staleTime: 1000 * 60 * 5,
  });

interface UseProjectFoldersQueryParams<T> {
  select?: (data: FolderMap) => T;
  folderType: FolderType;
  enabled?: boolean;
}

const useProjectFoldersQuery = <T = FolderMap>({ select, folderType, enabled }: UseProjectFoldersQueryParams<T>) => {
  const projectId = useAppSelector((state) => state.project.projectId);
  return useQuery({
    ...projectFoldersQueryOptions(projectId, folderType),
    select,
    enabled: !!projectId && (enabled ?? true),
  });
};

const useGetFolder = (folderId: number | null | undefined) =>
  useProjectFoldersQuery({
    select: (data) => data[folderId!],
    folderType: FolderType.NORMAL,
    enabled: !!folderId,
  });

const useGetAllFolders = () =>
  useProjectFoldersQuery({ select: (data) => Object.values(data), folderType: FolderType.NORMAL });

const useGetAllFoldersMap = () => useProjectFoldersQuery({ folderType: FolderType.NORMAL });

const useGetSdocFolder = (folderId: number | null | undefined) =>
  useProjectFoldersQuery({
    select: (data) => data[folderId!],
    folderType: FolderType.SDOC_FOLDER,
    enabled: !!folderId,
  });

const useGetAllSdocFolders = () =>
  useProjectFoldersQuery({ select: (data) => Object.values(data), folderType: FolderType.SDOC_FOLDER });

const useGetAllSdocFoldersMap = () => useProjectFoldersQuery({ folderType: FolderType.SDOC_FOLDER });

const useGetSdocIdsPerDoctypeInSdocFolder = (sdocFolderId: number | null | undefined) =>
  useQuery({
    queryKey: [QueryKey.SDOC_IDS_PER_DOCTYPE_IN_FOLDER, sdocFolderId],
    queryFn: () =>
      FolderService.getSdocIdsInFolderByDoctype({
        folderId: sdocFolderId!,
      }),
    staleTime: 1000 * 60 * 5,
    enabled: !!sdocFolderId,
  });

// Folder MUTATIONS

const useCreateFolder = () =>
  useMutation({
    mutationFn: FolderService.createFolder,
    meta: {
      entityEvent: "FOLDER_CREATED",
      successMessage: (folder: FolderRead) => `Created folder ${folder.name}`,
    },
  });

const useUpdateFolder = () =>
  useMutation({
    mutationFn: FolderService.updateById,
    meta: {
      entityEvent: "FOLDER_UPDATED",
      successMessage: (folder: FolderRead) => `Updated folder ${folder.name}`,
    },
  });

const useMoveFolders = () => {
  return useMutation({
    mutationFn: FolderService.moveFolders,
    onSuccess: (datas) => {
      handleEntityEvent({ type: "FOLDER_UPDATED_BATCH", payload: datas }, "mutation");
      // Moving folders changes which sdocs are where → refresh search results.
      queryClient.invalidateQueries({
        queryKey: [QueryKey.SEARCH_TABLE],
      });
    },
    meta: {
      successMessage: (data: FolderRead[]) => `Moved ${data.length} folder${data.length === 1 ? "" : "s"}!`,
    },
  });
};

const useDeleteFolder = () =>
  useMutation({
    mutationFn: FolderService.deleteById,
    meta: {
      entityEvent: "FOLDER_DELETED",
      successMessage: (folder: FolderRead) => `Deleted folder ${folder.name}`,
    },
  });

export const FolderHooks = {
  useGetFolder,
  useGetAllFolders,
  useGetAllFoldersMap,
  useGetSdocFolder,
  useGetAllSdocFolders,
  useGetAllSdocFoldersMap,
  useGetSdocIdsPerDoctypeInSdocFolder,
  useCreateFolder,
  useUpdateFolder,
  useMoveFolders,
  useDeleteFolder,
};
