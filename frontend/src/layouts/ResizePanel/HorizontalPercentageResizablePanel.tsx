import { Box } from "@mui/material";
import { ReactNode, useRef } from "react";
import { useCollapseStates } from "./hooks/useCollapseStates";
import { useDragResize } from "./hooks/useDragResize";
import { useMouseEventHandlers } from "./hooks/useMouseEventHandlers";
import "./styles/ResizablePanel.css";
import { createContainerStyles, createDividerStyles, createPanelStyles } from "./styles/resizePanelStyles";

interface HorizontalPercentageResizablePanelProps {
  leftContent: ReactNode;
  rightContent: ReactNode;
  horizontalContentPercentage: number;
  minPercentage?: number;
  maxPercentage?: number;
  onResize: (newPercentage: number) => void;
}

export function HorizontalPercentageResizablePanel({
  leftContent,
  rightContent,
  horizontalContentPercentage,
  minPercentage = 20,
  maxPercentage = 80,
  onResize,
}: HorizontalPercentageResizablePanelProps) {
  const dragHandleRef = useRef<HTMLDivElement>(null);

  const { isFirstCollapsed: isLeftCollapsed, isSecondCollapsed: isRightCollapsed } = useCollapseStates({
    currentPercentage: horizontalContentPercentage,
    minPercentage,
  });

  const { isDragging, containerRef, handleMouseDown, handleMouseMove, handleMouseUp } = useDragResize({
    initialPercentage: horizontalContentPercentage,
    minPercentage,
    maxPercentage,
    onResize: (clampedPercentage, rawPercentage) => {
      if (rawPercentage < minPercentage / 2) {
        onResize(0); // Collapse left
      } else if (rawPercentage > 100 - minPercentage / 2) {
        onResize(100); // Collapse right
      } else {
        onResize(clampedPercentage);
      }
    },
    isHorizontal: true,
  });

  useMouseEventHandlers({
    dragHandleRef,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
  });

  return (
    <Box ref={containerRef} sx={createContainerStyles(true)}>
      <Box sx={createPanelStyles(`${horizontalContentPercentage}%`, isLeftCollapsed, isDragging, true)}>
        <div className="panel-content">{leftContent}</div>
      </Box>

      <Box
        ref={dragHandleRef}
        className={`resizer-handle${isDragging ? " resizing" : ""}`}
        sx={{
          ...createDividerStyles(isDragging, isLeftCollapsed || isRightCollapsed, true),
          left: `${horizontalContentPercentage}%`,
          transform: "translateX(-50%)",
        }}
      />

      <Box sx={createPanelStyles(`${100 - horizontalContentPercentage}%`, isRightCollapsed, isDragging, true)}>
        <div className="panel-content">{rightContent}</div>
      </Box>
    </Box>
  );
}
