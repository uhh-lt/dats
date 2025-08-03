import { useMutation, useQuery } from "@tanstack/react-query";
import queryClient from "../plugins/ReactQueryClient.ts";
import { useAppSelector } from "../plugins/ReduxHooks.ts";
import { RootState } from "../store/store.ts";
import { QueryKey } from "./QueryKey.ts";
import { FolderRead } from "./openapi/models/FolderRead.ts";
import { FolderType } from "./openapi/models/FolderType.ts";
import { FolderService } from "./openapi/services/FolderService.ts";

// Folder QUERIES

export type FolderMap = Record<number, FolderRead>;

interface UseProjectFoldersQueryParams<T> {
  select?: (data: FolderMap) => T;
  folderType: FolderType;
  enabled?: boolean;
}

const useProjectFoldersQuery = <T = FolderMap>({ select, folderType, enabled }: UseProjectFoldersQueryParams<T>) => {
  const projectId = useAppSelector((state: RootState) => state.project.projectId);
  return useQuery({
    queryKey: [QueryKey.PROJECT_FOLDERS, projectId, folderType],
    queryFn: async () => {
      const folders = await FolderService.getFoldersByProjectAndType({
        projectId: projectId!,
        folderType: folderType,
      });
      return folders.reduce((acc, folder) => {
        acc[folder.id] = folder;
        return acc;
      }, {} as FolderMap);
    },
    staleTime: 1000 * 60 * 5,
    select,
    enabled: !!projectId && enabled,
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

const useMoveFolders = () =>
  useMutation({
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
    },
    meta: {
      successMessage: (data: FolderRead[]) => `Moved ${data.length} folder${data.length === 1 ? "" : "s"}!`,
    },
  });

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

const FolderHooks = {
  useGetFolder,
  useGetAllFolders,
  useGetAllFoldersMap,
  useGetSdocFolder,
  useGetAllSdocFolders,
  useGetAllSdocFoldersMap,
  useCreateFolder,
  useUpdateFolder,
  useMoveFolders,
  useDeleteFolder,
};

export default FolderHooks;
