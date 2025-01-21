import { useMutation, useQuery } from "@tanstack/react-query";
import queryClient from "../plugins/ReactQueryClient.ts";
import { QueryKey } from "./QueryKey.ts";
import { CancelablePromise } from "./openapi/core/CancelablePromise.ts";
import { MemoRead } from "./openapi/models/MemoRead.ts";
import { SentenceAnnotationRead } from "./openapi/models/SentenceAnnotationRead.ts";
import { SentenceAnnotationReadResolved } from "./openapi/models/SentenceAnnotationReadResolved.ts";
import { SentenceAnnotationService } from "./openapi/services/SentenceAnnotationService.ts";

export const FAKE_SENTENCE_ANNOTATION_ID = -1;

const useGetAnnotation = (sentenceAnnoId: number | undefined) =>
  useQuery<SentenceAnnotationReadResolved, Error>({
    queryKey: [QueryKey.SENTENCE_ANNOTATION, sentenceAnnoId],
    queryFn: () =>
      SentenceAnnotationService.getById({
        sentenceAnnoId: sentenceAnnoId!,
        resolve: true,
      }) as CancelablePromise<SentenceAnnotationReadResolved>,
    enabled: !!sentenceAnnoId,
  });

const useGetByCodeAndUser = (codeId: number | undefined) =>
  useQuery<SentenceAnnotationRead[], Error>({
    queryKey: [QueryKey.SENTENCE_ANNOTATIONS_USER_CODE, codeId],
    queryFn: () =>
      SentenceAnnotationService.getByUserCode({
        codeId: codeId!,
      }),
    enabled: !!codeId,
  });

const useUpdateSentenceAnno = () =>
  useMutation({
    mutationFn: SentenceAnnotationService.updateById,
    onSuccess(data) {
      queryClient.invalidateQueries({ queryKey: [QueryKey.SDOC_SENTENCE_ANNOTATOR, data.sdoc_id] });
      queryClient.invalidateQueries({ queryKey: [QueryKey.SENTENCE_ANNOTATION, data.id] });
    },
  });

const useUpdateBulkSentenceAnno = () =>
  useMutation({
    mutationFn: SentenceAnnotationService.updateSentAnnoAnnotationsBulk,
    onSuccess(data) {
      queryClient.invalidateQueries({ queryKey: ["sentence-annotation-table-data"] }); // TODO: This is not optimal, shoudl be projectId, selectedUserId... We do this because of SpanAnnotationTable
      data.forEach((annotation) => {
        queryClient.invalidateQueries({ queryKey: [QueryKey.SDOC_SENTENCE_ANNOTATOR, annotation.sdoc_id] });
        queryClient.invalidateQueries({ queryKey: [QueryKey.SENTENCE_ANNOTATION, annotation.id] });
      });
    },
  });

const useDeleteSentenceAnno = () =>
  useMutation({
    mutationFn: SentenceAnnotationService.deleteById,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [QueryKey.SDOC_SENTENCE_ANNOTATOR, data.sdoc_id] });
    },
  });

// memo
const useGetUserMemo = (sentenceAnnoId: number | undefined) =>
  useQuery<MemoRead, Error>({
    queryKey: [QueryKey.MEMO_SENTENCE_ANNOTATION, sentenceAnnoId],
    queryFn: () => SentenceAnnotationService.getUserMemo({ sentenceAnnoId: sentenceAnnoId! }),
    enabled: !!sentenceAnnoId,
    retry: false,
  });

const SentenceAnnotationHooks = {
  useGetAnnotation,
  useGetByCodeAndUser,
  useUpdateSentenceAnno,
  useUpdateBulkSentenceAnno,
  useDeleteSentenceAnno,
  // memo
  useGetUserMemo,
};

export default SentenceAnnotationHooks;
