import { useMutation } from "@tanstack/react-query";
import { SpanAnnotationRead } from "../../../api/openapi/models/SpanAnnotationRead.ts";
import { SpanAnnotationUpdate } from "../../../api/openapi/models/SpanAnnotationUpdate.ts";
import { SpanAnnotationService } from "../../../api/openapi/services/SpanAnnotationService.ts";
import { QueryKey } from "../../../api/QueryKey.ts";
import { FAKE_ANNOTATION_ID } from "../../../api/SpanAnnotationHooks.ts";
import queryClient from "../../../plugins/ReactQueryClient.ts";

export const useCreateSpanAnnotation = (visibleUserIds: number[]) =>
  useMutation({
    mutationFn: SpanAnnotationService.addSpanAnnotation,
    // optimistic updates
    onMutate: async (newSpanAnnotation) => {
      // when we create a new span annotation, we add a new annotation to a certain annotation document
      // thus, we only affect the annotation document that we are adding to
      const affectedQueryKey = [QueryKey.SDOC_SPAN_ANNOTATIONS, newSpanAnnotation.requestBody.sdoc_id, visibleUserIds];

      // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries({ queryKey: affectedQueryKey });

      // Snapshot the previous value
      const previousSpanAnnotations = queryClient.getQueryData<SpanAnnotationRead[]>(affectedQueryKey);

      // Optimistically update to the new value
      queryClient.setQueryData<SpanAnnotationRead[]>(affectedQueryKey, (old) => {
        const fakeAnnotationIndex = old?.findIndex((a) => a.id === FAKE_ANNOTATION_ID);
        if (fakeAnnotationIndex !== undefined && fakeAnnotationIndex !== -1) {
          const fakeAnnotation = old![fakeAnnotationIndex];
          // we already created a fake annotation, that is correct as is
          if (fakeAnnotation.code_id === newSpanAnnotation.requestBody.code_id) {
            return old;
          }
          // we already created a fake annotation, but the code is different
          const result = Array.from(old!);
          result[fakeAnnotationIndex] = fakeAnnotation;
          return result;
        }
        // we have not created a fake annotation yet
        const spanAnnotation = {
          ...newSpanAnnotation.requestBody,
          text: newSpanAnnotation.requestBody.span_text,
          id: FAKE_ANNOTATION_ID,
          code: {
            name: "",
            color: "",
            description: "",
            id: newSpanAnnotation.requestBody.code_id,
            project_id: 0,
            created: "",
            updated: "",
            is_system: false,
          },
          created: "",
          updated: "",
          user_id: 0,
        };
        return old === undefined ? [spanAnnotation] : [...old, spanAnnotation];
      });

      // Return a context object with the snapshotted value
      return { previousSpanAnnotations, affectedQueryKey };
    },
    onError: (_error: Error, _newSpanAnnotation, context) => {
      if (!context) return;
      // If the mutation fails, use the context returned from onMutate to roll back
      queryClient.setQueryData<SpanAnnotationRead[]>(context.affectedQueryKey, context.previousSpanAnnotations);
    },
    // Always re-fetch after error or success:
    onSettled: (_data, _error, _variables, context) => {
      if (!context) return;
      queryClient.invalidateQueries({ queryKey: context.affectedQueryKey });
    },
  });

export const useUpdateSpanAnnotation = (visibleUserIds: number[]) =>
  useMutation({
    mutationFn: (variables: {
      spanAnnotationToUpdate: SpanAnnotationRead | SpanAnnotationRead;
      requestBody: SpanAnnotationUpdate;
    }) =>
      SpanAnnotationService.updateById({
        spanId: variables.spanAnnotationToUpdate.id,
        requestBody: variables.requestBody,
      }),
    // todo: rework to only update QueryKey.SPAN_ANNOTATION (we need to change the rendering for this...)
    // optimistic update
    onMutate: async (updateData) => {
      // when we update a span annotation, we update an annotation of a certain annotation document
      // thus, we only affect the annotation document that contains the annotation we update
      const affectedQueryKey = [
        QueryKey.SDOC_SPAN_ANNOTATIONS,
        updateData.spanAnnotationToUpdate.sdoc_id,
        visibleUserIds,
      ];

      // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries({ queryKey: affectedQueryKey });

      // Snapshot the previous value
      const previousAnnos = queryClient.getQueryData<SpanAnnotationRead[]>(affectedQueryKey);

      // Optimistically update to the new value
      queryClient.setQueryData<SpanAnnotationRead[]>(affectedQueryKey, (old) => {
        if (!old) {
          return undefined;
        }
        const oldSpanAnnotation = old.find((anno) => anno.id === updateData.spanAnnotationToUpdate.id);
        if (!oldSpanAnnotation) {
          console.error("Could not find span annotation to update");
          return old;
        }
        const oldSpanAnnotationIndex = old.indexOf(oldSpanAnnotation);
        const result = Array.from(old);
        result[oldSpanAnnotationIndex] = {
          ...oldSpanAnnotation,
          code_id: updateData.requestBody.code_id,
        };
        return result;
      });

      // Return a context object with the snapshotted value
      return { previousAnnos, affectedQueryKey };
    },
    onError: (_error: Error, _updatedSpanAnnotation, context) => {
      if (!context) return;
      // If the mutation fails, use the context returned from onMutate to roll back
      queryClient.setQueryData<SpanAnnotationRead[]>(context.affectedQueryKey, context.previousAnnos);
    },
    // Always re-fetch after error or success:
    onSettled: (updatedSpanAnnotation, _error, _variables, context) => {
      if (!context) return;
      if (updatedSpanAnnotation) {
        queryClient.invalidateQueries({ queryKey: [QueryKey.SPAN_ANNOTATION, updatedSpanAnnotation.id] });
      }
      queryClient.invalidateQueries({ queryKey: context.affectedQueryKey });
    },
  });

export const useDeleteSpanAnnotation = (visibleUserIds: number[]) =>
  useMutation({
    mutationFn: (variables: { spanAnnotationToDelete: SpanAnnotationRead | SpanAnnotationRead }) =>
      SpanAnnotationService.deleteById({ spanId: variables.spanAnnotationToDelete.id }),
    // optimistic updates
    onMutate: async ({ spanAnnotationToDelete }) => {
      // when we delete a span annotation, we remove an annotation from a certain annotation document
      // thus, we only affect the annotation document that we are removing from
      const affectedQueryKey = [QueryKey.SDOC_SPAN_ANNOTATIONS, spanAnnotationToDelete.sdoc_id, visibleUserIds];

      // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries({ queryKey: affectedQueryKey });

      // Snapshot the previous value
      const previousSpanAnnotations = queryClient.getQueryData<SpanAnnotationRead[]>(affectedQueryKey);

      // Optimistically update to the new value
      queryClient.setQueryData<SpanAnnotationRead[]>(affectedQueryKey, (old) => {
        if (old === undefined) {
          return undefined;
        }

        return old.filter((spanAnnotation) => spanAnnotation.id !== spanAnnotationToDelete.id);
      });

      // Return a context object with the snapshotted value
      return { previousSpanAnnotations, affectedQueryKey };
    },
    onError: (_error: Error, _spanAnnotationToDelete, context) => {
      if (!context) return;
      // If the mutation fails, use the context returned from onMutate to roll back
      queryClient.setQueryData<SpanAnnotationRead[]>(context.affectedQueryKey, context.previousSpanAnnotations);
    },
    // Always re-fetch after error or success:
    onSettled: (_data, _error, _variables, context) => {
      if (!context) return;
      queryClient.invalidateQueries({ queryKey: context.affectedQueryKey });
    },
  });
