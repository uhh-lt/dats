import { Box } from "@mui/material";
import { ReactNode, useCallback, useEffect, useRef, useState } from "react";
import "./ResizablePanel.css";

interface VerticalPercentageResizablePanelProps {
  topContent: ReactNode;
  bottomContent: ReactNode;
  verticalContentPercentage: number;
  minPercentage?: number;
  maxPercentage?: number;
  onResize: (newPercentage: number) => void;
}

const COLLAPSED_TOP = 0; // Percentage when top is fully collapsed
const COLLAPSED_BOTTOM = 100; // Percentage when bottom is fully collapsed

export function VerticalPercentageResizablePanel({
  topContent,
  bottomContent,
  verticalContentPercentage,
  minPercentage = 20,
  maxPercentage = 80,
  onResize,
}: VerticalPercentageResizablePanelProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isTopCollapsed, setIsTopCollapsed] = useState(verticalContentPercentage <= COLLAPSED_TOP);
  const [isBottomCollapsed, setIsBottomCollapsed] = useState(verticalContentPercentage >= COLLAPSED_BOTTOM);
  const dragHandleRef = useRef<HTMLDivElement>(null);
  const startYRef = useRef<number>(0);
  const startPercentageRef = useRef<number>(verticalContentPercentage);
  const containerRef = useRef<HTMLDivElement>(null);
  const currentPercentageRef = useRef<number>(verticalContentPercentage);

  const handleMouseDown = useCallback((e: MouseEvent) => {
    setIsDragging(true);
    startYRef.current = e.clientY;
    startPercentageRef.current = currentPercentageRef.current;
    document.body.style.cursor = "ns-resize";
  }, []);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging || !containerRef.current) return;

      const containerHeight = containerRef.current.clientHeight;
      const dy = e.clientY - startYRef.current;
      const deltaPercentage = (dy / containerHeight) * 100;
      let newPercentage = startPercentageRef.current + deltaPercentage;

      // Handle collapsing behavior
      if (newPercentage < minPercentage / 2) {
        newPercentage = COLLAPSED_TOP;
        setIsTopCollapsed(true);
        setIsBottomCollapsed(false);
      } else if (newPercentage > 100 - minPercentage / 2) {
        newPercentage = COLLAPSED_BOTTOM;
        setIsBottomCollapsed(true);
        setIsTopCollapsed(false);
      } else {
        setIsTopCollapsed(false);
        setIsBottomCollapsed(false);
        // Clamp percentage between min and max when not collapsed
        newPercentage = Math.max(minPercentage, Math.min(maxPercentage, newPercentage));
      }

      currentPercentageRef.current = newPercentage;
      onResize(newPercentage);
    },
    [isDragging, maxPercentage, minPercentage, onResize],
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

  // Update states when the percentage prop changes
  useEffect(() => {
    currentPercentageRef.current = verticalContentPercentage;
    setIsTopCollapsed(verticalContentPercentage <= COLLAPSED_TOP);
    setIsBottomCollapsed(verticalContentPercentage >= COLLAPSED_BOTTOM);
  }, [verticalContentPercentage]);

  return (
    <Box
      ref={containerRef}
      sx={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%",
        position: "relative",
        bgcolor: "background.paper",
      }}
    >
      <Box
        sx={{
          width: "100%",
          height: `${verticalContentPercentage}%`,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          transition: isDragging ? undefined : "height 0.15s ease-out",
          visibility: isTopCollapsed ? "collapse" : "visible",
        }}
      >
        <div className="panel-content">{topContent}</div>
      </Box>

      <Box
        ref={dragHandleRef}
        className={`resizer-handle${isDragging ? " resizing" : ""}`}
        sx={{
          position: "absolute",
          top: `${verticalContentPercentage}%`,
          transform: "translateY(-50%)",
          height: 8,
          width: "100%",
          cursor: "ns-resize",
          zIndex: 2,
          "&:hover": {
            "&::after": {
              bgcolor: isDragging ? "primary.main" : "grey.500",
              opacity: isDragging ? 1 : 0.8,
            },
          },
          "&::after": {
            content: '""',
            position: "absolute",
            left: 0,
            right: 0,
            top: "50%",
            height: 2,
            bgcolor: isTopCollapsed || isBottomCollapsed ? "primary.main" : isDragging ? "primary.main" : "grey.400",
            opacity: isTopCollapsed || isBottomCollapsed ? 0.5 : isDragging ? 1 : 0.3,
            transform: "translateY(-50%)",
            transition: "opacity 0.2s, background-color 0.2s",
          },
        }}
      />

      <Box
        sx={{
          width: "100%",
          height: `${100 - verticalContentPercentage}%`,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          transition: isDragging ? undefined : "height 0.15s ease-out",
          visibility: isBottomCollapsed ? "collapse" : "visible",
          flex: isBottomCollapsed ? "0 0 0" : "1 1 auto",
        }}
      >
        <div className="panel-content">{bottomContent}</div>
      </Box>
    </Box>
  );
}
