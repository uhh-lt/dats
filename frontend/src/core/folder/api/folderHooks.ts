import { FolderType } from "@models/FolderType";
import { useAppSelector } from "@store/storeHooks";
import { useQuery } from "@tanstack/react-query";
import { FolderMap, folderQueries } from "./folderQueries";

// Folder QUERIES
// The queries themselves live in folderQueries. The hooks below only derive data from them.

export const useProjectFoldersQuery = <T>({
  select,
  folderType,
  enabled,
}: {
  select: (data: FolderMap) => T;
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

export const useGetFolder = (folderId: number | null | undefined) =>
  useProjectFoldersQuery({
    select: (data) => data[folderId!],
    folderType: FolderType.NORMAL,
    enabled: !!folderId,
  });

export const useGetAllFolders = () =>
  useProjectFoldersQuery({ select: (data) => Object.values(data), folderType: FolderType.NORMAL });

export const useGetSdocFolder = (folderId: number | null | undefined) =>
  useProjectFoldersQuery({
    select: (data) => data[folderId!],
    folderType: FolderType.SDOC_FOLDER,
    enabled: !!folderId,
  });

export const useGetAllSdocFolders = () =>
  useProjectFoldersQuery({ select: (data) => Object.values(data), folderType: FolderType.SDOC_FOLDER });
