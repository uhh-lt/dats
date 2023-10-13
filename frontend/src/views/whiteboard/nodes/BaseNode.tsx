import { Box, BoxProps } from "@mui/material";
import React from "react";
import { Handle, NodeResizer, Position } from "reactflow";
import "./nodes.css";
import { useConnectionHelper } from "../hooks/useConnectionHelper";

interface BaseNodeProps {
  children: React.ReactNode;
  selected: boolean;
  nodeId: string;
  allowDrawConnection: boolean;
  alignment?: "top" | "center" | "bottom";
}

function BaseNode({ children, selected, nodeId, allowDrawConnection, alignment, ...props }: BaseNodeProps & BoxProps) {
  const { isValidCustomConnectionTarget } = useConnectionHelper(nodeId);

  return (
    <>
      <NodeResizer isVisible={selected} minWidth={50} minHeight={50} handleStyle={{ width: "12px", height: "12px" }} />
      {[Position.Top, Position.Right, Position.Bottom, Position.Left].map((position) => (
        <Handle
          key={position}
          type="source"
          position={position}
          id={position}
          style={{
            width: "12px",
            height: "12px",
            [position]: "-20px",
            background: !isValidCustomConnectionTarget && !selected ? "transparent" : undefined,
          }}
        />
      ))}
      <Box padding={2} style={{ height: "100%" }}>
        <Box
          style={{
            height: "100%",
            position: "relative",
          }}
        >
          {!allowDrawConnection && <Box className="customHandle" style={{ zIndex: 5 }} />}

          <Box
            {...props}
            style={{
              ...props.style,
              position: "relative",
              zIndex: 5,
              margin: "8px",
              borderRadius: props.style?.borderRadius ? props.style.borderRadius : "inherit",
              height: "calc(100% - 16px)",
              display: "flex",
              flexDirection: "column",
              justifyContent: alignment === "center" ? "center" : alignment === "bottom" ? "flex-end" : "flex-start",
            }}
          >
            {children}
          </Box>
        </Box>
      </Box>
    </>
  );
}

export default BaseNode;
