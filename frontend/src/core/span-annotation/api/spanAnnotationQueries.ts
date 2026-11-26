import { SpanAnnotationService } from "@api/services/SpanAnnotationService";
import { SearchService } from "@api/services/SearchService";
import { tableInfoQueries, toColumnInfos } from "@core/filter";
import type { QueryRequest_SpanColumns_ } from "@models/QueryRequest_SpanColumns_";
import { infiniteQueryOptions, queryOptions, skipToken } from "@tanstack/react-query";

/**
 * Query factory for span annotations.
 *
 *   spanAnnotationQueries.all()                                  ["spanAnnotation"]
 *   spanAnnotationQueries.byId(projectId, spanId)                ["spanAnnotation", "detail", spanId, projectId]
 *   spanAnnotationQueries.byUserCode(projectId, codeId, userId)  ["spanAnnotation", "userCode", codeId, userId, projectId]
 *   spanAnnotationQueries.bySdoc(projectId, sdocId, userId)      ["spanAnnotation", "sdoc", sdocId, userId, projectId]
 *   spanAnnotationQueries.tableInfo(projectId)                   ["tableInfo", "span", projectId]
 *   spanAnnotationQueries.search(projectId, request)               ["spanAnnotation", "search", request, projectId]
 *
 * The routes need the project, but the ids already determine it: the project comes last in the keys, so the prefixes
 * by id (bySdocOfSdocScope, byUserCodeOfCodeScope) cover it.
 */
export const spanAnnotationQueries = {
  all: () => ["spanAnnotation"] as const,

  // the mutations that update a cache optimistically (see rollbackOptimisticUpdate); only these are counted there
  optimisticMutationScope: () => [...spanAnnotationQueries.all(), "optimistic"] as const,

  // a single span annotation
  byIdScope: () => [...spanAnnotationQueries.all(), "detail"] as const,
  byId: (projectId: number | null | undefined, spanId: number | null | undefined) =>
    queryOptions({
      queryKey: [...spanAnnotationQueries.byIdScope(), spanId, projectId] as const,
      queryFn:
        !projectId || !spanId
          ? skipToken
          : () => SpanAnnotationService.getById({ projectId, spanAnnotationId: spanId }),
      staleTime: 1000 * 60 * 5,
    }),

  // all span annotations of one user that use a code
  byUserCodeScope: () => [...spanAnnotationQueries.all(), "userCode"] as const,
  // prefix of all span annotation queries of one code (any user), for invalidation
  byUserCodeOfCodeScope: (codeId: number) => [...spanAnnotationQueries.byUserCodeScope(), codeId] as const,
  byUserCode: (
    projectId: number | null | undefined,
    codeId: number | null | undefined,
    userId: number | null | undefined,
  ) =>
    queryOptions({
      queryKey: [...spanAnnotationQueries.byUserCodeScope(), codeId, userId, projectId] as const,
      queryFn:
        !projectId || !codeId || !userId
          ? skipToken
          : () => SpanAnnotationService.getSpanAnnotations({ projectId, userId, codeId }),
    }),

  // all span annotations of one user in one sdoc
  bySdocScope: () => [...spanAnnotationQueries.all(), "sdoc"] as const,
  // prefix of all span annotation queries of one sdoc (any user), for invalidation
  bySdocOfSdocScope: (sdocId: number) => [...spanAnnotationQueries.bySdocScope(), sdocId] as const,
  bySdoc: (
    projectId: number | null | undefined,
    sdocId: number | null | undefined,
    userId: number | null | undefined,
  ) =>
    queryOptions({
      queryKey: [...spanAnnotationQueries.bySdocScope(), sdocId, userId, projectId] as const,
      queryFn:
        !projectId || !sdocId || !userId
          ? skipToken
          : () => SpanAnnotationService.getSpanAnnotations({ projectId, userId, sdocId }),
    }),
  // the column infos of the span annotation filter table
  tableInfo: (projectId: number) =>
    queryOptions({
      queryKey: tableInfoQueries.byDomain("span", projectId),
      queryFn: async () => toColumnInfos(await SearchService.searchSpanAnnotationInfo({ projectId })),
      staleTime: Infinity,
    }),

  searchScope: () => [...spanAnnotationQueries.all(), "search"] as const,
  search: (projectId: number, request: QueryRequest_SpanColumns_) =>
    infiniteQueryOptions({
      queryKey: [...spanAnnotationQueries.searchScope(), request, projectId] as const,
      queryFn: ({ pageParam }) =>
        SearchService.searchSpanAnnotations({ projectId, requestBody: { ...request, page_number: pageParam } }),
      initialPageParam: 0,
      getNextPageParam: (_lastPage, pages) => pages.length,
      refetchOnWindowFocus: false,
    }),
};
