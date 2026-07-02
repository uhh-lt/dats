import { FolderRead } from "@models/FolderRead";
import { FolderType } from "@models/FolderType";
import { queryClient } from "@api/queryClient";
import { FolderService } from "@api/services/FolderService";
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
    onSuccess: (data) => {
      queryClient.setQueryData<FolderMap>([QueryKey.PROJECT_FOLDERS, data.project_id, FolderType.NORMAL], (oldData) =>
        oldData ? { ...oldData, [data.id]: data } : { [data.id]: data },
      );
    },
    meta: {
      successMessage: (folder: FolderRead) => `Created folder ${folder.name}`,
    },
  });

const useUpdateFolder = () =>
  useMutation({
    mutationFn: FolderService.updateFolder,
    onSuccess: (data) => {
      queryClient.setQueryData<FolderMap>([QueryKey.PROJECT_FOLDERS, data.project_id, FolderType.NORMAL], (oldData) =>
        oldData ? { ...oldData, [data.id]: data } : { [data.id]: data },
      );
    },
    meta: {
      successMessage: (folder: FolderRead) => `Updated folder ${folder.name}`,
    },
  });

const useMoveFolders = () => {
  return useMutation({
    mutationFn: FolderService.moveFolders,
    onSuccess: (datas) => {
      queryClient.setQueryData<FolderMap>(
        [QueryKey.PROJECT_FOLDERS, datas[0].project_id, datas[0].folder_type],
        (oldData) => {
          if (!oldData) return oldData;
          const newData = { ...oldData };
          datas.forEach((data) => {
            newData[data.id] = data;
          });
          return newData;
        },
      );
      // query
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
    mutationFn: FolderService.deleteFolder,
    onSuccess: (data) => {
      queryClient.setQueryData<FolderMap>([QueryKey.PROJECT_FOLDERS, data.project_id, FolderType.NORMAL], (oldData) => {
        if (!oldData) return oldData;
        const newData = { ...oldData };
        delete newData[data.id];
        return newData;
      });
    },
    meta: {
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
