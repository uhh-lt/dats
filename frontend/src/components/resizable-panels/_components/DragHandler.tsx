import { Ref, memo } from "react";
import { StyledDragHandler } from "./styledComponents";

interface DragHandlerProps {
  dragHandleRef: Ref<HTMLDivElement>;
  isDragging: boolean;
  isCollapsed: boolean;
  isHorizontal: boolean;
  style?: {
    top?: number | string;
    left?: number | string;
    right?: number | string;
    bottom?: number | string;
    transform?: string;
  };
}

export const DragHandler = memo(({ dragHandleRef, isDragging, isCollapsed, isHorizontal, style }: DragHandlerProps) => {
  return (
    <StyledDragHandler
      ref={dragHandleRef}
      isDragging={isDragging}
      isCollapsed={isCollapsed}
      isHorizontal={isHorizontal}
      sx={style}
    />
  );
});
