import React from "react";
import CodeHooks from "../../../api/CodeHooks.ts";
import { BBoxAnnotationReadResolved } from "../../../api/openapi/models/BBoxAnnotationReadResolved.ts";

type CustomTextProps = Omit<
  React.SVGTextElementAttributes<SVGTextElement>,
  "x" | "y" | "width" | "height" | "stroke" | "strokeWidth" | "fill" | "bbox"
>;

interface SVGBBoxTextProps {
  bbox: BBoxAnnotationReadResolved;
}

function SVGBBoxText({ bbox, ...props }: SVGBBoxTextProps & CustomTextProps) {
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
          {...props}
        >
          {code.data.name}
        </text>
      )}
    </>
  );
}

export default SVGBBoxText;
