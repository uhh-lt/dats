import { useMutation, useQueries, useQuery } from "@tanstack/react-query";
import { useAuth } from "../auth/useAuth.ts";
import queryClient from "../plugins/ReactQueryClient.ts";
import { QueryKey } from "./QueryKey.ts";
import { SpanAnnotationCreate } from "./openapi/models/SpanAnnotationCreate.ts";
import { SpanAnnotationDeleted } from "./openapi/models/SpanAnnotationDeleted.ts";
import { SpanAnnotationRead } from "./openapi/models/SpanAnnotationRead.ts";
import { SourceDocumentService } from "./openapi/services/SourceDocumentService.ts";
import { SpanAnnotationService } from "./openapi/services/SpanAnnotationService.ts";

export const FAKE_ANNOTATION_ID = -1;

// SPAN QUERIES
const useGetByID = (spanId: number | null | undefined) =>
  useQuery<SpanAnnotationRead, Error>({
    queryKey: [QueryKey.SPAN_ANNOTATION, spanId],
    queryFn: () =>
      SpanAnnotationService.getById({
        spanId: spanId!,
      }),
    enabled: !!spanId,
    staleTime: 1000 * 60 * 5,
  });

const useGetByIDs = (annotationIds: number[] | undefined | null) => {
  const queriesToRun = annotationIds
    ? annotationIds.map((id) => ({
        queryKey: [QueryKey.SPAN_ANNOTATION, id] as const,
        queryFn: () => SpanAnnotationService.getById({ spanId: id }),
        enabled: !!id,
        staleTime: 1000 * 60 * 5,
      }))
    : [];

  return useQueries({
    queries: queriesToRun,
    combine: (results) => {
      return {
        data: results.every((result) => result.data) ? results.map((result) => result.data!) : undefined,
        isSuccess: results.every((result) => result.isSuccess),
        isLoading: results.some((result) => result.isLoading),
        isFetching: results.some((result) => result.isFetching),
        isError: results.some((result) => result.isError),
        error: results.find((result) => result.error)?.error || null,
      };
    },
  });
};

// ID QUERIES
const useGetIDsByCodeAndUser = (codeId: number | null | undefined) =>
  useQuery<number[], Error>({
    queryKey: [QueryKey.SPAN_ANNOTATIONS_USER_CODE, codeId],
    queryFn: async () => {
      const data = await SpanAnnotationService.getByUserCode({
        codeId: codeId!,
      });
      const result: number[] = [];
      data.forEach((annotation) => {
        queryClient.setQueryData<SpanAnnotationRead>([QueryKey.SPAN_ANNOTATION, annotation.id], annotation);
        result.push(annotation.id);
      });
      return result;
    },
    enabled: !!codeId,
  });

const useGetIDsBySdoc = (sdocId: number | null | undefined, userId: number | null | undefined) => {
  return useQuery<number[], Error>({
    queryKey: [QueryKey.SDOC_SPAN_ANNOTATIONS, sdocId, userId],
    queryFn: async () => {
      const data = await SourceDocumentService.getAllSpanAnnotationsBulk({
        sdocId: sdocId!,
        userId: userId!,
      });
      const result: number[] = [];
      data.forEach((annotation) => {
        queryClient.setQueryData<SpanAnnotationRead>([QueryKey.SPAN_ANNOTATION, annotation.id], annotation);
        result.push(annotation.id);
      });
      return result;
    },
    enabled: !!sdocId && !!userId,
  });
};

// SPAN MUTATIONS
const useCreate = () => {
  const { user } = useAuth();
  return useMutation({
    mutationFn: (variables: SpanAnnotationCreate) =>
      SpanAnnotationService.addSpanAnnotation({ requestBody: variables }),
    // optimistic update:
    // 1. Cancel any outgoing refetches (so they don't overwrite our optimistic update)
    // 2. Snapshot the previous value
    // 3. Optimistically update to the new value (new fake id, new fake annotation)
    // 4. Return a context object with the snapshotted value
    onMutate: async (newSpanAnnotation) => {
      if (!user) return;
      // add new fake annotation id
      const affectedKey = [QueryKey.SDOC_SPAN_ANNOTATIONS, newSpanAnnotation.sdoc_id, user.id];
      await queryClient.cancelQueries({ queryKey: affectedKey });
      const previousData = queryClient.getQueryData<number[]>(affectedKey);
      queryClient.setQueryData<number[]>(affectedKey, (old) => {
        // If no data or fake annotation not present, add it
        return !old ? [FAKE_ANNOTATION_ID] : old.includes(FAKE_ANNOTATION_ID) ? old : [...old, FAKE_ANNOTATION_ID];
      });
      // add the new fake annotation
      const spanAnno: SpanAnnotationRead = {
        ...newSpanAnnotation,
        id: FAKE_ANNOTATION_ID,
        code_id: newSpanAnnotation.code_id,
        user_id: user.id,
        text: "",
        created: "",
        updated: "",
        group_ids: [],
        memo_ids: [],
      };
      queryClient.setQueryData<SpanAnnotationRead>([QueryKey.SPAN_ANNOTATION, FAKE_ANNOTATION_ID], spanAnno);
      return { previousData, affectedKey };
    },
    onError: (_error: Error, _newSpanAnnotation, context) => {
      if (!context) return;
      // If the mutation fails, use the context returned from onMutate to roll back
      queryClient.setQueryData<number[]>(context.affectedKey, context.previousData);
      queryClient.removeQueries({ queryKey: [QueryKey.SPAN_ANNOTATION, FAKE_ANNOTATION_ID] });
    },
    onSuccess: (data) => {
      queryClient.setQueryData<SpanAnnotationRead>([QueryKey.SPAN_ANNOTATION, data.id], data);
      // Replace the fake span id with the real one
      queryClient.setQueryData<number[]>([QueryKey.SDOC_SPAN_ANNOTATIONS, data.sdoc_id, data.user_id], (old) =>
        old ? old.map((id) => (id === FAKE_ANNOTATION_ID ? data.id : id)) : [data.id],
      );
    },
    meta: {
      successMessage: (data: SpanAnnotationRead) => `Created Span Annotation ${data.id}`,
    },
  });
};

