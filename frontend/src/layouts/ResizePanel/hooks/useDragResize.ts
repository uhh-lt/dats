import { useCallback, useRef, useState } from "react";

interface DragResizeConfig {
  initialPercentage: number;
  minPercentage: number;
  maxPercentage: number;
  onResize: (newPercentage: number, rawPercentage: number) => void;
  isHorizontal?: boolean;
}

export function useDragResize({
  initialPercentage,
  minPercentage,
  maxPercentage,
  onResize,
  isHorizontal = true,
}: DragResizeConfig) {
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const startPosRef = useRef<number>(0);
  const startPercentageRef = useRef<number>(initialPercentage);
  const currentPercentageRef = useRef<number>(initialPercentage);

  const handleMouseDown = useCallback(
    (e: MouseEvent) => {
      setIsDragging(true);
      startPosRef.current = isHorizontal ? e.clientX : e.clientY;
      startPercentageRef.current = currentPercentageRef.current;
      document.body.style.cursor = isHorizontal ? "ew-resize" : "ns-resize";
    },
    [isHorizontal],
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging || !containerRef.current) return;

      const containerSize = isHorizontal ? containerRef.current.clientWidth : containerRef.current.clientHeight;

      const delta = (isHorizontal ? e.clientX : e.clientY) - startPosRef.current;
      const deltaPercentage = (delta / containerSize) * 100;
      const rawPercentage = startPercentageRef.current + deltaPercentage;

      // Clamp percentage between min and max
      const clampedPercentage = Math.max(minPercentage, Math.min(maxPercentage, rawPercentage));

      currentPercentageRef.current = clampedPercentage;
      onResize(clampedPercentage, rawPercentage);
    },
    [isDragging, maxPercentage, minPercentage, onResize, isHorizontal],
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    document.body.style.cursor = "";
  }, []);

  return {
    isDragging,
    containerRef,
    currentPercentageRef,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
  };
}
