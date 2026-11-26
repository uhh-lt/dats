import { BboxAnnotationService } from "@api/services/BboxAnnotationService";
import { SearchService } from "@api/services/SearchService";
import { tableInfoQueries, toColumnInfos } from "@core/filter";
import type { QueryRequest_BBoxColumns_ } from "@models/QueryRequest_BBoxColumns_";
import { infiniteQueryOptions, queryOptions, skipToken } from "@tanstack/react-query";

/**
 * Query factory for bounding box annotations.
 *
 *   bboxAnnotationQueries.all()                                  ["bboxAnnotation"]
 *   bboxAnnotationQueries.byId(projectId, bboxId)                ["bboxAnnotation", "detail", bboxId, projectId]
 *   bboxAnnotationQueries.byUserCode(projectId, codeId, userId)  ["bboxAnnotation", "userCode", codeId, userId, projectId]
 *   bboxAnnotationQueries.bySdoc(projectId, sdocId, userId)      ["bboxAnnotation", "sdoc", sdocId, userId, projectId]
 *   bboxAnnotationQueries.tableInfo(projectId)                   ["tableInfo", "bbox", projectId]
 *   bboxAnnotationQueries.search(projectId, request)               ["bboxAnnotation", "search", request, projectId]
 *
 * The routes need the project, but the ids already determine it: the project comes last in the keys, so the prefixes
 * by id (byUserCodeOfCodeScope) cover it.
 */
export const bboxAnnotationQueries = {
  all: () => ["bboxAnnotation"] as const,

  // the mutations that update a cache optimistically (see rollbackOptimisticUpdate); only these are counted there
  optimisticMutationScope: () => [...bboxAnnotationQueries.all(), "optimistic"] as const,

  byIdScope: () => [...bboxAnnotationQueries.all(), "detail"] as const,
  byId: (projectId: number | null | undefined, bboxId: number | null | undefined) =>
    queryOptions({
      queryKey: [...bboxAnnotationQueries.byIdScope(), bboxId, projectId] as const,
      queryFn:
        !projectId || !bboxId
          ? skipToken
          : () => BboxAnnotationService.getById({ projectId, bboxAnnotationId: bboxId }),
      staleTime: 1000 * 60 * 5,
    }),

  byUserCodeScope: () => [...bboxAnnotationQueries.all(), "userCode"] as const,
  // prefix of all bbox annotation queries of one code (any user), for invalidation
  byUserCodeOfCodeScope: (codeId: number) => [...bboxAnnotationQueries.byUserCodeScope(), codeId] as const,
  byUserCode: (
    projectId: number | null | undefined,
    codeId: number | null | undefined,
    userId: number | null | undefined,
  ) =>
    queryOptions({
      queryKey: [...bboxAnnotationQueries.byUserCodeScope(), codeId, userId, projectId] as const,
      queryFn:
        !projectId || !codeId || !userId
          ? skipToken
          : () => BboxAnnotationService.getBboxAnnotations({ projectId, userId, codeId }),
    }),

  bySdocScope: () => [...bboxAnnotationQueries.all(), "sdoc"] as const,
  bySdoc: (
    projectId: number | null | undefined,
    sdocId: number | null | undefined,
    userId: number | null | undefined,
  ) =>
    queryOptions({
      queryKey: [...bboxAnnotationQueries.bySdocScope(), sdocId, userId, projectId] as const,
      queryFn:
        !projectId || !sdocId || !userId
          ? skipToken
          : () => BboxAnnotationService.getBboxAnnotations({ projectId, userId, sdocId }),
    }),
  // the column infos of the bbox annotation filter table
  tableInfo: (projectId: number) =>
    queryOptions({
      queryKey: tableInfoQueries.byDomain("bbox", projectId),
      queryFn: async () => toColumnInfos(await SearchService.searchBboxAnnotationInfo({ projectId })),
      staleTime: Infinity,
    }),

  searchScope: () => [...bboxAnnotationQueries.all(), "search"] as const,
  search: (projectId: number, request: QueryRequest_BBoxColumns_) =>
    infiniteQueryOptions({
      queryKey: [...bboxAnnotationQueries.searchScope(), request, projectId] as const,
      queryFn: ({ pageParam }) =>
        SearchService.searchBboxAnnotations({ projectId, requestBody: { ...request, page_number: pageParam } }),
      initialPageParam: 0,
      getNextPageParam: (_lastPage, pages) => pages.length,
      refetchOnWindowFocus: false,
    }),
};
