import { differenceBy } from "lodash";
import { useMemo } from "react";
import { Node, ReactFlowInstance } from "reactflow";
import { DWTSNodeData } from "../types";

class ReactFlowService {
  zoom = 1.85;
  duration = 1000;
  timeout = 100;
  reactFlowInstance: ReactFlowInstance<DWTSNodeData, any>;

  constructor(reactFlowInstance: ReactFlowInstance<DWTSNodeData, any>) {
    this.reactFlowInstance = reactFlowInstance;
  }

  addNodes(nodes: Node<DWTSNodeData>[]) {
    const currentNodes = this.reactFlowInstance.getNodes();
    const newNodes = differenceBy(nodes, currentNodes, "id");

    newNodes.forEach((node, index) => {
      setTimeout(() => {
        this.reactFlowInstance.addNodes(node);
      }, this.timeout * index);
    });

    // if we actually added a new node, zoom in
    if (newNodes.length > 0) {
      this.reactFlowInstance.setCenter(newNodes[0].position.x, newNodes[0].position.y, {
        zoom: this.zoom,
        duration: this.duration,
      });
    }
  }
}

export const useReactFlowService = (reactFlowInstance: ReactFlowInstance<DWTSNodeData, any>) => {
  return useMemo(() => new ReactFlowService(reactFlowInstance), [reactFlowInstance]);
};
