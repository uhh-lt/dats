import { AttachedObjectType } from "@models/AttachedObjectType";
import { BBoxAnnotationRead } from "@models/BBoxAnnotationRead";
import { memo } from "react";
import { CodeIndicator } from "./_components/CodeIndicator";

interface SVGBBoxTextProps {
  bbox: BBoxAnnotationRead;
  xCentering?: number;
  scaledRatio?: number;
  onClick?: (event: React.MouseEvent) => void;
}

/** Estimated height of the code pill in px (used to size the foreignObject). */
const PILL_HEIGHT = 20;
/** Generous width for the foreignObject; the pill sizes itself inside. */
const PILL_WIDTH = 300;

export const SVGBBoxText = memo(({ bbox, xCentering = 0, scaledRatio = 1, onClick }: SVGBBoxTextProps) => {
  // position the pill at the bottom-left corner inside the bbox with a consistent inset
  const inset = 4;
  const x = scaledRatio * bbox.x_min + xCentering + inset;
  const y = scaledRatio * bbox.y_max - PILL_HEIGHT - inset;

  return (
    <foreignObject
      x={x}
      y={y}
      width={PILL_WIDTH}
      height={PILL_HEIGHT + 4}
      style={{ overflow: "visible", pointerEvents: "none" }}
    >
      <div style={{ display: "inline-block", pointerEvents: "auto", marginLeft: -4 }} onClick={onClick}>
        <CodeIndicator
          codeId={bbox.code_id}
          annotationId={bbox.id}
          memoCount={bbox.memo_ids.length}
          attachedObjectType={AttachedObjectType.BBOX_ANNOTATION}
        />
      </div>
    </foreignObject>
  );
});
