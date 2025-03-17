import { Box } from "@mui/material";
import { ReactNode, useCallback, useRef, useState } from "react";
import { useMouseEventHandlers } from "./hooks/useMouseEventHandlers.ts";
import "./styles/ResizablePanel.css";
import { createDividerStyles } from "./styles/resizePanelStyles.ts";

interface ResizablePanelProps {
  children: ReactNode;
  width: number;
  minWidth?: number;
  maxWidth?: number;
  onResize: (newWidth: number) => void;
  position: "left" | "right";
}

const COLLAPSED_WIDTH = 4; // Width when fully collapsed

export function HorizontalResizablePanel({
  children,
  width,
  minWidth = 200,
  maxWidth = 800,
  onResize,
  position,
}: ResizablePanelProps) {
  const [isDragging, setIsDragging] = useState(false);
  const dragHandleRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef<number>(0);
  const startWidthRef = useRef<number>(width);
  const currentWidthRef = useRef<number>(width);
  const isCollapsed = width <= COLLAPSED_WIDTH;

  const handleMouseDown = useCallback((e: MouseEvent) => {
    setIsDragging(true);
    startXRef.current = e.clientX;
    startWidthRef.current = currentWidthRef.current;
    document.body.style.cursor = "ew-resize";
  }, []);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging) return;

      const dx = e.clientX - startXRef.current;
      let newWidth = position === "left" ? startWidthRef.current + dx : startWidthRef.current - dx;

      // Handle collapsing behavior
      if (newWidth < minWidth / 2) {
        // Use half of minWidth as collapse threshold
        newWidth = COLLAPSED_WIDTH;
      } else {
        // Clamp width between min and max when not collapsed
        newWidth = Math.max(minWidth, Math.min(maxWidth, newWidth));
      }

      currentWidthRef.current = newWidth;
      onResize(newWidth);
    },
    [isDragging, maxWidth, minWidth, onResize, position],
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    document.body.style.cursor = "";
  }, []);

  useMouseEventHandlers({
    dragHandleRef,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
  });

  return (
    <Box
      sx={{
        position: "relative",
        width,
        height: "100%",
        bgcolor: "background.paper",
        display: "flex",
        flexDirection: "column",
        transition: isDragging ? undefined : "width 0.15s ease-out",
      }}
    >
      {!isCollapsed && <div className="panel-content">{children}</div>}
      <Box
        ref={dragHandleRef}
        className={`resizer-handle${isDragging ? " resizing" : ""}`}
        sx={{
          ...createDividerStyles(isDragging, isCollapsed, true),
          top: 0,
          // Place handle on right side for left panel, left side for right panel
          [position === "left" ? "right" : "left"]: -4,
        }}
      />
    </Box>
  );
}
