import { rollbackOptimisticUpdate } from "@api/cache-sync/_utils/optimisticUtils";
import { queryClient } from "@api/queryClient";
import { SpanAnnotationService } from "@api/services/SpanAnnotationService";
import { annotationQueries } from "@core/annotation";
import { SpanAnnotationCreate } from "@models/SpanAnnotationCreate";
import { SpanAnnotationDeleted } from "@models/SpanAnnotationDeleted";
import { SpanAnnotationRead } from "@models/SpanAnnotationRead";
import { SpanAnnotationUpdate } from "@models/SpanAnnotationUpdate";
import { useMutation } from "@tanstack/react-query";

// SPAN QUERIES live in annotationQueries.span (used with `useQuery` directly).

// SPAN MUTATIONS
const useCreateBulkAnnotations = () =>
  useMutation({
    mutationKey: [...annotationQueries.span.all(), "createBulk"],
    mutationFn: SpanAnnotationService.createSpanAnnotationsBulk,
    meta: {
      datsEvent: "SPAN_ANNOTATION_CREATED_BATCH",
      successMessage: (data: SpanAnnotationRead[]) => `Created ${data.length} Span Annotations`,
    },
  });

const useCreateSpanAnnotation = () =>
  useMutation({
    mutationKey: [...annotationQueries.span.all(), "create"],
    mutationFn: (variables: SpanAnnotationCreate) =>
      SpanAnnotationService.createSpanAnnotation({ requestBody: variables }),
    meta: {
      datsEvent: "SPAN_ANNOTATION_CREATED",
      successMessage: (data: SpanAnnotationRead) => `Created Span Annotation ${data.id}`,
    },
  });

const useUpdateSpanAnnotation = () =>
  useMutation({
    mutationKey: [...annotationQueries.span.all(), "update"],
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
    // todo: rework to only update the span annotation detail query (we need to change the rendering for this...)
    onMutate: async ({ spanAnnotationToUpdate, requestBody }) => {
      if (typeof spanAnnotationToUpdate === "number") return;
      const affectedQueryKey = annotationQueries.span.bySdoc(
        spanAnnotationToUpdate.sdoc_id,
        spanAnnotationToUpdate.user_id,
      ).queryKey;
      await queryClient.cancelQueries({ queryKey: affectedQueryKey });
      const previousAnnos = queryClient.getQueryData(affectedQueryKey);
      queryClient.setQueryData(affectedQueryKey, (old) => {
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
      rollbackOptimisticUpdate(context.affectedQueryKey, context.previousAnnos, annotationQueries.span.all());
    },
    meta: {
      datsEvent: "SPAN_ANNOTATION_UPDATED",
      successMessage: (data: SpanAnnotationRead) => `Updated Span Annotation ${data.id}`,
    },
  });

const useUpdateBulkSpan = () =>
  useMutation({
    mutationKey: [...annotationQueries.span.all(), "updateBulk"],
    mutationFn: SpanAnnotationService.updateSpanAnnotationsBulk,
    meta: {
      datsEvent: "SPAN_ANNOTATION_UPDATED_BATCH",
      successMessage: (data: SpanAnnotationRead[]) => `Updated ${data.length} Span Annotations`,
    },
  });

const useDeleteSpanAnnotation = () =>
  useMutation({
    mutationKey: [...annotationQueries.span.all(), "delete"],
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
      const affectedQueryKey = annotationQueries.span.bySdoc(
        spanAnnotationToDelete.sdoc_id,
        spanAnnotationToDelete.user_id,
      ).queryKey;
      await queryClient.cancelQueries({ queryKey: affectedQueryKey });
      const previousSpanAnnotations = queryClient.getQueryData(affectedQueryKey);
      queryClient.setQueryData(affectedQueryKey, (old) =>
        old ? old.filter((spanAnnotation) => spanAnnotation.id !== spanAnnotationToDelete.id) : old,
      );
      return { previousSpanAnnotations, affectedQueryKey };
    },
    onError: (_error: Error, _spanAnnotationToDelete, context) => {
      if (!context) return;
      rollbackOptimisticUpdate(context.affectedQueryKey, context.previousSpanAnnotations, annotationQueries.span.all());
    },
    meta: {
      datsEvent: "SPAN_ANNOTATION_DELETED",
      successMessage: (data: SpanAnnotationRead) => `Deleted Span Annotation ${data.id}`,
    },
  });

const useDeleteBulkSpanAnnotation = () =>
  useMutation({
    mutationKey: [...annotationQueries.span.all(), "deleteBulk"],
    mutationFn: SpanAnnotationService.deleteSpanAnnotationsBulk,
    meta: {
      datsEvent: "SPAN_ANNOTATION_DELETED_BATCH",
      successMessage: (data: SpanAnnotationDeleted[]) => `Deleted ${data.length} Span Annotations`,
    },
  });

const useCountBySdocsAndUser = () =>
  useMutation({
    mutationKey: [...annotationQueries.span.all(), "count"],
    mutationFn: SpanAnnotationService.countAnnotations,
  });

export const SpanAnnotationHooks = {
  useCreateBulkAnnotations,
  useCreateSpanAnnotation,
  useUpdateSpanAnnotation,
  useUpdateBulkSpan,
  useDeleteSpanAnnotation,
  useDeleteBulkSpanAnnotation,
  useCountBySdocsAndUser,
};
