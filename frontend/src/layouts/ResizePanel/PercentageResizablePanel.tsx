import { Box } from "@mui/material";
import { ReactNode, useCallback, useRef } from "react";
import { useMouseEventHandlers } from "./hooks/useMouseEventHandlers";
import "./styles/ResizablePanel.css";
import { createContainerStyles, createDividerStyles, createPanelStyles } from "./styles/resizePanelStyles";

interface PercentageResizablePanelProps {
  firstContent: ReactNode;
  secondContent: ReactNode;
  contentPercentage: number;
  minPercentage?: number;
  maxPercentage?: number;
  onResize: (newPercentage: number) => void;
  isHorizontal?: boolean;
}

export function PercentageResizablePanel({
  firstContent,
  secondContent,
  contentPercentage,
  minPercentage = 20,
  maxPercentage = 80,
  onResize,
  isHorizontal = false,
}: PercentageResizablePanelProps) {
  const dragHandleRef = useRef<HTMLDivElement>(null);

  const isFirstCollapsed = contentPercentage <= minPercentage / 2;
  const isSecondCollapsed = contentPercentage >= 100 - minPercentage / 2;

  const containerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef<boolean>(false);
  const startPosRef = useRef<number>(0);
  const startPercentageRef = useRef<number>(contentPercentage);
  const currentPercentageRef = useRef<number>(contentPercentage);

  const handleMouseDown = useCallback(
    (e: MouseEvent) => {
      isDraggingRef.current = true;
      startPosRef.current = isHorizontal ? e.clientX : e.clientY;
      startPercentageRef.current = currentPercentageRef.current;
      document.body.style.cursor = isHorizontal ? "ew-resize" : "ns-resize";
    },
    [isHorizontal],
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDraggingRef.current || !containerRef.current) return;

      const containerSize = isHorizontal ? containerRef.current.clientWidth : containerRef.current.clientHeight;

      const delta = (isHorizontal ? e.clientX : e.clientY) - startPosRef.current;
      const deltaPercentage = (delta / containerSize) * 100;
      const rawPercentage = startPercentageRef.current + deltaPercentage;

      // Clamp percentage between min and max
      const clampedPercentage = Math.max(minPercentage, Math.min(maxPercentage, rawPercentage));

      currentPercentageRef.current = clampedPercentage;

      if (rawPercentage < minPercentage / 2) {
        onResize(0); // Collapse top
      } else if (rawPercentage > 100 - minPercentage / 2) {
        onResize(100); // Collapse bottom
      } else {
        onResize(clampedPercentage);
      }
    },
    [maxPercentage, minPercentage, onResize, isHorizontal],
  );

  const handleMouseUp = useCallback(() => {
    isDraggingRef.current = false;
    document.body.style.cursor = "";
  }, []);

  useMouseEventHandlers({
    dragHandleRef,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
  });

  return (
    <Box ref={containerRef} sx={createContainerStyles(isHorizontal)}>
      {!isFirstCollapsed && (
        <Box sx={createPanelStyles(`${contentPercentage}%`, isDraggingRef.current, isHorizontal)}>
          <div className="panel-content">{firstContent}</div>
        </Box>
      )}

      <Box
        ref={dragHandleRef}
        className={`resizer-handle${isDraggingRef.current ? " resizing" : ""}`}
        sx={{
          ...createDividerStyles(isDraggingRef.current, isFirstCollapsed || isSecondCollapsed, isHorizontal),
          top: !isHorizontal ? `${contentPercentage}%` : null,
          left: isHorizontal ? `${contentPercentage}%` : null,
          transform: isHorizontal ? "translateX(-50%)" : "translateY(-50%)",
        }}
      />

      {!isSecondCollapsed && (
        <Box sx={createPanelStyles(`${100 - contentPercentage}%`, isDraggingRef.current, isHorizontal)}>
          <div className="panel-content">{secondContent}</div>
        </Box>
      )}
    </Box>
  );
}
