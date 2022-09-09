import {
  AnnotationDocumentRead,
  BBoxAnnotationReadResolvedCode,
  SourceDocumentRead,
  SpanAnnotationCreate,
  SpanAnnotationReadResolved,
} from "../../../api/openapi";
import React, { MouseEvent, useRef, useState } from "react";
import { useAppSelector } from "../../../plugins/ReduxHooks";
import { useQueryClient } from "@tanstack/react-query";
import { selectionIsEmpty } from "./utils";
import CodeContextMenu, { CodeSelectorHandle } from "../ContextMenu/CodeContextMenu";
import SnackbarAPI from "../../../features/snackbar/SnackbarAPI";
import { QueryKey } from "../../../api/QueryKey";
import SpanAnnotationHooks from "../../../api/SpanAnnotationHooks";
import { ICode } from "./ICode";
import useComputeTokenData from "./useComputeTokenData";
import TextAnnotatorRenderer from "./TextAnnotatorRenderer";

interface AnnotatorRemasteredProps {
  sdoc: SourceDocumentRead;
  adoc: AnnotationDocumentRead;
}

function TextAnnotator({ sdoc, adoc }: AnnotatorRemasteredProps) {
  // local state
  const codeSelectorRef = useRef<CodeSelectorHandle>(null);
  const [fakeAnnotation, setFakeAnnotation] = useState<SpanAnnotationCreate | undefined>(undefined);

  // global client state (redux)
  const visibleAdocIds = useAppSelector((state) => state.annotations.visibleAdocIds);
  const selectedCodeId = useAppSelector((state) => state.annotations.selectedCodeId);

  // computed / custom hooks
  const { tokenData, annotationsPerToken, annotationMap } = useComputeTokenData({
    sdocId: sdoc.id,
    annotationDocumentIds: visibleAdocIds,
  });

  // mutations for create, update, delete
  const queryClient = useQueryClient();
  const createMutation = SpanAnnotationHooks.useCreateAnnotation({
    onSuccess: (data) => {
      SnackbarAPI.openSnackbar({
        text: `Created Span Annotation ${data.id}`,
        severity: "success",
      });
    },
    // optimistic updates
    onMutate: async (newSpanAnnotation) => {
      // when we create a new span annotation, we add a new annotation to a certain annotation document
      // thus, we only affect the annotation document that we are adding to
      const affectedQueryKey = [QueryKey.ADOC_SPAN_ANNOTATIONS, newSpanAnnotation.requestBody.annotation_document_id];

      // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries(affectedQueryKey);

      // Snapshot the previous value
      const previousSpanAnnotations = queryClient.getQueryData(affectedQueryKey);

      // Optimistically update to the new value
      queryClient.setQueryData(affectedQueryKey, (old: SpanAnnotationReadResolved[] | undefined) => {
        const fakeAnnotation = old?.find((a) => a.id === -1);
        const fakeAnnotationIndex = old?.findIndex((a) => a.id === -1);
        if (fakeAnnotation && fakeAnnotationIndex && fakeAnnotationIndex !== -1) {
          // we already created a fake annotation, that is correct as is
          if (fakeAnnotation.code.id === newSpanAnnotation.requestBody.current_code_id) {
            return old;
          }
          // we already created a fake annotation, but the code is different
          const result = Array.from(old!);
          result[fakeAnnotationIndex] = {
            ...fakeAnnotation,
            code: {
              ...fakeAnnotation.code,
              id: newSpanAnnotation.requestBody.current_code_id,
            },
          };
          return result;
        }
        // we have not created a fake annotation yet
        const spanAnnotation = {
          ...newSpanAnnotation.requestBody,
          id: -1,
          code: {
            name: "",
            color: "",
            description: "",
            id: newSpanAnnotation.requestBody.current_code_id,
            project_id: 0,
            user_id: 0,
            created: "",
            updated: "",
          },
          created: "",
          updated: "",
        };
        return old === undefined ? [spanAnnotation] : [...old, spanAnnotation];
      });

      // Return a context object with the snapshotted value
      return { previousSpanAnnotations, myCustomQueryKey: affectedQueryKey };
    },
    onError: (error: Error, newSpanAnnotation, context: any) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      queryClient.setQueryData(context.myCustomQueryKey, context.previousSpanAnnotations);
    },
    // Always re-fetch after error or success:
    onSettled: (data, error, variables, context: any) => {
      queryClient.invalidateQueries(context.myCustomQueryKey);
    },
  });
  // todo: rework to only update QueryKey.SPAN_ANNOTATION (we need to change the rendering for this...)
  const updateMutation = SpanAnnotationHooks.useUpdateSpan({
    onSuccess: (data) => {
      SnackbarAPI.openSnackbar({
        text: `Updated Span Annotation ${data.id}`,
        severity: "success",
      });
    },
    // optimistic update
    onMutate: async (updatedSpanAnnotation) => {
      const spanAnnotationToUpdate = annotationMap?.get(updatedSpanAnnotation.spanId);
      if (spanAnnotationToUpdate === undefined) {
        console.error("Could not find span annotation to update");
        return;
      }

      // when we update a span annotation, we update an annotation of a certain annotation document
      // thus, we only affect the annotation document that contains the annotation we update
      const affectedQueryKey = [QueryKey.ADOC_SPAN_ANNOTATIONS, spanAnnotationToUpdate.annotation_document_id];

      // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries(affectedQueryKey);

      // Snapshot the previous value
      const previousAnnos = queryClient.getQueryData(affectedQueryKey);

      // Optimistically update to the new value
      queryClient.setQueryData(affectedQueryKey, (old: SpanAnnotationReadResolved[] | undefined) => {
        if (!old) {
          return undefined;
        }
        const oldSpanAnnotation = old.find((anno) => anno.id === updatedSpanAnnotation.spanId);
        if (!oldSpanAnnotation) {
          console.error("Could not find span annotation to update");
          return old;
        }
        const oldSpanAnnotationIndex = old.indexOf(oldSpanAnnotation);
        const result = Array.from(old);
        result[oldSpanAnnotationIndex] = {
          ...oldSpanAnnotation,
          code: {
            ...oldSpanAnnotation.code,
            id: updatedSpanAnnotation.requestBody.current_code_id,
          },
        };
        return result;
      });

      // Return a context object with the snapshotted value
      return { previousAnnos, myCustomQueryKey: affectedQueryKey };
    },
    onError: (error: Error, updatedSpanAnnotation, context: any) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      queryClient.setQueryData(context.myCustomQueryKey, context.previousAnnos);
    },
    // Always re-fetch after error or success:
    onSettled: (updatedSpanAnnotation, error, variables, context: any) => {
      if (updatedSpanAnnotation) {
        queryClient.invalidateQueries([QueryKey.SPAN_ANNOTATION, updatedSpanAnnotation.id]);
      }
      queryClient.invalidateQueries(context.myCustomQueryKey);
    },
  });
  const deleteMutation = SpanAnnotationHooks.useDeleteSpan({
    onSuccess: (data) => {
      queryClient.invalidateQueries([QueryKey.ADOC_SPAN_ANNOTATIONS, data.annotation_document_id]);
      SnackbarAPI.openSnackbar({
        text: `Deleted Span Annotation ${data.id}`,
        severity: "success",
      });
    },
    // optimistic updates
    onMutate: async ({ spanId }) => {
      const spanAnnotationToDelete = annotationMap?.get(spanId);
      if (spanAnnotationToDelete === undefined) {
        console.error("Could not find span annotation to delete");
        return;
      }

      // when we delete a span annotation, we remove an annotation from a certain annotation document
      // thus, we only affect the annotation document that we are removing from
      const affectedQueryKey = [QueryKey.ADOC_SPAN_ANNOTATIONS, spanAnnotationToDelete.annotation_document_id];

      // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries(affectedQueryKey);

      // Snapshot the previous value
      const previousSpanAnnotations = queryClient.getQueryData(affectedQueryKey);

      // Optimistically update to the new value
      queryClient.setQueryData(affectedQueryKey, (old: SpanAnnotationReadResolved[] | undefined) => {
        if (old === undefined) {
          return undefined;
        }

        return old.filter((spanAnnotation) => spanAnnotation.id !== spanId);
      });

      // Return a context object with the snapshotted value
      return { previousSpanAnnotations, myCustomQueryKey: affectedQueryKey };
    },
    onError: (error: Error, spanAnnotationToDelete, context: any) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      queryClient.setQueryData(context.myCustomQueryKey, context.previousSpanAnnotations);
    },
    // Always re-fetch after error or success:
    onSettled: (data, error, variables, context: any) => {
      queryClient.invalidateQueries(context.myCustomQueryKey);
    },
  });

  // handle ui events
  const handleContextMenu = (event: React.MouseEvent) => {
    if (!annotationsPerToken) return;
    if (!annotationMap) return;

    const target = (event.target as HTMLElement).parentElement;
    if (target && target.classList.contains("tok") && target.childElementCount > 0) {
      event.preventDefault();

      // get all annotations that span this token
      const tokenIndex = parseInt(target.getAttribute("data-tokenid")!);
      const annos = annotationsPerToken.get(tokenIndex);

      // open code selector if there are annotations
      if (annos) {
        // calculate position of the code selector (based on selection end)
        const boundingBox = target.getBoundingClientRect();
        const position = {
          left: boundingBox.left,
          top: boundingBox.top + boundingBox.height,
        };

        // open code selector
        codeSelectorRef.current!.open(
          position,
          annos.map((a) => annotationMap.get(a)!)
        );
      }
    }
  };

  const handleMouseUp = async (event: MouseEvent) => {
    if (event.button === 2) return;
    if (!tokenData) return;

    // make sure that selection is valid
    const selection = window.getSelection();
    if (!selection || selectionIsEmpty(selection)) return;

    // make sure a code is selected (in the Code Explorer)
    if (!selectedCodeId) {
      SnackbarAPI.openSnackbar({
        text: `Please select a Code in the Code Explorer`,
        severity: "error",
      });
      return;
    }

    // get the selected begin and end token
    const selectionStart = selection?.anchorNode?.parentElement?.parentElement?.getAttribute("data-tokenid");
    const selectionEnd = selection?.focusNode?.parentElement?.parentElement?.getAttribute("data-tokenid");
    if (!selectionStart || !selectionEnd) return;

    const begin = parseInt(selectionStart);
    const end = parseInt(selectionEnd);

    // swap begin and end if necessary (left to right, right to left annotation)
    const begin_token = end < begin ? end : begin;
    const end_token = end < begin ? begin : end;

    const span_text = tokenData
      .slice(begin_token, end_token + 1)
      .map((t) => t.text)
      .join(" ");

    const requestBody: SpanAnnotationCreate = {
      current_code_id: selectedCodeId,
      annotation_document_id: adoc.id,
      begin: tokenData[begin_token].beginChar,
      end: tokenData[end_token].endChar,
      begin_token: begin_token,
      end_token: end_token + 1,
      span_text: span_text,
    };

    // create a fake annotation
    setFakeAnnotation(requestBody);

    // when we create a new span annotation, we add a new annotation to a certain annotation document
    // thus, we only affect the annotation document that we are adding to
    const affectedQueryKey = [QueryKey.ADOC_SPAN_ANNOTATIONS, requestBody.annotation_document_id];

    // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
    await queryClient.cancelQueries(affectedQueryKey);

    // Add a fake annotation
    queryClient.setQueryData(affectedQueryKey, (old: SpanAnnotationReadResolved[] | undefined) => {
      const spanAnnotation = {
        ...requestBody,
        id: -1,
        code: {
          name: "",
          color: "",
          description: "",
          id: requestBody.current_code_id,
          project_id: 0,
          user_id: 0,
          created: "",
          updated: "",
        },
        created: "",
        updated: "",
      };
      return old === undefined ? [spanAnnotation] : [...old, spanAnnotation];
    });

    // open code selector
    const target = (event.target as HTMLElement).parentElement;
    if (target) {
      // calculate position of the code selector (based on selection end)
      const boundingBox = target.getBoundingClientRect();
      const position = {
        left: boundingBox.left,
        top: boundingBox.top + boundingBox.height,
      };

      // open code selector
      codeSelectorRef.current!.open(position);
    }

    // clear selection
    selection.empty();
  };

  // handle code selector events
  const handleCodeSelectorDeleteAnnotation = (
    annotation: SpanAnnotationReadResolved | BBoxAnnotationReadResolvedCode
  ) => {
    deleteMutation.mutate({ spanId: annotation.id });
  };
  const handleCodeSelectorEditCode = (
    annotation: SpanAnnotationReadResolved | BBoxAnnotationReadResolvedCode,
    code: ICode
  ) => {
    updateMutation.mutate({
      spanId: annotation.id,
      requestBody: {
        current_code_id: code.id,
      },
    });
  };
  const handleCodeSelectorAddCode = (code: ICode) => {
    if (!fakeAnnotation) return;

    createMutation.mutate({
      requestBody: {
        ...fakeAnnotation,
        current_code_id: code.id,
      },
    });
  };
  const handleCodeSelectorClose = (reason?: "backdropClick" | "escapeKeyDown") => {
    // i am about to create an annotation
    if (fakeAnnotation) {
      // i clicked away because i like the annotation as is
      if (reason === "backdropClick") {
        // add the annotation as is
        createMutation.mutate({ requestBody: fakeAnnotation });
      }
      // i clicked escape because i want to cancel the annotation
      if (reason === "escapeKeyDown") {
        // delete the fake annotation (that always has id -1)
        queryClient.setQueryData(
          [QueryKey.ADOC_SPAN_ANNOTATIONS, fakeAnnotation.annotation_document_id],
          (old: SpanAnnotationReadResolved[] | undefined) => {
            if (old === undefined) {
              return undefined;
            }
            return old.filter((spanAnnotation) => spanAnnotation.id !== -1);
          }
        );
      }
    }
    setFakeAnnotation(undefined);
  };

  return (
    <>
      <CodeContextMenu
        ref={codeSelectorRef}
        onAdd={handleCodeSelectorAddCode}
        onClose={handleCodeSelectorClose}
        onEdit={handleCodeSelectorEditCode}
        onDelete={handleCodeSelectorDeleteAnnotation}
      />
      <TextAnnotatorRenderer
        className="myFlexFillAllContainer"
        style={{ lineHeight: "26px" }}
        onContextMenu={handleContextMenu}
        onMouseUp={handleMouseUp}
        sdocId={sdoc.id}
        tokenData={tokenData}
        annotationsPerToken={annotationsPerToken}
        annotationMap={annotationMap}
      />
    </>
  );
}

export default TextAnnotator;
