import { useMutation, useQuery } from "@tanstack/react-query";
import { AttachedObjectType, MemoRead, MemoService } from "./openapi";
import { QueryKey } from "./QueryKey";
import queryClient from "../plugins/ReactQueryClient";

const useGetMemo = (memoId: number | undefined) =>
  useQuery<MemoRead, Error>([QueryKey.MEMO, memoId], () => MemoService.getById({ memoId: memoId! }), {
    enabled: !!memoId,
  });

const useUpdateMemo = () =>
  useMutation(MemoService.updateById, {
    onSuccess: (data) => {
      queryClient.invalidateQueries([QueryKey.MEMO, data.id]);
      switch (data.attached_object_type) {
        case AttachedObjectType.PROJECT:
          queryClient.invalidateQueries([QueryKey.MEMO_PROJECT, data.attached_object_id, data.user_id]);
          break;
        case AttachedObjectType.SOURCE_DOCUMENT:
          queryClient.invalidateQueries([QueryKey.MEMO_SDOC, data.attached_object_id, data.user_id]);
          break;
        case AttachedObjectType.DOCUMENT_TAG:
          queryClient.invalidateQueries([QueryKey.MEMO_TAG, data.attached_object_id, data.user_id]);
          break;
        case AttachedObjectType.CODE:
          queryClient.invalidateQueries([QueryKey.MEMO_CODE, data.attached_object_id, data.user_id]);
          break;
        case AttachedObjectType.SPAN_ANNOTATION:
          queryClient.invalidateQueries([QueryKey.MEMO_SPAN_ANNOTATION, data.attached_object_id, data.user_id]);
          break;
        case AttachedObjectType.BBOX_ANNOTATION:
          queryClient.invalidateQueries([QueryKey.MEMO_BBOX_ANNOTATION, data.attached_object_id, data.user_id]);
          break;
        case AttachedObjectType.ANNOTATION_DOCUMENT:
          console.error("Annotation document memo update not implemented");
          break;
        case AttachedObjectType.SPAN_GROUP:
          console.error("Span group memo update not implemented");
          break;
      }
    },
  });

const useDeleteMemo = () =>
  useMutation(MemoService.deleteById, {
    onSuccess: (data) => {
      queryClient.invalidateQueries([QueryKey.USER_MEMOS, data.user_id]);
      switch (data.attached_object_type) {
        case AttachedObjectType.PROJECT:
          break;
        case AttachedObjectType.SOURCE_DOCUMENT:
          queryClient.invalidateQueries([QueryKey.MEMO_SDOC, data.attached_object_id, data.user_id]);
          queryClient.invalidateQueries([QueryKey.MEMO_SDOC_RELATED, data.user_id, data.attached_object_id]);
          break;
        case AttachedObjectType.DOCUMENT_TAG:
          queryClient.invalidateQueries([QueryKey.MEMO_TAG, data.attached_object_id, data.user_id]);
          break;
        case AttachedObjectType.CODE:
          queryClient.invalidateQueries([QueryKey.MEMO_CODE, data.attached_object_id, data.user_id]);
          break;
        case AttachedObjectType.SPAN_ANNOTATION:
          queryClient.invalidateQueries([QueryKey.MEMO_SPAN_ANNOTATION, data.attached_object_id, data.user_id]);
          queryClient.invalidateQueries([QueryKey.MEMO_SDOC_RELATED, data.user_id]); // todo: this is not optimal
          break;
        case AttachedObjectType.BBOX_ANNOTATION:
          queryClient.invalidateQueries([QueryKey.MEMO_BBOX_ANNOTATION, data.attached_object_id, data.user_id]);
          queryClient.invalidateQueries([QueryKey.MEMO_SDOC_RELATED, data.user_id]); // todo: this is not optimal
          break;
        case AttachedObjectType.ANNOTATION_DOCUMENT:
          console.error("Annotation document memo update not implemented");
          break;
        case AttachedObjectType.SPAN_GROUP:
          console.error("Span group memo update not implemented");
          break;
      }
    },
  });

const MemoHooks = {
  useGetMemo,
  useUpdateMemo,
  useDeleteMemo,
};

export default MemoHooks;
