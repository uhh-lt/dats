import { Box, Card, CardProps } from "@mui/material";
import React from "react";
import { Handle, NodeResizer, Position } from "reactflow";
import "./nodes.css";
import { useConnectionHelper } from "../hooks/useConnectionHelper";

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
  const { isValidDatabaseConnectionTarget, isValidCustomConnectionTarget } = useConnectionHelper(nodeId);

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
        <Card
          {...props}
          variant="outlined"
          style={{
            height: "100%",
            position: "relative",
          }}
          sx={{
            backgroundColor: (theme) =>
              isValidDatabaseConnectionTarget
                ? theme.palette.success.light
                : allowDrawConnection
                ? theme.palette.grey[300]
                : theme.palette.grey[50],
          }}
        >
          <Handle
            className="customHandle"
            position={Position.Right}
            type="source"
            id="database"
            style={{ zIndex: 1 }}
          />

          {!allowDrawConnection && <Box className="customHandle" style={{ zIndex: 5 }} />}

          <Box
            style={{
              position: "relative",
              zIndex: 5,
              margin: "8px",
              borderRadius: "inherit",
              height: "calc(100% - 16px)",
              display: "flex",
              flexDirection: "column",
              justifyContent: alignment === "center" ? "center" : alignment === "bottom" ? "flex-end" : "flex-start",
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
