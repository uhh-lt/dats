import { queryClient } from "@api/queryClient";
import { SearchService } from "@api/services/SearchService";
import { SourceDocumentsService } from "@api/services/SourceDocumentsService";
import { TagsService } from "@api/services/TagsService";
import { tableInfoQueries, toColumnInfos } from "@core/filter";
import { folderQueries } from "@core/folder";
import { tagQueries } from "@core/tag";
import { FolderType } from "@models/FolderType";
import type { SourceDocumentSearchRequest } from "@models/SourceDocumentSearchRequest";
import { infiniteQueryOptions, queryOptions, skipToken } from "@tanstack/react-query";

/** The document search request, as the backend takes it (the page and the highlighting are added by the query). */
type SdocSearchRequest = Omit<SourceDocumentSearchRequest, "page_number" | "highlight">;

/**
 * Query factory for source documents (sdocs).
 *
 *   sdocQueries.all()                          ["sdoc"]
 *   sdocQueries.projectScope(projectId)        ["sdoc", "project", projectId]
 *   sdocQueries.byId(projectId, sdocId)        ["sdoc", "project", projectId, "detail", sdocId]
 *   sdocQueries.data(projectId, sdocId)        ["sdoc", "project", projectId, "data", sdocId]
 *   sdocQueries.idByFilename(pid, filename)    ["sdoc", "project", pid, "idByFilename", filename]
 *   sdocQueries.sameFolder(projectId, sdocId)  ["sdoc", "project", projectId, "sameFolder", sdocId]
 *   sdocQueries.urls(projectId, sdocId)        ["sdoc", "project", projectId, "urls", sdocId]
 *   sdocQueries.idsByTag(projectId, tagId)     ["sdoc", "project", projectId, "idsByTag", tagId]
 *   sdocQueries.annotators(projectId, sdocId)  ["sdoc", "project", projectId, "annotators", sdocId]
 *   sdocQueries.tableInfo(projectId)           ["tableInfo", "project", projectId, "sdoc"]
 *   sdocQueries.search(projectId, request)     ["sdoc", "project", projectId, "search", request]
 */
