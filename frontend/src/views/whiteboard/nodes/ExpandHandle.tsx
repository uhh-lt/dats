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

  // TODO: background color to red when handle click would delete node (otherwise green)
  // TODO: Can you use any handle type string? No:
  //  If you need multiple source or target handles you can achieve this by creating a custom node.
  //  Normally you just use the id of a node for the source or target of an edge. If you have
  //  multiple source or target handles you need to pass an id to these handles. These ids can be
  //  used by an edge with the sourceHandle and targetHandle options, so that you can connect
  //  a specific handle. If you have a node with an id = 1 and a handle with an id = a you can
  //  connect this handle by using the node source=1 and the sourceHandle=a.
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
