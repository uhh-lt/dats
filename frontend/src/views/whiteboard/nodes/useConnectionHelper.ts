import { ReactFlowState, useStore } from "reactflow";
import { isConnectionAllowed } from "../whiteboardUtils";

const connectionNodeIdSelector = (state: ReactFlowState) => state.connectionNodeId;

export const useConnectionHelper = (nodeId: string) => {
  const connectionNodeId = useStore(connectionNodeIdSelector);
  return {
    isConnecting: !!connectionNodeId,
    isValidConnectionTarget: connectionNodeId && isConnectionAllowed(connectionNodeId, nodeId),
  };
};
