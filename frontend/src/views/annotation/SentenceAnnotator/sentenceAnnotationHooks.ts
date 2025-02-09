import { useMutation } from "@tanstack/react-query";
import { CodeRead } from "../../../api/openapi/models/CodeRead.ts";
import { SentenceAnnotationRead } from "../../../api/openapi/models/SentenceAnnotationRead.ts";
import { SentenceAnnotationReadResolved } from "../../../api/openapi/models/SentenceAnnotationReadResolved.ts";
import { SentenceAnnotatorResult } from "../../../api/openapi/models/SentenceAnnotatorResult.ts";
import { SentenceAnnotationService } from "../../../api/openapi/services/SentenceAnnotationService.ts";
import { QueryKey } from "../../../api/QueryKey.ts";
import { FAKE_SENTENCE_ANNOTATION_ID } from "../../../api/SentenceAnnotationHooks.ts";
import queryClient from "../../../plugins/ReactQueryClient.ts";

export const useCreateSentenceAnnotation = (currentUserId: number) =>
  useMutation({
    mutationFn: async ({ code, sdocId, start, end }: { code: CodeRead; sdocId: number; start: number; end: number }) =>
      SentenceAnnotationService.addSentenceAnnotation({
        requestBody: {
          code_id: code.id,
          sdoc_id: sdocId,
          sentence_id_start: start,
          sentence_id_end: end,
        },
        resolve: true,
      }),
    // optimistic updates
    onMutate: async (variables) => {
      // when we create a new sentence annotation, we add a new annotation to a certain annotation document
      // thus, we only affect the annotation document that we are adding to
      const affectedQueryKey = [QueryKey.SDOC_SENTENCE_ANNOTATOR, variables.sdocId, currentUserId];

      // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries({ queryKey: affectedQueryKey });

      // Snapshot the previous value
      const previousSentenceAnnotator = queryClient.getQueryData<SentenceAnnotatorResult>(affectedQueryKey);

      // Optimistically update to the new value
      queryClient.setQueryData<SentenceAnnotatorResult>(affectedQueryKey, (old) => {
        if (!old) return old;

        const newSentenceAnnotations = Object.entries(old.sentence_annotations).reduce(
          (acc, [sentId, annotations]) => {
            const sentenceId = parseInt(sentId);
            if (sentenceId >= variables.start && sentenceId <= variables.end) {
              acc[sentId] = [
                ...annotations,
                {
                  id: FAKE_SENTENCE_ANNOTATION_ID,
                  sdoc_id: variables.sdocId,
                  user_id: currentUserId,
                  code: variables.code,
                  sentence_id_start: variables.start,
                  sentence_id_end: variables.end,
                  created: new Date().toISOString(),
                  updated: new Date().toISOString(),
                },
              ];
              return acc;
            }
            acc[sentId] = annotations;
            return acc;
          },
          {} as Record<string, SentenceAnnotationReadResolved[]>,
        );
        return { sentence_annotations: newSentenceAnnotations };
      });

      // Return a context object with the snapshotted value
      return { previousSentenceAnnotator, affectedQueryKey };
    },
    onError: (_error: Error, _newSentAnnotation, context) => {
      if (!context) return;
      // If the mutation fails, use the context returned from onMutate to roll back
      queryClient.setQueryData(context.affectedQueryKey, context.previousSentenceAnnotator);
    },
    // Always re-fetch after error or success:
    onSettled: (_data, _error, _variables, context) => {
      if (!context) return;
      queryClient.invalidateQueries({ queryKey: context.affectedQueryKey });
    },
  });

