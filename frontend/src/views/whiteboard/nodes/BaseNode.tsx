import { Box, Card, CardProps } from "@mui/material";
import React from "react";
import { Handle, NodeResizer, Position } from "reactflow";
import "./nodes.css";
import { useConnectionHelper } from "./useConnectionHelper";

interface BaseNodeProps {
  children: React.ReactNode;
  selected: boolean;
  nodeId: string;
  allowDrawConnection: boolean;
}

function BaseNode({ children, selected, nodeId, allowDrawConnection, ...props }: BaseNodeProps & CardProps) {
  const { isConnecting, isValidConnectionTarget } = useConnectionHelper(nodeId);

  return (
    <>
      <NodeResizer
        isVisible={selected}
        minWidth={200}
        minHeight={100}
        handleStyle={{ width: "12px", height: "12px" }}
      />
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
            }}
            sx={{ backgroundColor: (theme) => theme.palette.background.paper }}
          >
            {children}
          </Box>
        </Card>
      </Box>
    </>
  );
}

export default BaseNode;

// import { Box, Card, CardProps } from "@mui/material";
// import React from "react";
// import { Handle, NodeResizer, Position } from "reactflow";
// import "./nodes.css";
// import { useConnectionHelper } from "./useConnectionHelper";

// interface BaseNodeProps {
//   children: React.ReactNode;
//   nodeId: string;
//   allowDrawConnection: boolean;
// }

// function BaseNode({ children, nodeId, allowDrawConnection, ...props }: BaseNodeProps & CardProps) {
//   // whiteboard state (react-flow)
//   const { isConnecting, isValidConnectionTarget } = useConnectionHelper(nodeId);

//   return (
//     <>
//       <NodeResizer
//         isVisible={props.raised}
//         minWidth={200}
//         minHeight={100}
//         handleStyle={{ width: "12px", height: "12px" }}
//       />
//       <Box padding={2} style={{ height: "100%" }}>
//         <Card
//           {...props}
//           variant={isValidConnectionTarget ? "outlined" : "elevation"}
//           style={{ height: "100%", backgroundColor: isValidConnectionTarget ? "red" : undefined }}
//         >
//           {!isConnecting && (
//             <Handle className="customHandle" position={Position.Right} type="source" style={{ zIndex: 1 }} />
//           )}

//           <Handle className="customHandle" position={Position.Left} type="target" />

//           {/* {!allowDrawConnection && <Box className="customHandle" style={{ zIndex: 5 }} />} */}

//           <Box style={{ position: "relative", zIndex: 5, margin: "16px" }}>{children}</Box>
//         </Card>
//       </Box>
//     </>
//   );
// }

// export default BaseNode;
