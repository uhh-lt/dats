import React, { memo, useEffect, useState } from "react";
import { Droppable } from "react-beautiful-dnd";

// Wrapper component for react-beautiful-dnd to work with React 18 StrictMode
function StrictModeDroppable({ children, ...props }: React.ComponentProps<typeof Droppable>) {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const animation = requestAnimationFrame(() => setEnabled(true));
    return () => {
      cancelAnimationFrame(animation);
      setEnabled(false);
    };
  }, []);

  if (!enabled) {
    return null;
  }

  return <Droppable {...props}>{children}</Droppable>;
}

export default memo(StrictModeDroppable);
