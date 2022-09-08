import {
  AnnotationDocumentRead,
  BBoxAnnotationReadResolvedCode,
  SourceDocumentRead,
  SpanAnnotationReadResolved,
} from "../../../api/openapi";
import React, { MouseEvent, useRef } from "react";
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
import { spanAnnoKeyFactory } from "../../../api/AdocHooks";

interface AnnotatorRemasteredProps {
  sdoc: SourceDocumentRead;
  adoc: AnnotationDocumentRead;
}

function TextAnnotator({ sdoc, adoc }: AnnotatorRemasteredProps) {
  // local state
  const codeSelectorRef = useRef<CodeSelectorHandle>(null);

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
      // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries(spanAnnoKeyFactory.visible(visibleAdocIds));

      // Snapshot the previous value
      const previousSpanAnnotations = queryClient.getQueryData(spanAnnoKeyFactory.visible(visibleAdocIds));

      // Optimistically update to the new value
      queryClient.setQueryData(
        spanAnnoKeyFactory.visible(visibleAdocIds),
        (old: SpanAnnotationReadResolved[] | undefined) => {
          const bbox = {
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
          return old === undefined ? [bbox] : [...old, bbox];
        }
      );

      // Return a context object with the snapshotted value
      return { previousSpanAnnotations, myCustomQueryKey: spanAnnoKeyFactory.visible(visibleAdocIds) };
    },
    onError: (error: Error, newBbox, context: any) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      queryClient.setQueryData(context.myCustomQueryKey, context.previousSpanAnnotations);
    },
    // Always re-fetch after error or success:
    onSettled: (data, error, variables, context: any) => {
      queryClient.invalidateQueries(context.myCustomQueryKey);
    },
  });
  const updateMutation = SpanAnnotationHooks.useUpdateSpan({
    onSuccess: (data) => {
      SnackbarAPI.openSnackbar({
        text: `Updated Span Annotation ${data.id}`,
        severity: "success",
      });
    },
    // optimistic update
    // todo: this is not working yet, because optimistic update only updates the span annotation, not the list of span annotations
    onMutate: async (newSpanAnnotation) => {
      // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries([QueryKey.SPAN_ANNOTATION, newSpanAnnotation.spanId]);

      // Snapshot the previous value
      const previousAnnos = queryClient.getQueryData([QueryKey.SPAN_ANNOTATION, newSpanAnnotation.spanId]);

      // Optimistically update to the new value
      queryClient.setQueryData(
        [QueryKey.SPAN_ANNOTATION, newSpanAnnotation.spanId],
        (old: SpanAnnotationReadResolved | undefined) => {
          if (old === undefined) {
            return undefined;
          }
          return {
            ...old,
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
          };
        }
      );

      // Return a context object with the snapshotted value
      return { previousAnnos };
    },
    onError: (error: Error, newSpanAnnotation, context: any) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      queryClient.setQueryData([QueryKey.SPAN_ANNOTATION, newSpanAnnotation.spanId], context.previousAnnos);
    },
    // Always re-fetch after error or success:
    onSettled: (newSpanAnnotation) => {
      if (newSpanAnnotation) {
        queryClient.invalidateQueries([QueryKey.SPAN_ANNOTATION, newSpanAnnotation.id]);
      }
      queryClient.invalidateQueries(spanAnnoKeyFactory.visible(visibleAdocIds)); // todo: this should not be necessary, as the list does actually not change on update. Change the rendering.
    },
  });
  const deleteMutation = SpanAnnotationHooks.useDeleteSpan({
    onSuccess: (data) => {
      queryClient.invalidateQueries(spanAnnoKeyFactory.visible(visibleAdocIds)); //todo: not all, but update all queries that contain the affected adoc! (check docs if this is possible)
      SnackbarAPI.openSnackbar({
        text: `Deleted Span Annotation ${data.id}`,
        severity: "success",
      });
    },
    // optimistic updates
    onMutate: async ({ spanId }) => {
      // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries(spanAnnoKeyFactory.visible(visibleAdocIds));

      // Snapshot the previous value
      const previousSpanAnnotations = queryClient.getQueryData(spanAnnoKeyFactory.visible(visibleAdocIds));

      // Optimistically update to the new value
      queryClient.setQueryData(
        spanAnnoKeyFactory.visible(visibleAdocIds),
        (old: SpanAnnotationReadResolved[] | undefined) => {
          if (old === undefined) {
            return undefined;
          }

          return old.filter((spanAnnotation) => spanAnnotation.id !== spanId);
        }
      );

      // Return a context object with the snapshotted value
      return { previousSpanAnnotations, myCustomQueryKey: spanAnnoKeyFactory.visible(visibleAdocIds) };
    },
    onError: (error: Error, newBbox, context: any) => {
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

  const handleMouseUp = (event: MouseEvent) => {
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

    // create annotation
    const begin = parseInt(selectionStart);
    const end = parseInt(selectionEnd);

    // swap begin and end if necessary (left to right, right to left annotation)
    const begin_token = end < begin ? end : begin;
    const end_token = end < begin ? begin : end;

    const span_text = tokenData
      .slice(begin_token, end_token + 1)
      .map((t) => t.text)
      .join(" ");

    const requestBody = {
      current_code_id: selectedCodeId,
      annotation_document_id: adoc.id,
      begin: tokenData[begin_token].beginChar,
      end: tokenData[end_token].endChar,
      begin_token: begin_token,
      end_token: end_token + 1,
      span_text: span_text,
    };
    createMutation.mutate({ requestBody });

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

  return (
    <>
      <CodeContextMenu
        ref={codeSelectorRef}
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
