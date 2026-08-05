import { CodeHooks } from "@api/hooks/CodeHooks";
import { BBoxAnnotationRead } from "@models/BBoxAnnotationRead";
import { memo, SVGProps } from "react";
import { BboxAnnotationResizeStartHandler } from "../_hooks/useBboxAnnotationResize";
import { BboxAnnotationResizeHandles } from "./BboxAnnotationResizeHandles";

type CustomSVGProps = Omit<
  SVGProps<SVGRectElement>,
  "className" | "x" | "y" | "width" | "height" | "stroke" | "strokeWidth" | "fill" | "bbox"
>;

interface SVGBBoxProps {
  bbox: BBoxAnnotationRead;
  xCentering?: number;
  scaledRatio?: number;
  isHovered?: boolean;
  onResizeStart?: BboxAnnotationResizeStartHandler;
}

export const SVGBBox = memo(
  ({
    bbox,
    xCentering = 0,
    scaledRatio = 1,
    isHovered = false,
    onResizeStart,
    onMouseEnter,
    onMouseLeave,
    ...props
  }: SVGBBoxProps & CustomSVGProps) => {
    const code = CodeHooks.useGetCode(bbox.code_id);

    // pending (not yet persisted) annotations have negative ids and never offer resize handles.
    const isPending = bbox.id < 0;

    return (
      <>
        {code.data && (
          <g onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
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
            {onResizeStart && !isPending && (
              <BboxAnnotationResizeHandles
                bbox={bbox}
                isHovered={isHovered}
                color={code.data.color}
                scaledRatio={scaledRatio}
                xCentering={xCentering}
                onResizeStart={onResizeStart}
              />
            )}
          </g>
        )}
      </>
    );
  },
);
