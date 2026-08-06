import { SpanAnnotationHooks } from "@api/hooks/SpanAnnotationHooks";
import { useAuth } from "@core/auth";
import { useOpenConfirmationDialog, useOpenSnackbar } from "@core/notification";
import { SourceDocumentDataRead } from "@models/SourceDocumentDataRead";
import { SpanAnnotationCreate } from "@models/SpanAnnotationCreate";
import { SpanAnnotationRead } from "@models/SpanAnnotationRead";
import { useAppDispatch, useAppSelector } from "@store/storeHooks";
import { MouseEvent, MouseEventHandler, useMemo, useRef, useState } from "react";
import { AnnotationRouteAPI } from "../_hooks/annotationRouteAPI";
import { toPendingSpanAnnotation } from "../_hooks/pendingSpanAnnotation";
import { useComputeTokenData, useTokenData } from "../_hooks/useComputeTokenData";
import { useSpanAnnotationResize } from "../_hooks/useSpanAnnotationResize";
import { Annotation } from "../_types/Annotation";
import { TagStyle } from "../_types/TagStyle";
import { AnnoActions } from "../store/annoSlice";
import { AnnotationMenu, AnnotationMenuHandle } from "./annotation-menu/AnnotationMenu";
import { DocumentRenderer } from "./DocumentRenderer";

const selectionIsEmpty = (selection: Selection): boolean => {
  return selection.toString().trim().length === 0;
};

interface TextAnnotatorProps {
  sdocData: SourceDocumentDataRead;
}

