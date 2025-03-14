import { Box } from "@mui/material";
import { ReactNode, useCallback, useEffect, useRef, useState } from "react";
import "./ResizablePanel.css";

interface HorizontalPercentageResizablePanelProps {
  leftContent: ReactNode;
  rightContent: ReactNode;
  horizontalContentPercentage: number;
  minPercentage?: number;
  maxPercentage?: number;
  onResize: (newPercentage: number) => void;
}

const COLLAPSED_LEFT = 0; // Percentage when left is fully collapsed
const COLLAPSED_RIGHT = 100; // Percentage when right is fully collapsed

export function HorizontalPercentageResizablePanel({
  leftContent,
  rightContent,
  horizontalContentPercentage,
  minPercentage = 20,
  maxPercentage = 80,
  onResize,
}: HorizontalPercentageResizablePanelProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isLeftCollapsed, setIsLeftCollapsed] = useState(horizontalContentPercentage <= COLLAPSED_LEFT);
  const [isRightCollapsed, setIsRightCollapsed] = useState(horizontalContentPercentage >= COLLAPSED_RIGHT);
  const dragHandleRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef<number>(0);
  const startPercentageRef = useRef<number>(horizontalContentPercentage);
  const containerRef = useRef<HTMLDivElement>(null);
  const currentPercentageRef = useRef<number>(horizontalContentPercentage);

  const handleMouseDown = useCallback((e: MouseEvent) => {
    setIsDragging(true);
    startXRef.current = e.clientX;
    startPercentageRef.current = currentPercentageRef.current;
    document.body.style.cursor = "ew-resize";
  }, []);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging || !containerRef.current) return;

      const containerWidth = containerRef.current.clientWidth;
      const dx = e.clientX - startXRef.current;
      const deltaPercentage = (dx / containerWidth) * 100;
      let newPercentage = startPercentageRef.current + deltaPercentage;

      // Handle collapsing behavior
      if (newPercentage < minPercentage / 2) {
        newPercentage = COLLAPSED_LEFT;
        setIsLeftCollapsed(true);
        setIsRightCollapsed(false);
      } else if (newPercentage > 100 - minPercentage / 2) {
        newPercentage = COLLAPSED_RIGHT;
        setIsRightCollapsed(true);
        setIsLeftCollapsed(false);
      } else {
        setIsLeftCollapsed(false);
        setIsRightCollapsed(false);
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
    currentPercentageRef.current = horizontalContentPercentage;
    setIsLeftCollapsed(horizontalContentPercentage <= COLLAPSED_LEFT);
    setIsRightCollapsed(horizontalContentPercentage >= COLLAPSED_RIGHT);
  }, [horizontalContentPercentage]);

  return (
    <Box
      ref={containerRef}
      sx={{
        display: "flex",
        width: "100%",
        height: "100%",
        position: "relative",
        bgcolor: "background.paper",
      }}
    >
      <Box
        sx={{
          width: `${horizontalContentPercentage}%`,
          height: "100%",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          transition: isDragging ? undefined : "width 0.15s ease-out",
          visibility: isLeftCollapsed ? "collapse" : "visible",
        }}
      >
        <div className="panel-content">{leftContent}</div>
      </Box>

      <Box
        ref={dragHandleRef}
        className={`resizer-handle${isDragging ? " resizing" : ""}`}
        sx={{
          position: "absolute",
          left: `${horizontalContentPercentage}%`,
          transform: "translateX(-50%)",
          width: 8,
          height: "100%",
          cursor: "ew-resize",
          zIndex: 2,
          "&:hover": {
            "&::after": {
              bgcolor: isDragging ? "primary.main" : "grey.500", // Primary during drag, darker grey on hover
              opacity: isDragging ? 1 : 0.8,
            },
          },
          "&::after": {
            content: '""',
            position: "absolute",
            top: 0,
            bottom: 0,
            left: "50%",
            width: 2,
            bgcolor: isLeftCollapsed || isRightCollapsed ? "primary.main" : isDragging ? "primary.main" : "grey.400",
            opacity: isLeftCollapsed || isRightCollapsed ? 0.5 : isDragging ? 1 : 0.3, // Always visible with lower opacity in normal state
            transform: "translateX(-50%)",
            transition: "opacity 0.2s, background-color 0.2s",
          },
        }}
      />

      <Box
        sx={{
          width: `${100 - horizontalContentPercentage}%`,
          height: "100%",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          transition: isDragging ? undefined : "width 0.15s ease-out",
          visibility: isRightCollapsed ? "collapse" : "visible",
          flex: isRightCollapsed ? "0 0 0" : "1 1 auto",
        }}
      >
        <div className="panel-content">{rightContent}</div>
      </Box>
    </Box>
  );
}
