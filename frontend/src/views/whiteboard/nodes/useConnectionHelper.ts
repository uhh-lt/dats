import { ReactFlowState, useStore } from "reactflow";
import {
  isBBoxAnnotationNodeId,
  isCodeNodeId,
  isSdocNodeId,
  isSpanAnnotationNodeId,
  isTagNodeId,
} from "../whiteboardUtils";

const connectionNodeIdSelector = (state: ReactFlowState) => state.connectionNodeId;

const isConnectionAllowed = (sourceNodeId: string, targetNodeId: string) => {
  // do not allow self-connections
  if (sourceNodeId === targetNodeId) {
    return false;
  }

  // code can be manually connected to other code
  if (isCodeNodeId(sourceNodeId) && isCodeNodeId(targetNodeId)) {
    return true;
  }

  // tag can be manually connected to document
  if (isTagNodeId(sourceNodeId) && isSdocNodeId(targetNodeId)) {
    return true;
  }

  // codes can be manually connected to annotations
  if (isCodeNodeId(sourceNodeId) && (isSpanAnnotationNodeId(targetNodeId) || isBBoxAnnotationNodeId(targetNodeId))) {
    return true;
  }

  return false;
};

export const useConnectionHelper = (nodeId: string) => {
  const connectionNodeId = useStore(connectionNodeIdSelector);
  return {
    isConnecting: !!connectionNodeId,
    isValidConnectionTarget: connectionNodeId && isConnectionAllowed(connectionNodeId, nodeId),
  };
};
