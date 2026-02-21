import { ComponentProps, memo, useEffect, useState } from "react";
import { Droppable } from "react-beautiful-dnd";

export const StrictModeDroppable = memo(({ children, ...props }: ComponentProps<typeof Droppable>) => {
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
});
