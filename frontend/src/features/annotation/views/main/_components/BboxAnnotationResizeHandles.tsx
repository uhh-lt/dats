import { BBoxAnnotationRead } from "@models/BBoxAnnotationRead";
import { BboxAnnotationBoundary, BboxAnnotationResizeStartHandler } from "../_hooks/useBboxAnnotationResize";

interface BboxAnnotationResizeHandlesProps {
  bbox: BBoxAnnotationRead;
  isHovered: boolean;
  color: string;
  scaledRatio: number;
  xCentering: number;
  onResizeStart: BboxAnnotationResizeStartHandler;
}

const HANDLE_SIZE = 10;

const corners: { boundary: BboxAnnotationBoundary; cursor: string }[] = [
  { boundary: "topLeft", cursor: "nwse-resize" },
  { boundary: "topRight", cursor: "nesw-resize" },
  { boundary: "bottomLeft", cursor: "nesw-resize" },
  { boundary: "bottomRight", cursor: "nwse-resize" },
];

/**
 * Renders the four corner resize handles for a bbox annotation.
 *
 * Handles are SVG rects positioned at the corners of the bounding box. They are
 * hidden by default and fade in when the bbox is hovered (`isHovered`). They
 * render inside the zoom-transformed SVG group, so they scale with the image.
 */
export function BboxAnnotationResizeHandles({
  bbox,
  isHovered,
  color,
  scaledRatio,
  xCentering,
  onResizeStart,
}: BboxAnnotationResizeHandlesProps) {
  const x = scaledRatio * bbox.x_min + xCentering;
  const y = scaledRatio * bbox.y_min;
  const width = scaledRatio * (bbox.x_max - bbox.x_min);
  const height = scaledRatio * (bbox.y_max - bbox.y_min);

  const cornerPositions: Record<BboxAnnotationBoundary, { cx: number; cy: number }> = {
    topLeft: { cx: x, cy: y },
    topRight: { cx: x + width, cy: y },
    bottomLeft: { cx: x, cy: y + height },
    bottomRight: { cx: x + width, cy: y + height },
  };

  return (
    <>
      {corners.map(({ boundary, cursor }) => {
        const { cx, cy } = cornerPositions[boundary];
        return (
          <rect
            key={boundary}
            data-bbox-resize-handle
            x={cx - HANDLE_SIZE / 2}
            y={cy - HANDLE_SIZE / 2}
            width={HANDLE_SIZE}
            height={HANDLE_SIZE}
            fill={color}
            stroke="rgba(0, 0, 0, 0.65)"
            strokeWidth={1}
            style={{
              cursor,
              opacity: isHovered ? 1 : 0,
              pointerEvents: isHovered ? "auto" : "none",
              transition: "opacity 100ms ease-in-out",
              touchAction: "none",
            }}
            onPointerDown={(event) => onResizeStart(bbox, boundary, event)}
            onClick={(event) => event.stopPropagation()}
            onMouseUp={(event) => event.stopPropagation()}
          />
        );
      })}
    </>
  );
}
