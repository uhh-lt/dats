import { Box } from "@mui/material";
import { ReactNode, useCallback, useEffect, useRef, useState } from "react";
import "./styles/ResizablePanel.css";

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
  const [isCollapsed, setIsCollapsed] = useState(width <= COLLAPSED_WIDTH);
  const dragHandleRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef<number>(0);
  const startWidthRef = useRef<number>(width);
  const currentWidthRef = useRef<number>(width);

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
        setIsCollapsed(true);
      } else {
        setIsCollapsed(false);
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

  useEffect(() => {
    const dragHandle = dragHandleRef.current;
    if (dragHandle) {
      dragHandle.addEventListener("mousedown", handleMouseDown);
    }
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      if (dragHandle) {
        dragHandle.removeEventListener("mousedown", handleMouseDown);
      }
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [handleMouseDown, handleMouseMove, handleMouseUp]);

  // Update the current width ref and collapsed state when the width prop changes
  useEffect(() => {
    currentWidthRef.current = width;
    setIsCollapsed(width <= COLLAPSED_WIDTH);
  }, [width]);

  return (
    <Box
      sx={{
        position: "relative",
        width,
        height: "100%",
        bgcolor: "background.paper",
        borderRight: position === "left" ? "1px solid #e8eaed" : undefined,
        borderLeft: position === "right" ? "1px solid #e8eaed" : undefined,
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
          position: "absolute",
          top: 0,
          // Place handle on right side for left panel, left side for right panel
          [position === "left" ? "right" : "left"]: -4,
          width: 8,
          height: "100%",
          cursor: "ew-resize",
          zIndex: 2,
          "&:hover": {
            "&::after": {
              opacity: 0.5,
            },
          },
          "&::after": {
            content: '""',
            position: "absolute",
            top: 0,
            bottom: 0,
            left: "50%",
            width: 2,
            bgcolor: isCollapsed ? "primary.main" : isDragging ? "primary.main" : "grey.300",
            opacity: isCollapsed ? 0.5 : isDragging ? 1 : 0,
            transform: "translateX(-50%)",
            transition: "opacity 0.2s",
          },
        }}
      />
    </Box>
  );
}
