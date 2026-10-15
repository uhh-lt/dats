import { FolderService } from "@api/services/FolderService";
import type { FolderRead } from "@models/FolderRead";
import type { FolderType } from "@models/FolderType";
import { queryOptions, skipToken } from "@tanstack/react-query";

export type FolderMap = Record<number, FolderRead>;

/**
 * Query factory for folders.
 *
 *   folderQueries.all()                                   ["folder"]
 *   folderQueries.byProject(projectId, folderType)        ["folder", "project", projectId, folderType]
 *   folderQueries.sdocIdsPerDoctype(sdocFolderId)         ["folder", "sdocIdsPerDoctype", sdocFolderId]
 */
export const folderQueries = {
  all: () => ["folder"] as const,

  // all folders of a project and type, as a map by folder id
  byProjectScope: () => [...folderQueries.all(), "project"] as const,
  // prefix of all folder types of one project (for invalidation)
  ofProjectScope: (projectId: number) => [...folderQueries.byProjectScope(), projectId] as const,
  byProject: (projectId: number | undefined, folderType: FolderType) =>
    queryOptions({
      queryKey: [...folderQueries.byProjectScope(), projectId, folderType] as const,
      queryFn:
        projectId === undefined
          ? skipToken
          : async () => {
              const folders = await FolderService.getFoldersByProjectAndType({ projectId, folderType });
              return folders.reduce<FolderMap>((acc, folder) => {
                acc[folder.id] = folder;
                return acc;
              }, {});
            },
      staleTime: 1000 * 60 * 5,
    }),

  // ids of the sdocs in a folder, grouped by doctype
  sdocIdsPerDoctypeScope: () => [...folderQueries.all(), "sdocIdsPerDoctype"] as const,
  sdocIdsPerDoctype: (sdocFolderId: number | null | undefined) =>
    queryOptions({
      queryKey: [...folderQueries.sdocIdsPerDoctypeScope(), sdocFolderId] as const,
      queryFn: !sdocFolderId ? skipToken : () => FolderService.getSdocIdsInFolderByDoctype({ folderId: sdocFolderId }),
      staleTime: 1000 * 60 * 5,
    }),
};
