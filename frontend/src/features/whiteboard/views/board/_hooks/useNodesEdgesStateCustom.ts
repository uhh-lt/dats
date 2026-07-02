import { Edge, EdgeChange, Node, NodeChange, applyEdgeChanges, applyNodeChanges } from "@xyflow/react";
import { Dispatch, SetStateAction, useCallback, useState } from "react";

type OnChange<ChangesType> = (changes: ChangesType[]) => void;

const uniqueItemsById = <T extends { id: string }>(items: T[]): T[] => {
  const uniqueItems = items.reduce(
    (acc, item) => {
      return { ...acc, [item.id]: item };
    },
    {} as Record<string, T>,
  );
  return Object.values(uniqueItems);
};

export const useEdgeStateCustom = <T extends Edge>(
  initialEdges: T[],
): [T[], Dispatch<SetStateAction<T[]>>, OnChange<EdgeChange<T>>] => {
  const [edges, setEdges] = useState(initialEdges);

  const setItemsUnique = useCallback((edges: T[] | ((edges: T[]) => T[])) => {
    setEdges((currentItems) => {
      const newItems = typeof edges === "function" ? edges(currentItems) : edges;
      return uniqueItemsById(newItems);
    });
  }, []);

  const onEdgesChange = useCallback(
    (changes: EdgeChange<T>[]) => setItemsUnique((edges) => applyEdgeChanges(changes, edges)),
    [setItemsUnique],
  );

  return [edges, setItemsUnique, onEdgesChange];
};

export const useNodeStateCustom = <T extends Node>(
  initialNodes: T[],
): [T[], Dispatch<T[]>, OnChange<NodeChange<T>>] => {
  const [nodes, setNodes] = useState(initialNodes);

  const setItemsUnique = useCallback((nodes: T[] | ((nodes: T[]) => T[])) => {
    setNodes((currentItems) => {
      const newItems = typeof nodes === "function" ? nodes(currentItems) : nodes;
      return uniqueItemsById(newItems);
    });
  }, []);

  const onNodesChange = useCallback(
    (changes: NodeChange<T>[]) => setItemsUnique((nodes) => applyNodeChanges(changes, nodes)),
    [setItemsUnique],
  );

  return [nodes, setNodes, onNodesChange];
};
