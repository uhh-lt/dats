import { useMutation, useQuery } from "@tanstack/react-query";
import { useAuth } from "../features/auth/useAuth.ts";
import { queryClient } from "../plugins/ReactQueryClient.ts";
import { QueryKey } from "./QueryKey.ts";
import { CancelablePromise } from "./openapi/core/CancelablePromise.ts";
import { BBoxAnnotationCreate } from "./openapi/models/BBoxAnnotationCreate.ts";
import { BBoxAnnotationRead } from "./openapi/models/BBoxAnnotationRead.ts";
import { BBoxAnnotationUpdate } from "./openapi/models/BBoxAnnotationUpdate.ts";
import { BboxAnnotationService } from "./openapi/services/BboxAnnotationService.ts";

export const FAKE_BBOX_ID = -1;

// BBOX QUERIES
const useGetAnnotation = (bboxId: number | undefined) =>
  useQuery<BBoxAnnotationRead, Error>({
    queryKey: [QueryKey.BBOX_ANNOTATION, bboxId],
    queryFn: () =>
      BboxAnnotationService.getById({
        bboxId: bboxId!,
      }) as CancelablePromise<BBoxAnnotationRead>,
    enabled: !!bboxId,
    staleTime: 1000 * 60 * 5,
  });

const useGetByCodeAndUser = (codeId: number | undefined) =>
  useQuery<BBoxAnnotationRead[], Error>({
    queryKey: [QueryKey.BBOX_ANNOTATIONS_USER_CODE, codeId],
    queryFn: () =>
      BboxAnnotationService.getByUserCode({
        codeId: codeId!,
      }),
    enabled: !!codeId,
  });

const useGetBBoxAnnotationsBatch = (sdocId: number | null | undefined, userId: number | null | undefined) => {
  return useQuery<BBoxAnnotationRead[], Error>({
    queryKey: [QueryKey.SDOC_BBOX_ANNOTATIONS, sdocId, userId],
    queryFn: () =>
      BboxAnnotationService.getBySdocAndUser({
        sdocId: sdocId!,
        userId: userId!,
      }) as Promise<BBoxAnnotationRead[]>,
    enabled: !!sdocId && !!userId,
  });
};

// BBOX MUTATIONS
const useCreateBBoxAnnotation = () => {
  const { user } = useAuth();
  return useMutation({
    mutationFn: (variables: BBoxAnnotationCreate) =>
      BboxAnnotationService.addBboxAnnotation({ requestBody: variables }),
    // optimistic update:
    // 1. Cancel any outgoing refetches (so they don't overwrite our optimistic update)
    // 2. Snapshot the previous value
    // 3. Optimistically update to the new value
    // 4. Return a context object with the snapshotted value
    onMutate: async (newBbox) => {
      if (!user) return;
      const affectedQueryKey = [QueryKey.SDOC_BBOX_ANNOTATIONS, newBbox.sdoc_id, user.id];
      await queryClient.cancelQueries({ queryKey: affectedQueryKey });
      const previousBboxes = queryClient.getQueryData<BBoxAnnotationRead[]>(affectedQueryKey);
      const bbox: BBoxAnnotationRead = {
        ...newBbox,
        id: FAKE_BBOX_ID,
        code_id: newBbox.code_id,
        created: "",
        updated: "",
        user_id: user.id,
        memo_ids: [],
      };
      queryClient.setQueryData<BBoxAnnotationRead[]>(affectedQueryKey, (old) => {
        return old ? [...old, bbox] : [bbox];
      });
      return { previousBboxes, affectedQueryKey };
    },
    onError: (_error, _newBbox, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (!context) return;
      queryClient.setQueryData<BBoxAnnotationRead[]>(context.affectedQueryKey, context.previousBboxes);
    },
    onSuccess: (data) => {
      queryClient.setQueryData<BBoxAnnotationRead>([QueryKey.BBOX_ANNOTATION, data.id], data);
      // Replace the fake bbox with the real one
      queryClient.setQueryData<BBoxAnnotationRead[]>(
        [QueryKey.SDOC_BBOX_ANNOTATIONS, data.sdoc_id, data.user_id],
        (old) => (old ? old.map((bbox) => (bbox.id === FAKE_BBOX_ID ? data : bbox)) : [data]),
      );
    },
    meta: {
      successMessage: (bbox: BBoxAnnotationRead) => `Created Bounding Box Annotation ${bbox.id}`,
    },
  });
};

