import { XYPosition } from "reactflow";
import { ReactFlowService } from "../hooks/ReactFlowService";

export type PendingAddNodeAction = (position: XYPosition, reactFlowService: ReactFlowService) => void;
