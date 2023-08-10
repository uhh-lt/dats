import {
  AnnotationDocumentRead,
  BBoxAnnotationReadResolvedCode,
  CodeRead,
  SourceDocumentRead,
  SpanAnnotationCreateWithCodeId,
  SpanAnnotationReadResolved,
} from "../../../api/openapi";
import React, { MouseEvent, useRef, useState } from "react";
import { useAppDispatch, useAppSelector } from "../../../plugins/ReduxHooks";
import { useQueryClient } from "@tanstack/react-query";
import { selectionIsEmpty } from "./utils";
import SpanContextMenu, { CodeSelectorHandle } from "../SpanContextMenu/SpanContextMenu";
import SnackbarAPI from "../../../features/Snackbar/SnackbarAPI";
import { QueryKey } from "../../../api/QueryKey";
import SpanAnnotationHooks, { FAKE_ANNOTATION_ID } from "../../../api/SpanAnnotationHooks";
import { ICode } from "./ICode";
import useComputeTokenData from "../../../features/DocumentRenderer/useComputeTokenData";
import { AnnoActions } from "../annoSlice";
import TextAnnotatorRendererNew from "../../../features/DocumentRenderer/DocumentRenderer";

interface AnnotatorRemasteredProps {
  sdoc: SourceDocumentRead;
  adoc: AnnotationDocumentRead;
}

