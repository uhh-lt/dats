import { BboxAnnotationHooks } from "@api/hooks/BboxAnnotationHooks";
import { BBoxAnnotationRead } from "@models/BBoxAnnotationRead";
import { PointerEvent as ReactPointerEvent, RefObject, useCallback, useEffect, useRef, useState } from "react";

export type BboxAnnotationBoundary = "topLeft" | "topRight" | "bottomLeft" | "bottomRight";

export type BboxAnnotationResizeStartHandler = (
  annotation: BBoxAnnotationRead,
  boundary: BboxAnnotationBoundary,
  event: ReactPointerEvent<SVGElement>,
) => void;

interface ResizeState {
  boundary: BboxAnnotationBoundary;
  originalAnnotation: BBoxAnnotationRead;
  previewAnnotation: BBoxAnnotationRead;
}

/** Minimum width/height of a bbox, matching the draw-create threshold. */
const MIN_BBOX_SIZE = 10;

const boundaryToCursor: Record<BboxAnnotationBoundary, string> = {
  topLeft: "nwse-resize",
  bottomRight: "nwse-resize",
  topRight: "nesw-resize",
  bottomLeft: "nesw-resize",
};

/**
 * Converts pointer client coordinates to image coordinates, accounting for the
 * current zoom/pan transform applied to the SVG group.
 */
const pointerToImageCoords = (
  event: PointerEvent,
  imageRef: RefObject<SVGImageElement | null>,
): { x: number; y: number } | undefined => {
  const img = imageRef.current;
  const svg = img?.ownerSVGElement;
  if (!img || !svg) return undefined;

  const ctm = img.getScreenCTM();
  if (!ctm) return undefined;

  const point = svg.createSVGPoint();
  point.x = event.clientX;
  point.y = event.clientY;
  const transformed = point.matrixTransform(ctm.inverse());
  return { x: transformed.x, y: transformed.y };
};

/**
 * Creates a preview annotation with updated coordinates based on the pointer
 * position in image space, clamped to the image bounds and enforcing a minimum
 * box size.
 */
const createPreviewAnnotation = (
  state: ResizeState,
  imageX: number,
  imageY: number,
  imageWidth: number,
  imageHeight: number,
): BBoxAnnotationRead => {
  const clampedX = Math.min(Math.max(imageX, 0), imageWidth);
  const clampedY = Math.min(Math.max(imageY, 0), imageHeight);

  let { x_min, x_max, y_min, y_max } = state.previewAnnotation;

  switch (state.boundary) {
    case "topLeft":
      x_min = Math.min(clampedX, x_max - MIN_BBOX_SIZE);
      y_min = Math.min(clampedY, y_max - MIN_BBOX_SIZE);
      break;
    case "topRight":
      x_max = Math.max(clampedX, x_min + MIN_BBOX_SIZE);
      y_min = Math.min(clampedY, y_max - MIN_BBOX_SIZE);
      break;
    case "bottomLeft":
      x_min = Math.min(clampedX, x_max - MIN_BBOX_SIZE);
      y_max = Math.max(clampedY, y_min + MIN_BBOX_SIZE);
      break;
    case "bottomRight":
      x_max = Math.max(clampedX, x_min + MIN_BBOX_SIZE);
      y_max = Math.max(clampedY, y_min + MIN_BBOX_SIZE);
      break;
  }

  return {
    ...state.previewAnnotation,
    x_min: Math.round(x_min),
    x_max: Math.round(x_max),
    y_min: Math.round(y_min),
    y_max: Math.round(y_max),
  };
};

/**
 * Checks whether the drag actually changed the annotation's coordinates.
 */
const hasChangedBoundaries = (state: ResizeState): boolean => {
  return (
    state.originalAnnotation.x_min !== state.previewAnnotation.x_min ||
    state.originalAnnotation.x_max !== state.previewAnnotation.x_max ||
    state.originalAnnotation.y_min !== state.previewAnnotation.y_min ||
    state.originalAnnotation.y_max !== state.previewAnnotation.y_max
  );
};