export function TextAnnotator({ sdocData }: TextAnnotatorProps) {
  const { user } = useAuth();

  // local state
  const spanMenuRef = useRef<AnnotationMenuHandle>(null);
  // the draft annotation whose code-selector menu is currently open (not yet sent to the server).
  // Rendered as a preview via its negative pending id.
  const [draftAnnotation, setDraftAnnotation] = useState<SpanAnnotationRead | undefined>(undefined);
  // annotations already sent to the server but not yet persisted; kept visible until the real
  // annotation lands in the cache so the highlight never flickers. Keyed by unique negative ids.
  const [pendingAnnotations, setPendingAnnotations] = useState<SpanAnnotationRead[]>([]);

  // global client state (URL search params)
  const { visibleUserId } = AnnotationRouteAPI.useSearch();

  // global client state (redux)
  const mostRecentCodeId = useAppSelector((state) => state.annotations.mostRecentCodeId);
  const selectedCodeId = useAppSelector((state) => state.annotations.selectedCodeId);
  const tagStyle = useAppSelector((state) => state.annotations.tagStyle);
  const dispatch = useAppDispatch();

  // snackbar
  const openSnackbar = useOpenSnackbar();

  // the draft (menu open) is rendered as a preview alongside the in-flight pending annotations
  const allPendingAnnotations = useMemo<SpanAnnotationRead[]>(
    () => (draftAnnotation ? [...pendingAnnotations, draftAnnotation] : pendingAnnotations),
    [pendingAnnotations, draftAnnotation],
  );

  // computed / custom hooks
  const resizeTokenData = useTokenData(sdocData);
  const resizeController = useSpanAnnotationResize(resizeTokenData);
  const { tokenData, annotationsPerToken, annotationMap } = useComputeTokenData({
    sdocData,
    userId: visibleUserId,
    annotationOverride: resizeController.previewAnnotation,
    pendingAnnotations: allPendingAnnotations,
  });

  // mutations for create, update, delete
  const createMutation = SpanAnnotationHooks.useCreateSpanAnnotation();
  const updateMutation = SpanAnnotationHooks.useUpdateSpanAnnotation();
  const deleteMutation = SpanAnnotationHooks.useDeleteSpanAnnotation();

  // handle ui events
  const handleMenu: MouseEventHandler = (event) => {
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

  const handleMouseUp = (event: MouseEvent) => {
    if (resizeController.shouldIgnoreMouseUp()) return;
    if (event.button === 2) return;
    if (!tokenData) return;

    const selection = window.getSelection();
    // the selection is empty
    if (!selection || selectionIsEmpty(selection)) {
      handleMenu(event);
      return;
    }
    // the selection is valid

    // only allow annotation creation if the current user is the same as the visibleUserId (from URL search params).
    // warn and clear the selection when viewing another user's document.
    if (user?.id !== visibleUserId) {
      openSnackbar({
        severity: "warning",
        text: "You cannot create annotations on another user's document. Switch to your user in the Annotator Selector (top) to create annotations.",
      });
      selection.empty();
      return;
    }

    if (!mostRecentCodeId && !selectedCodeId) {
      openSnackbar({
        severity: "warning",
        text: "Select a code in the Code Explorer (left) first!",
      });
      selection.empty();
      return;
    }

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

    const requestBody: SpanAnnotationCreate = {
      code_id: mostRecentCodeId || selectedCodeId || -1,
      sdoc_id: sdocData.id,
      begin: tokenData[begin_token].beginChar,
      end: tokenData[end_token].endChar,
      begin_token: begin_token,
      end_token: end_token + 1,
      span_text: span_text,
    };

    // store the draft annotation in local state; it is rendered via the pendingAnnotations override
    setDraftAnnotation(toPendingSpanAnnotation(requestBody, user?.id));

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
  const openConfirmationDialog = useOpenConfirmationDialog();
  const handleCodeSelectorDeleteAnnotation = (annotation: Annotation) => {
    openConfirmationDialog({
      text: `Do you really want to remove the SpanAnnotation ${annotation.id}? You can reassign it later!`,
      type: "DELETE",
      onAccept: () => {
        deleteMutation.mutate({ spanAnnotationToDelete: annotation as SpanAnnotationRead });
      },
    });
  };
  const handleCodeSelectorEditCode = (annotation: Annotation, codeId: number) => {
    updateMutation.mutate({
      spanAnnotationToUpdate: annotation as SpanAnnotationRead,
      requestBody: {
        code_id: codeId,
      },
    });
  };
  // send a create request and keep the annotation visible (pending) until the real one is cached.
  // `pending` is the local preview annotation; only its create-payload fields are sent to the server.
  const startCreate = (pending: SpanAnnotationRead, codeId: number, onSuccess?: () => void) => {
    const requestBody: SpanAnnotationCreate = {
      code_id: codeId,
      sdoc_id: pending.sdoc_id,
      begin: pending.begin,
      end: pending.end,
      begin_token: pending.begin_token,
      end_token: pending.end_token,
      span_text: pending.text,
    };
    setPendingAnnotations((prev) => [...prev, { ...pending, code_id: codeId }]);
    createMutation.mutate(requestBody, {
      onSuccess,
      // remove the pending preview once the real annotation is in the cache (or the request failed)
      onSettled: () => setPendingAnnotations((prev) => prev.filter((a) => a.id !== pending.id)),
    });
  };

  const handleCodeSelectorAddCode = (codeId: number, isNewCode: boolean) => {
    if (!draftAnnotation) return;
    startCreate(draftAnnotation, codeId, () => {
      if (!isNewCode) {
        // if we use an existing code to annotate, we move it to the top
        dispatch(AnnoActions.moveCodeToTop(codeId));
      }
    });
  };
  const handleCodeSelectorDuplicateAnnotation = (annotation: Annotation, codeId: number) => {
    if ("id" in annotation && "begin_token" in annotation && "end_token" in annotation) {
      const requestBody: SpanAnnotationCreate = {
        begin: annotation.begin,
        end: annotation.end,
        begin_token: annotation.begin_token,
        end_token: annotation.end_token,
        span_text: annotation.text,
        sdoc_id: annotation.sdoc_id,
        code_id: codeId,
      };
      const pending = toPendingSpanAnnotation(requestBody, user?.id);
      startCreate(pending, codeId, () => dispatch(AnnoActions.moveCodeToTop(codeId)));
    }
  };
  const handleCodeSelectorClose = (reason?: "backdropClick" | "escapeKeyDown") => {
    // i am about to create an annotation
    if (draftAnnotation) {
      // i clicked away because i like the annotation as is
      if (reason === "backdropClick") {
        // add the annotation as is
        startCreate(draftAnnotation, draftAnnotation.code_id, () =>
          dispatch(AnnoActions.moveCodeToTop(draftAnnotation.code_id)),
        );
      }
    }
    setDraftAnnotation(undefined);
  };

  return (
    <>
      <AnnotationMenu
        ref={spanMenuRef}
        onAdd={handleCodeSelectorAddCode}
        onClose={handleCodeSelectorClose}
        onEdit={handleCodeSelectorEditCode}
        onDelete={handleCodeSelectorDeleteAnnotation}
        onDuplicate={handleCodeSelectorDuplicateAnnotation}
      />
      <DocumentRenderer
        className="myFlexFillAllContainer"
        onMouseUp={handleMouseUp}
        html={sdocData.html}
        tokenData={tokenData}
        annotationsPerToken={annotationsPerToken}
        annotationMap={annotationMap}
        isViewer={false}
        projectId={sdocData.project_id}
        onResizeStart={resizeController.handleResizeStart}
        style={{
          zIndex: 1,
          overflowY: "auto",
          ...(tagStyle === TagStyle.Above && {
            lineHeight: "2.1rem",
          }),
        }}
      />
    </>
  );
}
