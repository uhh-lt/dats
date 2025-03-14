import { Box } from "@mui/material";
import { ReactNode, useRef } from "react";
import { useCollapseStates } from "./hooks/useCollapseStates";
import { useDragResize } from "./hooks/useDragResize";
import { useMouseEventHandlers } from "./hooks/useMouseEventHandlers";
import "./styles/ResizablePanel.css";
import { createContainerStyles, createDividerStyles, createPanelStyles } from "./styles/resizePanelStyles";

interface VerticalPercentageResizablePanelProps {
  topContent: ReactNode;
  bottomContent: ReactNode;
  verticalContentPercentage: number;
  minPercentage?: number;
  maxPercentage?: number;
  onResize: (newPercentage: number) => void;
}

export function VerticalPercentageResizablePanel({
  topContent,
  bottomContent,
  verticalContentPercentage,
  minPercentage = 20,
  maxPercentage = 80,
  onResize,
}: VerticalPercentageResizablePanelProps) {
  const dragHandleRef = useRef<HTMLDivElement>(null);

  const { isFirstCollapsed: isTopCollapsed, isSecondCollapsed: isBottomCollapsed } = useCollapseStates({
    currentPercentage: verticalContentPercentage,
    minPercentage,
  });

  const { isDragging, containerRef, handleMouseDown, handleMouseMove, handleMouseUp } = useDragResize({
    initialPercentage: verticalContentPercentage,
    minPercentage,
    maxPercentage,
    onResize: (clampedPercentage, rawPercentage) => {
      if (rawPercentage < minPercentage / 2) {
        onResize(0); // Collapse top
      } else if (rawPercentage > 100 - minPercentage / 2) {
        onResize(100); // Collapse bottom
      } else {
        onResize(clampedPercentage);
      }
    },
    isHorizontal: false,
  });

  useMouseEventHandlers({
    dragHandleRef,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
  });

  return (
    <Box ref={containerRef} sx={createContainerStyles(false)}>
      <Box sx={createPanelStyles(`${verticalContentPercentage}%`, isTopCollapsed, isDragging, false)}>
        <div className="panel-content">{topContent}</div>
      </Box>

      <Box
        ref={dragHandleRef}
        className={`resizer-handle${isDragging ? " resizing" : ""}`}
        sx={{
          ...createDividerStyles(isDragging, isTopCollapsed || isBottomCollapsed, false),
          top: `${verticalContentPercentage}%`,
          transform: "translateY(-50%)",
        }}
      />

      <Box sx={createPanelStyles(`${100 - verticalContentPercentage}%`, isBottomCollapsed, isDragging, false)}>
        <div className="panel-content">{bottomContent}</div>
      </Box>
    </Box>
  );
}
