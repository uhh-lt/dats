import { SentenceAnnotationService } from "@api/services/SentenceAnnotationService";
import { SearchService } from "@api/services/SearchService";
import { tableInfoQueries, toColumnInfos } from "@core/filter";
import type { QueryRequest_SentAnnoColumns_ } from "@models/QueryRequest_SentAnnoColumns_";
import { infiniteQueryOptions, queryOptions, skipToken } from "@tanstack/react-query";

/**
 * Query factory for sentence annotations. The per-sdoc query returns the annotations grouped by sentence
 * (SentenceAnnotatorResult), not a flat list.
 *
 *   sentenceAnnotationQueries.all()                              ["sentenceAnnotation"]
 *   sentenceAnnotationQueries.byId(projectId, sentenceAnnoId)    ["sentenceAnnotation", "detail", sentenceAnnoId, projectId]
 *   sentenceAnnotationQueries.bySdoc(projectId, sdocId, userId)  ["sentenceAnnotation", "sdoc", sdocId, userId, projectId]
 *   sentenceAnnotationQueries.tableInfo(projectId)               ["tableInfo", "sentence", projectId]
 *   sentenceAnnotationQueries.search(request)                    ["sentenceAnnotation", "search", request]
 *
 * The routes need the project, but the ids already determine it: the project comes last in the keys, so the prefixes
 * by id cover it.
 */
export const sentenceAnnotationQueries = {
  all: () => ["sentenceAnnotation"] as const,

  // the mutations that update a cache optimistically (see rollbackOptimisticUpdate); only these are counted there
  optimisticMutationScope: () => [...sentenceAnnotationQueries.all(), "optimistic"] as const,

  byIdScope: () => [...sentenceAnnotationQueries.all(), "detail"] as const,
  byId: (projectId: number | null | undefined, sentenceAnnoId: number | null | undefined) =>
    queryOptions({
      queryKey: [...sentenceAnnotationQueries.byIdScope(), sentenceAnnoId, projectId] as const,
      queryFn:
        !projectId || !sentenceAnnoId
          ? skipToken
          : () => SentenceAnnotationService.getById({ projectId, sentenceAnnotationId: sentenceAnnoId }),
      staleTime: 1000 * 60 * 5,
    }),

  bySdocScope: () => [...sentenceAnnotationQueries.all(), "sdoc"] as const,
  bySdoc: (
    projectId: number | null | undefined,
    sdocId: number | null | undefined,
    userId: number | null | undefined,
  ) =>
    queryOptions({
      queryKey: [...sentenceAnnotationQueries.bySdocScope(), sdocId, userId, projectId] as const,
      queryFn:
        !projectId || !sdocId || !userId
          ? skipToken
          : () => SentenceAnnotationService.getSentenceAnnotationsBySentence({ projectId, userId, sdocId }),
    }),
  // the column infos of the sentence annotation filter table
  tableInfo: (projectId: number) =>
    queryOptions({
      queryKey: tableInfoQueries.byDomain("sentence", projectId),
      queryFn: async () => toColumnInfos(await SearchService.searchSentenceAnnotationInfo({ projectId })),
      staleTime: Infinity,
    }),

  searchScope: () => [...sentenceAnnotationQueries.all(), "search"] as const,
  search: (request: QueryRequest_SentAnnoColumns_) =>
    infiniteQueryOptions({
      queryKey: [...sentenceAnnotationQueries.searchScope(), request] as const,
      queryFn: ({ pageParam }) =>
        SearchService.searchSentenceAnnotations({ requestBody: { ...request, page_number: pageParam } }),
      initialPageParam: 0,
      getNextPageParam: (_lastPage, pages) => pages.length,
      refetchOnWindowFocus: false,
    }),
};
