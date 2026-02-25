import { XYPosition } from "reactflow";
import { ReactFlowService } from "../_hooks/ReactFlowService";

export type PendingAddNodeAction = (position: XYPosition, reactFlowService: ReactFlowService) => void;
