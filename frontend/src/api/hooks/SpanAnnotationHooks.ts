import { queryClient } from "@api/queryClient";
import { SpanAnnotationService } from "@api/services/SpanAnnotationService";
import { SpanAnnotationCreate } from "@models/SpanAnnotationCreate";
import { SpanAnnotationDeleted } from "@models/SpanAnnotationDeleted";
import { SpanAnnotationRead } from "@models/SpanAnnotationRead";
import { SpanAnnotationUpdate } from "@models/SpanAnnotationUpdate";
import { useMutation, useQuery } from "@tanstack/react-query";
import { QueryKey } from "./QueryKey";

// SPAN QUERIES
const useGetAnnotation = (spanId: number | null | undefined) =>
  useQuery<SpanAnnotationRead, Error>({
    queryKey: [QueryKey.SPAN_ANNOTATION, spanId],
    queryFn: () =>
      SpanAnnotationService.getById({
        spanId: spanId!,
      }) as Promise<SpanAnnotationRead>,
    enabled: !!spanId,
    staleTime: 1000 * 60 * 5,
  });

const useGetByCodeAndUser = (codeId: number | null | undefined) =>
  useQuery<SpanAnnotationRead[], Error>({
    queryKey: [QueryKey.SPAN_ANNOTATIONS_USER_CODE, codeId],
    queryFn: () =>
      SpanAnnotationService.getByUserCode({
        codeId: codeId!,
      }),
    enabled: !!codeId,
  });

const useGetSpanAnnotationsBatch = (sdocId: number | null | undefined, userId: number | null | undefined) => {
  return useQuery<SpanAnnotationRead[], Error>({
    queryKey: [QueryKey.SDOC_SPAN_ANNOTATIONS, sdocId, userId],
    queryFn: () =>
      SpanAnnotationService.getBySdocAndUser({
        sdocId: sdocId!,
        userId: userId!,
      }) as Promise<SpanAnnotationRead[]>,
    enabled: !!sdocId && !!userId,
  });
};

// SPAN MUTATIONS
const useCreateBulkAnnotations = () =>
  useMutation({
    mutationFn: SpanAnnotationService.createSpanAnnotationsBulk,
    meta: {
      datsEvent: "SPAN_ANNOTATION_CREATED_BATCH",
      successMessage: (data: SpanAnnotationRead[]) => `Created ${data.length} Span Annotations`,
    },
  });

const useCreateSpanAnnotation = () =>
  useMutation({
    mutationFn: (variables: SpanAnnotationCreate) =>
      SpanAnnotationService.createSpanAnnotation({ requestBody: variables }),
    meta: {
      datsEvent: "SPAN_ANNOTATION_CREATED",
      successMessage: (data: SpanAnnotationRead) => `Created Span Annotation ${data.id}`,
    },
  });

const useUpdateSpanAnnotation = () =>
  useMutation({
    mutationFn: (variables: {
      spanAnnotationToUpdate: SpanAnnotationRead | number;
      requestBody: SpanAnnotationUpdate;
    }) =>
      SpanAnnotationService.updateById({
        spanId:
          typeof variables.spanAnnotationToUpdate === "number"
            ? variables.spanAnnotationToUpdate
            : variables.spanAnnotationToUpdate.id,
        requestBody: variables.requestBody,
      }),
    // optimistic update if spanAnnotationToUpdate is a proper SpanAnnotationRead
    // todo: rework to only update QueryKey.SPAN_ANNOTATION (we need to change the rendering for this...)
    onMutate: async ({ spanAnnotationToUpdate, requestBody }) => {
      if (typeof spanAnnotationToUpdate === "number") return;
      const affectedQueryKey = [
        QueryKey.SDOC_SPAN_ANNOTATIONS,
        spanAnnotationToUpdate.sdoc_id,
        spanAnnotationToUpdate.user_id,
      ];
      await queryClient.cancelQueries({ queryKey: affectedQueryKey });
      const previousAnnos = queryClient.getQueryData<SpanAnnotationRead[]>(affectedQueryKey);
      queryClient.setQueryData<SpanAnnotationRead[]>(affectedQueryKey, (old) => {
        return old
          ? old.map((anno) =>
              anno.id === spanAnnotationToUpdate.id
                ? {
                    ...anno,
                    code_id: requestBody.code_id ?? anno.code_id,
                    begin: requestBody.begin ?? anno.begin,
                    end: requestBody.end ?? anno.end,
                    begin_token: requestBody.begin_token ?? anno.begin_token,
                    end_token: requestBody.end_token ?? anno.end_token,
                    text: requestBody.span_text ?? anno.text,
                  }
                : anno,
            )
          : undefined;
      });
      return { previousAnnos, affectedQueryKey };
    },
    onError: (_error: Error, _updatedSpanAnnotation, context) => {
      if (!context) return;
      // If the mutation fails, use the context returned from onMutate to roll back
      queryClient.setQueryData<SpanAnnotationRead[]>(context.affectedQueryKey, context.previousAnnos);
    },
    meta: {
      datsEvent: "SPAN_ANNOTATION_UPDATED",
      successMessage: (data: SpanAnnotationRead) => `Updated Span Annotation ${data.id}`,
    },
  });

