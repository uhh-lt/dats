import { SpanAnnotationsService } from "@api/services/SpanAnnotationsService";
import { SearchService } from "@api/services/SearchService";
import { tableInfoQueries, toColumnInfos } from "@core/filter";
import type { QueryRequest_SpanColumns_ } from "@models/QueryRequest_SpanColumns_";
import { infiniteQueryOptions, queryOptions, skipToken } from "@tanstack/react-query";

/**
 * Query factory for span annotations.
 *
 *   spanAnnotationQueries.all()                                  ["spanAnnotation"]
 *   spanAnnotationQueries.projectScope(projectId)                ["spanAnnotation", "project", projectId]
 *   spanAnnotationQueries.byId(projectId, spanId)                ["spanAnnotation", "project", projectId, "detail", spanId]
 *   spanAnnotationQueries.byUserCode(projectId, codeId, userId)  ["spanAnnotation", "project", projectId, "userCode", codeId, userId]
 *   spanAnnotationQueries.bySdoc(projectId, sdocId, userId)      ["spanAnnotation", "project", projectId, "sdoc", sdocId, userId]
 *   spanAnnotationQueries.tableInfo(projectId)                   ["tableInfo", "project", projectId, "span"]
 *   spanAnnotationQueries.search(projectId, request)             ["spanAnnotation", "project", projectId, "search", request]
 */
export const spanAnnotationQueries = {
  all: () => ["spanAnnotation"] as const,

  // the mutations that update a cache optimistically (see rollbackOptimisticUpdate); only these are counted there
  optimisticMutationScope: () => [...spanAnnotationQueries.all(), "optimistic"] as const,

  // prefix of all span annotation queries of one project
  projectScope: (projectId: number | null | undefined) =>
    [...spanAnnotationQueries.all(), "project", projectId] as const,

  // a single span annotation
  byIdScope: (projectId: number | null | undefined) =>
    [...spanAnnotationQueries.projectScope(projectId), "detail"] as const,
  byId: (projectId: number | null | undefined, spanId: number | null | undefined) =>
    queryOptions({
      queryKey: [...spanAnnotationQueries.byIdScope(projectId), spanId] as const,
      queryFn:
        !projectId || !spanId
          ? skipToken
          : () => SpanAnnotationsService.getById({ projectId, spanAnnotationId: spanId }),
      staleTime: 1000 * 60 * 5,
    }),

  // all span annotations of one user that use a code
  byUserCodeScope: (projectId: number | null | undefined) =>
    [...spanAnnotationQueries.projectScope(projectId), "userCode"] as const,
  // prefix of all span annotation queries of one code (any user), for invalidation
  byUserCodeOfCodeScope: (projectId: number, codeId: number) =>
    [...spanAnnotationQueries.byUserCodeScope(projectId), codeId] as const,
  byUserCode: (
    projectId: number | null | undefined,
    codeId: number | null | undefined,
    userId: number | null | undefined,
  ) =>
    queryOptions({
      queryKey: [...spanAnnotationQueries.byUserCodeScope(projectId), codeId, userId] as const,
      queryFn:
        !projectId || !codeId || !userId
          ? skipToken
          : () => SpanAnnotationsService.getByProject({ projectId, userId, codeId }),
    }),

  // all span annotations of one user in one sdoc
  bySdocScope: (projectId: number | null | undefined) =>
    [...spanAnnotationQueries.projectScope(projectId), "sdoc"] as const,
  // prefix of all span annotation queries of one sdoc (any user), for invalidation
  bySdocOfSdocScope: (projectId: number, sdocId: number) =>
    [...spanAnnotationQueries.bySdocScope(projectId), sdocId] as const,
  bySdoc: (
    projectId: number | null | undefined,
    sdocId: number | null | undefined,
    userId: number | null | undefined,
  ) =>
    queryOptions({
      queryKey: [...spanAnnotationQueries.bySdocScope(projectId), sdocId, userId] as const,
      queryFn:
        !projectId || !sdocId || !userId
          ? skipToken
          : () => SpanAnnotationsService.getByProject({ projectId, userId, sdocId }),
    }),
  // the column infos of the span annotation filter table
  tableInfo: (projectId: number) =>
    queryOptions({
      queryKey: tableInfoQueries.byDomain("span", projectId),
      queryFn: async () => toColumnInfos(await SearchService.searchSpanAnnotationColumns({ projectId })),
      staleTime: Infinity,
    }),

  searchScope: (projectId: number) => [...spanAnnotationQueries.projectScope(projectId), "search"] as const,
  search: (projectId: number, request: QueryRequest_SpanColumns_) =>
    infiniteQueryOptions({
      queryKey: [...spanAnnotationQueries.searchScope(projectId), request] as const,
      queryFn: ({ pageParam }) =>
        SearchService.searchSpanAnnotations({ projectId, requestBody: { ...request, page_number: pageParam } }),
      initialPageParam: 0,
      getNextPageParam: (_lastPage, pages) => pages.length,
      refetchOnWindowFocus: false,
    }),
};
