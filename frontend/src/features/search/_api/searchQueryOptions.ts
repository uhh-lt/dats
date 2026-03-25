import { QueryKey } from "@api/hooks/QueryKey";
import { FolderRead } from "@api/models/FolderRead";
import { FolderType } from "@api/models/FolderType";
import { FolderService } from "@api/services/FolderService";
import { ProjectMetadataService } from "@api/services/ProjectMetadataService";
import { TagService } from "@api/services/TagService";
import { queryOptions } from "@tanstack/react-query";

export const projectMetadataListQueryOptions = (projectId: number) =>
  queryOptions({
    queryKey: [QueryKey.PROJECT_METADATAS, projectId],
    queryFn: async () => {
      const metadata = await ProjectMetadataService.getByProject({ projId: projectId });
      return metadata;
    },
    staleTime: 1000 * 60 * 5,
  });

export const projectTagsQueryOptions = (projectId: number) =>
  queryOptions({
    queryKey: [QueryKey.PROJECT_TAGS, projectId],
    queryFn: () => TagService.getByProject({ projId: projectId }),
    staleTime: 1000 * 60 * 5,
  });

export const projectFoldersQueryOptions = (projectId: number, folderType: FolderType) =>
  queryOptions({
    queryKey: [QueryKey.PROJECT_FOLDERS, projectId, folderType],
    queryFn: async () => {
      const folders = await FolderService.getFoldersByProjectAndType({ projectId, folderType });
      return folders.reduce(
        (acc, folder) => {
          acc[folder.id] = folder;
          return acc;
        },
        {} as Record<number, FolderRead>,
      );
    },
    staleTime: 1000 * 60 * 5,
  });
