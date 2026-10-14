import { queryClient } from "@api/queryClient";
import { SentenceAnnotationService } from "@api/services/SentenceAnnotationService";
import { SentenceAnnotationRead } from "@models/SentenceAnnotationRead";
import { SentenceAnnotationUpdate } from "@models/SentenceAnnotationUpdate";
import { useMutation, useQuery } from "@tanstack/react-query";
import { rollbackOptimisticUpdate } from "@utils/optimisticUtils";
import { sentenceAnnotationQueries } from "./sentenceAnnotationQueries";

// SENTENCE QUERIES live in sentenceAnnotationQueries (used with `useQuery` directly).
// TODO: filter out all disabled code ids

// SENTENCE MUTATIONS
const useCreateSentenceAnnotation = () =>
  useMutation({
    mutationKey: [...sentenceAnnotationQueries.all(), "createSentenceAnnotation"],
    mutationFn: SentenceAnnotationService.createSentenceAnnotation,
    meta: {
      datsEvent: "SENTENCE_ANNOTATION_CREATED",
      successMessage: (data: SentenceAnnotationRead) => `Created Sentence Annotation ${data.id}`,
    },
  });

const useCreateBulkSentenceAnnotation = () =>
  useMutation({
    mutationKey: [...sentenceAnnotationQueries.all(), "createBulkSentenceAnnotation"],
    mutationFn: SentenceAnnotationService.createSentenceAnnotationsBulk,
    meta: {
      datsEvent: "SENTENCE_ANNOTATION_CREATED_BATCH",
      successMessage: (data: SentenceAnnotationRead[]) => `Created ${data.length} Sentence Annotations`,
    },
  });

const useUpdateSentenceAnnotation = () =>
  useMutation({
    mutationKey: [...sentenceAnnotationQueries.all(), "updateSentenceAnnotation"],
    mutationFn: (variables: {
      sentenceAnnoToUpdate: SentenceAnnotationRead | number;
      update: SentenceAnnotationUpdate;
    }) =>
      SentenceAnnotationService.updateById({
        sentenceAnnoId:
          typeof variables.sentenceAnnoToUpdate === "number"
            ? variables.sentenceAnnoToUpdate
            : variables.sentenceAnnoToUpdate.id,
        requestBody: variables.update,
      }),
    // Optimistic update: immediately reflect the resize/code change in the cached
    // SentenceAnnotatorResult so the UI updates without waiting for the server.
    //
    // The cache stores annotations grouped by sentence index, with each annotation
    // duplicated across every sentence it covers. When boundaries change, the
    // annotation must be added to newly covered sentences, removed from sentences
    // it no longer covers, and replaced in sentences it still covers.
    //
    // We compute the union of old and new ranges, then for each affected sentence:
    //   - coversSentence && !isListed  → annotation grew into this sentence: add it
    //   - !coversSentence && isListed  → annotation shrank away: remove it
    //   - isListed (still covers)      → update in place (e.g. code_id changed)
    //
    // On error, the previous cache snapshot is restored (rollback).
    onMutate: async ({ sentenceAnnoToUpdate, update }) => {
      if (typeof sentenceAnnoToUpdate === "number") return;
      const affectedQueryKey = sentenceAnnotationQueries.bySdoc(
        sentenceAnnoToUpdate.sdoc_id,
        sentenceAnnoToUpdate.user_id,
      ).queryKey;
      await queryClient.cancelQueries({ queryKey: affectedQueryKey });
      const previousAnnos = queryClient.getQueryData(affectedQueryKey);
      queryClient.setQueryData(affectedQueryKey, (old) => {
        if (!old) return old;
        const sentAnnos = { ...old.sentence_annotations };
        const newStart = update.sentence_id_start ?? sentenceAnnoToUpdate.sentence_id_start;
        const newEnd = update.sentence_id_end ?? sentenceAnnoToUpdate.sentence_id_end;
        const oldStart = sentenceAnnoToUpdate.sentence_id_start;
        const oldEnd = sentenceAnnoToUpdate.sentence_id_end;
        const updatedAnnotation: SentenceAnnotationRead = {
          ...sentenceAnnoToUpdate,
          code_id: update.code_id ?? sentenceAnnoToUpdate.code_id,
          sentence_id_start: newStart,
          sentence_id_end: newEnd,
        };
        const affectedSentenceIds = new Set<number>();
        for (let sentenceId = oldStart; sentenceId <= oldEnd; sentenceId++) {
          affectedSentenceIds.add(sentenceId);
        }
        for (let sentenceId = newStart; sentenceId <= newEnd; sentenceId++) {
          affectedSentenceIds.add(sentenceId);
        }
        affectedSentenceIds.forEach((sentenceId) => {
          if (!sentAnnos[sentenceId]) {
            sentAnnos[sentenceId] = [];
          }
          const coversSentence = newStart <= sentenceId && sentenceId <= newEnd;
          const isListed = sentAnnos[sentenceId].some((annotation) => annotation.id === sentenceAnnoToUpdate.id);
          if (coversSentence && !isListed) {
            sentAnnos[sentenceId] = [...sentAnnos[sentenceId], updatedAnnotation];
          } else if (!coversSentence && isListed) {
            sentAnnos[sentenceId] = sentAnnos[sentenceId].filter(
              (annotation) => annotation.id !== sentenceAnnoToUpdate.id,
            );
          } else {
            sentAnnos[sentenceId] = sentAnnos[sentenceId].map((annotation) =>
              annotation.id === sentenceAnnoToUpdate.id ? updatedAnnotation : annotation,
            );
          }
        });
        return { sentence_annotations: sentAnnos };
      });
      return { previousAnnos, affectedQueryKey };
    },
    onError: (_error: Error, _updatedSentenceAnnotation, context) => {
      if (!context) return;
      rollbackOptimisticUpdate(
        queryClient,
        context.affectedQueryKey,
        context.previousAnnos,
        sentenceAnnotationQueries.all(),
      );
    },
    meta: {
      datsEvent: "SENTENCE_ANNOTATION_UPDATED",
      successMessage: (data: SentenceAnnotationRead) => `Updated Sentence Annotation ${data.id}`,
    },
  });