export const useCreateBulkSentenceAnnotation = (currentUserId: number) =>
  useMutation({
    mutationFn: async ({
      sdocId,
      annotations,
    }: {
      sdocId: number;
      annotations: { code: CodeRead; start: number; end: number }[];
    }) =>
      SentenceAnnotationService.addSentenceAnnotationsBulk({
        requestBody: annotations.map((annotation) => ({
          code_id: annotation.code.id,
          sdoc_id: sdocId,
          sentence_id_start: annotation.start,
          sentence_id_end: annotation.end,
        })),
        resolve: true,
      }),
    // optimistic updates
    onMutate: async (variables) => {
      // when we create a new sentence annotation, we add a new annotation to a certain annotation document
      // thus, we only affect the annotation document that we are adding to
      const affectedQueryKey = [QueryKey.SDOC_SENTENCE_ANNOTATOR, variables.sdocId, currentUserId];

      // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries({ queryKey: affectedQueryKey });

      // Snapshot the previous value
      const previousSentenceAnnotator = queryClient.getQueryData<SentenceAnnotatorResult>(affectedQueryKey);

      // Optimistically update to the new value
      let fakeID = FAKE_SENTENCE_ANNOTATION_ID;
      queryClient.setQueryData<SentenceAnnotatorResult>(affectedQueryKey, (old) => {
        if (!old) return old;

        const newSentenceAnnotations = Object.entries(old.sentence_annotations).reduce(
          (acc, [sentId, annotations]) => {
            acc[sentId] = annotations;

            const sentenceId = parseInt(sentId);
            variables.annotations.forEach((newAnnotation) => {
              if (sentenceId >= newAnnotation.start && sentenceId <= newAnnotation.end) {
                acc[sentId] = [
                  ...acc[sentId],
                  {
                    id: fakeID,
                    sdoc_id: variables.sdocId,
                    user_id: currentUserId,
                    code: newAnnotation.code,
                    sentence_id_start: newAnnotation.start,
                    sentence_id_end: newAnnotation.end,
                    created: new Date().toISOString(),
                    updated: new Date().toISOString(),
                  },
                ];
                fakeID = fakeID - 1;
              }
            });

            return acc;
          },
          {} as Record<string, SentenceAnnotationReadResolved[]>,
        );
        return { sentence_annotations: newSentenceAnnotations };
      });
      // Return a context object with the snapshotted value
      return { previousSentenceAnnotator, affectedQueryKey };
    },
    onError: (_error: Error, _newSentAnnotation, context) => {
      if (!context) return;
      // If the mutation fails, use the context returned from onMutate to roll back
      queryClient.setQueryData(context.affectedQueryKey, context.previousSentenceAnnotator);
    },
    // Always re-fetch after error or success:
    onSettled: (_data, _error, _variables, context) => {
      if (!context) return;
      queryClient.invalidateQueries({ queryKey: context.affectedQueryKey });
    },
  });

export const useUpdateSentenceAnnotation = () =>
  useMutation({
    mutationFn: (variables: {
      sentenceAnnoToUpdate: SentenceAnnotationRead | SentenceAnnotationReadResolved;
      code: CodeRead;
      resolve?: boolean | undefined;
    }) =>
      SentenceAnnotationService.updateById({
        sentenceAnnoId: variables.sentenceAnnoToUpdate.id,
        requestBody: {
          code_id: variables.code.id,
        },
        resolve: variables.resolve,
      }),
    // optimistic update
    onMutate: async (updateData) => {
      // when we update a sentence annotation, we update an annotation of a certain annotation document
      // thus, we only affect the annotation document that contains the annotation we update
      const affectedQueryKey = [
        QueryKey.SDOC_SENTENCE_ANNOTATOR,
        updateData.sentenceAnnoToUpdate.sdoc_id,
        updateData.sentenceAnnoToUpdate.user_id,
      ];

      // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries({ queryKey: affectedQueryKey });

      // Snapshot the previous value
      const previousAnnos = queryClient.getQueryData<SentenceAnnotatorResult>(affectedQueryKey);

      // Optimistically update to the new value
      queryClient.setQueryData<SentenceAnnotatorResult>(affectedQueryKey, (old) => {
        if (old === undefined) {
          return undefined;
        }
        const newSentenceAnnotations = Object.entries(old.sentence_annotations).reduce(
          (acc, [sentId, annotations]) => {
            acc[sentId] = annotations.map((annotation) => {
              if (annotation.id === updateData.sentenceAnnoToUpdate.id) {
                return {
                  ...annotation,
                  code: updateData.code,
                };
              }
              return annotation;
            });
            return acc;
          },
          {} as Record<string, SentenceAnnotationReadResolved[]>,
        );
        return { sentence_annotations: newSentenceAnnotations };
      });

      // Return a context object with the snapshotted value
      return { previousAnnos, affectedQueryKey };
    },
    onError: (_error: Error, _updatedSentenceAnnotation, context) => {
      if (!context) return;
      // If the mutation fails, use the context returned from onMutate to roll back
      queryClient.setQueryData<SentenceAnnotatorResult>(context.affectedQueryKey, context.previousAnnos);
    },
    // Always re-fetch after error or success:
    onSettled: (updatedSentenceAnnotation, _error, _variables, context) => {
      if (!context) return;
      if (updatedSentenceAnnotation) {
        queryClient.invalidateQueries({ queryKey: [QueryKey.SENTENCE_ANNOTATION, updatedSentenceAnnotation.id] });
      }
      queryClient.invalidateQueries({ queryKey: context.affectedQueryKey });
    },
  });

