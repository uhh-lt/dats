import React from "react";
import CodeHooks from "../../../api/CodeHooks.ts";
import { BBoxAnnotationReadResolvedCode } from "../../../api/openapi/models/BBoxAnnotationReadResolvedCode.ts";

interface SVGBBoxTextProps {
  bbox: BBoxAnnotationReadResolvedCode;
  onContextMenu: (e: React.MouseEvent<SVGTextElement, MouseEvent>, bbox: BBoxAnnotationReadResolvedCode) => void;
  fontSize: number;
}

function SVGBBoxText({ bbox, onContextMenu, fontSize }: SVGBBoxTextProps) {
  const code = CodeHooks.useGetCode(bbox.code.id);

  return (
    <>
      {code.data && (
        <text
          key={bbox.id}
          x={bbox.x_min + 3}
          y={bbox.y_max - 3}
          width={bbox.x_max - bbox.x_min}
          height={bbox.y_max - bbox.y_min}
          fill={"white"}
          stroke={"black"}
          strokeWidth={0.75}
          fontSize={`${fontSize}px`}
          onContextMenu={(e) => onContextMenu(e, bbox)}
        >
          {code.data.name}
        </text>
      )}
    </>
  );
}

export default SVGBBoxText;
