import { useEffect, useRef } from "react";

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
  // Store handlers in a ref to maintain stable references
  const handlersRef = useRef({ handleMouseDown, handleMouseMove, handleMouseUp });

  // Update ref values when handlers change
  handlersRef.current.handleMouseDown = handleMouseDown;
  handlersRef.current.handleMouseMove = handleMouseMove;
  handlersRef.current.handleMouseUp = handleMouseUp;

  useEffect(() => {
    const dragHandle = dragHandleRef.current;
    console.log("add resize event listener");
    if (!dragHandle) return;

    // Create stable event handler functions that read from ref
    const onMouseDown = (e: MouseEvent) => handlersRef.current.handleMouseDown(e);
    const onMouseMove = (e: MouseEvent) => handlersRef.current.handleMouseMove(e);
    const onMouseUp = (e: MouseEvent) => handlersRef.current.handleMouseUp(e);

    dragHandle.addEventListener("mousedown", onMouseDown);
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);

    return () => {
      dragHandle.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };
  }, [dragHandleRef]); // Only recreate listeners when dragHandleRef changes
}
