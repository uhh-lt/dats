import React from "react";
import CodeHooks from "../../../api/CodeHooks.ts";
import { BBoxAnnotationReadResolvedCode } from "../../../api/openapi/models/BBoxAnnotationReadResolvedCode.ts";

type CustomSVGProps = Omit<
  React.SVGProps<SVGRectElement>,
  "className" | "x" | "y" | "width" | "height" | "stroke" | "strokeWidth" | "fill" | "bbox"
>;

interface SVGBBoxProps {
  bbox: BBoxAnnotationReadResolvedCode;
}

function SVGBBox({ bbox, ...props }: SVGBBoxProps & CustomSVGProps) {
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
          {...props}
        />
      )}
    </>
  );
}

export default SVGBBox;
