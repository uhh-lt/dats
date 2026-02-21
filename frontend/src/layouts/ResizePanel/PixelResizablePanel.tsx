import { Box } from "@mui/material";
import { memo, ReactNode, useCallback, useRef, useState } from "react";
import { DragHandler } from "./DragHandler.tsx";
import { useMouseEventHandlers } from "./hooks/useMouseEventHandlers.ts";

interface PixelResizablePanelProps {
  children: ReactNode;
  size: number;
  minSize?: number;
  maxSize?: number;
  onResize: (newSize: number) => void;
  position: "left" | "right" | "top" | "bottom";
  isHorizontal?: boolean;
}

const COLLAPSED_SIZE = 4; // Size when fully collapsed

export const PixelResizablePanel = memo((
  {
    children,
    size,
    minSize = 200,
    maxSize = 800,
    onResize,
    position,
    isHorizontal = false,
  }: PixelResizablePanelProps
) => {
  const dragHandleRef = useRef<HTMLDivElement>(null);

  const isCollapsed = size <= COLLAPSED_SIZE;

  const [isDragging, setIsDragging] = useState(false);
  const startPosRef = useRef<number>(0);
  const startSizeRef = useRef<number>(size);
  const currentSizeRef = useRef<number>(size);

  const handleMouseDown = useCallback(
    (e: MouseEvent) => {
      setIsDragging(true);
      startPosRef.current = isHorizontal ? e.clientX : e.clientY;
      startSizeRef.current = currentSizeRef.current;
      document.body.style.cursor = isHorizontal ? "ew-resize" : "ns-resize";
    },
    [isHorizontal],
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging) return;

      const delta = (isHorizontal ? e.clientX : e.clientY) - startPosRef.current;
      let newSize;

      if (position === "left" || position === "top") {
        newSize = startSizeRef.current + delta;
      } else {
        newSize = startSizeRef.current - delta;
      }

      // Handle collapsing behavior
      if (newSize < minSize / 2) {
        // Use half of minSize as collapse threshold
        newSize = COLLAPSED_SIZE;
      } else {
        // Clamp size between min and max when not collapsed
        newSize = Math.max(minSize, Math.min(maxSize, newSize));
      }

      currentSizeRef.current = newSize;
      onResize(newSize);
    },
    [isDragging, maxSize, minSize, onResize, position, isHorizontal],
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

  const isLeftOrTop = position === "left" || position === "top";

  return (
    <Box
      sx={{
        ...(isHorizontal
          ? {
              width: size,
              height: "100%",
            }
          : {
              width: "100%",
              height: size,
            }),
        display: "flex",
        flexDirection: "column",
        position: "relative",
        bgcolor: "background.paper",
      }}
    >
      {!isCollapsed && <div className="panel-content">{children}</div>}
      <DragHandler
        dragHandleRef={dragHandleRef}
        isDragging={isDragging}
        isCollapsed={isCollapsed}
        isHorizontal={isHorizontal}
        style={
          isHorizontal
            ? {
                top: 0,
                [isLeftOrTop ? "right" : "left"]: -4,
              }
            : {
                left: 0,
                [isLeftOrTop ? "bottom" : "top"]: -4,
              }
        }
      />
    </Box>
  );
});
