import { useDroppable } from "@dnd-kit/core";
import { alpha, useTheme } from "@mui/material";

interface DroppableProps {
  id: string;
  children: React.ReactNode;
  Element?: React.ElementType;
}

export default function Droppable({ id, children, Element = "div" }: DroppableProps) {
  const theme = useTheme();
  const { isOver, setNodeRef } = useDroppable({ id });
  return (
    <Element
      ref={setNodeRef}
      style={{
        background: isOver ? alpha(theme.palette.success.light, 0.33) : undefined,
        borderRadius: isOver ? 4 : undefined,
      }}
    >
      {children}
    </Element>
  );
}
