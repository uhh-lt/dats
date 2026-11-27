import { SentenceAnnotationsService } from "@api/services/SentenceAnnotationsService";
import { SearchService } from "@api/services/SearchService";
import { tableInfoQueries, toColumnInfos } from "@core/filter";
import type { QueryRequest_SentAnnoColumns_ } from "@models/QueryRequest_SentAnnoColumns_";
import { infiniteQueryOptions, queryOptions, skipToken } from "@tanstack/react-query";

/**
 * Query factory for sentence annotations. The per-sdoc query returns the annotations grouped by sentence
 * (SentenceAnnotatorResult), not a flat list.
 *
 *   sentenceAnnotationQueries.all()                              ["sentenceAnnotation"]
 *   sentenceAnnotationQueries.projectScope(projectId)            ["sentenceAnnotation", "project", projectId]
 *   sentenceAnnotationQueries.byId(projectId, sentenceAnnoId)    ["sentenceAnnotation", "project", projectId, "detail", sentenceAnnoId]
 *   sentenceAnnotationQueries.bySdoc(projectId, sdocId, userId)  ["sentenceAnnotation", "project", projectId, "sdoc", sdocId, userId]
 *   sentenceAnnotationQueries.tableInfo(projectId)               ["tableInfo", "project", projectId, "sentence"]
 *   sentenceAnnotationQueries.search(projectId, request)         ["sentenceAnnotation", "project", projectId, "search", request]
 */
export const sentenceAnnotationQueries = {
  all: () => ["sentenceAnnotation"] as const,

  // the mutations that update a cache optimistically (see rollbackOptimisticUpdate); only these are counted there
  optimisticMutationScope: () => [...sentenceAnnotationQueries.all(), "optimistic"] as const,

  // prefix of all sentence annotation queries of one project
  projectScope: (projectId: number | null | undefined) =>
    [...sentenceAnnotationQueries.all(), "project", projectId] as const,

  byIdScope: (projectId: number | null | undefined) =>
    [...sentenceAnnotationQueries.projectScope(projectId), "detail"] as const,
  byId: (projectId: number | null | undefined, sentenceAnnoId: number | null | undefined) =>
    queryOptions({
      queryKey: [...sentenceAnnotationQueries.byIdScope(projectId), sentenceAnnoId] as const,
      queryFn:
        !projectId || !sentenceAnnoId
          ? skipToken
          : () => SentenceAnnotationsService.getById({ projectId, sentenceAnnotationId: sentenceAnnoId }),
      staleTime: 1000 * 60 * 5,
    }),

  bySdocScope: (projectId: number | null | undefined) =>
    [...sentenceAnnotationQueries.projectScope(projectId), "sdoc"] as const,
  bySdoc: (
    projectId: number | null | undefined,
    sdocId: number | null | undefined,
    userId: number | null | undefined,
  ) =>
    queryOptions({
      queryKey: [...sentenceAnnotationQueries.bySdocScope(projectId), sdocId, userId] as const,
      queryFn:
        !projectId || !sdocId || !userId
          ? skipToken
          : () => SentenceAnnotationsService.getSentenceMap({ projectId, userId, sdocId }),
    }),
  // the column infos of the sentence annotation filter table
  tableInfo: (projectId: number) =>
    queryOptions({
      queryKey: tableInfoQueries.byDomain("sentence", projectId),
      queryFn: async () => toColumnInfos(await SearchService.getSentenceAnnotationColumns({ projectId })),
      staleTime: Infinity,
    }),

  searchScope: (projectId: number) => [...sentenceAnnotationQueries.projectScope(projectId), "search"] as const,
  search: (projectId: number, request: QueryRequest_SentAnnoColumns_) =>
    infiniteQueryOptions({
      queryKey: [...sentenceAnnotationQueries.searchScope(projectId), request] as const,
      queryFn: ({ pageParam }) =>
        SearchService.searchSentenceAnnotations({ projectId, requestBody: { ...request, page_number: pageParam } }),
      initialPageParam: 0,
      getNextPageParam: (_lastPage, pages) => pages.length,
      refetchOnWindowFocus: false,
    }),
};
