import { useMutation, useQuery } from "@tanstack/react-query";
import queryClient from "../plugins/ReactQueryClient.ts";
import { QueryKey } from "./QueryKey.ts";
import { CancelablePromise } from "./openapi/core/CancelablePromise.ts";
import { BBoxAnnotationRead } from "./openapi/models/BBoxAnnotationRead.ts";
import { BBoxAnnotationReadResolved } from "./openapi/models/BBoxAnnotationReadResolved.ts";
import { MemoRead } from "./openapi/models/MemoRead.ts";
import { BboxAnnotationService } from "./openapi/services/BboxAnnotationService.ts";

export const FAKE_BBOX_ID = -1;

const useGetAnnotation = (bboxId: number | undefined) =>
  useQuery<BBoxAnnotationReadResolved, Error>({
    queryKey: [QueryKey.BBOX_ANNOTATION, bboxId],
    queryFn: () =>
      BboxAnnotationService.getById({
        bboxId: bboxId!,
        resolve: true,
      }) as CancelablePromise<BBoxAnnotationReadResolved>,
    enabled: !!bboxId,
  });

const useGetByCodeAndUser = (codeId: number | undefined, userId: number | undefined) =>
  useQuery<BBoxAnnotationRead[], Error>({
    queryKey: [QueryKey.BBOX_ANNOTATIONS_USER_CODE, userId, codeId],
    queryFn: () =>
      BboxAnnotationService.getByUserCode({
        userId: userId!,
        codeId: codeId!,
      }),
    enabled: !!userId && !!codeId,
  });

const useUpdateBBox = () =>
  useMutation({
    mutationFn: BboxAnnotationService.updateById,
    onSuccess(data) {
      queryClient.invalidateQueries({ queryKey: [QueryKey.SDOC_BBOX_ANNOTATIONS, data.sdoc_id, data.user_id] });
      queryClient.invalidateQueries({ queryKey: [QueryKey.SDOC_BBOX_ANNOTATIONS, data.sdoc_id] });
      queryClient.invalidateQueries({ queryKey: [QueryKey.BBOX_ANNOTATION, data.id] });
    },
  });

const useDeleteBBox = () =>
  useMutation({
    mutationFn: BboxAnnotationService.deleteById,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [QueryKey.SDOC_BBOX_ANNOTATIONS, data.sdoc_id, data.user_id] });
      queryClient.invalidateQueries({ queryKey: [QueryKey.SDOC_BBOX_ANNOTATIONS, data.sdoc_id] });
      queryClient.invalidateQueries({ queryKey: [QueryKey.MEMO_SDOC_RELATED] }); // todo: this is not optimal
    },
  });

// memo
const useGetMemos = (bboxId: number | undefined) =>
  useQuery<MemoRead[], Error>({
    queryKey: [QueryKey.MEMO_BBOX_ANNOTATION, bboxId],
    queryFn: () => BboxAnnotationService.getMemos({ bboxId: bboxId! }),
    enabled: !!bboxId,
    retry: false,
  });

const useGetMemo = (bboxId: number | undefined, userId: number | undefined) =>
  useQuery<MemoRead, Error>({
    queryKey: [QueryKey.MEMO_BBOX_ANNOTATION, bboxId, userId],
    queryFn: () => BboxAnnotationService.getUserMemo({ bboxId: bboxId!, userId: userId! }),
    enabled: !!bboxId && !!userId,
    retry: false,
  });

const useCreateMemo = () =>
  useMutation({
    mutationFn: BboxAnnotationService.addMemo,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [QueryKey.USER_MEMOS, data.user_id] });
      queryClient.invalidateQueries({
        queryKey: [QueryKey.MEMO_BBOX_ANNOTATION, data.attached_object_id, data.user_id],
      });
      queryClient.invalidateQueries({ queryKey: [QueryKey.MEMO_SDOC_RELATED, data.user_id] }); // todo: this is not optimal
    },
  });

const BboxAnnotationHooks = {
  useGetAnnotation,
  useGetByCodeAndUser,
  useUpdateBBox,
  useDeleteBBox,
  // memo
  useGetMemo,
  useGetMemos,
  useCreateMemo,
};

export default BboxAnnotationHooks;
