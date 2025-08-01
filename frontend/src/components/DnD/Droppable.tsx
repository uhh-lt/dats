import { useDroppable } from "@dnd-kit/core";

interface DroppableProps {
  id: string;
  children: React.ReactNode;
  Element?: React.ElementType;
}

export default function Droppable({ id, children, Element = "div" }: DroppableProps) {
  const { isOver, setNodeRef } = useDroppable({ id });
  return (
    <Element
      ref={setNodeRef}
      style={{
        background: isOver ? "#ffaaaa" : undefined,
        borderRadius: isOver ? 4 : undefined,
      }}
    >
      {children}
    </Element>
  );
}
