import { queryClient } from "@api/queryClient";
import { ProjectService } from "@api/services/ProjectService";
import { SearchService } from "@api/services/SearchService";
import { SourceDocumentService } from "@api/services/SourceDocumentService";
import { TagService } from "@api/services/TagService";
import { tableInfoQueries, toColumnInfos, type MyFilter } from "@core/filter";
import { folderQueries } from "@core/folder";
import { tagQueries } from "@core/tag";
import { FolderType } from "@models/FolderType";
import { SdocColumns } from "@models/SdocColumns";
import { SortDirection } from "@models/SortDirection";
import { infiniteQueryOptions, queryOptions, skipToken } from "@tanstack/react-query";
import type { MRT_SortingState } from "material-react-table";

interface SdocTableParams {
  projectId: number | undefined;
  searchQuery: string | undefined;
  filter: MyFilter<SdocColumns>;
  sortingModel: MRT_SortingState;
  fetchSize: number;
}

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
const searchQueries = {
  all: () => ["search"] as const,

  // the column infos of the document search
  tableInfo: (projectId: number) =>
    queryOptions({
      queryKey: tableInfoQueries.bySlice("search", projectId),
      queryFn: async () => toColumnInfos(await SearchService.searchSdocInfo({ projectId })),
      staleTime: Infinity,
    }),

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

/**
 * Query factory for source documents (sdocs).
 *
 *   sdocQueries.all()                        ["sdocs"]
 *   sdocQueries.detail(sdocId)               ["sdocs", "detail", sdocId]
 *   sdocQueries.data(sdocId)                 ["sdocs", "data", sdocId]
 *   sdocQueries.idByFilename(pid, filename)  ["sdocs", "idByFilename", pid, filename]
 *   sdocQueries.sameFolder(sdocId)           ["sdocs", "sameFolder", sdocId]
 *   sdocQueries.thumbnailUrl(sdocId)         ["sdocs", "thumbnailUrl", sdocId]
 *   sdocQueries.idsByTag(tagId)              ["sdocs", "idsByTag", tagId]
 *   sdocQueries.annotators(sdocId)           ["sdocs", "annotators", sdocId]
 *   sdocQueries.table(params)                ["sdocs", "table", projectId, ...]
 *   sdocQueries.search.*                     the document search, root ["search"]
 */
export const sdocQueries = {
  all: () => ["sdocs"] as const,

  // a single sdoc
  detailScope: () => [...sdocQueries.all(), "detail"] as const,
  detail: (sdocId: number) =>
    queryOptions({
      queryKey: [...sdocQueries.detailScope(), sdocId] as const,
      queryFn: () => SourceDocumentService.getById({ sdocId }),
      staleTime: Infinity,
    }),

  // an sdoc including its data (text, html, ...)
  dataScope: () => [...sdocQueries.all(), "data"] as const,
  data: (sdocId: number) =>
    queryOptions({
      queryKey: [...sdocQueries.dataScope(), sdocId] as const,
      queryFn: () => SourceDocumentService.getByIdWithData({ sdocId }),
      staleTime: Infinity,
    }),

  // sdoc id resolved from a filename
  idByFilenameScope: () => [...sdocQueries.all(), "idByFilename"] as const,
  idByFilename: (projectId: number, filename: string | undefined) =>
    queryOptions({
      queryKey: [...sdocQueries.idByFilenameScope(), projectId, filename] as const,
      queryFn: !filename
        ? skipToken
        : () => ProjectService.resolveFilename({ projId: projectId, filename, onlyFinished: true }),
      staleTime: Infinity,
    }),

  // ids of the sdocs in the same folder
  sameFolderScope: () => [...sdocQueries.all(), "sameFolder"] as const,
  sameFolder: (sdocId: number | null | undefined) =>
    queryOptions({
      queryKey: [...sdocQueries.sameFolderScope(), sdocId] as const,
      queryFn: !sdocId ? skipToken : () => SourceDocumentService.getSameFolderSdocs({ sdocId }),
      staleTime: Infinity,
    }),

  // relative url of the thumbnail (raw; the hook adds the /content/ prefix)
  thumbnailUrlScope: () => [...sdocQueries.all(), "thumbnailUrl"] as const,
  thumbnailUrl: (sdocId: number | null | undefined) =>
    queryOptions({
      queryKey: [...sdocQueries.thumbnailUrlScope(), sdocId] as const,
      queryFn: !sdocId
        ? skipToken
        : () => SourceDocumentService.getFileUrl({ sdocId, relative: true, webp: true, thumbnail: true }),
      staleTime: Infinity,
    }),

  // ids of the sdocs that carry a tag
  idsByTagScope: () => [...sdocQueries.all(), "idsByTag"] as const,
  idsByTag: (tagId: number | null | undefined) =>
    queryOptions({
      queryKey: [...sdocQueries.idsByTagScope(), tagId] as const,
      queryFn: !tagId ? skipToken : () => TagService.getSdocIdsByTagId({ tagId }),
    }),

  // user ids that annotated the sdoc
  annotatorsScope: () => [...sdocQueries.all(), "annotators"] as const,
  annotators: (sdocId: number | null | undefined) =>
    queryOptions({
      queryKey: [...sdocQueries.annotatorsScope(), sdocId] as const,
      queryFn: !sdocId ? skipToken : () => SourceDocumentService.getAnnotators({ sdocId }),
      staleTime: 1000 * 60 * 5,
    }),

  // the column infos of the sdoc filter table
  tableInfo: (projectId: number) =>
    queryOptions({
      queryKey: tableInfoQueries.bySlice("documentTableFilter", projectId),
      queryFn: async () => toColumnInfos(await SearchService.searchSdocInfo({ projectId })),
      staleTime: Infinity,
    }),

  // the sdoc filter table
  tableScope: () => [...sdocQueries.all(), "table"] as const,
  table: ({ projectId, searchQuery, filter, sortingModel, fetchSize }: SdocTableParams) =>
    infiniteQueryOptions({
      queryKey: [...sdocQueries.tableScope(), projectId, searchQuery, filter, sortingModel, fetchSize] as const,
      queryFn: !projectId
        ? skipToken
        : ({ pageParam }) =>
            SearchService.searchSdocs({
              searchQuery: searchQuery || "",
              projectId,
              folderId: null,
              highlight: true,
              expertMode: false,
              showFolders: false,
              requestBody: {
                filter,
                sorts: sortingModel.map((sort) => ({
                  column: sort.id as SdocColumns,
                  direction: sort.desc ? SortDirection.DESC : SortDirection.ASC,
                })),
              },
              pageNumber: pageParam,
              pageSize: fetchSize,
            }),
      initialPageParam: 0,
      getNextPageParam: (_lastGroup, groups) => groups.length,
      refetchOnWindowFocus: false,
    }),

  // the document search (project-wide search with highlights, used by the search feature and invalidated by the brain)
  search: searchQueries,
};
