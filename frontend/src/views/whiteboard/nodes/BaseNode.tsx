import { Box, Card, CardProps } from "@mui/material";
import React from "react";
import { Handle, NodeResizer, Position, ReactFlowState, useStore } from "reactflow";
import "./nodes.css";

const connectionNodeIdSelector = (state: ReactFlowState) => state.connectionNodeId;

interface BaseNodeProps {
  children: React.ReactNode;
}

function BaseNode({ children, ...props }: BaseNodeProps & CardProps) {
  // whiteboard state (react-flow)
  const connectionNodeId = useStore(connectionNodeIdSelector);
  const isConnecting = !!connectionNodeId;

  return (
    <>
      <NodeResizer
        isVisible={props.raised}
        minWidth={200}
        minHeight={100}
        handleStyle={{ width: "12px", height: "12px" }}
      />
      <Box padding={2} style={{ height: "100%" }}>
        <Card {...props} style={{ height: "100%" }}>
          {!isConnecting && (
            <Handle className="customHandle" position={Position.Right} type="source" style={{ zIndex: 1 }} />
          )}

          <Handle className="customHandle" position={Position.Left} type="target" />

          <Box style={{ position: "relative", zIndex: 5, margin: "16px" }}>{children}</Box>
        </Card>
      </Box>
    </>
  );
}

export default BaseNode;
