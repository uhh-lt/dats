import { ProjectService } from "@api/services/ProjectService";
import { SourceDocumentService } from "@api/services/SourceDocumentService";
import { TagService } from "@api/services/TagService";
import { queryOptions, skipToken } from "@tanstack/react-query";

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
};
