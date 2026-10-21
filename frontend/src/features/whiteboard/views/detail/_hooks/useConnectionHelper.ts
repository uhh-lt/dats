import { ReactFlowState, useStore } from "@xyflow/react";
import { isConnectionAllowed } from "../_utils/whiteboardUtils";

export const useConnectionHelper = (nodeId: string) => {
  const connectionNodeId = useStore((state: ReactFlowState) => state.connection.fromNode?.id);
  const connectionHandleId = useStore((state: ReactFlowState) => state.connection.fromHandle?.id);
  const isConnecting = useStore((state: ReactFlowState) => state.connection.inProgress);

  return {
    isConnecting,
    isValidDatabaseConnectionTarget:
      !!connectionNodeId && connectionHandleId === "database" && isConnectionAllowed(connectionNodeId, nodeId),
    isValidCustomConnectionTarget: !!connectionNodeId && connectionHandleId !== "database",
  };
};
