import { useEffect } from "react";

interface MouseEventHandlersConfig {
  dragHandleRef: React.RefObject<HTMLElement>;
  handleMouseDown: (e: MouseEvent) => void;
  handleMouseMove: (e: MouseEvent) => void;
  handleMouseUp: (e: MouseEvent) => void;
}

export function useMouseEventHandlers({
  dragHandleRef,
  handleMouseDown,
  handleMouseMove,
  handleMouseUp,
}: MouseEventHandlersConfig) {
  useEffect(() => {
    console.log("add event listeners");
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
  }, [dragHandleRef, handleMouseDown, handleMouseMove, handleMouseUp]);
}