export const useDeleteSentenceAnnotation = () =>
  useMutation({
    mutationFn: (variables: { sentenceAnnotationToDelete: SentenceAnnotationRead | SentenceAnnotationReadResolved }) =>
      SentenceAnnotationService.deleteById({ sentenceAnnoId: variables.sentenceAnnotationToDelete.id }),
    // optimistic updates
    onMutate: async ({ sentenceAnnotationToDelete }) => {
      // when we delete a sentence annotation, we remove an annotation from a certain annotation document
      // thus, we only affect the annotation document that we are removing from
      const affectedQueryKey = [
        QueryKey.SDOC_SENTENCE_ANNOTATOR,
        sentenceAnnotationToDelete.sdoc_id,
        sentenceAnnotationToDelete.user_id,
      ];

      // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries({ queryKey: affectedQueryKey });

      // Snapshot the previous value
      const previousSentenceAnnotator = queryClient.getQueryData<SentenceAnnotatorResult>(affectedQueryKey);

      // Optimistically update to the new value
      queryClient.setQueryData<SentenceAnnotatorResult>(affectedQueryKey, (old) => {
        if (old === undefined) {
          return undefined;
        }

        const newSentenceAnnotations = Object.entries(old.sentence_annotations).reduce(
          (acc, [sentId, annotations]) => {
            acc[sentId] = annotations.filter((annotation) => annotation.id !== sentenceAnnotationToDelete.id);
            return acc;
          },
          {} as Record<string, SentenceAnnotationReadResolved[]>,
        );

        return { sentence_annotations: newSentenceAnnotations };
      });

      // Return a context object with the snapshotted value
      return { previousSentenceAnnotator, affectedQueryKey };
    },
    onError: (_error: Error, _sentenceAnnotationToDelete, context) => {
      if (!context) return;
      // If the mutation fails, use the context returned from onMutate to roll back
      queryClient.setQueryData<SentenceAnnotatorResult>(context.affectedQueryKey, context.previousSentenceAnnotator);
    },
    // Always re-fetch after error or success:
    onSettled: (_data, _error, _variables, context) => {
      if (!context) return;
      queryClient.invalidateQueries({ queryKey: context.affectedQueryKey });
    },
  });

export const useDeleteBulkSentenceAnnotation = (currentUserId: number) =>
  useMutation({
    mutationFn: (variables: {
      sdocId: number;
      sentenceAnnotationToDelete:
        | Omit<SentenceAnnotationRead, "sdocId">[]
        | Omit<SentenceAnnotationReadResolved, "sdocId">[];
    }) =>
      SentenceAnnotationService.deleteBulkById({
        requestBody: variables.sentenceAnnotationToDelete.map((anno) => anno.id),
      }),
    // optimistic updates
    onMutate: async (variables) => {
      // when we delete a sentence annotation, we remove an annotation from a certain annotation document
      // thus, we only affect the annotation document that we are removing from
      const affectedQueryKey = [QueryKey.SDOC_SENTENCE_ANNOTATOR, variables.sdocId, currentUserId];

      // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries({ queryKey: affectedQueryKey });

      // Snapshot the previous value
      const previousSentenceAnnotator = queryClient.getQueryData<SentenceAnnotatorResult>(affectedQueryKey);

      const idsToDelete = variables.sentenceAnnotationToDelete.map((anno) => anno.id);

      // Optimistically update to the new value
      queryClient.setQueryData<SentenceAnnotatorResult>(affectedQueryKey, (old) => {
        if (old === undefined) {
          return undefined;
        }

        const newSentenceAnnotations = Object.entries(old.sentence_annotations).reduce(
          (acc, [sentId, annotations]) => {
            // filter out the annotations that are to be deleted
            acc[sentId] = annotations.filter((annotation) => !idsToDelete.includes(annotation.id));
            return acc;
          },
          {} as Record<string, SentenceAnnotationReadResolved[]>,
        );

        return { sentence_annotations: newSentenceAnnotations };
      });

      // Return a context object with the snapshotted value
      return { previousSentenceAnnotator, affectedQueryKey };
    },
    onError: (_error: Error, _sentenceAnnotationToDelete, context) => {
      if (!context) return;
      // If the mutation fails, use the context returned from onMutate to roll back
      queryClient.setQueryData<SentenceAnnotatorResult>(context.affectedQueryKey, context.previousSentenceAnnotator);
    },
    // Always re-fetch after error or success:
    onSettled: (_data, _error, _variables, context) => {
      if (!context) return;
      queryClient.invalidateQueries({ queryKey: context.affectedQueryKey });
    },
  });
