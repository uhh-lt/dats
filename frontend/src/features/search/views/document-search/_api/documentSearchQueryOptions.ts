import { QueryKey } from "@api/hooks/QueryKey";
import { folderQueries } from "@api/queries/folderQueries";
import { sdocQueries } from "@api/queries/sdocQueries";
import { tagQueries } from "@api/queries/tagQueries";
import { queryClient } from "@api/queryClient";
import { SearchService } from "@api/services/SearchService";
import { MyFilter } from "@core/filter";
import { FolderType } from "@models/FolderType";
import { SdocColumns } from "@models/SdocColumns";
import { SortDirection } from "@models/SortDirection";
import { infiniteQueryOptions } from "@tanstack/react-query";

interface DocumentSearchQueryOptionsArgs {
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

export const documentSearchQueryOptions = ({
  projectId,
  selectedFolderId,
  searchQuery,
  filter,
  expertMode,
  sortingModel,
  fetchSize,
  showFolders = true,
  showChildFolders = false,
}: DocumentSearchQueryOptionsArgs) =>
  infiniteQueryOptions({
    queryKey: [
      QueryKey.SEARCH_TABLE,
      projectId,
      selectedFolderId,
      searchQuery,
      filter,
      expertMode,
      sortingModel,
      fetchSize,
      showFolders,
      showChildFolders,
    ],
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
  });
