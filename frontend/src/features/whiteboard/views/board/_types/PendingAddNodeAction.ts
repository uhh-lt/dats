import { XYPosition } from "@xyflow/react";
import { ReactFlowService } from "../_hooks/ReactFlowService";

export type PendingAddNodeAction = (position: XYPosition, reactFlowService: ReactFlowService) => void;
