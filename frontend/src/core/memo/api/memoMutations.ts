import { queryClient } from "@api/queryClient";
import { MemoService } from "@api/services/MemoService";
import { MemoRead } from "@models/MemoRead";
import { useMutation } from "@tanstack/react-query";
import { memoQueries } from "./memoQueries";

// MEMO MUTATIONS
export const useCreateMemo = () =>
  useMutation({
    mutationKey: [...memoQueries.all(), "create"],
    mutationFn: MemoService.createMemo,
    meta: {
      datsEvent: "MEMO_CREATED",
      successMessage: (memo: MemoRead) => `Created memo "${memo.title}"`,
    },
  });

export const useUpdateMemo = () =>
  useMutation({
    mutationKey: [...memoQueries.all(), "update"],
    mutationFn: MemoService.updateById,
    meta: {
      datsEvent: "MEMO_UPDATED",
      successMessage: (memo: MemoRead) => `Updated memo "${memo.title}"`,
    },
  });

export const useUpdateMemos = () =>
  useMutation({
    mutationKey: [...memoQueries.all(), "updateBulk"],
    mutationFn: MemoService.updateMemosBulk,
    meta: {
      datsEvent: "MEMO_UPDATED_BATCH",
      successMessage: (memos: MemoRead[]) => `Updated ${memos.length} memo(s)`,
    },
  });

export const useDeleteMemo = () =>
  useMutation({
    mutationKey: [...memoQueries.all(), "delete"],
    mutationFn: MemoService.deleteById,
    meta: {
      datsEvent: "MEMO_DELETED",
      successMessage: (memo: MemoRead) => `Deleted memo "${memo.title}"`,
    },
  });

export const useDeleteMemos = () =>
  useMutation({
    mutationKey: [...memoQueries.all(), "deleteBulk"],
    mutationFn: ({ memoIds }: { memoIds: number[] }) => MemoService.deleteMemosBulk({ requestBody: memoIds }),
    meta: {
      datsEvent: "MEMO_DELETED_BATCH",
      successMessage: (memos: MemoRead[]) => `Deleted ${memos.length} memo(s)`,
    },
  });

export const useRecordRecentMemo = () =>
  useMutation({
    mutationKey: [...memoQueries.all(), "recordRecent"],
    mutationFn: ({ memoId }: { memoId: number; projectId: number }) => MemoService.recordRecentMemo({ memoId }),
    onSuccess: (_data, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: memoQueries.recent(projectId).queryKey });
    },
  });
