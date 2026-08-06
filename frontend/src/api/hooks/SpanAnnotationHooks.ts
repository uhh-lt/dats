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
    mutationFn: SpanAnnotationService.addSpanAnnotationsBulk,
    onSuccess: (data) => {
      if (data.length === 0) return;
      const sdocId = data[0].sdoc_id;
      const userId = data[0].user_id;
      queryClient.invalidateQueries({
        queryKey: [QueryKey.SDOC_SPAN_ANNOTATIONS, sdocId, userId],
      });
    },
    meta: {
      successMessage: (data: SpanAnnotationRead[]) => `Created ${data.length} Span Annotations`,
    },
  });

const useCreateSpanAnnotation = () =>
  useMutation({
    mutationFn: (variables: SpanAnnotationCreate) =>
      SpanAnnotationService.addSpanAnnotation({ requestBody: variables }),
    onSuccess: (data) => {
      queryClient.setQueryData<SpanAnnotationRead>([QueryKey.SPAN_ANNOTATION, data.id], data);
      queryClient.setQueryData<SpanAnnotationRead[]>(
        [QueryKey.SDOC_SPAN_ANNOTATIONS, data.sdoc_id, data.user_id],
        (old) => {
          if (!old) return [data];
          return old.some((span) => span.id === data.id) ? old : [...old, data];
        },
      );
    },
    meta: {
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
    onSuccess: (data) => {
      queryClient.setQueryData<SpanAnnotationRead>([QueryKey.SPAN_ANNOTATION, data.id], data);
      queryClient.setQueryData<SpanAnnotationRead[]>(
        [QueryKey.SDOC_SPAN_ANNOTATIONS, data.sdoc_id, data.user_id],
        (old) => (old ? old.map((span) => (span.id === data.id ? data : span)) : [data]),
      );
      queryClient.invalidateQueries({ queryKey: [QueryKey.SPAN_ANNO_TABLE] }); // TODO: This is not optimal, shoudl be projectId, selectedUserId... We do this because of SpanAnnotationTable
    },
    meta: {
      successMessage: (data: SpanAnnotationRead) => `Updated Span Annotation ${data.id}`,
    },
  });

const useUpdateBulkSpan = () =>
  useMutation({
    mutationFn: SpanAnnotationService.updateSpanAnnotationsBulk,
    onSuccess(data) {
      queryClient.invalidateQueries({ queryKey: [QueryKey.SPAN_ANNO_TABLE] }); // TODO: This is not optimal, shoudl be projectId, selectedUserId... We do this because of SpanAnnotationTable
      data.forEach((annotation) => {
        queryClient.setQueryData<SpanAnnotationRead>([QueryKey.SPAN_ANNOTATION, annotation.id], annotation);
      });

      // Update SDOC_SPAN_ANNOTATIONS queries
      // 1. Group annotations by sdoc_id and user_id
      const annotationsByDocAndUser = data.reduce(
        (acc, annotation) => {
          const key = `${annotation.sdoc_id}-${annotation.user_id}`;
          if (!acc[key]) {
            acc[key] = [];
          }
          acc[key].push(annotation);
          return acc;
        },
        {} as Record<string, SpanAnnotationRead[]>,
      );
      // 2. Update the queries
      Object.entries(annotationsByDocAndUser).forEach(([key, annotations]) => {
        const [sdoc_id, user_id] = key.split("-").map(Number);
        queryClient.setQueryData<SpanAnnotationRead[]>([QueryKey.SDOC_SPAN_ANNOTATIONS, sdoc_id, user_id], (old) => {
          const oldMap = old ? new Map(old.map((span) => [span.id, span])) : new Map();
          annotations.forEach((annotation) => {
            oldMap.set(annotation.id, annotation);
          });
          return Array.from(oldMap.values());
        });
      });
    },
    meta: {
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
    onSuccess: (data) => {
      queryClient.removeQueries({ queryKey: [QueryKey.SPAN_ANNOTATION, data.id] });
      queryClient.setQueryData<SpanAnnotationRead[]>(
        [QueryKey.SDOC_SPAN_ANNOTATIONS, data.sdoc_id, data.user_id],
        (old) => (old ? old.filter((span) => span.id !== data.id) : old),
      );
    },
    meta: {
      successMessage: (data: SpanAnnotationRead) => `Deleted Span Annotation ${data.id}`,
    },
  });

const useDeleteBulkSpanAnnotation = () =>
  useMutation({
    mutationFn: SpanAnnotationService.deleteBulkById,
    onSuccess(data) {
      if (data.length === 0) return;
      queryClient.invalidateQueries({ queryKey: [QueryKey.SPAN_ANNO_TABLE] });

      // Invalidate each unique (sdoc_id, user_id) pair once
      const uniquePairs = new Set<string>();
      data.forEach((annotation) => {
        const key = `${annotation.sdoc_id}-${annotation.user_id}`;
        if (!uniquePairs.has(key)) {
          uniquePairs.add(key);
          queryClient.invalidateQueries({
            queryKey: [QueryKey.SDOC_SPAN_ANNOTATIONS, annotation.sdoc_id, annotation.user_id],
          });
        }
        queryClient.removeQueries({ queryKey: [QueryKey.SPAN_ANNOTATION, annotation.id] });
      });
    },
    meta: {
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
