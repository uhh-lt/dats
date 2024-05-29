import React from "react";
import CodeHooks from "../../../api/CodeHooks.ts";
import { BBoxAnnotationReadResolvedCode } from "../../../api/openapi/models/BBoxAnnotationReadResolvedCode.ts";

interface SVGBBoxProps {
  bbox: BBoxAnnotationReadResolvedCode;
  onContextMenu: (e: React.MouseEvent<SVGRectElement, MouseEvent>, bbox: BBoxAnnotationReadResolvedCode) => void;
}

function SVGBBox({ bbox, onContextMenu }: SVGBBoxProps) {
  const code = CodeHooks.useGetCode(bbox.code.id);

  return (
    <>
      {code.data && (
        <rect
          className={`bbox-${bbox.id}`}
          key={bbox.id}
          x={bbox.x_min}
          y={bbox.y_min}
          width={bbox.x_max - bbox.x_min}
          height={bbox.y_max - bbox.y_min}
          stroke={code.data.color}
          strokeWidth={3}
          fill={"transparent"}
          onContextMenu={(e) => onContextMenu(e, bbox)}
        />
      )}
    </>
  );
}

export default SVGBBox;
