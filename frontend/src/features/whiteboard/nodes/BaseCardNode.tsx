import { Box, Card, CardProps } from "@mui/material";
import {ReactNode} from "react";
import { Handle, NodeProps, NodeResizer, Position } from "reactflow";
import "./nodes.css";
import { useConnectionHelper } from "../hooks/useConnectionHelper.ts";

interface BaseCardNodeProps {
  children: ReactNode;
  nodeProps: NodeProps;
  allowDrawConnection: boolean;
  backgroundColor?: string;
  alignment?: "top" | "center" | "bottom";
}

export function BaseCardNode({
  children,
  nodeProps,
  allowDrawConnection,
  backgroundColor,
  alignment,
  ...props
}: BaseCardNodeProps & CardProps) {
  const { isValidDatabaseConnectionTarget, isValidCustomConnectionTarget } = useConnectionHelper(nodeProps.id);

  return (
    <>
      <NodeResizer
        isVisible={nodeProps.selected}
        minWidth={50}
        minHeight={50}
        handleStyle={{ width: "12px", height: "12px" }}
      />
      {[Position.Top, Position.Right, Position.Bottom, Position.Left].map((position) => (
        <Handle
          key={position}
          isConnectable={nodeProps.isConnectable}
          type="source"
          position={position}
          id={position}
          style={{
            width: "12px",
            height: "12px",
            [position]: "-20px",
            background: !isValidCustomConnectionTarget && !nodeProps.selected ? "transparent" : undefined,
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
            isConnectable={nodeProps.isConnectable}
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
