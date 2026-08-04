import { SpanAnnotationHooks } from "@api/hooks/SpanAnnotationHooks";
import { SpanAnnotationRead } from "@models/SpanAnnotationRead";
import { PointerEvent as ReactPointerEvent, useCallback, useEffect, useRef, useState } from "react";
import { IToken } from "../_types/IToken";

export type SpanAnnotationBoundary = "start" | "end";

export type SpanAnnotationResizeStartHandler = (
  annotation: SpanAnnotationRead,
  boundary: SpanAnnotationBoundary,
  event: ReactPointerEvent<HTMLSpanElement>,
) => void;

interface ResizeState {
  boundary: SpanAnnotationBoundary;
  originalAnnotation: SpanAnnotationRead;
  previewAnnotation: SpanAnnotationRead;
}

/**
 * Resolves the token index under the mouse pointer by hit-testing the DOM
 * for the nearest element with class `tok` and a `data-tokenid` attribute.
 */
const findTokenIndex = (event: PointerEvent): number | undefined => {
  const target = document.elementFromPoint(event.clientX, event.clientY);
  const tokenElement = target?.closest<HTMLElement>(".tok[data-tokenid]");
  const tokenId = tokenElement?.dataset.tokenid;
  if (tokenId === undefined) return undefined;

  const tokenIndex = Number(tokenId);
  return Number.isInteger(tokenIndex) ? tokenIndex : undefined;
};

/**
 * Creates a preview annotation with updated token boundaries, character offsets,
 * and span text based on the token index under the pointer.
 */
const createPreviewAnnotation = (state: ResizeState, tokenIndex: number, tokenData: IToken[]): SpanAnnotationRead => {
  const lastTokenIndex = tokenData.length - 1;
  if (lastTokenIndex < 0) return state.previewAnnotation;

  let beginToken = state.previewAnnotation.begin_token;
  let endToken = state.previewAnnotation.end_token;
  if (state.boundary === "start") {
    beginToken = Math.min(Math.max(tokenIndex, 0), endToken - 1);
  } else {
    endToken = Math.max(Math.min(tokenIndex, lastTokenIndex) + 1, beginToken + 1);
  }

  const endTokenIndex = endToken - 1;
  const spanText = tokenData
    .slice(beginToken, endToken)
    .map((token) => token.text)
    .join(" ");

  return {
    ...state.previewAnnotation,
    begin: tokenData[beginToken].beginChar,
    end: tokenData[endTokenIndex].endChar,
    begin_token: beginToken,
    end_token: endToken,
    text: spanText,
  };
};

/**
 * Checks whether the drag actually changed any of the annotation's boundaries
 * (character offsets, token indices, or text).
 */
const hasChangedBoundaries = (state: ResizeState): boolean => {
  return (
    state.originalAnnotation.begin !== state.previewAnnotation.begin ||
    state.originalAnnotation.end !== state.previewAnnotation.end ||
    state.originalAnnotation.begin_token !== state.previewAnnotation.begin_token ||
    state.originalAnnotation.end_token !== state.previewAnnotation.end_token ||
    state.originalAnnotation.text !== state.previewAnnotation.text
  );
};

/**
 * Hook that enables drag-to-resize interaction for span annotations.
 *
 * Provides a `handleResizeStart` callback to initiate a drag (typically from a
 * resize handle on the annotation), a `previewAnnotation` that reflects the
 * in-progress drag state for live visual feedback, and a `shouldIgnoreMouseUp`
 * guard to suppress click events that fire immediately after a drag ends.
 *
 * While dragging, the hook:
 * - Listens for global pointermove/pointerup/pointercancel/Escape events
 * - Disables text selection
 * - Computes a preview annotation with updated token boundaries, character
 *   offsets, and span text on each pointer move
 * - Commits the resize via `useUpdateSpanAnnotation` on pointer up
 *
 * @param tokenData - The token array for the current document (used to resolve
 *   character offsets and span text from token indices)
 */
export function useSpanAnnotationResize(tokenData: IToken[] | undefined) {
  const { mutate: updateSpanAnnotation } = SpanAnnotationHooks.useUpdateSpanAnnotation();
  const resizeStateRef = useRef<ResizeState | undefined>(undefined);
  const suppressMouseUpRef = useRef(false);
  const [resizeState, setResizeState] = useState<ResizeState>();
  const [isDragging, setIsDragging] = useState(false);

  const clearResize = useCallback(() => {
    resizeStateRef.current = undefined;
    setResizeState(undefined);
    setIsDragging(false);
  }, []);

  const handleResizeStart: SpanAnnotationResizeStartHandler = useCallback((annotation, boundary, event) => {
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
    if (!isDragging || !tokenData) return;

    const previousUserSelect = document.body.style.userSelect;
    document.body.style.userSelect = "none";

    const handlePointerMove = (event: PointerEvent) => {
      const currentState = resizeStateRef.current;
      const tokenIndex = findTokenIndex(event);
      if (!currentState || tokenIndex === undefined) return;

      const previewAnnotation = createPreviewAnnotation(currentState, tokenIndex, tokenData);
      if (
        previewAnnotation.begin_token === currentState.previewAnnotation.begin_token &&
        previewAnnotation.end_token === currentState.previewAnnotation.end_token
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
      updateSpanAnnotation(
        {
          spanAnnotationToUpdate: currentState.originalAnnotation,
          requestBody: {
            begin: currentState.previewAnnotation.begin,
            end: currentState.previewAnnotation.end,
            begin_token: currentState.previewAnnotation.begin_token,
            end_token: currentState.previewAnnotation.end_token,
            span_text: currentState.previewAnnotation.text,
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
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerCancel);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [clearResize, isDragging, tokenData, updateSpanAnnotation]);

  const shouldIgnoreMouseUp = useCallback(() => suppressMouseUpRef.current, []);

  return {
    handleResizeStart,
    previewAnnotation: resizeState?.previewAnnotation,
    shouldIgnoreMouseUp,
  };
}
