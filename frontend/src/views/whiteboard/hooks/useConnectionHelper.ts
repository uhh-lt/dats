import { ReactFlowState, useStore } from "reactflow";
import { isConnectionAllowed } from "../whiteboardUtils.ts";

const connectionNodeIdSelector = (state: ReactFlowState) => state.connectionNodeId;
const connectionHandleIdSelector = (state: ReactFlowState) => state.connectionHandleId;

export const useConnectionHelper = (nodeId: string) => {
  const connectionNodeId = useStore(connectionNodeIdSelector);
  const connectionHandleId = useStore(connectionHandleIdSelector);

  return {
    isConnecting: !!connectionNodeId,
    isValidDatabaseConnectionTarget:
      connectionNodeId && connectionHandleId === "database" && isConnectionAllowed(connectionNodeId, nodeId),
    isValidCustomConnectionTarget: connectionNodeId && connectionHandleId !== "database",
  };
};