function TextAnnotator({ sdoc, adoc }: AnnotatorRemasteredProps) {
  // local state
  const spanContextMenuRef = useRef<CodeSelectorHandle>(null);
  const [fakeAnnotation, setFakeAnnotation] = useState<SpanAnnotationCreateWithCodeId | undefined>(undefined);

  // global client state (redux)
  const visibleAdocIds = useAppSelector((state) => state.annotations.visibleAdocIds);
  const codes = useAppSelector((state) => state.annotations.codesForSelection);
  const dispatch = useAppDispatch();

  // computed / custom hooks
  const { tokenData, annotationsPerToken, annotationMap } = useComputeTokenData({
    sdocId: sdoc.id,
    annotationDocumentIds: visibleAdocIds,
  });

  // mutations for create, update, delete
  const queryClient = useQueryClient();
  const createMutation = SpanAnnotationHooks.useCreateAnnotation();
  const updateMutation = SpanAnnotationHooks.useUpdateSpan();
  const deleteMutation = SpanAnnotationHooks.useDeleteSpan();

  // handle ui events
  const handleContextMenu = (event: React.MouseEvent) => {
    if (!annotationsPerToken) return;
    if (!annotationMap) return;

    // try to find a parent element that has the tok class, we go up 3 levels at maximum
    let target: HTMLElement = event.target as HTMLElement;
    let found = false;
    for (let i = 0; i < 3; i++) {
      if (target && target.classList.contains("tok") && target.childElementCount > 0) {
        found = true;
        break;
      }
      if (target.parentElement) {
        target = target.parentElement;
      } else {
        break;
      }
    }
    if (!found) return;

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
      spanContextMenuRef.current!.open(
        position,
        annos.map((a) => annotationMap.get(a)!)
      );
    }
  };

  const handleMouseUp = async (event: MouseEvent) => {
    if (event.button === 2) return;
    if (!tokenData) return;

    // make sure that selection is valid
    const selection = window.getSelection();
    if (!selection || selectionIsEmpty(selection)) return;

    // get the selected begin and end token
    let selectionStartElement = selection?.anchorNode?.parentElement;
    let selectionEndElement = selection?.focusNode?.parentElement;

    while (selectionStartElement && selectionStartElement?.getAttribute("data-tokenid") === null) {
      selectionStartElement = selectionStartElement?.parentElement;
    }

    while (selectionEndElement && selectionEndElement?.getAttribute("data-tokenid") === null) {
      selectionEndElement = selectionEndElement?.parentElement;
    }

    const selectionStart = selectionStartElement?.getAttribute("data-tokenid");
    const selectionEnd = selectionEndElement?.getAttribute("data-tokenid");
    if (!selectionStart || !selectionEnd) return;

    const begin = parseInt(selectionStart);
    const end = parseInt(selectionEnd);

    // swap begin and end if necessary (left to right, right to left annotation)
    selectionStartElement = end < begin ? selectionEndElement : selectionStartElement;
    const begin_token = end < begin ? end : begin;
    const end_token = end < begin ? begin : end;

    const span_text = tokenData
      .slice(begin_token, end_token + 1)
      .map((t) => t.text)
      .join(" ");

    const requestBody: SpanAnnotationCreateWithCodeId = {
      code_id: codes[0].id,
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
        id: FAKE_ANNOTATION_ID,
        code: {
          name: "",
          color: "",
          description: "",
          id: requestBody.code_id,
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
    const target = selectionStartElement;
    if (target) {
      // calculate position of the code selector (based on selection end)
      const boundingBox = target.getBoundingClientRect();
      const position = {
        left: boundingBox.left,
        top: boundingBox.top + boundingBox.height,
      };

      // open code selector
      spanContextMenuRef.current!.open(position);
    }

    // clear selection
    selection.empty();
  };

  // handle code selector events
  const handleCodeSelectorDeleteAnnotation = (
    annotation: SpanAnnotationReadResolved | BBoxAnnotationReadResolvedCode
  ) => {
    deleteMutation.mutate(
      { spanAnnotationToDelete: annotation as SpanAnnotationReadResolved },
      {
        onSuccess: (spanAnnotation) => {
          SnackbarAPI.openSnackbar({
            text: `Deleted Span Annotation ${spanAnnotation.id}`,
            severity: "success",
          });
        },
      }
    );
  };
  const handleCodeSelectorEditCode = (
    annotation: SpanAnnotationReadResolved | BBoxAnnotationReadResolvedCode,
    code: ICode
  ) => {
    updateMutation.mutate(
      {
        spanAnnotationToUpdate: annotation as SpanAnnotationReadResolved,
        requestBody: {
          code_id: code.id,
        },
      },
      {
        onSuccess: (spanAnnotation) => {
          SnackbarAPI.openSnackbar({
            text: `Updated Span Annotation ${spanAnnotation.id}`,
            severity: "success",
          });
        },
      }
    );
  };
  const handleCodeSelectorAddCode = (code: CodeRead, isNewCode: boolean) => {
    if (!fakeAnnotation) return;
    createMutation.mutate(
      {
        requestBody: {
          ...fakeAnnotation,
          code_id: code.id,
        },
      },
      {
        onSuccess: (spanAnnotation) => {
          if (!isNewCode) {
            // if we use an existing code to annotate, we move it to the top
            dispatch(AnnoActions.moveCodeToTop(code));
          }
          SnackbarAPI.openSnackbar({
            text: `Created Span Annotation ${spanAnnotation.id}`,
            severity: "success",
          });
        },
      }
    );
  };
  const handleCodeSelectorClose = (reason?: "backdropClick" | "escapeKeyDown") => {
    // i am about to create an annotation
    if (fakeAnnotation) {
      // i clicked away because i like the annotation as is
      if (reason === "backdropClick") {
        // add the annotation as is
        createMutation.mutate(
          { requestBody: fakeAnnotation },
          {
            onSuccess: (spanAnnotation) => {
              SnackbarAPI.openSnackbar({
                text: `Created Span Annotation ${spanAnnotation.id}`,
                severity: "success",
              });
            },
          }
        );
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
      <SpanContextMenu
        ref={spanContextMenuRef}
        onAdd={handleCodeSelectorAddCode}
        onClose={handleCodeSelectorClose}
        onEdit={handleCodeSelectorEditCode}
        onDelete={handleCodeSelectorDeleteAnnotation}
      />
      <TextAnnotatorRendererNew
        className="myFlexFillAllContainer"
        onContextMenu={handleContextMenu}
        onMouseUp={handleMouseUp}
        html={sdoc.content}
        tokenData={tokenData}
        annotationsPerToken={annotationsPerToken}
        annotationMap={annotationMap}
        isViewer={false}
        projectId={sdoc.project_id}
        sentences={undefined}
        doHighlighting={false}
        style={{ zIndex: 1, overflowY: "auto" }}
      />
    </>
  );
}

export default TextAnnotator;
