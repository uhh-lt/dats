import { SentenceAnnotationRead } from "@models/SentenceAnnotationRead";
import { SentenceAnnotationResizeStartHandler } from "../../../_hooks/useSentenceAnnotationResize";

interface SentenceAnnotationResizeHandlesProps {
  annotation: SentenceAnnotationRead;
  isStartOfAnnotation: boolean;
  isEndOfAnnotation: boolean;
  isHovered: boolean;
  color: string;
  onResizeStart: SentenceAnnotationResizeStartHandler;
}

/**
 * Renders the start/end resize handles for a sentence annotation bar.
 *
 * Handles are absolutely positioned at the top (start) and bottom (end) of the
 * annotation bar. They are hidden by default and fade in when the annotation is
 * hovered (`isHovered`). The start handle is only rendered on the first sentence
 * row of the annotation, and the end handle only on the last row.
 */
export function SentenceAnnotationResizeHandles({
  annotation,
  isStartOfAnnotation,
  isEndOfAnnotation,
  isHovered,
  color,
  onResizeStart,
}: SentenceAnnotationResizeHandlesProps) {
  return (
    <>
      {isStartOfAnnotation && (
        <div
          data-sent-resize-handle
          onPointerDown={(event) => onResizeStart(annotation, "start", event)}
          onClick={(event) => event.stopPropagation()}
          onMouseUp={(event) => event.stopPropagation()}
          style={{
            position: "absolute",
            top: "-7px",
            left: "-10px",
            width: "20px",
            height: "12px",
            cursor: "ns-resize",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            opacity: isHovered ? 1 : 0,
            pointerEvents: isHovered ? "auto" : "none",
            transition: "opacity 100ms ease-in-out",
          }}
        >
          <div
            style={{
              width: "14px",
              height: "5px",
              borderRadius: "2.5px",
              border: "1px solid rgba(0, 0, 0, 0.65)",
              backgroundColor: color,
            }}
          />
        </div>
      )}
      {isEndOfAnnotation && (
        <div
          data-sent-resize-handle
          onPointerDown={(event) => onResizeStart(annotation, "end", event)}
          onClick={(event) => event.stopPropagation()}
          onMouseUp={(event) => event.stopPropagation()}
          style={{
            position: "absolute",
            bottom: "-8px",
            left: "-10px",
            width: "20px",
            height: "12px",
            cursor: "ns-resize",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            opacity: isHovered ? 1 : 0,
            pointerEvents: isHovered ? "auto" : "none",
            transition: "opacity 100ms ease-in-out",
          }}
        >
          <div
            style={{
              width: "14px",
              height: "5px",
              borderRadius: "2.5px",
              border: "1px solid rgba(0, 0, 0, 0.65)",
              backgroundColor: color,
            }}
          />
        </div>
      )}
    </>
  );
}
