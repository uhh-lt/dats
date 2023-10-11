import { Box, BoxProps, CardProps } from "@mui/material";
import React from "react";
import { Handle, NodeResizer, Position } from "reactflow";
import "./nodes.css";
import { useConnectionHelper } from "./useConnectionHelper";

interface BaseNodeProps {
  children: React.ReactNode;
  selected: boolean;
  nodeId: string;
  allowDrawConnection: boolean;
  alignment?: "top" | "center" | "bottom";
}

function BaseNode({ children, selected, nodeId, allowDrawConnection, alignment, ...props }: BaseNodeProps & BoxProps) {
  const { isConnecting, isValidConnectionTarget } = useConnectionHelper(nodeId);

  return (
    <>
      <NodeResizer isVisible={selected} minWidth={50} minHeight={50} handleStyle={{ width: "12px", height: "12px" }} />
      <Box padding={2} style={{ height: "100%" }}>
        <Box
          style={{
            height: "100%",
            position: "relative",
          }}
        >
          {!isConnecting && (
            <Handle className="customHandle" position={Position.Right} type="source" style={{ zIndex: 1 }} />
          )}

          <Handle className="customHandle" position={Position.Left} type="target" />

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
              alignItems: alignment === "center" ? "center" : alignment === "bottom" ? "flex-end" : "flex-start",
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
