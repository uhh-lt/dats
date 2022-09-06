import { useMutation, UseMutationOptions, useQuery } from "@tanstack/react-query";
import {
  MemoCreate,
  MemoRead,
  SpanAnnotationCreate,
  SpanAnnotationRead,
  SpanAnnotationReadResolved,
  SpanAnnotationService,
  SpanAnnotationUpdate,
} from "./openapi";
import { QueryKey } from "./QueryKey";

const useCreateAnnotation = (
  options: UseMutationOptions<
    SpanAnnotationRead | SpanAnnotationReadResolved,
    Error,
    { requestBody: SpanAnnotationCreate; resolve?: boolean | undefined }
  >
) => useMutation(SpanAnnotationService.addSpanAnnotationSpanPut, options);

const useGetAnnotation = (spanId: number | undefined) =>
  useQuery<SpanAnnotationReadResolved, Error>(
    [QueryKey.SPAN_ANNOTATION, spanId],
    () =>
      SpanAnnotationService.getByIdSpanSpanIdGet({
        spanId: spanId!,
        resolve: true,
      }) as Promise<SpanAnnotationReadResolved>,
    { enabled: !!spanId }
  );

const useUpdateSpan = (
  options: UseMutationOptions<
    SpanAnnotationRead | SpanAnnotationReadResolved,
    Error,
    { spanId: number; requestBody: SpanAnnotationUpdate; resolve?: boolean | undefined }
  >
) => useMutation(SpanAnnotationService.updateByIdSpanSpanIdPatch, options);

const useDeleteSpan = (
  options: UseMutationOptions<SpanAnnotationRead | SpanAnnotationReadResolved, Error, { spanId: number }>
) => useMutation(SpanAnnotationService.deleteByIdSpanSpanIdDelete, options);

// memo
const useGetMemos = (spanId: number | undefined) =>
  useQuery<MemoRead[], Error>(
    [QueryKey.MEMO_SPAN_ANNOTATION, spanId],
    () => SpanAnnotationService.getMemosSpanSpanIdMemoGet({ spanId: spanId! }),
    { enabled: !!spanId, retry: false }
  );

const useGetMemo = (spanId: number | undefined, userId: number | undefined) =>
  useQuery<MemoRead, Error>(
    [QueryKey.MEMO_SPAN_ANNOTATION, spanId, userId],
    () => SpanAnnotationService.getUserMemoSpanSpanIdMemoUserIdGet({ spanId: spanId!, userId: userId! }),
    { enabled: !!spanId && !!userId, retry: false }
  );

const useCreateMemo = (options: UseMutationOptions<MemoRead, Error, { spanId: number; requestBody: MemoCreate }>) =>
  useMutation(SpanAnnotationService.addMemoSpanSpanIdMemoPut, options);

const SpanAnnotationHooks = {
  useCreateAnnotation,
  useGetAnnotation,
  useUpdateSpan,
  useDeleteSpan,
  // memo
  useGetMemos,
  useGetMemo,
  useCreateMemo,
};

export default SpanAnnotationHooks;
