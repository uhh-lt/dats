import { queryClient } from "@api/queryClient";
import { MemoService } from "@api/services/MemoService";
import { toColumnInfoMap } from "@core/filter";
import { AttachedObjectType } from "@models/AttachedObjectType";
import { GroupQueryRequest_MemoColumns_ } from "@models/GroupQueryRequest_MemoColumns_";
import { MemoRead } from "@models/MemoRead";
import { Page_MemoRead_ } from "@models/Page_MemoRead_";
import { QueryRequest_MemoColumns_ } from "@models/QueryRequest_MemoColumns_";
import type { InfiniteData } from "@tanstack/react-query";
import { useInfiniteQuery, useMutation, useQuery } from "@tanstack/react-query";
import { memoQueries } from "./memoQueries";

// MEMO QUERIES
// Memo queries (detail, attached, recent, search, groups, table) live in memoQueries and are used with
// `useQuery`/`useInfiniteQuery` directly. Only the column-info query below is still defined here (stage 4).

/**
 * Fetches the memo column info (label, sortable, filter operator, filter value type)
 * from the backend memo search info endpoint.
 *
 * Returns a map from column id to ColumnInfo. This is the single source of truth
 * for which filters/operators are available on memo columns - do not hardcode
 * column info in views.
 */
const useMemoSearchInfo = (projectId: number) =>
  useQuery({
    ...memoQueries.tableInfo(projectId),
    select: toColumnInfoMap,
  });

// MEMO MUTATIONS
const useCreateMemo = () =>
  useMutation({
    mutationKey: [...memoQueries.all(), "create"],
    mutationFn: MemoService.createMemo,
    meta: {
      datsEvent: "MEMO_CREATED",
      successMessage: (memo: MemoRead) => `Created memo "${memo.title}"`,
    },
  });

const useUpdateMemo = () =>
  useMutation({
    mutationKey: [...memoQueries.all(), "update"],
    mutationFn: MemoService.updateById,
    meta: {
      datsEvent: "MEMO_UPDATED",
      successMessage: (memo: MemoRead) => `Updated memo "${memo.title}"`,
    },
  });

const useUpdateMemos = () =>
  useMutation({
    mutationKey: [...memoQueries.all(), "updateBulk"],
    mutationFn: MemoService.updateMemosBulk,
    meta: {
      datsEvent: "MEMO_UPDATED_BATCH",
      successMessage: (memos: MemoRead[]) => `Updated ${memos.length} memo(s)`,
    },
  });

const useDeleteMemo = () =>
  useMutation({
    mutationKey: [...memoQueries.all(), "delete"],
    mutationFn: MemoService.deleteById,
    meta: {
      datsEvent: "MEMO_DELETED",
      successMessage: (memo: MemoRead) => `Deleted memo "${memo.title}"`,
    },
  });

const useDeleteMemos = () =>
  useMutation({
    mutationKey: [...memoQueries.all(), "deleteBulk"],
    mutationFn: ({ memoIds }: { memoIds: number[] }) => MemoService.deleteMemosBulk({ requestBody: memoIds }),
    meta: {
      datsEvent: "MEMO_DELETED_BATCH",
      successMessage: (memos: MemoRead[]) => `Deleted ${memos.length} memo(s)`,
    },
  });

const useRecordRecentMemo = () =>
  useMutation({
    mutationKey: [...memoQueries.all(), "recordRecent"],
    mutationFn: ({ memoId }: { memoId: number; projectId: number }) => MemoService.recordRecentMemo({ memoId }),
    onSuccess: (_data, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: memoQueries.recent(projectId).queryKey });
    },
  });

const useGetMemo = (memoId: number | null | undefined) => useQuery(memoQueries.byId(memoId));

const useGetObjectMemos = (
  attachedObjType: AttachedObjectType,
  attachedObjId: number | null | undefined,
  options?: { enabled?: boolean },
) =>
  useQuery({
    ...memoQueries.byAttachedObject(attachedObjType, attachedObjId),
    enabled: options?.enabled ?? true,
  });

const useQueryMemos = <TData = InfiniteData<Page_MemoRead_>>(
  request: QueryRequest_MemoColumns_,
  options?: { enabled?: boolean; select?: (data: InfiniteData<Page_MemoRead_>) => TData },
) =>
  useInfiniteQuery({
    ...memoQueries.search(request),
    enabled: options?.enabled ?? true,
    select: options?.select,
  });

const useQueryMemoGroups = (request: GroupQueryRequest_MemoColumns_, enabled = true) =>
  useInfiniteQuery({
    ...memoQueries.groups(request),
    enabled,
  });

const useGetRecentMemos = (projectId: number | null | undefined) => useQuery(memoQueries.recent(projectId));

export const MemoHooks = {
  useMemoSearchInfo,
  useCreateMemo,
  useUpdateMemo,
  useUpdateMemos,
  useDeleteMemo,
  useDeleteMemos,
  useRecordRecentMemo,
  useGetMemo,
  useGetObjectMemos,
  useQueryMemos,
  useQueryMemoGroups,
  useGetRecentMemos,
};