const useUpdateBulkSentenceAnno = () =>
  useMutation({
    mutationKey: [...sentenceAnnotationQueries.all(), "updateBulkSentenceAnno"],
    mutationFn: SentenceAnnotationService.updateSentenceAnnotationsBulk,
    meta: {
      datsEvent: "SENTENCE_ANNOTATION_UPDATED_BATCH",
      successMessage: (data: SentenceAnnotationRead[]) => `Updated ${data.length} Sentence Annotations`,
    },
  });

const useDeleteSentenceAnnotation = () =>
  useMutation({
    mutationKey: [...sentenceAnnotationQueries.all(), "deleteSentenceAnnotation"],
    mutationFn: (sentAnnoToDelete: SentenceAnnotationRead | number) =>
      SentenceAnnotationService.deleteById({
        sentenceAnnoId: typeof sentAnnoToDelete === "number" ? sentAnnoToDelete : sentAnnoToDelete.id,
      }),
    // optimistic updates
    onMutate: async (sentAnnoToDelete) => {
      if (typeof sentAnnoToDelete === "number") return;
      const affectedQueryKey = sentenceAnnotationQueries.bySdoc(
        sentAnnoToDelete.sdoc_id,
        sentAnnoToDelete.user_id,
      ).queryKey;
      await queryClient.cancelQueries({ queryKey: affectedQueryKey });
      const previousSentenceAnnotator = queryClient.getQueryData(affectedQueryKey);
      queryClient.setQueryData(affectedQueryKey, (old) => {
        if (!old) return old;
        const sentAnnos = { ...old.sentence_annotations };
        for (
          let sentenceId = sentAnnoToDelete.sentence_id_start;
          sentenceId <= sentAnnoToDelete.sentence_id_end;
          sentenceId++
        ) {
          if (!sentAnnos[sentenceId]) continue;
          sentAnnos[sentenceId] = sentAnnos[sentenceId].filter((annotation) => annotation.id !== sentAnnoToDelete.id);
        }
        return { sentence_annotations: sentAnnos };
      });
      return { previousSentenceAnnotator, affectedQueryKey };
    },
    onError: (_error: Error, _sentenceAnnotationToDelete, context) => {
      if (!context) return;
      rollbackOptimisticUpdate(
        queryClient,
        context.affectedQueryKey,
        context.previousSentenceAnnotator,
        sentenceAnnotationQueries.all(),
      );
    },
    meta: {
      datsEvent: "SENTENCE_ANNOTATION_DELETED",
      successMessage: (data: SentenceAnnotationRead) => `Deleted Sentence Annotation ${data.id}`,
    },
  });

