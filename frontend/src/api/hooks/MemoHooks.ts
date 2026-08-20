import { AttachedObjectType } from "@models/AttachedObjectType";
import { MemoRead } from "@models/MemoRead";
import { queryClient } from "@api/queryClient";
import { MemoService } from "@api/services/MemoService";
import { useMutation, useQuery } from "@tanstack/react-query";
import { QueryKey } from "./QueryKey";

// MEMO QUERIES
const useGetMemo = (memoId: number | null | undefined) =>
  useQuery<MemoRead, Error>({
    queryKey: [QueryKey.MEMO, memoId],
    queryFn: () => MemoService.getById({ memoId: memoId! }),
    enabled: !!memoId,
    staleTime: 1000 * 60 * 5,
  });

const useGetUserMemo = (attachedObjType: AttachedObjectType, attachedObjId: number | null | undefined) =>
  useQuery<MemoRead, Error>({
    queryKey: [QueryKey.USER_MEMO, attachedObjType, attachedObjId],
    queryFn: () => MemoService.getUserMemoByAttachedObjectId({ attachedObjType, attachedObjId: attachedObjId! }),
    enabled: !!attachedObjId,
    retry: false,
    staleTime: 1000 * 60 * 5,
  });

const useGetObjectMemos = (attachedObjType: AttachedObjectType, attachedObjId: number | null | undefined) =>
  useQuery<MemoRead[], Error>({
    queryKey: [QueryKey.OBJECT_MEMOS, attachedObjType, attachedObjId],
    queryFn: () => MemoService.getMemosByAttachedObjectId({ attachedObjType, attachedObjId: attachedObjId! }),
    enabled: !!attachedObjId && (options?.enabled ?? true),
    retry: false,
  });

// Invalidate the caches that hold the memo_ids of the attached object,
// so that memo indicators across the UI react to memo creation/deletion.
const invalidateAttachedObjectMemoIds = (attachedObjectType: AttachedObjectType, attachedObjectId: number) => {
  switch (attachedObjectType) {
    case AttachedObjectType.SOURCE_DOCUMENT:
      queryClient.invalidateQueries({ queryKey: [QueryKey.SDOC, attachedObjectId] });
      queryClient.invalidateQueries({ queryKey: [QueryKey.SDOC_MEMOS, attachedObjectId] });
      queryClient.invalidateQueries({ queryKey: [QueryKey.SEARCH_TABLE] });
      break;
    case AttachedObjectType.TAG:
      queryClient.invalidateQueries({ queryKey: [QueryKey.PROJECT_TAGS] });
      break;
    case AttachedObjectType.CODE:
      queryClient.invalidateQueries({ queryKey: [QueryKey.PROJECT_CODES] });
      break;
    case AttachedObjectType.SPAN_ANNOTATION:
      queryClient.invalidateQueries({ queryKey: [QueryKey.SDOC_SPAN_ANNOTATIONS] });
      queryClient.invalidateQueries({ queryKey: [QueryKey.SEARCH_TABLE] });
      break;
    case AttachedObjectType.SENTENCE_ANNOTATION:
      queryClient.invalidateQueries({ queryKey: [QueryKey.SDOC_SENTENCE_ANNOTATOR] });
      queryClient.invalidateQueries({ queryKey: [QueryKey.SEARCH_TABLE] });
      break;
    case AttachedObjectType.BBOX_ANNOTATION:
      queryClient.invalidateQueries({ queryKey: [QueryKey.SDOC_BBOX_ANNOTATIONS] });
      queryClient.invalidateQueries({ queryKey: [QueryKey.SEARCH_TABLE] });
      break;
    default:
      break;
  }
};

// MEMO MUTATIONS
const useCreateMemo = () =>
  useMutation({
    mutationFn: MemoService.addMemo,
    onSuccess: (data) => {
      queryClient.setQueryData<MemoRead>([QueryKey.MEMO, data.id], data);
      queryClient.setQueryData<MemoRead>(
        [QueryKey.USER_MEMO, data.attached_object_type, data.attached_object_id],
        data,
      );
      queryClient.setQueryData<MemoRead[]>(
        [QueryKey.OBJECT_MEMOS, data.attached_object_type, data.attached_object_id],
        (oldData) => (oldData ? [...oldData, data] : [data]),
      );
      invalidateAttachedObjectMemoIds(data.attached_object_type, data.attached_object_id);
    },
    meta: {
      successMessage: (memo: MemoRead) => `Created memo "${memo.title}"`,
    },
  });

const updateInvalidation = (data: MemoRead) => {
  queryClient.setQueryData<MemoRead>([QueryKey.MEMO, data.id], data);
  queryClient.setQueryData<MemoRead>([QueryKey.USER_MEMO, data.attached_object_type, data.attached_object_id], data);
  queryClient.setQueryData<MemoRead[]>(
    [QueryKey.OBJECT_MEMOS, data.attached_object_type, data.attached_object_id],
    (oldData) => (oldData ? oldData.map((memo) => (memo.id === data.id ? data : memo)) : [data]),
  );
};

const useUpdateMemo = () =>
  useMutation({
    mutationFn: MemoService.updateById,
    onSuccess: (data) => {
      updateInvalidation(data);
      queryClient.invalidateQueries({ queryKey: [QueryKey.MEMO_TABLE] });
    },
    meta: {
      successMessage: (memo: MemoRead) => `Updated memo "${memo.title}"`,
    },
  });

const useStarMemos = () =>
  useMutation({
    mutationFn: ({ memoIds, isStarred }: { memoIds: number[]; isStarred: boolean }) => {
      const promises = memoIds.map((memoId) => MemoService.updateById({ memoId, requestBody: { starred: isStarred } }));
      return Promise.all(promises);
    },
    onSuccess: (memos) => {
      memos.forEach((memo) => {
        updateInvalidation(memo);
      });
      queryClient.invalidateQueries({ queryKey: [QueryKey.MEMO_TABLE] });
    },
    meta: {
      successMessage: (memos: MemoRead[], variables: { memoIds: number[]; isStarred: boolean }) =>
        `${variables.isStarred ? "Starred" : "Unstarred"} ${memos.length} memo(s)`,
    },
  });

const deleteInvalidation = (data: MemoRead) => {
  queryClient.removeQueries({ queryKey: [QueryKey.MEMO, data.id] });
  queryClient.removeQueries({ queryKey: [QueryKey.USER_MEMO, data.attached_object_type, data.attached_object_id] });
  queryClient.setQueryData<MemoRead[]>(
    [QueryKey.OBJECT_MEMOS, data.attached_object_type, data.attached_object_id],
    (oldData) => (oldData ? oldData.filter((memo) => memo.id !== data.id) : oldData),
  );
  invalidateAttachedObjectMemoIds(data.attached_object_type, data.attached_object_id);
};

const useDeleteMemo = () =>
  useMutation({
    mutationFn: MemoService.deleteById,
    onSuccess: (data) => {
      deleteInvalidation(data);
      queryClient.invalidateQueries({ queryKey: [QueryKey.MEMO_TABLE] });
    },
    meta: {
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
      memos.forEach((data) => {
        deleteInvalidation(data);
      });
      queryClient.invalidateQueries({ queryKey: [QueryKey.MEMO_TABLE] });
    },
    meta: {
      successMessage: (memos: MemoRead[]) => `Deleted ${memos.length} memo(s)`,
    },
  });

export const MemoHooks = {
  useGetMemo,
  useGetObjectMemos,
  useGetUserMemo,
  useCreateMemo,
  useUpdateMemo,
  useStarMemos,
  useDeleteMemo,
  useDeleteMemos,
};
