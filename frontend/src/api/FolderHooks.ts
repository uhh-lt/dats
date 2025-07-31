import { useMutation, useQuery } from "@tanstack/react-query";
import queryClient from "../plugins/ReactQueryClient.ts";
import { useAppSelector } from "../plugins/ReduxHooks.ts";
import { RootState } from "../store/store.ts";
import { QueryKey } from "./QueryKey.ts";
import { FolderRead } from "./openapi/models/FolderRead.ts";
import { FolderType } from "./openapi/models/FolderType.ts";
import { FolderService } from "./openapi/services/FolderService.ts";

// TAG QUERIES
interface UseProjectFoldersQueryParams<T> {
  select?: (data: FolderRead[]) => T;
  enabled?: boolean;
}

const useProjectFoldersQuery = <T = FolderRead[]>({ select, enabled }: UseProjectFoldersQueryParams<T>) => {
  const projectId = useAppSelector((state: RootState) => state.project.projectId);
  return useQuery({
    queryKey: [QueryKey.PROJECT_FOLDERS, projectId],
    queryFn: () =>
      FolderService.getFoldersByProjectAndType({
        projectId: projectId!,
        folderType: FolderType.NORMAL,
      }),
    staleTime: 1000 * 60 * 5,
    select,
    enabled: !!projectId && enabled,
  });
};

const useGetFolder = (folderId: number | null | undefined) =>
  useProjectFoldersQuery({
    select: (data) => data.find((tag) => tag.id === folderId)!,
    enabled: !!folderId,
  });

const useGetAllFolders = () => useProjectFoldersQuery({});

// Folder MUTATIONS

const useCreateFolder = () =>
  useMutation({
    mutationFn: FolderService.createFolder,
    onSuccess: (folder) => {
      queryClient.setQueryData<FolderRead[]>([QueryKey.PROJECT_FOLDERS, folder.project_id], (oldData) =>
        oldData ? [...oldData, folder] : [folder],
      );
    },
    meta: {
      successMessage: (folder: FolderRead) => `Created folder ${folder.name}`,
    },
  });

const useUpdateFolder = () =>
  useMutation({
    mutationFn: FolderService.updateFolder,
    onSuccess: (folder) => {
      queryClient.setQueryData<FolderRead[]>([QueryKey.PROJECT_FOLDERS, folder.project_id], (oldData) =>
        oldData ? oldData.map((f) => (f.id === folder.id ? folder : f)) : oldData,
      );
    },
    meta: {
      successMessage: (folder: FolderRead) => `Updated folder ${folder.name}`,
    },
  });

const useDeleteFolder = () =>
  useMutation({
    mutationFn: FolderService.deleteFolder,
    onSuccess: (data) => {
      queryClient.setQueryData<FolderRead[]>([QueryKey.PROJECT_FOLDERS, data.project_id], (oldData) =>
        oldData ? oldData.filter((folder) => folder.id !== data.id) : oldData,
      );
    },
    meta: {
      successMessage: (folder: FolderRead) => `Deleted folder ${folder.name}`,
    },
  });

const FolderHooks = {
  useGetFolder,
  useGetAllFolders,
  useCreateFolder,
  useUpdateFolder,
  useDeleteFolder,
};

export default FolderHooks;
