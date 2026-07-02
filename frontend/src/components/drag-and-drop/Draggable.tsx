import { Data, useDraggable } from "@dnd-kit/core";

interface DraggableProps {
  id: string;
  data: Data;
  children: React.ReactNode;
  Element?: React.ElementType;
}

export function Draggable({ id, data, children, Element = "div" }: DraggableProps) {
  const { setNodeRef, isDragging, listeners, attributes } = useDraggable({ id, data });

  return (
    <Element
      ref={setNodeRef}
      style={{
        cursor: isDragging ? "grabbing" : "grab",
      }}
      {...listeners}
      {...attributes}
    >
      {children}
    </Element>
  );
}
