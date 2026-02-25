import { Data, useDraggable } from "@dnd-kit/core";

interface DraggableProps {
  id: string;
  data: Data;
  children: React.ReactNode;
  Element?: React.ElementType;
}

export function Draggable({ id, data, children, Element = "div" }: DraggableProps) {
  const draggable = useDraggable({ id, data });
  return (
    <Element
      ref={draggable.setNodeRef}
      style={{
        cursor: draggable.isDragging ? "grabbing" : "grab",
      }}
      {...draggable.listeners}
      {...draggable.attributes}
    >
      {children}
    </Element>
  );
}