const useUpdateBBoxAnnotation = () =>
  useMutation({
    mutationFn: (variables: { bboxToUpdate: BBoxAnnotationRead | number; requestBody: BBoxAnnotationUpdate }) =>
      BboxAnnotationService.updateById({
        bboxId: typeof variables.bboxToUpdate === "number" ? variables.bboxToUpdate : variables.bboxToUpdate.id,
        requestBody: variables.requestBody,
      }),
    // optimistic update if bboxToUpdate is a proper BBoxAnnotationRead
    // todo: rework to only update QueryKey.BBOX_ANNOTATION (we need to change the rendering for this...)
    onMutate: async ({ bboxToUpdate, requestBody }) => {
      if (typeof bboxToUpdate === "number") return;
      const affectedQueryKey = [QueryKey.SDOC_BBOX_ANNOTATIONS, bboxToUpdate.sdoc_id, bboxToUpdate.user_id];
      await queryClient.cancelQueries({ queryKey: affectedQueryKey });
      const previousBboxes = queryClient.getQueryData<BBoxAnnotationRead[]>(affectedQueryKey);
      queryClient.setQueryData<BBoxAnnotationRead[]>(affectedQueryKey, (old) => {
        return old
          ? old.map((anno) =>
              anno.id === bboxToUpdate.id
                ? {
                    ...anno,
                    code_id: requestBody.code_id,
                  }
                : anno,
            )
          : undefined;
      });
      return { previousBboxes, affectedQueryKey };
    },
    onError: (_error, _updatedBboxAnnotation, context) => {
      if (!context) return;
      // If the mutation fails, use the context returned from onMutate to roll back
      queryClient.setQueryData<BBoxAnnotationRead[]>(context.affectedQueryKey, context.previousBboxes);
    },
    onSuccess: (data) => {
      queryClient.setQueryData<BBoxAnnotationRead>([QueryKey.BBOX_ANNOTATION, data.id], data);
      queryClient.setQueryData<BBoxAnnotationRead[]>(
        [QueryKey.SDOC_BBOX_ANNOTATIONS, data.sdoc_id, data.user_id],
        (old) => (old ? old.map((bbox) => (bbox.id === data.id ? data : bbox)) : [data]),
      );
    },
    meta: {
      successMessage: (bbox: BBoxAnnotationRead) => `Updated Bounding Box Annotation ${bbox.id}`,
    },
  });

const useUpdateBulkBBoxAnnotation = () =>
  useMutation({
    mutationFn: BboxAnnotationService.updateBboxAnnoAnnotationsBulk,
    onSuccess(data) {
      queryClient.invalidateQueries({ queryKey: [QueryKey.BBOX_TABLE] }); // TODO: This is not optimal, shoudl be projectId, selectedUserId... We do this because of BBoxAnnotationTable
      data.forEach((annotation) => {
        queryClient.invalidateQueries({
          queryKey: [QueryKey.SDOC_BBOX_ANNOTATIONS, annotation.sdoc_id, annotation.user_id],
        });
        queryClient.invalidateQueries({ queryKey: [QueryKey.BBOX_ANNOTATION, annotation.id] });
      });
    },
    meta: {
      successMessage: (data: BBoxAnnotationRead[]) => `Updated ${data.length} BBox Annotations`,
    },
  });

const useDeleteBBoxAnnotation = () =>
  useMutation({
    mutationFn: (variables: { bboxToDelete: BBoxAnnotationRead | number }) =>
      BboxAnnotationService.deleteById({
        bboxId: typeof variables.bboxToDelete === "number" ? variables.bboxToDelete : variables.bboxToDelete.id,
      }),
    // optimistic update if bboxToDelete is a proper BBoxAnnotationRead
    onMutate: async ({ bboxToDelete }) => {
      if (typeof bboxToDelete === "number") return;
      const affectedQueryKey = [QueryKey.SDOC_BBOX_ANNOTATIONS, bboxToDelete.sdoc_id, bboxToDelete.user_id];
      await queryClient.cancelQueries({ queryKey: affectedQueryKey });
      const previousBboxes = queryClient.getQueryData<BBoxAnnotationRead[]>(affectedQueryKey);
      queryClient.setQueryData<BBoxAnnotationRead[]>(affectedQueryKey, (old) =>
        old ? old.filter((bbox) => bbox.id !== bboxToDelete.id) : old,
      );
      return { previousBboxes, affectedQueryKey };
    },
    onError: (_error: Error, _newBbox, context) => {
      if (!context) return;
      // If the mutation fails, use the context returned from onMutate to roll back
      queryClient.setQueryData<BBoxAnnotationRead[]>(context.affectedQueryKey, context.previousBboxes);
    },
    onSuccess: (data) => {
      queryClient.removeQueries({ queryKey: [QueryKey.BBOX_ANNOTATION, data.id] });
      queryClient.setQueryData<BBoxAnnotationRead[]>(
        [QueryKey.SDOC_BBOX_ANNOTATIONS, data.sdoc_id, data.user_id],
        (old) => (old ? old.filter((bbox) => bbox.id !== data.id) : old),
      );
    },
    meta: {
      successMessage: (bbox: BBoxAnnotationRead) => `Deleted Bounding Box Annotation ${bbox.id}`,
    },
  });

const useDeleteBulkBBoxAnnotation = () =>
  useMutation({
    mutationFn: BboxAnnotationService.deleteBulkById,
    onSuccess(data) {
      queryClient.invalidateQueries({ queryKey: [QueryKey.BBOX_TABLE] }); // TODO: This is not optimal, should be projectId, selectedUserId... We do this because of BBoxAnnotationTable
      data.forEach((annotation) => {
        queryClient.invalidateQueries({
          queryKey: [QueryKey.SDOC_BBOX_ANNOTATIONS, annotation.sdoc_id, annotation.user_id],
        });
        queryClient.removeQueries({ queryKey: [QueryKey.BBOX_ANNOTATION, annotation.id] });
      });
    },
    meta: {
      successMessage: (data: BBoxAnnotationRead[]) => `Deleted ${data.length} Bounding Box Annotations`,
    },
  });

export const BboxAnnotationHooks = {
  useGetAnnotation,
  useGetByCodeAndUser,
  useGetBBoxAnnotationsBatch,
  useCreateBBoxAnnotation,
  useUpdateBBoxAnnotation,
  useUpdateBulkBBoxAnnotation,
  useDeleteBBoxAnnotation,
  useDeleteBulkBBoxAnnotation,
};
