import { useQueryClient } from "@tanstack/react-query";
import React, { MouseEvent, useRef, useState } from "react";
import { QueryKey } from "../../../api/QueryKey.ts";
import SpanAnnotationHooks, { FAKE_ANNOTATION_ID } from "../../../api/SpanAnnotationHooks.ts";

import { AnnotationDocumentRead } from "../../../api/openapi/models/AnnotationDocumentRead.ts";
import { BBoxAnnotationReadResolvedCode } from "../../../api/openapi/models/BBoxAnnotationReadResolvedCode.ts";
import { CodeRead } from "../../../api/openapi/models/CodeRead.ts";
import { SourceDocumentWithDataRead } from "../../../api/openapi/models/SourceDocumentWithDataRead.ts";
import { SpanAnnotationCreateWithCodeId } from "../../../api/openapi/models/SpanAnnotationCreateWithCodeId.ts";
import { SpanAnnotationReadResolved } from "../../../api/openapi/models/SpanAnnotationReadResolved.ts";
import ConfirmationAPI from "../../../features/ConfirmationDialog/ConfirmationAPI.ts";
import { useOpenSnackbar } from "../../../features/SnackbarDialog/useOpenSnackbar.ts";
import { useAppDispatch, useAppSelector } from "../../../plugins/ReduxHooks.ts";
import AnnotationMenu, { CodeSelectorHandle } from "../AnnotationMenu.tsx";
import DocumentRenderer from "../DocumentRenderer/DocumentRenderer.tsx";
import useComputeTokenData from "../DocumentRenderer/useComputeTokenData.ts";
import { ICode } from "../ICode.ts";
import { AnnoActions } from "../annoSlice.ts";

const selectionIsEmpty = (selection: Selection): boolean => {
  return selection.toString().trim().length === 0;
};

interface AnnotatorRemasteredProps {
  sdoc: SourceDocumentWithDataRead;
  adoc: AnnotationDocumentRead;
}

function TextAnnotator({ sdoc, adoc }: AnnotatorRemasteredProps) {
  // local state
  const spanMenuRef = useRef<CodeSelectorHandle>(null);
  const [fakeAnnotation, setFakeAnnotation] = useState<SpanAnnotationCreateWithCodeId | undefined>(undefined);

  // global client state (redux)
  const visibleAdocIds = useAppSelector((state) => state.annotations.visibleAdocIds);
  const codes = useAppSelector((state) => state.annotations.codesForSelection);
  const dispatch = useAppDispatch();

  // snackbar
  const openSnackbar = useOpenSnackbar();

  // computed / custom hooks
  const { tokenData, annotationsPerToken, annotationMap } = useComputeTokenData({
    sdocId: sdoc.id,
    annotationDocumentIds: visibleAdocIds,
  });

  // mutations for create, update, delete
  const queryClient = useQueryClient();
  const createMutation = SpanAnnotationHooks.useCreateAnnotation();
  const updateMutation = SpanAnnotationHooks.useOptimisticUpdateSpan();
  const deleteMutation = SpanAnnotationHooks.useDeleteSpan();

  // handle ui events
  const handleMenu = (event: React.MouseEvent) => {
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
      spanMenuRef.current!.open(
        position,
        annos.map((a) => annotationMap.get(a)!),
      );
    }
  };

  const handleMouseUp = async (event: MouseEvent) => {
    if (event.button === 2) return;
    if (!tokenData) return;

    const selection = window.getSelection();
    // the selection is empty
    if (!selection || selectionIsEmpty(selection)) {
      handleMenu(event);
      return;
    }
    // the selection is valid

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
    await queryClient.cancelQueries({ queryKey: affectedQueryKey });

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
        sdoc_id: 0,
        user_id: 0,
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
      spanMenuRef.current!.open(position);
    }

    // clear selection
    selection.empty();
  };

  // handle code selector events
  const handleCodeSelectorDeleteAnnotation = (
    annotation: SpanAnnotationReadResolved | BBoxAnnotationReadResolvedCode,
  ) => {
    ConfirmationAPI.openConfirmationDialog({
      text: `Do you really want to remove the SpanAnnotation ${annotation.id}? You can reassign it later!`,
      onAccept: () => {
        deleteMutation.mutate(
          { spanAnnotationToDelete: annotation as SpanAnnotationReadResolved },
          {
            onSuccess: (spanAnnotation) => {
              openSnackbar({
                text: `Deleted Span Annotation ${spanAnnotation.id}`,
                severity: "success",
              });
            },
          },
        );
      },
    });
  };
  const handleCodeSelectorEditCode = (
    annotation: SpanAnnotationReadResolved | BBoxAnnotationReadResolvedCode,
    code: ICode,
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
          openSnackbar({
            text: `Updated Span Annotation ${spanAnnotation.id}`,
            severity: "success",
          });
        },
      },
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
          openSnackbar({
            text: `Created Span Annotation ${spanAnnotation.id}`,
            severity: "success",
          });
        },
      },
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
              openSnackbar({
                text: `Created Span Annotation ${spanAnnotation.id}`,
                severity: "success",
              });
            },
          },
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
          },
        );
      }
    }
    setFakeAnnotation(undefined);
  };

  return (
    <>
      <AnnotationMenu
        ref={spanMenuRef}
        onAdd={handleCodeSelectorAddCode}
        onClose={handleCodeSelectorClose}
        onEdit={handleCodeSelectorEditCode}
        onDelete={handleCodeSelectorDeleteAnnotation}
      />
      <DocumentRenderer
        className="myFlexFillAllContainer"
        onMouseUp={handleMouseUp}
        html={sdoc.html}
        tokenData={tokenData}
        annotationsPerToken={annotationsPerToken}
        annotationMap={annotationMap}
        isViewer={false}
        projectId={sdoc.project_id}
        style={{ zIndex: 1, overflowY: "auto" }}
      />
    </>
  );
}

export default TextAnnotator;