const useCreateBulk = () =>
  useMutation({
    mutationFn: SpanAnnotationService.addSpanAnnotationsBulk,
    // no optimistic updates for bulk creation, as we would need to create a lot of fake ids
    onSuccess(data) {
      queryClient.invalidateQueries({ queryKey: [QueryKey.SPAN_ANNO_TABLE] });
      data.forEach((annotation) => {
        queryClient.setQueryData<SpanAnnotationRead>([QueryKey.SPAN_ANNOTATION, annotation.id], annotation);
        queryClient.setQueryData<number[]>(
          [QueryKey.SDOC_SPAN_ANNOTATIONS, annotation.sdoc_id, annotation.user_id],
          (old) => (old ? [...old, annotation.id] : [annotation.id]),
        );
      });
    },
    meta: {
      successMessage: (data: SpanAnnotationRead[]) => `Created ${data.length} Span Annotations`,
    },
  });

const useUpdate = () =>
  useMutation({
    mutationFn: SpanAnnotationService.updateById,
    // optimistic update:
    // 1. Cancel any outgoing refetches (so they don't overwrite our optimistic update)
    // 2. Snapshot the previous value
    // 3. Optimistically update to the new value (new code id)
    // 4. Return a context object with the snapshotted value
    onMutate: async ({ spanId, requestBody }) => {
      const affectedKey = [QueryKey.SPAN_ANNOTATION, spanId];
      await queryClient.cancelQueries({ queryKey: affectedKey });
      const previousData = queryClient.getQueryData<SpanAnnotationRead>(affectedKey);
      queryClient.setQueryData<SpanAnnotationRead>(affectedKey, (old) => {
        return old
          ? {
              ...old,
              code_id: requestBody.code_id,
            }
          : old;
      });
      return { previousData, affectedKey };
    },
    onError: (_error: Error, _updatedSpanAnnotation, context) => {
      if (!context) return;
      // If the mutation fails, use the context returned from onMutate to roll back
      queryClient.setQueryData<SpanAnnotationRead>(context.affectedKey, context.previousData);
    },
    onSuccess: (data) => {
      queryClient.setQueryData<SpanAnnotationRead>([QueryKey.SPAN_ANNOTATION, data.id], data);
    },
    meta: {
      successMessage: (data: SpanAnnotationRead) => `Updated Span Annotation ${data.id}`,
    },
  });

const useUpdateBulk = () =>
  useMutation({
    mutationFn: SpanAnnotationService.updateSpanAnnotationsBulk,
    // optimistic update:
    // 1. Cancel any outgoing refetches (so they don't overwrite our optimistic update)
    // 2. Snapshot the previous value
    // 3. Optimistically update to the new value (new code id)
    // 4. Return a context object with the snapshotted value
    onMutate: async ({ requestBody: updates }) => {
      const affectedKeys = updates.map((update) => [QueryKey.SPAN_ANNOTATION, update.span_annotation_id]);
      await queryClient.cancelQueries({ queryKey: affectedKeys });
      const previousData = affectedKeys.map((key) => queryClient.getQueryData<SpanAnnotationRead>(key));
      updates.forEach((update) => {
        queryClient.setQueryData<SpanAnnotationRead>([QueryKey.SPAN_ANNOTATION, update.span_annotation_id], (old) => {
          return old
            ? {
                ...old,
                code_id: update.code_id,
              }
            : old;
        });
      });
      return { previousData, affectedKeys };
    },
    onError: (_error: Error, _updatedSpanAnnotation, context) => {
      if (!context) return;
      // If the mutation fails, use the context returned from onMutate to roll back
      context.previousData.forEach((data, index) => {
        queryClient.setQueryData<SpanAnnotationRead>(context.affectedKeys[index], data);
      });
    },
    onSuccess(data) {
      queryClient.invalidateQueries({ queryKey: [QueryKey.SPAN_ANNO_TABLE] }); // TODO: This is not optimal, should be projectId, selectedUserId... We do this because of SpanAnnotationTable
      data.forEach((annotation) => {
        queryClient.setQueryData<SpanAnnotationRead>([QueryKey.SPAN_ANNOTATION, annotation.id], annotation);
      });
    },
    meta: {
      successMessage: (data: SpanAnnotationRead[]) => `Updated ${data.length} Span Annotations`,
    },
  });