const useUpdateBulkSpan = () =>
  useMutation({
    mutationFn: SpanAnnotationService.updateSpanAnnotationsBulk,
    meta: {
      datsEvent: "SPAN_ANNOTATION_UPDATED_BATCH",
      successMessage: (data: SpanAnnotationRead[]) => `Updated ${data.length} Span Annotations`,
    },
  });

const useDeleteSpanAnnotation = () =>
  useMutation({
    mutationFn: (variables: { spanAnnotationToDelete: SpanAnnotationRead | number }) =>
      SpanAnnotationService.deleteById({
        spanId:
          typeof variables.spanAnnotationToDelete === "number"
            ? variables.spanAnnotationToDelete
            : variables.spanAnnotationToDelete.id,
      }),
    // optimistic updates if spanAnnotationToDelete is a proper SpanAnnotationRead
    onMutate: async ({ spanAnnotationToDelete }) => {
      if (typeof spanAnnotationToDelete === "number") return;
      const affectedQueryKey = [
        QueryKey.SDOC_SPAN_ANNOTATIONS,
        spanAnnotationToDelete.sdoc_id,
        spanAnnotationToDelete.user_id,
      ];
      await queryClient.cancelQueries({ queryKey: affectedQueryKey });
      const previousSpanAnnotations = queryClient.getQueryData<SpanAnnotationRead[]>(affectedQueryKey);
      queryClient.setQueryData<SpanAnnotationRead[]>(affectedQueryKey, (old) =>
        old ? old.filter((spanAnnotation) => spanAnnotation.id !== spanAnnotationToDelete.id) : old,
      );
      return { previousSpanAnnotations, affectedQueryKey };
    },
    onError: (_error: Error, _spanAnnotationToDelete, context) => {
      if (!context) return;
      // If the mutation fails, use the context returned from onMutate to roll back
      queryClient.setQueryData<SpanAnnotationRead[]>(context.affectedQueryKey, context.previousSpanAnnotations);
    },
    meta: {
      datsEvent: "SPAN_ANNOTATION_DELETED",
      successMessage: (data: SpanAnnotationRead) => `Deleted Span Annotation ${data.id}`,
    },
  });

const useDeleteBulkSpanAnnotation = () =>
  useMutation({
    mutationFn: SpanAnnotationService.deleteSpanAnnotationsBulk,
    meta: {
      datsEvent: "SPAN_ANNOTATION_DELETED_BATCH",
      successMessage: (data: SpanAnnotationDeleted[]) => `Deleted ${data.length} Span Annotations`,
    },
  });

const useCountBySdocsAndUser = () =>
  useMutation({
    mutationFn: SpanAnnotationService.countAnnotations,
  });

export const SpanAnnotationHooks = {
  useCreateSpanAnnotation,
  useCreateBulkAnnotations,
  useGetSpanAnnotationsBatch,
  useGetAnnotation,
  useGetByCodeAndUser,
  useUpdateSpanAnnotation,
  useUpdateBulkSpan,
  useDeleteSpanAnnotation,
  useDeleteBulkSpanAnnotation,
  useCountBySdocsAndUser,
};