export const sdocQueries = {
  all: () => ["sdoc"] as const,
  // prefix of all sdoc queries of one project
  projectScope: (projectId: number | null | undefined) => [...sdocQueries.all(), "project", projectId] as const,

  // a single sdoc
  byIdScope: (projectId: number) => [...sdocQueries.projectScope(projectId), "detail"] as const,
  byId: (projectId: number, sdocId: number) =>
    queryOptions({
      queryKey: [...sdocQueries.byIdScope(projectId), sdocId] as const,
      queryFn: () => SourceDocumentsService.getById({ projectId, sdocId }),
      staleTime: Infinity,
    }),

  // an sdoc including its data (text, html, ...)
  dataScope: (projectId: number) => [...sdocQueries.projectScope(projectId), "data"] as const,
  data: (projectId: number, sdocId: number) =>
    queryOptions({
      queryKey: [...sdocQueries.dataScope(projectId), sdocId] as const,
      queryFn: () => SourceDocumentsService.getData({ projectId, sdocId }),
      staleTime: Infinity,
    }),

  // sdoc id resolved from a filename
  idByFilenameScope: (projectId: number) => [...sdocQueries.projectScope(projectId), "idByFilename"] as const,
  idByFilename: (projectId: number, filename: string | undefined) =>
    queryOptions({
      queryKey: [...sdocQueries.idByFilenameScope(projectId), filename] as const,
      queryFn: !filename
        ? skipToken
        : () =>
            SourceDocumentsService.getByProject({ projectId, filename, onlyFinished: true }).then((sdocs) => {
              if (sdocs.length === 0) throw new Error(`No document with the filename ${filename}`);
              return sdocs[0].id;
            }),
      staleTime: Infinity,
    }),

  // ids of the sdocs in the same folder
  sameFolderScope: (projectId: number | null | undefined) =>
    [...sdocQueries.projectScope(projectId), "sameFolder"] as const,
  sameFolder: (projectId: number | null | undefined, sdocId: number | null | undefined) =>
    queryOptions({
      queryKey: [...sdocQueries.sameFolderScope(projectId), sdocId] as const,
      queryFn: !projectId || !sdocId ? skipToken : () => SourceDocumentsService.getSiblings({ projectId, sdocId }),
      staleTime: Infinity,
    }),

  // relative urls of the files: the upload, the WebP image and the thumbnail
  // (raw; the hooks add the /content/ prefix)
  urlsScope: (projectId: number | null | undefined) => [...sdocQueries.projectScope(projectId), "urls"] as const,
  urls: (projectId: number | null | undefined, sdocId: number | null | undefined) =>
    queryOptions({
      queryKey: [...sdocQueries.urlsScope(projectId), sdocId] as const,
      queryFn: !projectId || !sdocId ? skipToken : () => SourceDocumentsService.getUrls({ projectId, sdocId }),
    }),

  // ids of the sdocs that carry a tag
  idsByTagScope: (projectId: number | null | undefined) =>
    [...sdocQueries.projectScope(projectId), "idsByTag"] as const,
  idsByTag: (projectId: number | null | undefined, tagId: number | null | undefined) =>
    queryOptions({
      queryKey: [...sdocQueries.idsByTagScope(projectId), tagId] as const,
      queryFn: !projectId || !tagId ? skipToken : () => TagsService.getSourceDocuments({ projectId, tagId }),
    }),

  // user ids that annotated the sdoc
  annotatorsScope: (projectId: number | null | undefined) =>
    [...sdocQueries.projectScope(projectId), "annotators"] as const,
  annotators: (projectId: number | null | undefined, sdocId: number | null | undefined) =>
    queryOptions({
      queryKey: [...sdocQueries.annotatorsScope(projectId), sdocId] as const,
      queryFn: !projectId || !sdocId ? skipToken : () => SourceDocumentsService.getAnnotators({ projectId, sdocId }),
      staleTime: 1000 * 60 * 5,
    }),

  // the column infos of the document filter (also used by the perspectives, which filter documents)
  tableInfo: (projectId: number) =>
    queryOptions({
      queryKey: tableInfoQueries.byDomain("sdoc", projectId),
      queryFn: async () => toColumnInfos(await SearchService.getSourceDocumentColumns({ projectId })),
      staleTime: Infinity,
    }),

  // the document search: project-wide, with highlights. Its queryFn seeds the caches of the found sdocs, annotators, tags
  // and folders. Used by the search page and the sdoc filter table.
  searchScope: (projectId: number) => [...sdocQueries.projectScope(projectId), "search"] as const,
  search: (projectId: number, request: SdocSearchRequest) =>
    infiniteQueryOptions({
      queryKey: [...sdocQueries.searchScope(projectId), request] as const,
      queryFn: async ({ pageParam }) => {
        const data = await SearchService.searchSourceDocuments({
          projectId,
          requestBody: { ...request, highlight: true, page_number: pageParam },
        });

        Object.entries(data.sdocs).forEach(([sdocId, sdoc]) => {
          queryClient.setQueryData(sdocQueries.byId(projectId, parseInt(sdocId)).queryKey, sdoc);
          queryClient.setQueryData(sdocQueries.idByFilename(projectId, sdoc.filename).queryKey, sdoc.id);
        });

        Object.entries(data.annotators).forEach(([sdocId, annotators]) => {
          queryClient.setQueryData(sdocQueries.annotators(projectId, parseInt(sdocId)).queryKey, annotators);
        });

        Object.entries(data.tags).forEach(([sdocId, tags]) => {
          queryClient.setQueryData(tagQueries.idsBySdoc(projectId, parseInt(sdocId)).queryKey, tags);
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
