import React, { useState } from "react";
import { Handle, Position } from "reactflow";
import "./nodes.css";

interface ExpandHandleProps {
  id: string;
  handleType: any;
  position: Position;
  isConnectable: boolean;
}

function ExpandHandle({ id, handleType, position, isConnectable }: ExpandHandleProps) {
  const hoverRadius = 50;
  const [hovering, setHovering] = useState<boolean>(false);

  return (
    <Handle
      id={id}
      type={handleType}
      position={position}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      style={{
        width: hovering ? hoverRadius : 6,
        height: hovering ? hoverRadius : 6,
        marginTop: hovering && position === Position.Top ? -hoverRadius / 2 : 0,
        marginBottom: hovering && position === Position.Bottom ? -hoverRadius / 2 : 0,
      }}
      isConnectable={isConnectable}
    />
  );
}

export default ExpandHandle;
