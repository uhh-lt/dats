import { Edge, EdgeProps, getStraightPath, useInternalNode } from "@xyflow/react";
import { getEdgeParams } from "../edgeUtils";

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
type FloatingEdgeData = {};

export type FloatingEdge = Edge<FloatingEdgeData, "floating">;
export function FloatingEdge({ id, source, target, markerEnd, style, selected }: EdgeProps<FloatingEdge>) {
  const sourceNode = useInternalNode(source);
  const targetNode = useInternalNode(target);

  if (!sourceNode || !targetNode) {
    return null;
  }

  const { sx, sy, tx, ty } = getEdgeParams(sourceNode, targetNode);

  const [edgePath] = getStraightPath({
    sourceX: sx,
    sourceY: sy,
    targetX: tx,
    targetY: ty,
  });

  return (
    <path
      id={id}
      className="react-flow__edge-path"
      d={edgePath}
      markerEnd={markerEnd}
      style={{
        ...style,
        strokeDashoffset: selected ? "100" : undefined,
        strokeDasharray: selected ? "10,5" : undefined,
      }}
    />
  );
}
