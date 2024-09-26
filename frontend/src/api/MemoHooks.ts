import { useMutation, useQuery } from "@tanstack/react-query";
import queryClient from "../plugins/ReactQueryClient.ts";
import { QueryKey } from "./QueryKey.ts";
import { AttachedObjectType } from "./openapi/models/AttachedObjectType.ts";
import { MemoRead } from "./openapi/models/MemoRead.ts";
import { MemoService } from "./openapi/services/MemoService.ts";

const useGetMemo = (memoId: number | null | undefined) =>
  useQuery<MemoRead, Error>({
    queryKey: [QueryKey.MEMO, memoId],
    queryFn: () => MemoService.getById({ memoId: memoId! }),
    enabled: !!memoId,
  });

const updateInvalidation = (data: MemoRead) => {
  queryClient.invalidateQueries({ queryKey: [QueryKey.MEMO, data.id] });
  queryClient.setQueryData([QueryKey.MEMO, data.id], data);
  switch (data.attached_object_type) {
    case AttachedObjectType.PROJECT:
      queryClient.invalidateQueries({ queryKey: [QueryKey.MEMO_PROJECT, data.attached_object_id, data.user_id] });
      queryClient.setQueryData([QueryKey.MEMO_PROJECT, data.attached_object_id, data.user_id], data);
      break;
    case AttachedObjectType.SOURCE_DOCUMENT:
      queryClient.invalidateQueries({ queryKey: [QueryKey.MEMO_SDOC, data.attached_object_id, data.user_id] });
      queryClient.setQueryData([QueryKey.MEMO_SDOC, data.attached_object_id, data.user_id], data);
      break;
    case AttachedObjectType.DOCUMENT_TAG:
      queryClient.invalidateQueries({ queryKey: [QueryKey.MEMO_TAG, data.attached_object_id, data.user_id] });
      queryClient.setQueryData([QueryKey.MEMO_TAG, data.attached_object_id, data.user_id], data);
      break;
    case AttachedObjectType.CODE:
      queryClient.invalidateQueries({ queryKey: [QueryKey.MEMO_CODE, data.attached_object_id, data.user_id] });
      queryClient.setQueryData([QueryKey.MEMO_CODE, data.attached_object_id, data.user_id], data);
      break;
    case AttachedObjectType.SPAN_ANNOTATION:
      queryClient.invalidateQueries({
        queryKey: [QueryKey.MEMO_SPAN_ANNOTATION, data.attached_object_id, data.user_id],
      });
      queryClient.setQueryData([QueryKey.MEMO_SPAN_ANNOTATION, data.attached_object_id, data.user_id], data);
      break;
    case AttachedObjectType.BBOX_ANNOTATION:
      queryClient.invalidateQueries({
        queryKey: [QueryKey.MEMO_BBOX_ANNOTATION, data.attached_object_id, data.user_id],
      });
      queryClient.setQueryData([QueryKey.MEMO_BBOX_ANNOTATION, data.attached_object_id, data.user_id], data);
      break;
    case AttachedObjectType.SPAN_GROUP:
      console.error("Span group memo update not implemented");
      break;
  }
};

const useUpdateMemo = () =>
  useMutation({
    mutationFn: MemoService.updateById,
    onSuccess: (data) => {
      updateInvalidation(data);
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
      queryClient.invalidateQueries({ queryKey: ["search-memo-table-data"] });
    },
  });

const deleteInvalidation = (data: MemoRead) => {
  queryClient.invalidateQueries({ queryKey: [QueryKey.USER_MEMOS, data.user_id] });
  switch (data.attached_object_type) {
    case AttachedObjectType.PROJECT:
      break;
    case AttachedObjectType.SOURCE_DOCUMENT:
      queryClient.removeQueries({ queryKey: [QueryKey.MEMO_SDOC, data.attached_object_id, data.user_id] });
      queryClient.invalidateQueries({
        queryKey: [QueryKey.MEMO_SDOC_RELATED, data.user_id, data.attached_object_id],
      });
      break;
    case AttachedObjectType.DOCUMENT_TAG:
      queryClient.removeQueries({ queryKey: [QueryKey.MEMO_TAG, data.attached_object_id, data.user_id] });
      break;
    case AttachedObjectType.CODE:
      queryClient.removeQueries({ queryKey: [QueryKey.MEMO_CODE, data.attached_object_id, data.user_id] });
      break;
    case AttachedObjectType.SPAN_ANNOTATION:
      queryClient.removeQueries({
        queryKey: [QueryKey.MEMO_SPAN_ANNOTATION, data.attached_object_id, data.user_id],
      });
      queryClient.invalidateQueries({ queryKey: [QueryKey.MEMO_SDOC_RELATED, data.user_id] }); // todo: this is not optimal
      break;
    case AttachedObjectType.BBOX_ANNOTATION:
      queryClient.removeQueries({
        queryKey: [QueryKey.MEMO_BBOX_ANNOTATION, data.attached_object_id, data.user_id],
      });
      queryClient.invalidateQueries({ queryKey: [QueryKey.MEMO_SDOC_RELATED, data.user_id] }); // todo: this is not optimal
      break;
    case AttachedObjectType.SPAN_GROUP:
      console.error("Span group memo update not implemented");
      break;
  }
};

const useDeleteMemo = () =>
  useMutation({
    mutationFn: MemoService.deleteById,
    onSuccess: (data) => {
      deleteInvalidation(data);
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
        deleteInvalidation(memo);
      });
      queryClient.invalidateQueries({ queryKey: ["search-memo-table-data"] });
    },
  });

const MemoHooks = {
  useGetMemo,
  useUpdateMemo,
  useStarMemos,
  useDeleteMemo,
  useDeleteMemos,
};

export default MemoHooks;
