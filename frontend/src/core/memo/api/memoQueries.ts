import { MemoService } from "@api/services/MemoService";
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
 *   memoQueries.all()                              ["memo"]
 *   memoQueries.byId(projectId, memoId)            ["memo", "detail", memoId, projectId]
 *   memoQueries.byAttachedObject(projectId, type, id)  ["memo", "attached", type, id, projectId]
 *   memoQueries.recent(projectId)                  ["memo", "recent", projectId]
 *   memoQueries.search(request)                    ["memo", "search", request]
 *   memoQueries.searchGrouped(request)             ["memo", "searchGrouped", request]
 *   memoQueries.tableInfo(projectId)               ["tableInfo", "memoFilter", projectId]
 */
export const memoQueries = {
  all: () => ["memo"] as const,

  // a single memo
  byIdScope: () => [...memoQueries.all(), "detail"] as const,
  byId: (projectId: number | null | undefined, memoId: number | null | undefined) =>
    queryOptions({
      queryKey: [...memoQueries.byIdScope(), memoId, projectId] as const,
      queryFn: !projectId || !memoId ? skipToken : () => MemoService.getById({ projectId, memoId }),
      staleTime: 1000 * 60 * 5,
    }),

  // all memos attached to an object; the object determines the project, so the project comes last in the key
  byAttachedObjectScope: () => [...memoQueries.all(), "attached"] as const,
  byAttachedObject: (
    projectId: number | null | undefined,
    attachedObjType: AttachedObjectType,
    attachedObjId: number | null | undefined,
  ) =>
    queryOptions({
      queryKey: [...memoQueries.byAttachedObjectScope(), attachedObjType, attachedObjId, projectId] as const,
      queryFn:
        !projectId || !attachedObjId
          ? skipToken
          : () =>
              MemoService.getByProject({
                projectId,
                attachedObjectType: attachedObjType,
                attachedObjectId: attachedObjId,
              }),
      retry: false,
    }),

  // recently opened memos of a project
  recentScope: () => [...memoQueries.all(), "recent"] as const,
  recent: (projectId: number | null | undefined) =>
    queryOptions({
      queryKey: [...memoQueries.recentScope(), projectId] as const,
      queryFn: !projectId ? skipToken : () => MemoService.getRecentMemos({ projectId }),
    }),

  // search results (flat) and search results grouped by a column
  searchScope: () => [...memoQueries.all(), "search"] as const,
  search: (request: QueryRequest_MemoColumns_) =>
    infiniteQueryOptions({
      queryKey: [...memoQueries.searchScope(), request] as const,
      queryFn: ({ pageParam }) => SearchService.searchMemos({ requestBody: { ...request, page_number: pageParam } }),
      initialPageParam: 0,
      getNextPageParam: nextPageByCount,
    }),
  searchGroupedScope: () => [...memoQueries.all(), "searchGrouped"] as const,
  searchGrouped: (request: GroupQueryRequest_MemoColumns_) =>
    infiniteQueryOptions({
      queryKey: [...memoQueries.searchGroupedScope(), request] as const,
      queryFn: ({ pageParam }) =>
        SearchService.searchMemoGroups({ requestBody: { ...request, page_number: pageParam } }),
      initialPageParam: 0,
      getNextPageParam: nextPageByCount,
    }),

  // the column infos of the memo filter table
  tableInfo: (projectId: number) =>
    queryOptions({
      queryKey: tableInfoQueries.byDomain("memoFilter", projectId),
      queryFn: async () => toColumnInfos(await SearchService.searchMemoInfo({ projectId })),
      staleTime: Infinity,
    }),
};
