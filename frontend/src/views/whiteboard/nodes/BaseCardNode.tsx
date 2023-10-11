import { Box, Card, CardProps } from "@mui/material";
import React from "react";
import { Handle, NodeResizer, Position } from "reactflow";
import "./nodes.css";
import { useConnectionHelper } from "./useConnectionHelper";

interface BaseCardNodeProps {
  children: React.ReactNode;
  selected: boolean;
  nodeId: string;
  allowDrawConnection: boolean;
  backgroundColor?: string;
  alignment?: "top" | "center" | "bottom";
}

function BaseCardNode({
  children,
  selected,
  nodeId,
  allowDrawConnection,
  backgroundColor,
  alignment,
  ...props
}: BaseCardNodeProps & CardProps) {
  const { isConnecting, isValidConnectionTarget } = useConnectionHelper(nodeId);

  return (
    <>
      <NodeResizer isVisible={selected} minWidth={50} minHeight={50} handleStyle={{ width: "12px", height: "12px" }} />
      <Box padding={2} style={{ height: "100%" }}>
        <Card
          {...props}
          variant="outlined"
          style={{
            height: "100%",
            position: "relative",
          }}
          sx={{
            backgroundColor: (theme) =>
              isValidConnectionTarget
                ? theme.palette.success.light
                : allowDrawConnection
                ? theme.palette.grey[300]
                : theme.palette.grey[50],
          }}
        >
          {!isConnecting && (
            <Handle className="customHandle" position={Position.Right} type="source" style={{ zIndex: 1 }} />
          )}

          <Handle className="customHandle" position={Position.Left} type="target" />

          {!allowDrawConnection && <Box className="customHandle" style={{ zIndex: 5 }} />}

          <Box
            style={{
              position: "relative",
              zIndex: 5,
              margin: "8px",
              borderRadius: "inherit",
              height: "calc(100% - 16px)",
              display: "flex",
              alignItems: alignment === "center" ? "center" : alignment == "bottom" ? "flex-end" : "flex-start",
            }}
            sx={{ backgroundColor: backgroundColor ? backgroundColor : (theme) => theme.palette.background.paper }}
          >
            {children}
          </Box>
        </Card>
      </Box>
    </>
  );
}

export default BaseCardNode;