const useDeleteBulkSentenceAnnotation = () =>
  useMutation({
    mutationKey: [...sentenceAnnotationQueries.all(), "deleteBulkSentenceAnnotation"],
    mutationFn: SentenceAnnotationService.deleteSentenceAnnotationsBulk,
    meta: {
      datsEvent: "SENTENCE_ANNOTATION_DELETED_BATCH",
      successMessage: (data: SentenceAnnotationRead[]) => `Deleted ${data.length} Sentence Annotations`,
    },
  });

const useDeleteBulkSentenceAnnotationSingleSdoc = () =>
  useMutation({
    mutationKey: [...sentenceAnnotationQueries.all(), "deleteBulkSentenceAnnotationSingleSdoc"],
    mutationFn: (sentAnnosToDelete: SentenceAnnotationRead[]) =>
      SentenceAnnotationService.deleteSentenceAnnotationsBulk({
        requestBody: sentAnnosToDelete.map((anno) => anno.id),
      }),
    // optimistic updates
    onMutate: async (sentAnnosToDelete) => {
      if (sentAnnosToDelete.length === 0) return;
      const sdocId = sentAnnosToDelete[0].sdoc_id;
      if (sentAnnosToDelete.some((annotation) => annotation.sdoc_id !== sdocId)) {
        console.error("All annotations to delete must belong to the same source document");
        return;
      }
      const userId = sentAnnosToDelete[0].user_id;
      if (sentAnnosToDelete.some((annotation) => annotation.user_id !== userId)) {
        console.error("All annotations to delete must belong to the same user");
        return;
      }

      const affectedQueryKey = sentenceAnnotationQueries.bySdoc(sdocId, userId).queryKey;
      await queryClient.cancelQueries({ queryKey: affectedQueryKey });
      const previousSentenceAnnotator = queryClient.getQueryData(affectedQueryKey);
      const idsToDelete = sentAnnosToDelete.map((anno) => anno.id);
      queryClient.setQueryData(affectedQueryKey, (old) => {
        if (!old) return old;
        const newSentenceAnnotations = Object.entries(old.sentence_annotations).reduce(
          (acc, [sentId, annotations]) => {
            // filter out the annotations that are to be deleted
            acc[sentId] = annotations.filter((annotation) => !idsToDelete.includes(annotation.id));
            return acc;
          },
          {} as Record<string, SentenceAnnotationRead[]>,
        );
        return { sentence_annotations: newSentenceAnnotations };
      });
      return { previousSentenceAnnotator, affectedQueryKey };
    },
    onError: (_error: Error, _sentenceAnnotationToDelete, context) => {
      if (!context) return;
      rollbackOptimisticUpdate(
        queryClient,
        context.affectedQueryKey,
        context.previousSentenceAnnotator,
        sentenceAnnotationQueries.all(),
      );
    },
    // Re-fetch after error or success, but only once no other sentence annotation mutation is in flight
    // (isMutating still counts this mutation, hence `=== 1`); otherwise the refetch would overwrite their
    // optimistic updates.
    onSettled: (_data, _error, _variables, context) => {
      if (!context) return;
      if (queryClient.isMutating({ mutationKey: sentenceAnnotationQueries.all() }) === 1) {
        queryClient.invalidateQueries({ queryKey: context.affectedQueryKey });
      }
    },
    meta: {
      successMessage: (data: SentenceAnnotationRead[]) => `Bulk deleted ${data.length} Sentence Annotations`,
    },
  });

const useCountBySdocsAndUser = () =>
  useMutation({
    mutationKey: [...sentenceAnnotationQueries.all(), "countBySdocsAndUser"],
    mutationFn: SentenceAnnotationService.countAnnotations,
  });

const useGetAnnotation = (sentenceAnnoId: number | null | undefined) =>
  useQuery(sentenceAnnotationQueries.byId(sentenceAnnoId));

const useGetSentenceAnnotator = (sdocId: number | null | undefined, userId: number | null | undefined) =>
  useQuery(sentenceAnnotationQueries.bySdoc(sdocId, userId));

export const SentenceAnnotationHooks = {
  useGetSentenceAnnotator,
  useCreateSentenceAnnotation,
  useCreateBulkSentenceAnnotation,
  useUpdateSentenceAnnotation,
  useUpdateBulkSentenceAnno,
  useDeleteSentenceAnnotation,
  useDeleteBulkSentenceAnnotation,
  useDeleteBulkSentenceAnnotationSingleSdoc,
  useCountBySdocsAndUser,
  useGetAnnotation,
};
