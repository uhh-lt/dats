import { SpanAnnotationService } from "@api/services/SpanAnnotationService";
import { SearchService } from "@api/services/SearchService";
import { type ColumnInfo, tableInfoQueries, toColumnInfos } from "@core/filter";
import type { QueryRequest_SpanColumns_ } from "@models/QueryRequest_SpanColumns_";
import { infiniteQueryOptions, queryOptions, skipToken } from "@tanstack/react-query";

/**
 * Span annotations.
 *
 *   spanAnnotationQueries.all()                      ["spanAnnotation"]
 *   spanAnnotationQueries.byId(spanId)               ["spanAnnotation", "detail", spanId]
 *   spanAnnotationQueries.byUserCode(codeId)         ["spanAnnotation", "userCode", codeId]
 *   spanAnnotationQueries.bySdoc(sdocId, userId)     ["spanAnnotation", "sdoc", sdocId, userId]
 */
export const spanAnnotationQueries = {
  all: () => ["spanAnnotation"] as const,

  // the mutations that update a cache optimistically (see rollbackOptimisticUpdate); only these are counted there
  optimisticMutationScope: () => [...spanAnnotationQueries.all(), "optimistic"] as const,

  // a single span annotation
  byIdScope: () => [...spanAnnotationQueries.all(), "detail"] as const,
  byId: (spanId: number | null | undefined) =>
    queryOptions({
      queryKey: [...spanAnnotationQueries.byIdScope(), spanId] as const,
      queryFn: !spanId ? skipToken : () => SpanAnnotationService.getById({ spanId }),
      staleTime: 1000 * 60 * 5,
    }),

  // all span annotations of the logged-in user that use a code
  byUserCodeScope: () => [...spanAnnotationQueries.all(), "userCode"] as const,
  byUserCode: (codeId: number | null | undefined) =>
    queryOptions({
      queryKey: [...spanAnnotationQueries.byUserCodeScope(), codeId] as const,
      queryFn: !codeId ? skipToken : () => SpanAnnotationService.getByUserCode({ codeId }),
    }),

  // all span annotations of one user in one sdoc
  bySdocScope: () => [...spanAnnotationQueries.all(), "sdoc"] as const,
  // prefix of all span annotation queries of one sdoc (any user), for invalidation
  bySdocOfSdocScope: (sdocId: number) => [...spanAnnotationQueries.bySdocScope(), sdocId] as const,
  bySdoc: (sdocId: number | null | undefined, userId: number | null | undefined) =>
    queryOptions({
      queryKey: [...spanAnnotationQueries.bySdocScope(), sdocId, userId] as const,
      queryFn: !sdocId || !userId ? skipToken : () => SpanAnnotationService.getBySdocAndUser({ sdocId, userId }),
    }),
  // the column infos of the span annotation filter table
  tableInfo: (projectId: number, onLoaded?: (columnInfos: ColumnInfo[]) => void) =>
    queryOptions({
      queryKey: tableInfoQueries.bySlice("satFilter", projectId),
      queryFn: async () => {
        const columnInfos = toColumnInfos(await SearchService.searchSpanAnnotationInfo({ projectId }));
        onLoaded?.(columnInfos);
        return columnInfos;
      },
      staleTime: Infinity,
    }),

  searchScope: () => [...spanAnnotationQueries.all(), "search"] as const,
  search: (request: QueryRequest_SpanColumns_) =>
    infiniteQueryOptions({
      queryKey: [...spanAnnotationQueries.searchScope(), request] as const,
      queryFn: ({ pageParam }) =>
        SearchService.searchSpanAnnotations({ requestBody: { ...request, page_number: pageParam } }),
      initialPageParam: 0,
      getNextPageParam: (_lastPage, pages) => pages.length,
      refetchOnWindowFocus: false,
    }),
};
