import { BboxAnnotationService } from "@api/services/BboxAnnotationService";
import { SearchService } from "@api/services/SearchService";
import { tableInfoQueries, toColumnInfos } from "@core/filter";
import type { QueryRequest_BBoxColumns_ } from "@models/QueryRequest_BBoxColumns_";
import { infiniteQueryOptions, queryOptions, skipToken } from "@tanstack/react-query";

/**
 * Query factory for bounding box annotations.
 *
 *   bboxAnnotationQueries.all()                                  ["bboxAnnotation"]
 *   bboxAnnotationQueries.projectScope(projectId)                ["bboxAnnotation", "project", projectId]
 *   bboxAnnotationQueries.byId(projectId, bboxId)                ["bboxAnnotation", "project", projectId, "detail", bboxId]
 *   bboxAnnotationQueries.byUserCode(projectId, codeId, userId)  ["bboxAnnotation", "project", projectId, "userCode", codeId, userId]
 *   bboxAnnotationQueries.bySdoc(projectId, sdocId, userId)      ["bboxAnnotation", "project", projectId, "sdoc", sdocId, userId]
 *   bboxAnnotationQueries.tableInfo(projectId)                   ["tableInfo", "project", projectId, "bbox"]
 *   bboxAnnotationQueries.search(projectId, request)             ["bboxAnnotation", "project", projectId, "search", request]
 */
export const bboxAnnotationQueries = {
  all: () => ["bboxAnnotation"] as const,

  // the mutations that update a cache optimistically (see rollbackOptimisticUpdate); only these are counted there
  optimisticMutationScope: () => [...bboxAnnotationQueries.all(), "optimistic"] as const,

  // prefix of all bbox annotation queries of one project
  projectScope: (projectId: number | null | undefined) =>
    [...bboxAnnotationQueries.all(), "project", projectId] as const,

  byIdScope: (projectId: number | null | undefined) =>
    [...bboxAnnotationQueries.projectScope(projectId), "detail"] as const,
  byId: (projectId: number | null | undefined, bboxId: number | null | undefined) =>
    queryOptions({
      queryKey: [...bboxAnnotationQueries.byIdScope(projectId), bboxId] as const,
      queryFn:
        !projectId || !bboxId
          ? skipToken
          : () => BboxAnnotationService.getById({ projectId, bboxAnnotationId: bboxId }),
      staleTime: 1000 * 60 * 5,
    }),

  byUserCodeScope: (projectId: number | null | undefined) =>
    [...bboxAnnotationQueries.projectScope(projectId), "userCode"] as const,
  // prefix of all bbox annotation queries of one code (any user), for invalidation
  byUserCodeOfCodeScope: (projectId: number, codeId: number) =>
    [...bboxAnnotationQueries.byUserCodeScope(projectId), codeId] as const,
  byUserCode: (
    projectId: number | null | undefined,
    codeId: number | null | undefined,
    userId: number | null | undefined,
  ) =>
    queryOptions({
      queryKey: [...bboxAnnotationQueries.byUserCodeScope(projectId), codeId, userId] as const,
      queryFn:
        !projectId || !codeId || !userId
          ? skipToken
          : () => BboxAnnotationService.getByProject({ projectId, userId, codeId }),
    }),

  bySdocScope: (projectId: number | null | undefined) =>
    [...bboxAnnotationQueries.projectScope(projectId), "sdoc"] as const,
  bySdoc: (
    projectId: number | null | undefined,
    sdocId: number | null | undefined,
    userId: number | null | undefined,
  ) =>
    queryOptions({
      queryKey: [...bboxAnnotationQueries.bySdocScope(projectId), sdocId, userId] as const,
      queryFn:
        !projectId || !sdocId || !userId
          ? skipToken
          : () => BboxAnnotationService.getByProject({ projectId, userId, sdocId }),
    }),
  // the column infos of the bbox annotation filter table
  tableInfo: (projectId: number) =>
    queryOptions({
      queryKey: tableInfoQueries.byDomain("bbox", projectId),
      queryFn: async () => toColumnInfos(await SearchService.searchBboxAnnotationInfo({ projectId })),
      staleTime: Infinity,
    }),

  searchScope: (projectId: number) => [...bboxAnnotationQueries.projectScope(projectId), "search"] as const,
  search: (projectId: number, request: QueryRequest_BBoxColumns_) =>
    infiniteQueryOptions({
      queryKey: [...bboxAnnotationQueries.searchScope(projectId), request] as const,
      queryFn: ({ pageParam }) =>
        SearchService.searchBboxAnnotations({ projectId, requestBody: { ...request, page_number: pageParam } }),
      initialPageParam: 0,
      getNextPageParam: (_lastPage, pages) => pages.length,
      refetchOnWindowFocus: false,
    }),
};
