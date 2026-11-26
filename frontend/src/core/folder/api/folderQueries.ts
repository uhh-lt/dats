import { FolderService } from "@api/services/FolderService";
import type { FolderRead } from "@models/FolderRead";
import type { FolderType } from "@models/FolderType";
import { queryOptions, skipToken } from "@tanstack/react-query";

export type FolderMap = Record<number, FolderRead>;

/**
 * Query factory for folders.
 *
 *   folderQueries.all()                                       ["folder"]
 *   folderQueries.projectScope(projectId)                     ["folder", "project", projectId]
 *   folderQueries.byProject(projectId, folderType)            ["folder", "project", projectId, "type", folderType]
 *   folderQueries.sdocIdsPerDoctype(projectId, sdocFolderId)  ["folder", "project", projectId, "sdocIdsPerDoctype", sdocFolderId]
 */
export const folderQueries = {
  all: () => ["folder"] as const,
  // prefix of all folder queries of one project
  projectScope: (projectId: number | null | undefined) => [...folderQueries.all(), "project", projectId] as const,

  // all folders of a project and type, as a map by folder id
  byProjectScope: (projectId: number | undefined) => [...folderQueries.projectScope(projectId), "type"] as const,
  byProject: (projectId: number | undefined, folderType: FolderType) =>
    queryOptions({
      queryKey: [...folderQueries.byProjectScope(projectId), folderType] as const,
      queryFn:
        projectId === undefined
          ? skipToken
          : async () => {
              const folders = await FolderService.getByProject({ projectId, folderType });
              return folders.reduce<FolderMap>((acc, folder) => {
                acc[folder.id] = folder;
                return acc;
              }, {});
            },
      staleTime: 1000 * 60 * 5,
    }),

  // ids of the sdocs in a folder, grouped by doctype
  sdocIdsPerDoctypeScope: (projectId: number | null | undefined) =>
    [...folderQueries.projectScope(projectId), "sdocIdsPerDoctype"] as const,
  sdocIdsPerDoctype: (projectId: number | null | undefined, sdocFolderId: number | null | undefined) =>
    queryOptions({
      queryKey: [...folderQueries.sdocIdsPerDoctypeScope(projectId), sdocFolderId] as const,
      queryFn:
        !projectId || !sdocFolderId
          ? skipToken
          : () => FolderService.getSdocIdsInFolderByDoctype({ projectId, folderId: sdocFolderId }),
      staleTime: 1000 * 60 * 5,
    }),
};
