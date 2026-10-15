import { queryClient } from "@api/queryClient";
import { ProjectService } from "@api/services/ProjectService";
import { SearchService } from "@api/services/SearchService";
import { SourceDocumentService } from "@api/services/SourceDocumentService";
import { TagService } from "@api/services/TagService";
import { tableInfoQueries, toColumnInfos, type ColumnInfo, type MyFilter } from "@core/filter";
import { folderQueries } from "@core/folder";
import { tagQueries } from "@core/tag";
import { FolderType } from "@models/FolderType";
import { SdocColumns } from "@models/SdocColumns";
import type { Sort_SdocColumns_ } from "@models/Sort_SdocColumns_";
import { infiniteQueryOptions, queryOptions, skipToken } from "@tanstack/react-query";

/** The arguments of the document search, as the backend takes them (the page is added by the query). */
interface SdocSearchRequest {
  projectId: number;
  searchQuery: string;
  filter: MyFilter<SdocColumns>;
  sorts: Sort_SdocColumns_[];
  pageSize: number;
  folderId?: number | null;
  expertMode: boolean;
  showFolders?: boolean;
  showChildFolders?: boolean;
}

/**
 * Query factory for source documents (sdocs).
 *
 *   sdocQueries.all()                        ["sdoc"]
 *   sdocQueries.detail(sdocId)               ["sdoc", "detail", sdocId]
 *   sdocQueries.data(sdocId)                 ["sdoc", "data", sdocId]
 *   sdocQueries.idByFilename(pid, filename)  ["sdoc", "idByFilename", pid, filename]
 *   sdocQueries.sameFolder(sdocId)           ["sdoc", "sameFolder", sdocId]
 *   sdocQueries.thumbnailUrl(sdocId)         ["sdoc", "thumbnailUrl", sdocId]
 *   sdocQueries.idsByTag(tagId)              ["sdoc", "idsByTag", tagId]
 *   sdocQueries.annotators(sdocId)           ["sdoc", "annotators", sdocId]
 *   sdocQueries.search(params)               ["sdoc", "search", projectId, ...]
 */
export const sdocQueries = {
  all: () => ["sdoc"] as const,

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

  // the column infos of the document filter. The search page and the filter table keep their own filter slice, so each
  // one has its own cache entry and gets its own onLoaded call.
  tableInfo: (projectId: number, slice: "search" | "documentTable", onLoaded?: (columnInfos: ColumnInfo[]) => void) =>
    queryOptions({
      queryKey: tableInfoQueries.bySlice(slice, projectId),
      queryFn: async () => {
        const columnInfos = toColumnInfos(await SearchService.searchSdocInfo({ projectId }));
        onLoaded?.(columnInfos);
        return columnInfos;
      },
      staleTime: Infinity,
    }),

  // the document search: project-wide, with highlights. Its queryFn seeds the caches of the found sdocs, annotators, tags
  // and folders. Used by the search page and the sdoc filter table.
  searchScope: () => [...sdocQueries.all(), "search"] as const,
  // prefix of all document searches of one project, for invalidation
  searchByProject: (projectId: number) => [...sdocQueries.searchScope(), projectId] as const,
  search: (request: SdocSearchRequest) =>
    infiniteQueryOptions({
      queryKey: [...sdocQueries.searchByProject(request.projectId), request] as const,
      queryFn: async ({ pageParam }) => {
        const { projectId, searchQuery, filter, sorts, pageSize, ...options } = request;
        const data = await SearchService.searchSdocs({
          projectId,
          searchQuery,
          highlight: true,
          ...options,
          requestBody: { filter, sorts },
          pageNumber: pageParam,
          pageSize,
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
