import { useMutation } from "@tanstack/react-query";
import { FAKE_BBOX_ID } from "../../../api/BboxAnnotationHooks.ts";
import { BBoxAnnotationRead } from "../../../api/openapi/models/BBoxAnnotationRead.ts";
import { BBoxAnnotationReadResolved } from "../../../api/openapi/models/BBoxAnnotationReadResolved.ts";
import { BBoxAnnotationUpdate } from "../../../api/openapi/models/BBoxAnnotationUpdate.ts";
import { BboxAnnotationService } from "../../../api/openapi/services/BboxAnnotationService.ts";
import { QueryKey } from "../../../api/QueryKey.ts";
import queryClient from "../../../plugins/ReactQueryClient.ts";

export const useCreateBBoxAnnotation = (visibleUserIds: number[]) =>
  useMutation({
    mutationFn: BboxAnnotationService.addBboxAnnotation,
    // optimistic updates
    onMutate: async (newBbox) => {
      if (visibleUserIds.length == 0) {
        return;
      }

      // when we create a new bbox annotation, we add a new bbox to a certain document
      // thus, we only affect the document that we are adding to
      const affectedQueryKey = [QueryKey.SDOC_BBOX_ANNOTATIONS, newBbox.requestBody.sdoc_id, visibleUserIds];

      // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries({ queryKey: affectedQueryKey });

      // Snapshot the previous value
      const previousBboxes = queryClient.getQueryData(affectedQueryKey);

      // Optimistically update to the new value
      queryClient.setQueryData(affectedQueryKey, (old: BBoxAnnotationReadResolved[] | undefined) => {
        const bbox = {
          ...newBbox.requestBody,
          id: FAKE_BBOX_ID,
          code: {
            name: "",
            color: "",
            description: "",
            id: newBbox.requestBody.code_id,
            project_id: 0,
            user_id: 0,
            created: "",
            updated: "",
          },
          created: "",
          updated: "",
        };
        return old === undefined ? [bbox] : [...old, bbox];
      });

      // Return a context object with the snapshotted value
      return { previousBboxes, myCustomQueryKey: affectedQueryKey };
    },
    onError: (_error: Error, _newBbox, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (!context) return;
      queryClient.setQueryData(context.myCustomQueryKey, context.previousBboxes);
    },
    // Always re-fetch after error or success:
    onSettled: (_data, _error, _variables, context) => {
      if (!context) return;
      queryClient.invalidateQueries({ queryKey: context.myCustomQueryKey });
    },
  });

export const useUpdateBBoxAnnotation = (visibleUserIds: number[]) =>
  useMutation({
    mutationFn: (variables: {
      bboxToUpdate: BBoxAnnotationRead | BBoxAnnotationReadResolved;
      requestBody: BBoxAnnotationUpdate;
      resolve?: boolean | undefined;
    }) =>
      BboxAnnotationService.updateById({
        bboxId: variables.bboxToUpdate.id,
        requestBody: variables.requestBody,
        resolve: variables.resolve,
      }),
    // optimistic update
    // todo: rework to only update QueryKey.BBOX_ANNOTATION (we need to change the rendering for this...)
    onMutate: async (updateData) => {
      // when we update a bbox annotation, we update a bbox of a certain annotation document
      // thus, we only affect the annotation document that contains the bbox we update
      const affectedQueryKey = [QueryKey.SDOC_BBOX_ANNOTATIONS, updateData.bboxToUpdate.sdoc_id, visibleUserIds];

      // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries({ queryKey: affectedQueryKey });

      // Snapshot the previous value
      const previousBboxes = queryClient.getQueryData(affectedQueryKey);

      // Optimistically update to the new value
      queryClient.setQueryData(affectedQueryKey, (old: BBoxAnnotationReadResolved[] | undefined) => {
        if (!old) {
          return undefined;
        }
        const oldBboxAnnotation = old.find((anno) => anno.id === updateData.bboxToUpdate.id);
        if (!oldBboxAnnotation) {
          console.error("Could not find bbox annotation to update");
          return old;
        }
        const oldBboxAnnotationIndex = old.indexOf(oldBboxAnnotation);
        const result = Array.from(old);
        result[oldBboxAnnotationIndex] = {
          ...oldBboxAnnotation,
          code: {
            ...oldBboxAnnotation.code,
            id: updateData.requestBody.code_id,
          },
        };
        return result;
      });

      // Return a context object with the snapshotted value
      return { previousBboxes, myCustomQueryKey: affectedQueryKey };
    },
    onError: (_error: Error, _updatedBboxAnnotation, context) => {
      if (!context) return;
      // If the mutation fails, use the context returned from onMutate to roll back
      queryClient.setQueryData(context.myCustomQueryKey, context.previousBboxes);
    },
    // Always re-fetch after error or success:
    onSettled: (updatedBboxAnnotation, _error, _variables, context) => {
      if (!context) return;
      if (updatedBboxAnnotation) {
        queryClient.invalidateQueries({ queryKey: [QueryKey.BBOX_ANNOTATION, updatedBboxAnnotation.id] });
      }
      queryClient.invalidateQueries({ queryKey: context.myCustomQueryKey });
    },
  });

export const useDeleteBBoxAnnotation = (visibleUserIds: number[]) =>
  useMutation({
    mutationFn: (variables: { bboxToDelete: BBoxAnnotationRead | BBoxAnnotationReadResolved }) =>
      BboxAnnotationService.deleteById({ bboxId: variables.bboxToDelete.id }),
    // optimistic updates
    onMutate: async ({ bboxToDelete }) => {
      // when we delete a bbox annotation, we remove a bbox from a certain annotation document
      // thus, we only affect the annotation document that we are removing from
      const affectedQueryKey = [QueryKey.SDOC_BBOX_ANNOTATIONS, bboxToDelete.sdoc_id, visibleUserIds];

      // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries({ queryKey: affectedQueryKey });

      // Snapshot the previous value
      const previousBboxes = queryClient.getQueryData(affectedQueryKey);

      // Optimistically update to the new value
      queryClient.setQueryData(affectedQueryKey, (old: BBoxAnnotationReadResolved[] | undefined) => {
        if (old === undefined) {
          return undefined;
        }

        return old.filter((bbox) => bbox.id !== bboxToDelete.id);
      });

      // Return a context object with the snapshotted value
      return { previousBboxes, myCustomQueryKey: affectedQueryKey };
    },
    onError: (_error: Error, _newBbox, context) => {
      if (!context) return;
      // If the mutation fails, use the context returned from onMutate to roll back
      queryClient.setQueryData(context.myCustomQueryKey, context.previousBboxes);
    },
    // Always re-fetch after error or success:
    onSettled: (_data, _error, _variables, context) => {
      if (!context) return;
      queryClient.invalidateQueries({ queryKey: context.myCustomQueryKey });
      queryClient.invalidateQueries({ queryKey: [QueryKey.MEMO_SDOC_RELATED] }); // todo: this is not optimal
    },
  });
