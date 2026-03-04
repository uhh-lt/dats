import { CodeHooks } from "@api/hooks/CodeHooks";
import { BBoxAnnotationRead } from "@api/models/BBoxAnnotationRead";
import { memo, SVGProps } from "react";

type CustomSVGProps = Omit<
  SVGProps<SVGRectElement>,
  "className" | "x" | "y" | "width" | "height" | "stroke" | "strokeWidth" | "fill" | "bbox"
>;

interface SVGBBoxProps {
  bbox: BBoxAnnotationRead;
  xCentering?: number;
  scaledRatio?: number;
}

export const SVGBBox = memo(({ bbox, xCentering = 0, scaledRatio = 1, ...props }: SVGBBoxProps & CustomSVGProps) => {
  const code = CodeHooks.useGetCode(bbox.code_id);

  return (
    <>
      {code.data && (
        <rect
          className={`bbox-${bbox.id}`}
          key={bbox.id}
          x={scaledRatio * bbox.x_min + xCentering}
          y={scaledRatio * bbox.y_min}
          width={scaledRatio * (bbox.x_max - bbox.x_min)}
          height={scaledRatio * (bbox.y_max - bbox.y_min)}
          stroke={code.data.color}
          strokeWidth={3}
          fill={"transparent"}
          {...props}
        />
      )}
    </>
  );
});
