import { useMutation, UseMutationOptions, useQuery } from "@tanstack/react-query";
import {
  BBoxAnnotationCreate,
  BBoxAnnotationRead,
  BBoxAnnotationReadResolvedCode,
  BboxAnnotationService,
  CancelablePromise,
  MemoCreate,
  MemoRead,
  SpanAnnotationUpdate,
} from "./openapi";
import { QueryKey } from "./QueryKey";

const useCreateAnnotation = (
  options: UseMutationOptions<
    BBoxAnnotationRead | BBoxAnnotationReadResolvedCode,
    Error,
    { requestBody: BBoxAnnotationCreate; resolve?: boolean | undefined }
  >
) => useMutation(BboxAnnotationService.addBboxAnnotationBboxPut, options);

const useGetAnnotation = (bboxId: number | undefined) =>
  useQuery<BBoxAnnotationReadResolvedCode, Error>(
    [QueryKey.BBOX_ANNOTATION, bboxId],
    () =>
      BboxAnnotationService.getByIdBboxBboxIdGet({
        bboxId: bboxId!,
        resolve: true,
      }) as CancelablePromise<BBoxAnnotationReadResolvedCode>,
    { enabled: !!bboxId }
  );

const useUpdate = (
  options: UseMutationOptions<
    BBoxAnnotationRead | BBoxAnnotationReadResolvedCode,
    Error,
    { bboxId: number; requestBody: SpanAnnotationUpdate; resolve?: boolean | undefined }
  >
) => useMutation(BboxAnnotationService.updateByIdBboxBboxIdPatch, options);

const useDelete = (
  options: UseMutationOptions<BBoxAnnotationRead | BBoxAnnotationReadResolvedCode, Error, { bboxId: number }>
) => useMutation(BboxAnnotationService.deleteByIdBboxBboxIdDelete, options);

// memo
const useGetMemos = (bboxId: number | undefined) =>
  useQuery<MemoRead[], Error>(
    [QueryKey.MEMO_BBOX_ANNOTATION, bboxId],
    () => BboxAnnotationService.getMemosBboxBboxIdMemoGet({ bboxId: bboxId! }),
    { enabled: !!bboxId, retry: false }
  );

const useGetMemo = (bboxId: number | undefined, userId: number | undefined) =>
  useQuery<MemoRead, Error>(
    [QueryKey.MEMO_BBOX_ANNOTATION, bboxId, userId],
    () => BboxAnnotationService.getUserMemoBboxBboxIdMemoUserIdGet({ bboxId: bboxId!, userId: userId! }),
    { enabled: !!bboxId && !!userId, retry: false }
  );

const useCreateMemo = (options: UseMutationOptions<MemoRead, Error, { bboxId: number; requestBody: MemoCreate }>) =>
  useMutation(BboxAnnotationService.addMemoBboxBboxIdMemoPut, options);

const BboxAnnotationHooks = {
  useCreateAnnotation,
  useGetAnnotation,
  useUpdate,
  useDelete,
  // memo
  useGetMemo,
  useGetMemos,
  useCreateMemo,
};

export default BboxAnnotationHooks;
