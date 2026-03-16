import { Edge, InternalNode, Position, XYPosition } from "@xyflow/react";

export const isDashed = (edge: Edge) => {
  return (
    edge.style?.strokeDasharray ===
    `${2 * (edge.style!.strokeWidth! as number)} ${2 * (edge.style!.strokeWidth! as number)}`
  );
};

export const isSolid = (edge: Edge) => {
  return edge.style?.strokeDasharray === undefined;
};

export const isDotted = (edge: Edge) => {
  return edge.style?.strokeDasharray === `${edge.style?.strokeWidth} ${edge.style?.strokeWidth}`;
};

// this helper function returns the intersection point
// of the line between the center of the intersectionNode and the target node
// https://math.stackexchange.com/questions/1724792/an-algorithm-for-finding-the-intersection-point-between-a-center-of-vision-and-a
function getNodeIntersection(intersectionNode: InternalNode, targetNode: InternalNode) {
  const intersectionNodeWidth = intersectionNode.measured?.width;
  const intersectionNodeHeight = intersectionNode.measured?.height;
  const intersectionNodePos = intersectionNode.internals.positionAbsolute;
  const targetNodePos = targetNode.internals.positionAbsolute;

  if (!intersectionNodePos || !intersectionNodeWidth || !intersectionNodeHeight || !targetNodePos) {
    return { x: 0, y: 0 };
  }

  const w = intersectionNodeWidth / 2;
  const h = intersectionNodeHeight / 2;

  const x2 = intersectionNodePos.x + w;
  const y2 = intersectionNodePos.y + h;
  const x1 = targetNodePos.x + w;
  const y1 = targetNodePos.y + h;

  const xx1 = (x1 - x2) / (2 * w) - (y1 - y2) / (2 * h);
  const yy1 = (x1 - x2) / (2 * w) + (y1 - y2) / (2 * h);
  const a = 1 / (Math.abs(xx1) + Math.abs(yy1));
  const xx3 = a * xx1;
  const yy3 = a * yy1;
  const x = w * (xx3 + yy3) + x2;
  const y = h * (-xx3 + yy3) + y2;

  return { x, y };
}

// returns the position (top,right,bottom or right) passed node compared to the intersection point
function getEdgePosition(node: InternalNode, intersectionPoint: XYPosition) {
  const nodeWidth = node.measured?.width;
  const nodeHeight = node.measured?.height;
  const nodePos = node.internals.positionAbsolute;

  if (!nodePos || !nodeWidth || !nodeHeight) {
    return Position.Top;
  }

  const nx = Math.round(nodePos.x);
  const ny = Math.round(nodePos.y);
  const px = Math.round(intersectionPoint.x);
  const py = Math.round(intersectionPoint.y);

  if (px <= nx + 1) {
    return Position.Left;
  }
  if (px >= nx + nodeWidth - 1) {
    return Position.Right;
  }
  if (py <= ny + 1) {
    return Position.Top;
  }
  if (py >= nodePos.y + nodeHeight - 1) {
    return Position.Bottom;
  }

  return Position.Top;
}

// returns the parameters (sx, sy, tx, ty, sourcePos, targetPos) you need to create an edge
export function getEdgeParams(source: InternalNode, target: InternalNode) {
  const sourceIntersectionPoint = getNodeIntersection(source, target);
  const targetIntersectionPoint = getNodeIntersection(target, source);

  const sourcePos = getEdgePosition(source, sourceIntersectionPoint);
  const targetPos = getEdgePosition(target, targetIntersectionPoint);

  return {
    sx: sourceIntersectionPoint.x,
    sy: sourceIntersectionPoint.y,
    tx: targetIntersectionPoint.x,
    ty: targetIntersectionPoint.y,
    sourcePos,
    targetPos,
  };
}
