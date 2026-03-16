import { ReactFlowInstance } from "@xyflow/react";
import { differenceBy } from "lodash";
import { useMemo } from "react";
import { DATSNode } from "../_types/DATSNode";
import { DATSEdge } from "../_types/DATSEdge";

export class ReactFlowService {
  zoom = 1.85;
  duration = 1000;
  timeout = 100;
  reactFlowInstance: ReactFlowInstance<DATSNode, DATSEdge>;

  constructor(reactFlowInstance: ReactFlowInstance<DATSNode, DATSEdge>) {
    this.reactFlowInstance = reactFlowInstance;
  }

  addNodes(nodes: DATSNode[]) {
    const currentNodes = this.reactFlowInstance.getNodes();
    const newNodes = differenceBy(nodes, currentNodes, "id");

    newNodes.forEach((node, index) => {
      setTimeout(() => {
        this.reactFlowInstance.addNodes(node);
      }, this.timeout * index);
    });
  }

  addNodesWithoutDelay(nodes: DATSNode[]) {
    const currentNodes = this.reactFlowInstance.getNodes();
    const newNodes = differenceBy(nodes, currentNodes, "id");
    this.reactFlowInstance.addNodes(newNodes);
  }
}

export const useReactFlowService = (reactFlowInstance: ReactFlowInstance<DATSNode, DATSEdge>) => {
  return useMemo(() => new ReactFlowService(reactFlowInstance), [reactFlowInstance]);
};
