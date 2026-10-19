import { queryClient } from "@api/queryClient";
import { MemoService } from "@api/services/MemoService";
import { toColumnInfoMap } from "@core/filter";
import { AttachedObjectType } from "@models/AttachedObjectType";
import { MemoRead } from "@models/MemoRead";
import { useMutation, useQuery } from "@tanstack/react-query";
import { memoQueries } from "./memoQueries";

// MEMO QUERIES
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
    // The recent memos are private to the user, so there is no DATS event for this: refresh them here.
    onSuccess: (_data, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: memoQueries.recent(projectId).queryKey });
    },
  });

const useGetObjectMemos = (
  attachedObjType: AttachedObjectType,
  attachedObjId: number | null | undefined,
  options?: { enabled?: boolean },
) =>
  useQuery({
    ...memoQueries.byAttachedObject(attachedObjType, attachedObjId),
    enabled: options?.enabled ?? true,
  });

export const MemoHooks = {
  useMemoSearchInfo,
  useCreateMemo,
  useUpdateMemo,
  useUpdateMemos,
  useDeleteMemo,
  useDeleteMemos,
  useRecordRecentMemo,
  useGetObjectMemos,
};
