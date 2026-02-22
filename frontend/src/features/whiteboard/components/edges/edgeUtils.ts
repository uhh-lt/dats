import { Node, Edge, Position, XYPosition } from "reactflow";

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
function getNodeIntersection(intersectionNode: Node, targetNode: Node) {
  // https://math.stackexchange.com/questions/1724792/an-algorithm-for-finding-the-intersection-point-between-a-center-of-vision-and-a
  if (
    !intersectionNode.positionAbsolute ||
    !intersectionNode.width ||
    !intersectionNode.height ||
    !targetNode.positionAbsolute
  ) {
    return { x: 0, y: 0 };
  }

  const w = intersectionNode.width / 2;
  const h = intersectionNode.height / 2;

  const x2 = intersectionNode.positionAbsolute.x + w;
  const y2 = intersectionNode.positionAbsolute.y + h;
  const x1 = targetNode.positionAbsolute.x + w;
  const y1 = targetNode.positionAbsolute.y + h;

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
function getEdgePosition(node: Node, intersectionPoint: XYPosition) {
  if (!node.positionAbsolute || !node.width || !node.height) {
    return Position.Top;
  }

  const nx = Math.round(node.positionAbsolute.x);
  const ny = Math.round(node.positionAbsolute.y);
  const px = Math.round(intersectionPoint.x);
  const py = Math.round(intersectionPoint.y);

  if (px <= nx + 1) {
    return Position.Left;
  }
  if (px >= nx + node.width - 1) {
    return Position.Right;
  }
  if (py <= ny + 1) {
    return Position.Top;
  }
  if (py >= node.positionAbsolute.y + node.height - 1) {
    return Position.Bottom;
  }

  return Position.Top;
}

// returns the parameters (sx, sy, tx, ty, sourcePos, targetPos) you need to create an edge
export function getEdgeParams(source: Node, target: Node) {
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