const useDelete = () =>
  useMutation({
    mutationFn: (variables: { spanAnnotationToDelete: SpanAnnotationRead | number }) =>
      SpanAnnotationService.deleteById({
        spanId:
          typeof variables.spanAnnotationToDelete === "number"
            ? variables.spanAnnotationToDelete
            : variables.spanAnnotationToDelete.id,
      }),
    // optimistic update:
    // 1. Cancel any outgoing refetches (so they don't overwrite our optimistic update)
    // 2. Snapshot the previous value
    // 3. Optimistically update to the new value (remove the annotation)
    // 4. Return a context object with the snapshotted value
    onMutate: async ({ spanAnnotationToDelete }) => {
      const spanId = typeof spanAnnotationToDelete === "number" ? spanAnnotationToDelete : spanAnnotationToDelete.id;
      const affectedKey1 = [QueryKey.SPAN_ANNOTATION, spanId];
      await queryClient.cancelQueries({ queryKey: affectedKey1 });
      const previousData1 = queryClient.getQueryData<SpanAnnotationRead>(affectedKey1);
      queryClient.removeQueries({ queryKey: affectedKey1 });
      const context: { key: unknown[]; data: unknown }[] = [
        {
          key: affectedKey1,
          data: previousData1,
        },
      ];

      if (typeof spanAnnotationToDelete !== "number") {
        const affectedKey2 = [
          QueryKey.SDOC_SPAN_ANNOTATIONS,
          spanAnnotationToDelete.sdoc_id,
          spanAnnotationToDelete.user_id,
        ];
        await queryClient.cancelQueries({ queryKey: affectedKey2 });
        const previousData2 = queryClient.getQueryData<number[]>(affectedKey2);
        queryClient.removeQueries({ queryKey: affectedKey2 });
        queryClient.setQueryData<number[]>(affectedKey2, (old) =>
          old ? old.filter((spanId) => spanId !== spanAnnotationToDelete.id) : old,
        );
        context.push({
          key: affectedKey2,
          data: previousData2,
        });
      }
      return context;
    },
    onError: (_error: Error, _spanAnnotationToDelete, context) => {
      if (!context) return;
      // If the mutation fails, use the context returned from onMutate to roll back
      context.forEach((context) => {
        queryClient.setQueryData(context.key, context.data);
      });
    },
    onSuccess: (data) => {
      queryClient.removeQueries({ queryKey: [QueryKey.SPAN_ANNOTATION, data.id] });
      queryClient.setQueryData<number[]>([QueryKey.SDOC_SPAN_ANNOTATIONS, data.sdoc_id, data.user_id], (old) =>
        old ? old.filter((spanId) => spanId !== data.id) : old,
      );
    },
    meta: {
      successMessage: (data: SpanAnnotationRead) => `Deleted Span Annotation ${data.id}`,
    },
  });

const useDeleteBulk = () =>
  useMutation({
    mutationFn: SpanAnnotationService.deleteBulkById,
    onMutate: async ({ requestBody: idsToDelete }) => {
      // QueryKey.SPAN_ANNOTATION
      const affectedKeys = idsToDelete.map((id) => [QueryKey.SPAN_ANNOTATION, id]);
      await queryClient.cancelQueries({ queryKey: affectedKeys });
      const previousData = affectedKeys.map((key) => queryClient.getQueryData<SpanAnnotationRead>(key));
      affectedKeys.forEach((key) => {
        queryClient.removeQueries({ queryKey: key });
      });

      // QueryKey.SDOC_SPAN_ANNOTATIONS
      // find all where

      return { previousData, affectedKeys };
    },
    onSuccess(data) {
      queryClient.invalidateQueries({ queryKey: [QueryKey.SPAN_ANNO_TABLE] });
      data.forEach((annotation) => {
        queryClient.invalidateQueries({
          queryKey: [QueryKey.SDOC_SPAN_ANNOTATIONS, annotation.sdoc_id, annotation.user_id],
        });
        queryClient.removeQueries({ queryKey: [QueryKey.SPAN_ANNOTATION, annotation.id] });
      });
    },
    meta: {
      successMessage: (data: SpanAnnotationDeleted[]) => `Deleted ${data.length} Span Annotations`,
    },
  });

const SpanAnnotationHooks = {
  useCreateSpanAnnotation: useCreate,
  useCreateBulkAnnotations: useCreateBulk,
  useGetSpanAnnotationsBatch: useGetIDsBySdoc,
  useGetAnnotation: useGetByID,
  useGetAnnotations: useGetByIDs,
  useGetByCodeAndUser: useGetIDsByCodeAndUser,
  useUpdateSpanAnnotation: useUpdate,
  useUpdateBulkSpan: useUpdateBulk,
  useDeleteSpanAnnotation: useDelete,
  useDeleteBulkSpanAnnotation: useDeleteBulk,
};

export default SpanAnnotationHooks;
