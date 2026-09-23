import { handleDATSEvent } from "@api/entity-events/brain";
import { queryClient } from "@api/queryClient";
import { MemoService } from "@api/services/MemoService";
import { SearchService } from "@api/services/SearchService";
// eslint-disable-next-line boundaries/element-types
import { ColumnInfo, tableInfoQueryKey } from "@core/filter";
import { AttachedObjectType } from "@models/AttachedObjectType";
import { GroupQueryRequest_MemoColumns_ } from "@models/GroupQueryRequest_MemoColumns_";
import { MemoRead } from "@models/MemoRead";
import { Page_MemoRead_ } from "@models/Page_MemoRead_";
import { QueryRequest_MemoColumns_ } from "@models/QueryRequest_MemoColumns_";
import { InfiniteData, useInfiniteQuery, useMutation, useQuery } from "@tanstack/react-query";
import { QueryKey } from "./QueryKey";

// MEMO QUERIES
const useGetMemo = (memoId: number | null | undefined) =>
  useQuery<MemoRead, Error>({
    queryKey: [QueryKey.MEMO, memoId],
    queryFn: () => MemoService.getById({ memoId: memoId! }),
    enabled: !!memoId,
    staleTime: 1000 * 60 * 5,
  });

const useGetObjectMemos = (
  attachedObjType: AttachedObjectType,
  attachedObjId: number | null | undefined,
  options?: { enabled?: boolean },
) =>
  useQuery<MemoRead[], Error>({
    queryKey: [QueryKey.OBJECT_MEMOS, attachedObjType, attachedObjId],
    queryFn: () => MemoService.getMemosByAttachedObjectId({ attachedObjType, attachedObjId: attachedObjId! }),
    enabled: !!attachedObjId && (options?.enabled ?? true),
    retry: false,
  });

const useQueryMemos = <TData = InfiniteData<Page_MemoRead_>>(
  request: QueryRequest_MemoColumns_,
  options?: { enabled?: boolean; select?: (data: InfiniteData<Page_MemoRead_>) => TData },
) =>
  useInfiniteQuery({
    queryKey: [QueryKey.MEMO_QUERY, request],
    queryFn: ({ pageParam }) => SearchService.searchMemos({ requestBody: { ...request, page_number: pageParam } }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, pages) =>
      pages.reduce((total, page) => total + page.items.length, 0) < lastPage.total_results ? pages.length : undefined,
    enabled: options?.enabled ?? true,
    select: options?.select,
  });

const useQueryMemoGroups = (request: GroupQueryRequest_MemoColumns_, enabled = true) =>
  useInfiniteQuery({
    queryKey: [QueryKey.MEMO_GROUPS, request],
    queryFn: ({ pageParam }) => SearchService.searchMemoGroups({ requestBody: { ...request, page_number: pageParam } }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, pages) =>
      pages.reduce((total, page) => total + page.items.length, 0) < lastPage.total_results ? pages.length : undefined,
    enabled,
  });

const useGetRecentMemos = (projectId: number | null | undefined) =>
  useQuery<MemoRead[], Error>({
    queryKey: [QueryKey.MEMO_RECENT, projectId],
    queryFn: () => MemoService.getRecentMemos({ projectId: projectId! }),
    enabled: !!projectId,
  });

/**
 * Fetches the memo column info (label, sortable, filter operator, filter value type)
 * from the backend memo search info endpoint.
 *
 * Returns a map from column id to ColumnInfo. This is the single source of truth
 * for which filters/operators are available on memo columns - do not hardcode
 * column info in views.
 */
const useMemoSearchInfo = (projectId: number) =>
  useQuery<Record<string, ColumnInfo>>({
    queryKey: tableInfoQueryKey("memoFilter", projectId),
    queryFn: async () => {
      const result = await SearchService.searchMemoInfo({ projectId });
      return result.reduce<Record<string, ColumnInfo>>((acc, info) => {
        const column = info.column.toString();
        acc[column] = { ...info, column };
        return acc;
      }, {});
    },
    staleTime: Infinity,
  });

// MEMO MUTATIONS
const useCreateMemo = () =>
  useMutation({
    mutationFn: MemoService.createMemo,
    meta: {
      datsEvent: "MEMO_CREATED",
      successMessage: (memo: MemoRead) => `Created memo "${memo.title}"`,
    },
  });

const useUpdateMemo = () =>
  useMutation({
    mutationFn: MemoService.updateById,
    meta: {
      datsEvent: "MEMO_UPDATED",
      successMessage: (memo: MemoRead) => `Updated memo "${memo.title}"`,
    },
  });

const useUpdateMemos = () =>
  useMutation({
    mutationFn: MemoService.updateMemosBulk,
    meta: {
      datsEvent: "MEMO_UPDATED_BATCH",
      successMessage: (memos: MemoRead[]) => `Updated ${memos.length} memo(s)`,
    },
  });

const useDeleteMemo = () =>
  useMutation({
    mutationFn: MemoService.deleteById,
    meta: {
      datsEvent: "MEMO_DELETED",
      successMessage: (memo: MemoRead) => `Deleted memo "${memo.title}"`,
    },
  });

const useDeleteMemos = () =>
  useMutation({
    mutationFn: ({ memoIds }: { memoIds: number[] }) => {
      const promises = memoIds.map((memoId) => MemoService.deleteById({ memoId }));
      return Promise.all(promises);
    },
    onSuccess: (memos) => {
      memos.forEach((memo) => {
        handleDATSEvent({ type: "MEMO_DELETED", payload: memo }, "mutation");
      });
    },
    meta: {
      successMessage: (memos: MemoRead[]) => `Deleted ${memos.length} memo(s)`,
    },
  });

const useRecordRecentMemo = () =>
  useMutation({
    mutationFn: ({ memoId }: { memoId: number; projectId: number }) => MemoService.recordRecentMemo({ memoId }),
    onSuccess: (_data, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: [QueryKey.MEMO_RECENT, projectId] });
    },
  });

export const MemoHooks = {
  useGetMemo,
  useGetObjectMemos,
  useQueryMemos,
  useQueryMemoGroups,
  useGetRecentMemos,
  useMemoSearchInfo,
  useCreateMemo,
  useUpdateMemo,
  useUpdateMemos,
  useDeleteMemo,
  useDeleteMemos,
  useRecordRecentMemo,
};
