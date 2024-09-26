import { useMutation, useQuery } from "@tanstack/react-query";
import queryClient from "../plugins/ReactQueryClient.ts";
import { QueryKey } from "./QueryKey.ts";
import { MemoRead } from "./openapi/models/MemoRead.ts";
import { SpanAnnotationReadResolved } from "./openapi/models/SpanAnnotationReadResolved.ts";
import { SpanAnnotationUpdate } from "./openapi/models/SpanAnnotationUpdate.ts";
import { SpanAnnotationService } from "./openapi/services/SpanAnnotationService.ts";

export const FAKE_ANNOTATION_ID = -1;

const useCreateBulkAnnotations = () =>
  useMutation({
    mutationFn: SpanAnnotationService.addSpanAnnotationsBulk,
  });

const useGetAnnotation = (spanId: number | null | undefined) =>
  useQuery<SpanAnnotationReadResolved, Error>({
    queryKey: [QueryKey.SPAN_ANNOTATION, spanId],
    queryFn: () =>
      SpanAnnotationService.getById({
        spanId: spanId!,
        resolve: true,
      }) as Promise<SpanAnnotationReadResolved>,
    enabled: !!spanId,
  });

const useGetByCodeAndUser = (codeId: number | null | undefined, userId: number | null | undefined) =>
  useQuery<SpanAnnotationReadResolved[], Error>({
    queryKey: [QueryKey.SPAN_ANNOTATIONS_USER_CODE, userId, codeId],
    queryFn: () =>
      SpanAnnotationService.getByUserCode({
        userId: userId!,
        codeId: codeId!,
      }),
    enabled: !!userId && !!codeId,
  });

const useUpdateSpan = () =>
  useMutation({
    mutationFn: (variables: {
      spanAnnotationId: number;
      requestBody: SpanAnnotationUpdate;
      resolve?: boolean | undefined;
    }) =>
      SpanAnnotationService.updateById({
        spanId: variables.spanAnnotationId,
        requestBody: variables.requestBody,
        resolve: variables.resolve,
      }),
    onSuccess(data) {
      queryClient.invalidateQueries({ queryKey: ["annotation-table-data"] }); // TODO: This is not optimal, shoudl be projectId, selectedUserId... We do this because of SpanAnnotationTable
      queryClient.invalidateQueries({ queryKey: [QueryKey.SPAN_ANNOTATION, data.id] });
      queryClient.invalidateQueries({ queryKey: [QueryKey.SDOC_SPAN_ANNOTATIONS, data.sdoc_id] });
      queryClient.invalidateQueries({ queryKey: [QueryKey.SDOC_SPAN_ANNOTATIONS, data.sdoc_id, data.user_id] });
    },
  });

const useDeleteSpan = () =>
  useMutation({
    mutationFn: SpanAnnotationService.deleteById,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [QueryKey.MEMO_SDOC_RELATED] }); // todo: this is not optimal
      queryClient.invalidateQueries({ queryKey: [QueryKey.SDOC_SPAN_ANNOTATIONS, data.sdoc_id] });
      queryClient.invalidateQueries({ queryKey: [QueryKey.SDOC_SPAN_ANNOTATIONS, data.sdoc_id, data.user_id] });
    },
  });

// memo
const useGetMemos = (spanId: number | null | undefined) =>
  useQuery<MemoRead[], Error>({
    queryKey: [QueryKey.MEMO_SPAN_ANNOTATION, spanId],
    queryFn: () => SpanAnnotationService.getMemos({ spanId: spanId! }),
    enabled: !!spanId,
    retry: false,
  });

const useGetMemo = (spanId: number | null | undefined, userId: number | null | undefined) =>
  useQuery<MemoRead, Error>({
    queryKey: [QueryKey.MEMO_SPAN_ANNOTATION, spanId, userId],
    queryFn: () => SpanAnnotationService.getUserMemo({ spanId: spanId!, userId: userId! }),
    enabled: !!spanId && !!userId,
    retry: false,
  });

const useCreateMemo = () =>
  useMutation({
    mutationFn: SpanAnnotationService.addMemo,
    onSuccess: (memo) => {
      queryClient.invalidateQueries({ queryKey: [QueryKey.USER_MEMOS, memo.user_id] });
      queryClient.invalidateQueries({
        queryKey: [QueryKey.MEMO_SPAN_ANNOTATION, memo.attached_object_id, memo.user_id],
      });
      queryClient.invalidateQueries({ queryKey: [QueryKey.MEMO_SDOC_RELATED, memo.user_id] }); // todo: this is not optimal
    },
  });

const SpanAnnotationHooks = {
  useCreateBulkAnnotations,
  useGetAnnotation,
  useGetByCodeAndUser,
  useUpdateSpan,
  useDeleteSpan,
  // memo
  useGetMemos,
  useGetMemo,
  useCreateMemo,
};

export default SpanAnnotationHooks;
