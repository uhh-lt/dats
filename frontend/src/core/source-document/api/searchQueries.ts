import { queryClient } from "@api/queryClient";
import { SearchService } from "@api/services/SearchService";
import type { MyFilter } from "@core/filter";
import { folderQueries } from "@core/folder";
import { tagQueries } from "@core/tag";
import { FolderType } from "@models/FolderType";
import { SdocColumns } from "@models/SdocColumns";
import { SortDirection } from "@models/SortDirection";
import { infiniteQueryOptions } from "@tanstack/react-query";
import { sdocQueries } from "./sdocQueries";

interface DocumentSearchParams {
  projectId: number;
  selectedFolderId: number;
  searchQuery: string;
  filter: MyFilter<SdocColumns>;
  expertMode: boolean;
  sortingModel: { id: string; desc: boolean }[];
  fetchSize: number;
  showFolders?: boolean;
  showChildFolders?: boolean;
}

/**
 * Query factory for the document search.
 *
 *   searchQueries.all()                         ["search"]
 *   searchQueries.documentsByProject(projectId) ["search", "documents", projectId]
 *   searchQueries.documents(params)             ["search", "documents", projectId, ...]
 *
 * The queryFn seeds the caches of the found sdocs, annotators, tags and folders.
 */
export const searchQueries = {
  all: () => ["search"] as const,

  documentsScope: () => [...searchQueries.all(), "documents"] as const,
  // prefix of all document searches of one project, for invalidation
  documentsByProject: (projectId: number) => [...searchQueries.documentsScope(), projectId] as const,
  documents: ({
    projectId,
    selectedFolderId,
    searchQuery,
    filter,
    expertMode,
    sortingModel,
    fetchSize,
    showFolders = true,
    showChildFolders = false,
  }: DocumentSearchParams) =>
    infiniteQueryOptions({
      queryKey: [
        ...searchQueries.documentsByProject(projectId),
        selectedFolderId,
        searchQuery,
        filter,
        expertMode,
        sortingModel,
        fetchSize,
        showFolders,
        showChildFolders,
      ] as const,
      queryFn: async ({ pageParam }) => {
        const data = await SearchService.searchSdocs({
          searchQuery,
          projectId,
          folderId: selectedFolderId === -1 ? null : selectedFolderId,
          highlight: true,
          expertMode,
          showFolders,
          showChildFolders,
          requestBody: {
            filter,
            sorts: sortingModel.map((sort) => ({
              column: sort.id as SdocColumns,
              direction: sort.desc ? SortDirection.DESC : SortDirection.ASC,
            })),
          },
          pageNumber: pageParam,
          pageSize: fetchSize,
        });

        Object.entries(data.sdocs).forEach(([sdocId, sdoc]) => {
          queryClient.setQueryData(sdocQueries.detail(parseInt(sdocId)).queryKey, sdoc);
          queryClient.setQueryData(sdocQueries.idByFilename(projectId, sdoc.filename).queryKey, sdoc.id);
        });

        Object.entries(data.annotators).forEach(([sdocId, annotators]) => {
          queryClient.setQueryData(sdocQueries.annotators(parseInt(sdocId)).queryKey, annotators);
        });

        Object.entries(data.tags).forEach(([sdocId, tags]) => {
          queryClient.setQueryData(tagQueries.idsBySdoc(parseInt(sdocId)).queryKey, tags);
        });

        queryClient.setQueryData(folderQueries.byProject(projectId, FolderType.SDOC_FOLDER).queryKey, (prev) => {
          prev = prev || {};
          Object.entries(data.sdoc_folders).forEach(([folderId, folder]) => {
            prev[parseInt(folderId)] = folder;
          });
          return prev;
        });

        return data;
      },
      initialPageParam: 0,
      getNextPageParam: (_lastGroup, groups) => groups.length,
      staleTime: 1000 * 60 * 5,
      refetchOnWindowFocus: false,
    }),
};
