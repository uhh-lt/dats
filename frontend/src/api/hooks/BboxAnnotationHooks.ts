import { CancelablePromise } from "@api/core/CancelablePromise";
import { queryClient } from "@api/queryClient";
import { BboxAnnotationService } from "@api/services/BboxAnnotationService";
import { BBoxAnnotationCreate } from "@models/BBoxAnnotationCreate";
import { BBoxAnnotationRead } from "@models/BBoxAnnotationRead";
import { BBoxAnnotationUpdate } from "@models/BBoxAnnotationUpdate";
import { useMutation, useQuery } from "@tanstack/react-query";
import { QueryKey } from "./QueryKey";

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

const useGetBBoxAnnotationsBatch = (sdocId: number | null | undefined, userId: number | null | undefined) =>
  useQuery<BBoxAnnotationRead[], Error>({
    queryKey: [QueryKey.SDOC_BBOX_ANNOTATIONS, sdocId, userId],
    queryFn: () =>
      BboxAnnotationService.getBySdocAndUser({
        sdocId: sdocId!,
        userId: userId!,
      }) as Promise<BBoxAnnotationRead[]>,
    enabled: !!sdocId && !!userId,
  });

// BBOX MUTATIONS
const useCreateBBoxAnnotation = () =>
  useMutation({
    mutationFn: (variables: BBoxAnnotationCreate) =>
      BboxAnnotationService.createBboxAnnotation({ requestBody: variables }),
    meta: {
      entityEvent: "BBOX_ANNOTATION_CREATED",
      successMessage: (bbox: BBoxAnnotationRead) => `Created Bounding Box Annotation ${bbox.id}`,
    },
  });

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
                    code_id: requestBody.code_id ?? anno.code_id,
                    x_min: requestBody.x_min ?? anno.x_min,
                    x_max: requestBody.x_max ?? anno.x_max,
                    y_min: requestBody.y_min ?? anno.y_min,
                    y_max: requestBody.y_max ?? anno.y_max,
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
    meta: {
      entityEvent: "BBOX_ANNOTATION_UPDATED",
      successMessage: (bbox: BBoxAnnotationRead) => `Updated Bounding Box Annotation ${bbox.id}`,
    },
  });

const useUpdateBulkBBoxAnnotation = () =>
  useMutation({
    mutationFn: BboxAnnotationService.updateBboxAnnotationsBulk,
    meta: {
      entityEvent: "BBOX_ANNOTATION_UPDATED_BATCH",
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
    meta: {
      entityEvent: "BBOX_ANNOTATION_DELETED",
      successMessage: (bbox: BBoxAnnotationRead) => `Deleted Bounding Box Annotation ${bbox.id}`,
    },
  });

const useDeleteBulkBBoxAnnotation = () =>
  useMutation({
    mutationFn: BboxAnnotationService.deleteBboxAnnotationsBulk,
    meta: {
      entityEvent: "BBOX_ANNOTATION_DELETED_BATCH",
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
