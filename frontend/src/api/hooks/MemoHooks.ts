import { memoQueries } from "@api/queries/memoQueries";
import { tableInfoQueries } from "@api/queries/tableInfoQueries";
import { queryClient } from "@api/queryClient";
import { MemoService } from "@api/services/MemoService";
import { SearchService } from "@api/services/SearchService";
// eslint-disable-next-line boundaries/element-types
import { ColumnInfo } from "@core/filter";
import { MemoRead } from "@models/MemoRead";
import { useMutation, useQuery } from "@tanstack/react-query";

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
  useQuery<Record<string, ColumnInfo>>({
    queryKey: tableInfoQueries.bySlice("memoFilter", projectId),
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

export const MemoHooks = {
  useMemoSearchInfo,
  useCreateMemo,
  useUpdateMemo,
  useUpdateMemos,
  useDeleteMemo,
  useDeleteMemos,
  useRecordRecentMemo,
};
