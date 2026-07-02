import { useConnection } from "@xyflow/react";
import { isConnectionAllowed } from "../_utils/whiteboardUtils";

export const useConnectionHelper = (nodeId: string) => {
  const connection = useConnection();
  const connectionNodeId = connection.fromNode?.id;
  const connectionHandleId = connection.fromHandle?.id;

  return {
    isConnecting: connection.inProgress,
    isValidDatabaseConnectionTarget:
      !!connectionNodeId && connectionHandleId === "database" && isConnectionAllowed(connectionNodeId, nodeId),
    isValidCustomConnectionTarget: !!connectionNodeId && connectionHandleId !== "database",
  };
};
