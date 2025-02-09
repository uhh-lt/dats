import { useMutation, useQuery } from "@tanstack/react-query";
import queryClient from "../plugins/ReactQueryClient.ts";
import { QueryKey } from "./QueryKey.ts";
import { SpanAnnotationRead } from "./openapi/models/SpanAnnotationRead.ts";
import { SpanAnnotationUpdate } from "./openapi/models/SpanAnnotationUpdate.ts";
import { SourceDocumentService } from "./openapi/services/SourceDocumentService.ts";
import { SpanAnnotationService } from "./openapi/services/SpanAnnotationService.ts";
import { useSelectEnabledSpanAnnotations } from "./utils.ts";

export const FAKE_ANNOTATION_ID = -1;

const useCreateBulkAnnotations = () =>
  useMutation({
    mutationFn: SpanAnnotationService.addSpanAnnotationsBulk,
  });

const useGetAnnotation = (spanId: number | null | undefined) =>
  useQuery<SpanAnnotationRead, Error>({
    queryKey: [QueryKey.SPAN_ANNOTATION, spanId],
    queryFn: () =>
      SpanAnnotationService.getById({
        spanId: spanId!,
      }) as Promise<SpanAnnotationRead>,
    enabled: !!spanId,
  });

const useGetSpanAnnotationsBatch = (sdocId: number | null | undefined, userIds: number[] | null | undefined) => {
  // filter out all disabled code ids
  const selectEnabledAnnotations = useSelectEnabledSpanAnnotations();
  return useQuery<SpanAnnotationRead[], Error>({
    queryKey: [QueryKey.SDOC_SPAN_ANNOTATIONS, sdocId, userIds],
    queryFn: () =>
      SourceDocumentService.getAllSpanAnnotationsBulk({
        sdocId: sdocId!,
        userId: userIds!,
      }) as Promise<SpanAnnotationRead[]>,
    enabled: !!sdocId && !!userIds,
    select: selectEnabledAnnotations,
  });
};

const useGetByCodeAndUser = (codeId: number | null | undefined) =>
  useQuery<SpanAnnotationRead[], Error>({
    queryKey: [QueryKey.SPAN_ANNOTATIONS_USER_CODE, codeId],
    queryFn: () =>
      SpanAnnotationService.getByUserCode({
        codeId: codeId!,
      }),
    enabled: !!codeId,
  });

const useUpdateSpan = () =>
  useMutation({
    mutationFn: (variables: { spanAnnotationId: number; requestBody: SpanAnnotationUpdate }) =>
      SpanAnnotationService.updateById({
        spanId: variables.spanAnnotationId,
        requestBody: variables.requestBody,
      }),
    onSuccess(data) {
      queryClient.invalidateQueries({ queryKey: ["annotation-table-data"] }); // TODO: This is not optimal, shoudl be projectId, selectedUserId... We do this because of SpanAnnotationTable
      queryClient.invalidateQueries({ queryKey: [QueryKey.SPAN_ANNOTATION, data.id] });
      queryClient.invalidateQueries({ queryKey: [QueryKey.SDOC_SPAN_ANNOTATIONS, data.sdoc_id] });
    },
  });

const useUpdateBulkSpan = () =>
  useMutation({
    mutationFn: SpanAnnotationService.updateSpanAnnotationsBulk,
    onSuccess(data) {
      queryClient.invalidateQueries({ queryKey: ["annotation-table-data"] }); // TODO: This is not optimal, shoudl be projectId, selectedUserId... We do this because of SpanAnnotationTable
      data.forEach((annotation) => {
        queryClient.invalidateQueries({ queryKey: [QueryKey.SPAN_ANNOTATION, annotation.id] });
        queryClient.invalidateQueries({ queryKey: [QueryKey.SDOC_SPAN_ANNOTATIONS, annotation.sdoc_id] });
      });
    },
  });

const useDeleteSpan = () =>
  useMutation({
    mutationFn: SpanAnnotationService.deleteById,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [QueryKey.SDOC_SPAN_ANNOTATIONS, data.sdoc_id] });
    },
  });

const SpanAnnotationHooks = {
  useCreateBulkAnnotations,
  useGetSpanAnnotationsBatch,
  useGetAnnotation,
  useGetByCodeAndUser,
  useUpdateSpan,
  useUpdateBulkSpan,
  useDeleteSpan,
};

export default SpanAnnotationHooks;
