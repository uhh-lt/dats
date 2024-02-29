import { XYPosition } from "reactflow";
import { ReactFlowService } from "../hooks/ReactFlowService.ts";

export type PendingAddNodeAction = (position: XYPosition, reactFlowService: ReactFlowService) => void;
