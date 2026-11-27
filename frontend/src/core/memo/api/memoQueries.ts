import { MemosService } from "@api/services/MemosService";
import { SearchService } from "@api/services/SearchService";
import { tableInfoQueries, toColumnInfos } from "@core/filter";
import type { AttachedObjectType } from "@models/AttachedObjectType";
import type { GroupQueryRequest_MemoColumns_ } from "@models/GroupQueryRequest_MemoColumns_";
import type { QueryRequest_MemoColumns_ } from "@models/QueryRequest_MemoColumns_";
import { infiniteQueryOptions, queryOptions, skipToken } from "@tanstack/react-query";

const nextPageByCount = <TPage extends { items: unknown[]; total_results: number }>(lastPage: TPage, pages: TPage[]) =>
  pages.reduce((total, page) => total + page.items.length, 0) < lastPage.total_results ? pages.length : undefined;

/**
 * Query factory for memos.
 *
 *   memoQueries.all()                                  ["memo"]
 *   memoQueries.projectScope(projectId)                ["memo", "project", projectId]
 *   memoQueries.byId(projectId, memoId)                ["memo", "project", projectId, "detail", memoId]
 *   memoQueries.byAttachedObject(projectId, type, id)  ["memo", "project", projectId, "attached", type, id]
 *   memoQueries.recent(projectId)                      ["memo", "project", projectId, "recent"]
 *   memoQueries.search(projectId, request)             ["memo", "project", projectId, "search", request]
 *   memoQueries.searchGrouped(projectId, request)      ["memo", "project", projectId, "searchGrouped", request]
 *   memoQueries.tableInfo(projectId)                   ["tableInfo", "project", projectId, "memoFilter"]
 */
export const memoQueries = {
  all: () => ["memo"] as const,
  // prefix of all memo queries of one project
  projectScope: (projectId: number | null | undefined) => [...memoQueries.all(), "project", projectId] as const,

  // a single memo
  byIdScope: (projectId: number | null | undefined) => [...memoQueries.projectScope(projectId), "detail"] as const,
  byId: (projectId: number | null | undefined, memoId: number | null | undefined) =>
    queryOptions({
      queryKey: [...memoQueries.byIdScope(projectId), memoId] as const,
      queryFn: !projectId || !memoId ? skipToken : () => MemosService.getById({ projectId, memoId }),
      staleTime: 1000 * 60 * 5,
    }),

  // all memos attached to an object
  byAttachedObjectScope: (projectId: number | null | undefined) =>
    [...memoQueries.projectScope(projectId), "attached"] as const,
  byAttachedObject: (
    projectId: number | null | undefined,
    attachedObjType: AttachedObjectType,
    attachedObjId: number | null | undefined,
  ) =>
    queryOptions({
      queryKey: [...memoQueries.byAttachedObjectScope(projectId), attachedObjType, attachedObjId] as const,
      queryFn:
        !projectId || !attachedObjId
          ? skipToken
          : () =>
              MemosService.getByProject({
                projectId,
                attachedObjectType: attachedObjType,
                attachedObjectId: attachedObjId,
              }),
      retry: false,
    }),

  // the ten most recently opened memos of a project
  recentScope: (projectId: number | null | undefined) => [...memoQueries.projectScope(projectId), "recent"] as const,
  recent: (projectId: number | null | undefined) =>
    queryOptions({
      queryKey: memoQueries.recentScope(projectId),
      queryFn: !projectId ? skipToken : () => MemosService.getByProject({ projectId, recent: true, limit: 10 }),
    }),

  // search results (flat) and search results grouped by a column
  searchScope: (projectId: number) => [...memoQueries.projectScope(projectId), "search"] as const,
  search: (projectId: number, request: QueryRequest_MemoColumns_) =>
    infiniteQueryOptions({
      queryKey: [...memoQueries.searchScope(projectId), request] as const,
      queryFn: ({ pageParam }) =>
        SearchService.searchMemos({ projectId, requestBody: { ...request, page_number: pageParam } }),
      initialPageParam: 0,
      getNextPageParam: nextPageByCount,
    }),
  searchGroupedScope: (projectId: number) => [...memoQueries.projectScope(projectId), "searchGrouped"] as const,
  searchGrouped: (projectId: number, request: GroupQueryRequest_MemoColumns_) =>
    infiniteQueryOptions({
      queryKey: [...memoQueries.searchGroupedScope(projectId), request] as const,
      queryFn: ({ pageParam }) =>
        SearchService.searchMemoGroups({ projectId, requestBody: { ...request, page_number: pageParam } }),
      initialPageParam: 0,
      getNextPageParam: nextPageByCount,
    }),

  // the column infos of the memo filter table
  tableInfo: (projectId: number) =>
    queryOptions({
      queryKey: tableInfoQueries.byDomain("memoFilter", projectId),
      queryFn: async () => toColumnInfos(await SearchService.getMemoColumns({ projectId })),
      staleTime: Infinity,
    }),
};
