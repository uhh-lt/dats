import { FolderMap } from "@api/hooks/FolderHooks";
import { QueryKey } from "@api/hooks/QueryKey";
import { FolderType } from "@api/models/FolderType";
import { SdocColumns } from "@api/models/SdocColumns";
import { SortDirection } from "@api/models/SortDirection";
import { SourceDocumentRead } from "@api/models/SourceDocumentRead";
import { queryClient } from "@api/queryClient";
import { SearchService } from "@api/services/SearchService";
import { MyFilter } from "@core/filter";
import { infiniteQueryOptions } from "@tanstack/react-query";

interface DocumentSearchQueryOptionsArgs {
  projectId: number;
  selectedFolderId: number;
  searchQuery: string;
  filter: MyFilter<SdocColumns>;
  sortingModel: { id: string; desc: boolean }[];
  fetchSize: number;
}

export const documentSearchQueryOptions = ({
  projectId,
  selectedFolderId,
  searchQuery,
  filter,
  sortingModel,
  fetchSize,
}: DocumentSearchQueryOptionsArgs) =>
  infiniteQueryOptions({
    queryKey: [QueryKey.SEARCH_TABLE, projectId, selectedFolderId, searchQuery, filter, sortingModel, fetchSize],
    queryFn: async ({ pageParam }) => {
      const data = await SearchService.searchSdocs({
        searchQuery,
        projectId,
        folderId: selectedFolderId === -1 ? null : selectedFolderId,
        highlight: true,
        expertMode: false,
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
        queryClient.setQueryData<SourceDocumentRead>([QueryKey.SDOC, parseInt(sdocId)], sdoc);
        queryClient.setQueryData<number>([QueryKey.SDOC_ID, projectId, sdoc.filename], sdoc.id);
      });

      Object.entries(data.annotators).forEach(([sdocId, annotators]) => {
        queryClient.setQueryData<number[]>([QueryKey.SDOC_ANNOTATORS, parseInt(sdocId)], annotators);
      });

      Object.entries(data.tags).forEach(([sdocId, tags]) => {
        queryClient.setQueryData<number[]>([QueryKey.SDOC_TAGS, parseInt(sdocId)], tags);
      });

      queryClient.setQueryData<FolderMap>([QueryKey.PROJECT_FOLDERS, projectId, FolderType.SDOC_FOLDER], (prev) => {
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
    refetchOnWindowFocus: false,
  });
