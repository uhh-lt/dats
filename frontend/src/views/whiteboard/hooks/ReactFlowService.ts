import { differenceBy } from "lodash";
import { useMemo } from "react";
import { Node, ReactFlowInstance } from "reactflow";
import { DATSNodeData } from "../types/DATSNodeData.ts";

export class ReactFlowService {
  zoom = 1.85;
  duration = 1000;
  timeout = 100;
  reactFlowInstance: ReactFlowInstance<DATSNodeData>;

  constructor(reactFlowInstance: ReactFlowInstance<DATSNodeData>) {
    this.reactFlowInstance = reactFlowInstance;
  }

  addNodes(nodes: Node<DATSNodeData>[]) {
    const currentNodes = this.reactFlowInstance.getNodes();
    const newNodes = differenceBy(nodes, currentNodes, "id");

    newNodes.forEach((node, index) => {
      setTimeout(() => {
        this.reactFlowInstance.addNodes(node);
      }, this.timeout * index);
    });
  }

  addNodesWithoutDelay(nodes: Node<DATSNodeData>[]) {
    const currentNodes = this.reactFlowInstance.getNodes();
    const newNodes = differenceBy(nodes, currentNodes, "id");
    this.reactFlowInstance.addNodes(newNodes);
  }
}

export const useReactFlowService = (reactFlowInstance: ReactFlowInstance<DATSNodeData>) => {
  return useMemo(() => new ReactFlowService(reactFlowInstance), [reactFlowInstance]);
};
