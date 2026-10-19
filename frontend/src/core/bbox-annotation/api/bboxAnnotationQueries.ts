import { BboxAnnotationService } from "@api/services/BboxAnnotationService";
import { SearchService } from "@api/services/SearchService";
import { tableInfoQueries, toColumnInfos } from "@core/filter";
import type { QueryRequest_BBoxColumns_ } from "@models/QueryRequest_BBoxColumns_";
import { infiniteQueryOptions, queryOptions, skipToken } from "@tanstack/react-query";

/**
 * Bounding box annotations.
 */
export const bboxAnnotationQueries = {
  all: () => ["bboxAnnotation"] as const,

  // the mutations that update a cache optimistically (see rollbackOptimisticUpdate); only these are counted there
  optimisticMutationScope: () => [...bboxAnnotationQueries.all(), "optimistic"] as const,

  byIdScope: () => [...bboxAnnotationQueries.all(), "detail"] as const,
  byId: (bboxId: number | null | undefined) =>
    queryOptions({
      queryKey: [...bboxAnnotationQueries.byIdScope(), bboxId] as const,
      queryFn: !bboxId ? skipToken : () => BboxAnnotationService.getById({ bboxId }),
      staleTime: 1000 * 60 * 5,
    }),

  byUserCodeScope: () => [...bboxAnnotationQueries.all(), "userCode"] as const,
  byUserCode: (codeId: number | null | undefined) =>
    queryOptions({
      queryKey: [...bboxAnnotationQueries.byUserCodeScope(), codeId] as const,
      queryFn: !codeId ? skipToken : () => BboxAnnotationService.getByUserCode({ codeId }),
    }),

  bySdocScope: () => [...bboxAnnotationQueries.all(), "sdoc"] as const,
  bySdoc: (sdocId: number | null | undefined, userId: number | null | undefined) =>
    queryOptions({
      queryKey: [...bboxAnnotationQueries.bySdocScope(), sdocId, userId] as const,
      queryFn: !sdocId || !userId ? skipToken : () => BboxAnnotationService.getBySdocAndUser({ sdocId, userId }),
    }),
  // the column infos of the bbox annotation filter table
  tableInfo: (projectId: number) =>
    queryOptions({
      queryKey: tableInfoQueries.byDomain("bbox", projectId),
      queryFn: async () => toColumnInfos(await SearchService.searchBboxAnnotationInfo({ projectId })),
      staleTime: 1000 * 60 * 5,
    }),

  searchScope: () => [...bboxAnnotationQueries.all(), "search"] as const,
  search: (request: QueryRequest_BBoxColumns_) =>
    infiniteQueryOptions({
      queryKey: [...bboxAnnotationQueries.searchScope(), request] as const,
      queryFn: ({ pageParam }) =>
        SearchService.searchBboxAnnotations({ requestBody: { ...request, page_number: pageParam } }),
      initialPageParam: 0,
      getNextPageParam: (_lastPage, pages) => pages.length,
      refetchOnWindowFocus: false,
    }),
};
