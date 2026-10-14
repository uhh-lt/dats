import { rollbackOptimisticUpdate } from "@api/cache-sync/_utils/optimisticUtils";
import { queryClient } from "@api/queryClient";
import { BboxAnnotationService } from "@api/services/BboxAnnotationService";
import { annotationQueries } from "@core/annotation";
import { BBoxAnnotationCreate } from "@models/BBoxAnnotationCreate";
import { BBoxAnnotationRead } from "@models/BBoxAnnotationRead";
import { BBoxAnnotationUpdate } from "@models/BBoxAnnotationUpdate";
import { useMutation } from "@tanstack/react-query";

// BBOX QUERIES live in annotationQueries.bbox (used with `useQuery` directly).

// BBOX MUTATIONS
const useCreateBBoxAnnotation = () =>
  useMutation({
    mutationKey: [...annotationQueries.bbox.all(), "create"],
    mutationFn: (variables: BBoxAnnotationCreate) =>
      BboxAnnotationService.createBboxAnnotation({ requestBody: variables }),
    meta: {
      datsEvent: "BBOX_ANNOTATION_CREATED",
      successMessage: (bbox: BBoxAnnotationRead) => `Created Bounding Box Annotation ${bbox.id}`,
    },
  });

const useUpdateBBoxAnnotation = () =>
  useMutation({
    mutationKey: [...annotationQueries.bbox.all(), "update"],
    mutationFn: (variables: { bboxToUpdate: BBoxAnnotationRead | number; requestBody: BBoxAnnotationUpdate }) =>
      BboxAnnotationService.updateById({
        bboxId: typeof variables.bboxToUpdate === "number" ? variables.bboxToUpdate : variables.bboxToUpdate.id,
        requestBody: variables.requestBody,
      }),
    // optimistic update if bboxToUpdate is a proper BBoxAnnotationRead
    // todo: rework to only update the bbox annotation detail query (we need to change the rendering for this...)
    onMutate: async ({ bboxToUpdate, requestBody }) => {
      if (typeof bboxToUpdate === "number") return;
      const affectedQueryKey = annotationQueries.bbox.bySdoc(bboxToUpdate.sdoc_id, bboxToUpdate.user_id).queryKey;
      await queryClient.cancelQueries({ queryKey: affectedQueryKey });
      const previousBboxes = queryClient.getQueryData(affectedQueryKey);
      queryClient.setQueryData(affectedQueryKey, (old) => {
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
      rollbackOptimisticUpdate(context.affectedQueryKey, context.previousBboxes, annotationQueries.bbox.all());
    },
    meta: {
      datsEvent: "BBOX_ANNOTATION_UPDATED",
      successMessage: (bbox: BBoxAnnotationRead) => `Updated Bounding Box Annotation ${bbox.id}`,
    },
  });

const useUpdateBulkBBoxAnnotation = () =>
  useMutation({
    mutationKey: [...annotationQueries.bbox.all(), "updateBulk"],
    mutationFn: BboxAnnotationService.updateBboxAnnotationsBulk,
    meta: {
      datsEvent: "BBOX_ANNOTATION_UPDATED_BATCH",
      successMessage: (data: BBoxAnnotationRead[]) => `Updated ${data.length} BBox Annotations`,
    },
  });

const useDeleteBBoxAnnotation = () =>
  useMutation({
    mutationKey: [...annotationQueries.bbox.all(), "delete"],
    mutationFn: (variables: { bboxToDelete: BBoxAnnotationRead | number }) =>
      BboxAnnotationService.deleteById({
        bboxId: typeof variables.bboxToDelete === "number" ? variables.bboxToDelete : variables.bboxToDelete.id,
      }),
    // optimistic update if bboxToDelete is a proper BBoxAnnotationRead
    onMutate: async ({ bboxToDelete }) => {
      if (typeof bboxToDelete === "number") return;
      const affectedQueryKey = annotationQueries.bbox.bySdoc(bboxToDelete.sdoc_id, bboxToDelete.user_id).queryKey;
      await queryClient.cancelQueries({ queryKey: affectedQueryKey });
      const previousBboxes = queryClient.getQueryData(affectedQueryKey);
      queryClient.setQueryData(affectedQueryKey, (old) =>
        old ? old.filter((bbox) => bbox.id !== bboxToDelete.id) : old,
      );
      return { previousBboxes, affectedQueryKey };
    },
    onError: (_error: Error, _newBbox, context) => {
      if (!context) return;
      rollbackOptimisticUpdate(context.affectedQueryKey, context.previousBboxes, annotationQueries.bbox.all());
    },
    meta: {
      datsEvent: "BBOX_ANNOTATION_DELETED",
      successMessage: (bbox: BBoxAnnotationRead) => `Deleted Bounding Box Annotation ${bbox.id}`,
    },
  });

const useDeleteBulkBBoxAnnotation = () =>
  useMutation({
    mutationKey: [...annotationQueries.bbox.all(), "deleteBulk"],
    mutationFn: BboxAnnotationService.deleteBboxAnnotationsBulk,
    meta: {
      datsEvent: "BBOX_ANNOTATION_DELETED_BATCH",
      successMessage: (data: BBoxAnnotationRead[]) => `Deleted ${data.length} Bounding Box Annotations`,
    },
  });

export const BboxAnnotationHooks = {
  useCreateBBoxAnnotation,
  useUpdateBBoxAnnotation,
  useUpdateBulkBBoxAnnotation,
  useDeleteBBoxAnnotation,
  useDeleteBulkBBoxAnnotation,
};
