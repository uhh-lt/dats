import { MemoService } from "@api/services/MemoService";
import { SearchService } from "@api/services/SearchService";
import type { AttachedObjectType } from "@models/AttachedObjectType";
import type { GroupQueryRequest_MemoColumns_ } from "@models/GroupQueryRequest_MemoColumns_";
import type { MemoColumns } from "@models/MemoColumns";
import type { QueryRequest_MemoColumns_ } from "@models/QueryRequest_MemoColumns_";
import { SortDirection } from "@models/SortDirection";
import { infiniteQueryOptions, queryOptions, skipToken } from "@tanstack/react-query";
import type { MRT_SortingState } from "material-react-table";
// eslint-disable-next-line boundaries/element-types
import type { MyFilter } from "@core/filter";

const nextPageByCount = <TPage extends { items: unknown[]; total_results: number }>(lastPage: TPage, pages: TPage[]) =>
  pages.reduce((total, page) => total + page.items.length, 0) < lastPage.total_results ? pages.length : undefined;

interface MemoTableParams {
  projectId: number;
  searchQuery: string;
  filter: MyFilter<MemoColumns>;
  sortingModel: MRT_SortingState;
  isSearchContent: boolean;
  fetchSize: number;
}

/**
 * Query factory for memos. Keys are hierarchical: domain -> scope -> params.
 *
 *   memoQueries.all()                              ["memos"]
 *   memoQueries.byId(memoId)                       ["memos", "detail", memoId]
 *   memoQueries.byAttachedObject(type, id)         ["memos", "attached", type, id]
 *   memoQueries.recent(projectId)                  ["memos", "recent", projectId]
 *   memoQueries.search(request) / .groups(request) ["memos", "search" | "groups", request]
 *   memoQueries.table(params)                      ["memos", "table", projectId, ...]
 */
export const memoQueries = {
  all: () => ["memos"] as const,

  // a single memo
  detailScope: () => [...memoQueries.all(), "detail"] as const,
  byId: (memoId: number | null | undefined) =>
    queryOptions({
      queryKey: [...memoQueries.detailScope(), memoId] as const,
      queryFn: !memoId ? skipToken : () => MemoService.getById({ memoId }),
      staleTime: 1000 * 60 * 5,
    }),

  // all memos attached to an object
  attachedScope: () => [...memoQueries.all(), "attached"] as const,
  byAttachedObject: (attachedObjType: AttachedObjectType, attachedObjId: number | null | undefined) =>
    queryOptions({
      queryKey: [...memoQueries.attachedScope(), attachedObjType, attachedObjId] as const,
      queryFn: !attachedObjId
        ? skipToken
        : () => MemoService.getMemosByAttachedObjectId({ attachedObjType, attachedObjId }),
      retry: false,
    }),

  // recently opened memos of a project
  recentScope: () => [...memoQueries.all(), "recent"] as const,
  recent: (projectId: number | null | undefined) =>
    queryOptions({
      queryKey: [...memoQueries.recentScope(), projectId] as const,
      queryFn: !projectId ? skipToken : () => MemoService.getRecentMemos({ projectId }),
    }),

  // memo workspace: search results and groups
  searchScope: () => [...memoQueries.all(), "search"] as const,
  search: (request: QueryRequest_MemoColumns_) =>
    infiniteQueryOptions({
      queryKey: [...memoQueries.searchScope(), request] as const,
      queryFn: ({ pageParam }) => SearchService.searchMemos({ requestBody: { ...request, page_number: pageParam } }),
      initialPageParam: 0,
      getNextPageParam: nextPageByCount,
    }),
  groupsScope: () => [...memoQueries.all(), "groups"] as const,
  groups: (request: GroupQueryRequest_MemoColumns_) =>
    infiniteQueryOptions({
      queryKey: [...memoQueries.groupsScope(), request] as const,
      queryFn: ({ pageParam }) =>
        SearchService.searchMemoGroups({ requestBody: { ...request, page_number: pageParam } }),
      initialPageParam: 0,
      getNextPageParam: nextPageByCount,
    }),

  // the memo filter table
  tableScope: () => [...memoQueries.all(), "table"] as const,
  table: ({ projectId, searchQuery, filter, sortingModel, isSearchContent, fetchSize }: MemoTableParams) =>
    infiniteQueryOptions({
      queryKey: [
        ...memoQueries.tableScope(),
        projectId,
        searchQuery,
        filter,
        sortingModel,
        isSearchContent,
        fetchSize,
      ] as const,
      queryFn: ({ pageParam }) =>
        SearchService.searchMemos({
          requestBody: {
            project_id: projectId,
            search_query: searchQuery || "",
            filter,
            sorts: sortingModel.map((sort) => ({
              // sort ids are the MemoColumns the table was configured with
              column: sort.id as MemoColumns,
              direction: sort.desc ? SortDirection.DESC : SortDirection.ASC,
            })),
            page_number: pageParam,
            page_size: fetchSize,
          },
        }),
      initialPageParam: 0,
      getNextPageParam: (_lastPage, pages) => pages.length,
      refetchOnWindowFocus: false,
    }),
};
