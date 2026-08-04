import { SentenceAnnotationHooks } from "@api/hooks/SentenceAnnotationHooks";
import { SentenceAnnotationRead } from "@models/SentenceAnnotationRead";
import { PointerEvent as ReactPointerEvent, useCallback, useEffect, useRef, useState } from "react";

export type SentenceAnnotationBoundary = "start" | "end";

export type SentenceAnnotationResizeStartHandler = (
  annotation: SentenceAnnotationRead,
  boundary: SentenceAnnotationBoundary,
  event: ReactPointerEvent<HTMLElement>,
) => void;

interface ResizeState {
  boundary: SentenceAnnotationBoundary;
  originalAnnotation: SentenceAnnotationRead;
  previewAnnotation: SentenceAnnotationRead;
}

/**
 * Resolves the sentence index under the mouse pointer by hit-testing the DOM
 * for the nearest element carrying a `data-sent-id` attribute.
 */
const findSentenceIndex = (event: PointerEvent): number | undefined => {
  const target = document.elementFromPoint(event.clientX, event.clientY);
  const sentenceElement = target?.closest<HTMLElement>("[data-sent-id]");
  const sentenceId = sentenceElement?.dataset.sentId;
  if (sentenceId === undefined) return undefined;

  const sentenceIndex = Number(sentenceId);
  return Number.isInteger(sentenceIndex) ? sentenceIndex : undefined;
};

/**
 * Creates a preview annotation with updated boundaries based on the sentence
 * index under the pointer, clamped to valid ranges.
 */
const createPreviewAnnotation = (
  state: ResizeState,
  sentenceIndex: number,
  sentenceCount: number,
): SentenceAnnotationRead => {
  const lastSentenceIndex = sentenceCount - 1;
  if (lastSentenceIndex < 0) return state.previewAnnotation;

  let sentenceIdStart = state.previewAnnotation.sentence_id_start;
  let sentenceIdEnd = state.previewAnnotation.sentence_id_end;
  if (state.boundary === "start") {
    sentenceIdStart = Math.min(Math.max(sentenceIndex, 0), sentenceIdEnd);
  } else {
    sentenceIdEnd = Math.max(Math.min(sentenceIndex, lastSentenceIndex), sentenceIdStart);
  }

  return {
    ...state.previewAnnotation,
    sentence_id_start: sentenceIdStart,
    sentence_id_end: sentenceIdEnd,
  };
};

/**
 * Checks whether the drag actually changed the annotation's boundaries.
 */
const hasChangedBoundaries = (state: ResizeState): boolean => {
  return (
    state.originalAnnotation.sentence_id_start !== state.previewAnnotation.sentence_id_start ||
    state.originalAnnotation.sentence_id_end !== state.previewAnnotation.sentence_id_end
  );
};

/**
 * Hook that enables drag-to-resize interaction for sentence annotations.
 *
 * Provides a `handleResizeStart` callback to initiate a drag (typically from a
 * resize handle on the annotation bar), a `previewAnnotation` that reflects the
 * in-progress drag state for live visual feedback, and a `shouldIgnoreMouseUp`
 * guard to suppress click events that fire immediately after a drag ends.
 *
 * While dragging, the hook:
 * - Listens for global pointermove/pointerup/pointercancel/Escape events
 * - Disables text selection and forces a resize cursor via a global stylesheet
 * - Computes a preview annotation with clamped boundaries on each pointer move
 * - Commits the resize via `useUpdateSentenceAnnotation` on pointer up
 *
 * @param sentenceCount - Total number of sentences in the document (used to clamp the end boundary)
 */
export function useSentenceAnnotationResize(sentenceCount: number | undefined) {
  const { mutate: updateSentenceAnnotation } = SentenceAnnotationHooks.useUpdateSentenceAnnotation();
  const resizeStateRef = useRef<ResizeState | undefined>(undefined);
  const suppressMouseUpRef = useRef(false);
  const [resizeState, setResizeState] = useState<ResizeState>();
  const [isDragging, setIsDragging] = useState(false);

  const clearResize = useCallback(() => {
    resizeStateRef.current = undefined;
    setResizeState(undefined);
    setIsDragging(false);
  }, []);

  const handleResizeStart: SentenceAnnotationResizeStartHandler = useCallback((annotation, boundary, event) => {
    if (annotation.id < 0) return;

    event.preventDefault();
    event.stopPropagation();
    suppressMouseUpRef.current = true;
    const nextState: ResizeState = {
      boundary,
      originalAnnotation: annotation,
      previewAnnotation: annotation,
    };
    resizeStateRef.current = nextState;
    setResizeState(nextState);
    setIsDragging(true);
  }, []);

  useEffect(() => {
    if (!isDragging || sentenceCount === undefined) return;

    const previousUserSelect = document.body.style.userSelect;
    document.body.style.userSelect = "none";
    // force the resize cursor globally, overriding element-specific cursors (e.g. MUI buttons)
    const cursorStyle = document.createElement("style");
    cursorStyle.textContent = "* { cursor: ns-resize !important; }";
    document.head.appendChild(cursorStyle);

    const handlePointerMove = (event: PointerEvent) => {
      const currentState = resizeStateRef.current;
      const sentenceIndex = findSentenceIndex(event);
      if (!currentState || sentenceIndex === undefined) return;

      const previewAnnotation = createPreviewAnnotation(currentState, sentenceIndex, sentenceCount);
      if (
        previewAnnotation.sentence_id_start === currentState.previewAnnotation.sentence_id_start &&
        previewAnnotation.sentence_id_end === currentState.previewAnnotation.sentence_id_end
      ) {
        return;
      }

      const nextState = { ...currentState, previewAnnotation };
      resizeStateRef.current = nextState;
      setResizeState(nextState);
    };

    const handlePointerUp = () => {
      const currentState = resizeStateRef.current;
      setIsDragging(false);
      window.setTimeout(() => {
        suppressMouseUpRef.current = false;
      });
      if (!currentState || !hasChangedBoundaries(currentState)) {
        clearResize();
        return;
      }

      resizeStateRef.current = undefined;
      updateSentenceAnnotation(
        {
          sentenceAnnoToUpdate: currentState.originalAnnotation,
          update: {
            sentence_id_start: currentState.previewAnnotation.sentence_id_start,
            sentence_id_end: currentState.previewAnnotation.sentence_id_end,
          },
        },
        { onSettled: clearResize },
      );
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      suppressMouseUpRef.current = false;
      clearResize();
    };

    const handlePointerCancel = () => {
      suppressMouseUpRef.current = false;
      clearResize();
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp, { once: true });
    window.addEventListener("pointercancel", handlePointerCancel, { once: true });
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.userSelect = previousUserSelect;
      cursorStyle.remove();
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerCancel);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [clearResize, isDragging, sentenceCount, updateSentenceAnnotation]);

  const shouldIgnoreMouseUp = useCallback(() => suppressMouseUpRef.current, []);

  return {
    handleResizeStart,
    previewAnnotation: resizeState?.previewAnnotation,
    shouldIgnoreMouseUp,
  };
}
