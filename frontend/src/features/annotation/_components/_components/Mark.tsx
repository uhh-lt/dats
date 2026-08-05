import { CodeHooks } from "@api/hooks/CodeHooks";
import { SpanAnnotationRead } from "@models/SpanAnnotationRead";
import { contrastiveColors } from "@utils/colors/colors";
import { SpanAnnotationResizeStartHandler } from "../../_hooks/useSpanAnnotationResize";

interface MarkProps {
  annotation: SpanAnnotationRead;
  isStart: boolean;
  isEnd: boolean;
  height: string;
  top: string;
  onResizeStart?: SpanAnnotationResizeStartHandler;
}

export function Mark({ annotation, isStart, isEnd, height, top, onResizeStart }: MarkProps) {
  const code = CodeHooks.useGetCode(annotation.code_id);

  // pending (not yet persisted) annotations have negative ids and never offer resize handles.
  const isPending = annotation.id < 0;

  const resizeHandles =
    onResizeStart && !isPending ? (
      <>
        {isStart && (
          <span
            className="span-resize-handle span-resize-handle--start"
            data-span-resize-handle
            onPointerDown={(event) => onResizeStart(annotation, "start", event)}
            onClick={(event) => event.stopPropagation()}
            onMouseUp={(event) => event.stopPropagation()}
          />
        )}
        {isEnd && (
          <span
            className="span-resize-handle span-resize-handle--end"
            data-span-resize-handle
            onPointerDown={(event) => onResizeStart(annotation, "end", event)}
            onClick={(event) => event.stopPropagation()}
            onMouseUp={(event) => event.stopPropagation()}
          />
        )}
      </>
    ) : null;

  if (code.data) {
    let color: string;
    if (
      code.data.is_system &&
      code.data.name === "MENTION" &&
      annotation.group_ids &&
      annotation.group_ids.length === 1
    ) {
      // coreference annotation
      color = contrastiveColors[annotation.group_ids[0] % contrastiveColors.length];
    } else {
      color = code.data.color;
    }
    return (
      <span
        className={"mark" + (isStart ? " start" : "") + (isEnd ? " end" : "")}
        style={{ backgroundColor: color, height: height, top: top }}
      >
        {resizeHandles}
      </span>
    );
  }
  return (
    <span
      className={"mark" + (isStart ? " start" : "") + (isEnd ? " end" : "")}
      style={{ backgroundColor: "lightgrey", height: height, top: top }}
    >
      {resizeHandles}
    </span>
  );
}
