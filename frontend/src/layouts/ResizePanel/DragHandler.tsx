import { Box } from "@mui/material";
import { RefObject } from "react";
import { createDividerStyles } from "./styles/resizePanelStyles";

interface DragHandlerProps {
  dragHandleRef: RefObject<HTMLDivElement>;
  isDragging: boolean;
  isCollapsed: boolean;
  isHorizontal: boolean;
  position?: {
    top?: number | string;
    left?: number | string;
    right?: number | string;
    bottom?: number | string;
    transform?: string;
  };
}

export function DragHandler({ dragHandleRef, isDragging, isCollapsed, isHorizontal, position }: DragHandlerProps) {
  return (
    <Box
      ref={dragHandleRef}
      className={`resizer-handle${isDragging ? " resizing" : ""}`}
      sx={{
        ...createDividerStyles(isDragging, isCollapsed, isHorizontal),
        ...position,
      }}
    />
  );
}
