import { Box } from "@mui/material";
import { RefObject } from "react";
import { createDividerStyles } from "../styles/resizePanelStyles";

interface DragHandlerProps {
  dragHandleRef: RefObject<HTMLDivElement>;
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

export function DragHandler({ dragHandleRef, isDragging, isCollapsed, isHorizontal, style }: DragHandlerProps) {
  return (
    <Box
      ref={dragHandleRef}
      className={`resizer-handle${isDragging ? " resizing" : ""}${isCollapsed ? " collapsed" : ""}`}
      sx={{
        ...createDividerStyles(isDragging, isCollapsed, isHorizontal),
        ...style,
        ...(isCollapsed && {
          "&::after": {
            content: '""',
            position: "absolute",
            backgroundColor: "action.active",
            transition: "all 0.2s ease",
            opacity: 0.5,
            ...(isHorizontal
              ? {
                  width: "4px",
                  height: "32px",
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                }
              : {
                  width: "32px",
                  height: "4px",
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                }),
          },
          "&:hover::after": {
            opacity: 1,
            ...(isHorizontal
              ? {
                  height: "48px",
                }
              : {
                  width: "48px",
                }),
          },
        }),
      }}
    />
  );
}
