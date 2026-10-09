import { ProjectService } from "@api/services/ProjectService";
import { SearchService } from "@api/services/SearchService";
import { SourceDocumentService } from "@api/services/SourceDocumentService";
import { TagService } from "@api/services/TagService";
import type { MyFilter } from "@core/filter";
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
};
