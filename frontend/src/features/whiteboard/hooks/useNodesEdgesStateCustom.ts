import { Dispatch, SetStateAction, useCallback, useState } from "react";
import { Edge, EdgeChange, Node, NodeChange, applyEdgeChanges, applyNodeChanges } from "reactflow";

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

export const useEdgeStateCustom = (
  initialEdges: Edge[],
): [Edge[], Dispatch<SetStateAction<Edge[]>>, OnChange<EdgeChange>] => {
  const [edges, setEdges] = useState(initialEdges);

  const setItemsUnique = useCallback((edges: Edge[] | ((edges: Edge[]) => Edge[])) => {
    setEdges((currentItems) => {
      const newItems = typeof edges === "function" ? edges(currentItems) : edges;
      return uniqueItemsById(newItems);
    });
  }, []);

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => setItemsUnique((edges) => applyEdgeChanges(changes, edges)),
    [setItemsUnique],
  );

  return [edges, setItemsUnique, onEdgesChange];
};

export const useNodeStateCustom = <T>(
  initialNodes: Node<T>[],
): [Node<T>[], Dispatch<Node<T>[]>, OnChange<NodeChange>] => {
  const [nodes, setNodes] = useState(initialNodes);

  const setItemsUnique = useCallback((nodes: Node<T>[] | ((nodes: Node<T>[]) => Node<T>[])) => {
    setNodes((currentItems) => {
      const newItems = typeof nodes === "function" ? nodes(currentItems) : nodes;
      return uniqueItemsById(newItems);
    });
  }, []);

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => setItemsUnique((nodes) => applyNodeChanges(changes, nodes)),
    [setItemsUnique],
  );

  return [nodes, setNodes, onNodesChange];
};