/**
 * Hook that enables drag-to-resize interaction for bbox annotations.
 *
 * Provides a `handleResizeStart` callback to initiate a drag (from a corner
 * resize handle on the bbox), a `previewAnnotation` that reflects the
 * in-progress drag state for live visual feedback, and a `shouldIgnoreMouseUp`
 * guard to suppress click events that fire immediately after a drag ends.
 *
 * While dragging, the hook:
 * - Listens for global pointermove/pointerup/pointercancel/Escape events
 * - Disables text selection and forces a resize cursor via a global stylesheet
 * - Computes a preview annotation with clamped coordinates on each pointer move
 * - Commits the resize via `useUpdateBBoxAnnotation` on pointer up
 *
 * @param imageRef - Ref to the SVG image element (used for coordinate conversion and bounds clamping)
 */
export function useBboxAnnotationResize(imageRef: RefObject<SVGImageElement | null>) {
  const { mutate: updateBBoxAnnotation } = BboxAnnotationHooks.useUpdateBBoxAnnotation();
  const resizeStateRef = useRef<ResizeState | undefined>(undefined);
  const suppressMouseUpRef = useRef(false);
  const [resizeState, setResizeState] = useState<ResizeState>();
  const [isDragging, setIsDragging] = useState(false);

  const clearResize = useCallback(() => {
    resizeStateRef.current = undefined;
    setResizeState(undefined);
    setIsDragging(false);
  }, []);

  const handleResizeStart: BboxAnnotationResizeStartHandler = useCallback((annotation, boundary, event) => {
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
    if (!isDragging) return;

    const currentState = resizeStateRef.current;
    if (!currentState) return;

    const previousUserSelect = document.body.style.userSelect;
    document.body.style.userSelect = "none";
    // force the resize cursor globally, overriding element-specific cursors
    const cursorStyle = document.createElement("style");
    cursorStyle.textContent = `* { cursor: ${boundaryToCursor[currentState.boundary]} !important; }`;
    document.head.appendChild(cursorStyle);

    const handlePointerMove = (event: PointerEvent) => {
      const state = resizeStateRef.current;
      const img = imageRef.current;
      if (!state || !img) return;

      const coords = pointerToImageCoords(event, imageRef);
      if (!coords) return;

      const imageBounds = img.getBBox();
      const previewAnnotation = createPreviewAnnotation(
        state,
        coords.x,
        coords.y,
        imageBounds.width,
        imageBounds.height,
      );
      if (
        previewAnnotation.x_min === state.previewAnnotation.x_min &&
        previewAnnotation.x_max === state.previewAnnotation.x_max &&
        previewAnnotation.y_min === state.previewAnnotation.y_min &&
        previewAnnotation.y_max === state.previewAnnotation.y_max
      ) {
        return;
      }

      const nextState = { ...state, previewAnnotation };
      resizeStateRef.current = nextState;
      setResizeState(nextState);
    };

    const handlePointerUp = () => {
      const state = resizeStateRef.current;
      setIsDragging(false);
      window.setTimeout(() => {
        suppressMouseUpRef.current = false;
      });
      if (!state || !hasChangedBoundaries(state)) {
        clearResize();
        return;
      }

      resizeStateRef.current = undefined;
      updateBBoxAnnotation(
        {
          bboxToUpdate: state.originalAnnotation,
          requestBody: {
            x_min: state.previewAnnotation.x_min,
            x_max: state.previewAnnotation.x_max,
            y_min: state.previewAnnotation.y_min,
            y_max: state.previewAnnotation.y_max,
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
  }, [clearResize, isDragging, imageRef, updateBBoxAnnotation]);

  const shouldIgnoreMouseUp = useCallback(() => suppressMouseUpRef.current, []);

  return {
    handleResizeStart,
    previewAnnotation: resizeState?.previewAnnotation,
    shouldIgnoreMouseUp,
  };
}
