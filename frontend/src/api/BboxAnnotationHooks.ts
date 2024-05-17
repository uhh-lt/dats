import { useMutation, useQuery } from "@tanstack/react-query";
import queryClient from "../plugins/ReactQueryClient.ts";
import { QueryKey } from "./QueryKey.ts";
import { CancelablePromise } from "./openapi/core/CancelablePromise.ts";
import { BBoxAnnotationRead } from "./openapi/models/BBoxAnnotationRead.ts";
import { BBoxAnnotationReadResolvedCode } from "./openapi/models/BBoxAnnotationReadResolvedCode.ts";
import { BBoxAnnotationUpdateWithCodeId } from "./openapi/models/BBoxAnnotationUpdateWithCodeId.ts";
import { MemoRead } from "./openapi/models/MemoRead.ts";
import { BboxAnnotationService } from "./openapi/services/BboxAnnotationService.ts";

export const FAKE_BBOX_ID = -1;

const useCreateAnnotation = () =>
  useMutation({
    mutationFn: BboxAnnotationService.addBboxAnnotation,
    // optimistic updates
    onMutate: async (newBbox) => {
      // when we create a new bbox annotation, we add a new bbox to a certain annotation document
      // thus, we only affect the annotation document that we are adding to
      const affectedQueryKey = [QueryKey.ADOC_BBOX_ANNOTATIONS, newBbox.requestBody.annotation_document_id];

      // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries({ queryKey: affectedQueryKey });

      // Snapshot the previous value
      const previousBboxes = queryClient.getQueryData(affectedQueryKey);

      // Optimistically update to the new value
      queryClient.setQueryData(affectedQueryKey, (old: BBoxAnnotationReadResolvedCode[] | undefined) => {
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

const useGetAnnotation = (bboxId: number | undefined) =>
  useQuery<BBoxAnnotationReadResolvedCode, Error>({
    queryKey: [QueryKey.BBOX_ANNOTATION, bboxId],
    queryFn: () =>
      BboxAnnotationService.getById({
        bboxId: bboxId!,
        resolve: true,
      }) as CancelablePromise<BBoxAnnotationReadResolvedCode>,
    enabled: !!bboxId,
  });

const useGetByCodeAndUser = (codeId: number | undefined, userId: number | undefined) =>
  useQuery<BBoxAnnotationRead[], Error>({
    queryKey: [QueryKey.BBOX_ANNOTATIONS_USER_CODE, userId, codeId],
    queryFn: () =>
      BboxAnnotationService.getByUserCode({
        userId: userId!,
        codeId: codeId!,
      }),
    enabled: !!userId && !!codeId,
  });

const useUpdate = () =>
  useMutation({
    mutationFn: BboxAnnotationService.updateById,
    onSuccess(data) {
      queryClient.invalidateQueries({ queryKey: [QueryKey.BBOX_ANNOTATION, data.id] });
      queryClient.invalidateQueries({ queryKey: [QueryKey.ADOC_BBOX_ANNOTATIONS, data.annotation_document_id] });
    },
  });

const useUpdateBBox = () =>
  useMutation({
    mutationFn: (variables: {
      bboxToUpdate: BBoxAnnotationRead | BBoxAnnotationReadResolvedCode;
      requestBody: BBoxAnnotationUpdateWithCodeId;
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
      const affectedQueryKey = [QueryKey.ADOC_BBOX_ANNOTATIONS, updateData.bboxToUpdate.annotation_document_id];

      // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries({ queryKey: affectedQueryKey });

      // Snapshot the previous value
      const previousBboxes = queryClient.getQueryData(affectedQueryKey);

      // Optimistically update to the new value
      queryClient.setQueryData(affectedQueryKey, (old: BBoxAnnotationReadResolvedCode[] | undefined) => {
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

const useDelete = () =>
  useMutation({
    mutationFn: BboxAnnotationService.deleteById,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [QueryKey.ADOC_BBOX_ANNOTATIONS, data.annotation_document_id] });
      queryClient.invalidateQueries({ queryKey: [QueryKey.MEMO_SDOC_RELATED] }); // todo: this is not optimal
    },
  });

const useDeleteBBox = () =>
  useMutation({
    mutationFn: (variables: { bboxToDelete: BBoxAnnotationRead | BBoxAnnotationReadResolvedCode }) =>
      BboxAnnotationService.deleteById({ bboxId: variables.bboxToDelete.id }),
    // optimistic updates
    onMutate: async ({ bboxToDelete }) => {
      // when we delete a bbox annotation, we remove a bbox from a certain annotation document
      // thus, we only affect the annotation document that we are removing from
      const affectedQueryKey = [QueryKey.ADOC_BBOX_ANNOTATIONS, bboxToDelete.annotation_document_id];

      // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries({ queryKey: affectedQueryKey });

      // Snapshot the previous value
      const previousBboxes = queryClient.getQueryData(affectedQueryKey);

      // Optimistically update to the new value
      queryClient.setQueryData(affectedQueryKey, (old: BBoxAnnotationReadResolvedCode[] | undefined) => {
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

// memo
const useGetMemos = (bboxId: number | undefined) =>
  useQuery<MemoRead[], Error>({
    queryKey: [QueryKey.MEMO_BBOX_ANNOTATION, bboxId],
    queryFn: () => BboxAnnotationService.getMemos({ bboxId: bboxId! }),
    enabled: !!bboxId,
    retry: false,
  });

const useGetMemo = (bboxId: number | undefined, userId: number | undefined) =>
  useQuery<MemoRead, Error>({
    queryKey: [QueryKey.MEMO_BBOX_ANNOTATION, bboxId, userId],
    queryFn: () => BboxAnnotationService.getUserMemo({ bboxId: bboxId!, userId: userId! }),
    enabled: !!bboxId && !!userId,
    retry: false,
  });

const useCreateMemo = () =>
  useMutation({
    mutationFn: BboxAnnotationService.addMemo,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [QueryKey.USER_MEMOS, data.user_id] });
      queryClient.invalidateQueries({
        queryKey: [QueryKey.MEMO_BBOX_ANNOTATION, data.attached_object_id, data.user_id],
      });
      queryClient.invalidateQueries({ queryKey: [QueryKey.MEMO_SDOC_RELATED, data.user_id] }); // todo: this is not optimal
    },
  });

const BboxAnnotationHooks = {
  useCreateAnnotation,
  useGetAnnotation,
  useGetByCodeAndUser,
  useUpdate,
  useUpdateBBox,
  useDelete,
  useDeleteBBox,
  // memo
  useGetMemo,
  useGetMemos,
  useCreateMemo,
};

export default BboxAnnotationHooks;
