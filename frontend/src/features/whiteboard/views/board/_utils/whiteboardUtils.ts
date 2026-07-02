import { BBoxAnnotationRead } from "@models/BBoxAnnotationRead";
import { BorderStyle } from "@models/BorderStyle";
import { CodeRead } from "@models/CodeRead";
import { HorizontalAlign } from "@models/HorizontalAlign";
import { MemoRead } from "@models/MemoRead";
import { SentenceAnnotationRead } from "@models/SentenceAnnotationRead";
import { SourceDocumentRead } from "@models/SourceDocumentRead";
import { SpanAnnotationRead } from "@models/SpanAnnotationRead";
import { TagRead } from "@models/TagRead";
import { VerticalAlign } from "@models/VerticalAlign";
import { WhiteboardNodeType } from "@models/WhiteboardNodeType";
import { DefaultEdgeOptions, Edge, MarkerType, XYPosition, getNodesBounds } from "@xyflow/react";
import type { BBoxAnnotationNode } from "../_components/nodes/BBoxAnnotationNode";
import type { BorderNode } from "../_components/nodes/BorderNode";
import type { CodeNode } from "../_components/nodes/CodeNode";
import type { MemoNode } from "../_components/nodes/MemoNode";
import type { NoteNode } from "../_components/nodes/NoteNode";
import type { SdocNode } from "../_components/nodes/SdocNode";
import type { SentenceAnnotationNode } from "../_components/nodes/SentenceAnnotationNode";
import type { SpanAnnotationNode } from "../_components/nodes/SpanAnnotationNode";
import type { TagNode } from "../_components/nodes/TagNode";
import type { TextNode } from "../_components/nodes/TextNode";
// eslint-disable-next-line boundaries/element-types
import { theme } from "@plugins/mui";
import { CustomEdge } from "../_components/edges/CustomEdge";
import { FloatingEdge } from "../_components/edges/FloatingEdge";
import { DATSNode } from "../_types/DATSNode";

const positionOffset = 50;

export const FONT_FAMILIES = ["Arial", "Times New Roman", "Courier New", "Verdana", "Georgia"];

export const PREDEFINED_COLORS = [
  "#ffffff", // White
  "#000000", // Black
  "#ff0000", // Red
  "#00ff00", // Green
  "#0000ff", // Blue
  "#ffff00", // Yellow
  "#ff00ff", // Magenta
  "#00ffff", // Cyan
  "#808080", // Gray
  "#800000", // Maroon
  "#808000", // Olive
  "#008000", // Dark Green
  "#800080", // Purple
  "#008080", // Teal
  "#000080", // Navy
];

export const defaultDatabaseEdgeOptions = {
  style: { strokeWidth: 3, stroke: theme.palette.grey[400] },
  type: "floating",
  markerEnd: {
    type: MarkerType.ArrowClosed,
    color: theme.palette.grey[400],
  },
} as const satisfies DefaultEdgeOptions;

const defaultDatabaseNodeData = {
  bgcolor: "#ffffff",
  bgalpha: 255,
};

export const isMemoNodeId = (nodeId: string): boolean => nodeId.startsWith("memo-");
export const isTagNodeId = (nodeId: string): boolean => nodeId.startsWith("tag-");
export const isSdocNodeId = (nodeId: string): boolean => nodeId.startsWith("sdoc-");
export const isCodeNodeId = (nodeId: string): boolean => nodeId.startsWith("code-");
export const isSpanAnnotationNodeId = (nodeId: string): boolean => nodeId.startsWith("spanAnnotation-");
export const isSentenceAnnotationNodeId = (nodeId: string): boolean => nodeId.startsWith("sentenceAnnotation-");
export const isBBoxAnnotationNodeId = (nodeId: string): boolean => nodeId.startsWith("bboxAnnotation-");

export const isConnectionAllowed = (sourceNodeId: string, targetNodeId: string) => {
  // do not allow self-connections
  if (sourceNodeId === targetNodeId) {
    return false;
  }

  // code can be manually connected to other code
  if (isCodeNodeId(sourceNodeId) && isCodeNodeId(targetNodeId)) {
    return true;
  }

  // tag can be manually connected to document
  if (isTagNodeId(sourceNodeId) && isSdocNodeId(targetNodeId)) {
    return true;
  }

  // codes can be manually connected to annotations
  if (
    isCodeNodeId(sourceNodeId) &&
    (isSpanAnnotationNodeId(targetNodeId) ||
      isBBoxAnnotationNodeId(targetNodeId) ||
      isSentenceAnnotationNodeId(targetNodeId))
  ) {
    return true;
  }

  return false;
};

export const duplicateNodes = (position: XYPosition, nodes: DATSNode[]): DATSNode[] => {
  const rect = getNodesBounds(nodes);
  const newNodes = nodes.map((node) => {
    return {
      ...node,
      id: crypto.randomUUID(),
      position: { x: node.position.x - rect.x + position.x, y: node.position.y - rect.y + position.y },
    };
  });

  return newNodes;
};

export const createTextNode = ({ position }: { position?: XYPosition }): TextNode => {
  return {
    id: crypto.randomUUID(),
    data: {
      type: WhiteboardNodeType.TEXT,
      text: "test",
      color: "#000000",
      horizontalAlign: HorizontalAlign.LEFT,
      verticalAlign: VerticalAlign.TOP,
      bold: false,
      italic: false,
      underline: false,
      strikethrough: false,
      fontFamily: "Arial",
      fontSize: 12,
    },
    type: WhiteboardNodeType.TEXT,
    position: { x: position?.x || 0, y: position?.y || 0 },
  };
};

export const createNoteNode = ({ position }: { position?: XYPosition }): NoteNode => {
  return {
    id: crypto.randomUUID(),
    data: {
      type: WhiteboardNodeType.NOTE,
      text: "test",
      color: "#000000",
      bgcolor: "#ffffff",
      bgalpha: 255,
      bold: false,
      italic: false,
      underline: false,
      strikethrough: false,
      fontFamily: "Arial",
      fontSize: 12,
      horizontalAlign: HorizontalAlign.LEFT,
      verticalAlign: VerticalAlign.TOP,
    },
    type: WhiteboardNodeType.NOTE,
    position: { x: position?.x || 0, y: position?.y || 0 },
  };
};

export const createBorderNode = ({
  position,
  borderRadius,
}: {
  position?: XYPosition;
  borderRadius: string;
}): BorderNode => {
  return {
    id: crypto.randomUUID(),
    data: {
      type: WhiteboardNodeType.BORDER,
      text: "test",
      color: "#000000",
      bgcolor: "#ffffff",
      bgalpha: 127,
      bold: false,
      italic: false,
      underline: false,
      strikethrough: false,
      fontFamily: "Arial",
      fontSize: 12,
      horizontalAlign: HorizontalAlign.CENTER,
      verticalAlign: VerticalAlign.CENTER,
      borderColor: "#000000",
      borderRadius: borderRadius,
      borderStyle: BorderStyle.SOLID,
      borderWidth: 1,
    },
    type: WhiteboardNodeType.BORDER,
    position: { x: position?.x || 0, y: position?.y || 0 },
  };
};

export const createTagNodes = ({
  tags,
  position,
}: {
  tags: number[] | TagRead[];
  position?: XYPosition;
}): TagNode[] => {
  const tagIds = tags.map((tag) => (typeof tag === "number" ? tag : tag.id));
  return tagIds.map((tagId, index) => ({
    id: `tag-${tagId}`,
    type: WhiteboardNodeType.TAG,
    data: { ...defaultDatabaseNodeData, tagId, type: WhiteboardNodeType.TAG },
    position: { x: (position?.x || 0) + index * positionOffset, y: (position?.y || 0) + index * positionOffset },
  }));
};

export const createMemoNodes = ({
  memos,
  position,
}: {
  memos: number[] | MemoRead[];
  position?: XYPosition;
}): MemoNode[] => {
  const memoIds = memos.map((memo) => (typeof memo === "number" ? memo : memo.id));
  return memoIds.map((memoId, index) => ({
    id: `memo-${memoId}`,
    type: WhiteboardNodeType.MEMO,
    data: { ...defaultDatabaseNodeData, memoId, type: WhiteboardNodeType.MEMO },
    position: { x: (position?.x || 0) + index * positionOffset, y: (position?.y || 0) + index * positionOffset },
  }));
};

export const createSdocNodes = ({
  sdocs,
  position,
}: {
  sdocs: number[] | SourceDocumentRead[];
  position?: XYPosition;
}): SdocNode[] => {
  const sdocIds = sdocs.map((sdoc) => (typeof sdoc === "number" ? sdoc : sdoc.id));
  return sdocIds.map((sdocId, index) => ({
    id: `sdoc-${sdocId}`,
    type: WhiteboardNodeType.SDOC,
    data: { ...defaultDatabaseNodeData, sdocId, type: WhiteboardNodeType.SDOC },
    position: { x: (position?.x || 0) + index * positionOffset, y: (position?.y || 0) + index * positionOffset },
  }));
};

export const createCodeNodes = ({ codes, position }: { codes: CodeRead[]; position?: XYPosition }): CodeNode[] => {
  return codes.map((code, index) => ({
    id: `code-${code.id}`,
    type: WhiteboardNodeType.CODE,
    data: { ...defaultDatabaseNodeData, codeId: code.id, parentCodeId: code.parent_id, type: WhiteboardNodeType.CODE },
    position: { x: (position?.x || 0) + index * positionOffset, y: (position?.y || 0) + index * positionOffset },
  }));
};

export const createSpanAnnotationNodes = ({
  spanAnnotations,
  position,
}: {
  spanAnnotations: number[] | SpanAnnotationRead[];
  position?: XYPosition;
}): SpanAnnotationNode[] => {
  const spanAnnotationIds = spanAnnotations.map((span) => (typeof span === "number" ? span : span.id));
  return spanAnnotationIds.map((spanAnnotationId, index) => ({
    id: `spanAnnotation-${spanAnnotationId}`,
    type: WhiteboardNodeType.SPAN_ANNOTATION,
    data: { ...defaultDatabaseNodeData, spanAnnotationId, type: WhiteboardNodeType.SPAN_ANNOTATION },
    position: { x: (position?.x || 0) + index * positionOffset, y: (position?.y || 0) + index * positionOffset },
  }));
};

export const createSentenceAnnotationNodes = ({
  sentenceAnnotations,
  position,
}: {
  sentenceAnnotations: number[] | SentenceAnnotationRead[];
  position?: XYPosition;
}): SentenceAnnotationNode[] => {
  const sentenceAnnotationIds = sentenceAnnotations.map((span) => (typeof span === "number" ? span : span.id));
  return sentenceAnnotationIds.map((sentenceAnnotationId, index) => ({
    id: `sentenceAnnotation-${sentenceAnnotationId}`,
    type: WhiteboardNodeType.SENTENCE_ANNOTATION,
    data: { ...defaultDatabaseNodeData, sentenceAnnotationId, type: WhiteboardNodeType.SENTENCE_ANNOTATION },
    position: { x: (position?.x || 0) + index * positionOffset, y: (position?.y || 0) + index * positionOffset },
  }));
};

export const createBBoxAnnotationNodes = ({
  bboxAnnotations,
  position,
}: {
  bboxAnnotations: number[] | BBoxAnnotationRead[] | BBoxAnnotationRead[];
  position?: XYPosition;
}): BBoxAnnotationNode[] => {
  const bboxAnnotationIds = bboxAnnotations.map((bbox) => (typeof bbox === "number" ? bbox : bbox.id));
  return bboxAnnotationIds.map((bboxAnnotationId, index) => ({
    id: `bboxAnnotation-${bboxAnnotationId}`,
    type: WhiteboardNodeType.BBOX_ANNOTATION,
    data: { ...defaultDatabaseNodeData, bboxAnnotationId, type: WhiteboardNodeType.BBOX_ANNOTATION },
    position: { x: (position?.x || 0) + index * positionOffset, y: (position?.y || 0) + index * positionOffset },
  }));
};

export const createCodeParentCodeEdge = ({
  codeId,
  parentCodeId,
}: {
  codeId: number;
  parentCodeId: number;
}): FloatingEdge => {
  return {
    ...defaultDatabaseEdgeOptions,
    id: `code-${codeId}-code-${parentCodeId}`,
    source: `code-${parentCodeId}`,
    target: `code-${codeId}`,
    sourceHandle: "database",
    targetHandle: "database",
  };
};

export const isDatabaseEdge = (edge: Edge): boolean => {
  return edge.sourceHandle === "database" && edge.targetHandle === "database";
};

export const isDatabaseEdgeArray = (edges: Edge[]): edges is FloatingEdge[] => {
  return edges.every(isDatabaseEdge);
};

export const isCustomEdge = (edge: Edge): edge is CustomEdge => {
  return !isDatabaseEdge(edge);
};

export const isCustomEdgeArray = (edges: Edge[]): edges is CustomEdge[] => {
  return !edges.some(isDatabaseEdge);
};

export const isCodeParentCodeEdge = (edge: Edge): edge is FloatingEdge => {
  return isDatabaseEdge(edge) && edge.source.startsWith("code-") && edge.target.startsWith("code-");
};

export const isCodeParentCodeEdgeArray = (edges: Edge[]): edges is FloatingEdge[] => {
  return edges.every(isCodeParentCodeEdge);
};

export const createMemoSpanAnnotationEdge = ({
  memoId,
  spanAnnotationId,
}: {
  memoId: number;
  spanAnnotationId: number;
}): FloatingEdge => {
  return {
    ...defaultDatabaseEdgeOptions,
    id: `memo-${memoId}-spanAnnotation-${spanAnnotationId}`,
    source: `memo-${memoId}`,
    target: `spanAnnotation-${spanAnnotationId}`,
    sourceHandle: "database",
    targetHandle: "database",
  };
};

export const isMemoSpanAnnotationEdge = (edge: Edge): edge is FloatingEdge => {
  return isDatabaseEdge(edge) && edge.source.startsWith("memo-") && edge.target.startsWith("spanAnnotation-");
};

export const createMemoSdocEdge = ({ memoId, sdocId }: { memoId: number; sdocId: number }): FloatingEdge => {
  return {
    ...defaultDatabaseEdgeOptions,
    id: `memo-${memoId}-sdoc-${sdocId}`,
    source: `memo-${memoId}`,
    target: `sdoc-${sdocId}`,
    sourceHandle: "database",
    targetHandle: "database",
  };
};

export const isMemoSdocEdge = (edge: Edge): edge is FloatingEdge => {
  return isDatabaseEdge(edge) && edge.source.startsWith("memo-") && edge.target.startsWith("sdoc-");
};

export const createMemoTagEdge = ({ memoId, tagId }: { memoId: number; tagId: number }): FloatingEdge => {
  return {
    ...defaultDatabaseEdgeOptions,
    id: `memo-${memoId}-tag-${tagId}`,
    source: `memo-${memoId}`,
    target: `tag-${tagId}`,
    sourceHandle: "database",
    targetHandle: "database",
  };
};

export const isMemoTagEdge = (edge: Edge): edge is FloatingEdge => {
  return isDatabaseEdge(edge) && edge.source.startsWith("memo-") && edge.target.startsWith("tag-");
};

export const createCodeSpanAnnotationEdge = ({
  codeId,
  spanAnnotationId,
}: {
  codeId: number;
  spanAnnotationId: number;
}): FloatingEdge => {
  return {
    ...defaultDatabaseEdgeOptions,
    id: `code-${codeId}-spanAnnotation-${spanAnnotationId}`,
    source: `code-${codeId}`,
    target: `spanAnnotation-${spanAnnotationId}`,
    sourceHandle: "database",
    targetHandle: "database",
  };
};

export const isCodeSpanAnnotationEdge = (edge: Edge): edge is FloatingEdge => {
  return isDatabaseEdge(edge) && edge.source.startsWith("code-") && edge.target.startsWith("spanAnnotation-");
};

export const createSdocSpanAnnotationEdge = ({
  sdocId,
  spanAnnotationId,
}: {
  sdocId: number;
  spanAnnotationId: number;
}): FloatingEdge => {
  return {
    ...defaultDatabaseEdgeOptions,
    id: `sdoc-${sdocId}-spanAnnotation-${spanAnnotationId}`,
    source: `sdoc-${sdocId}`,
    target: `spanAnnotation-${spanAnnotationId}`,
    sourceHandle: "database",
    targetHandle: "database",
  };
};

export const isSdocSpanAnnotationEdge = (edge: Edge): edge is FloatingEdge => {
  return isDatabaseEdge(edge) && edge.source.startsWith("sdoc-") && edge.target.startsWith("spanAnnotation-");
};

export const createCodeSentenceAnnotationEdge = ({
  codeId,
  sentenceAnnotationId,
}: {
  codeId: number;
  sentenceAnnotationId: number;
}): FloatingEdge => {
  return {
    ...defaultDatabaseEdgeOptions,
    id: `code-${codeId}-sentenceAnnotation-${sentenceAnnotationId}`,
    source: `code-${codeId}`,
    target: `sentenceAnnotation-${sentenceAnnotationId}`,
    sourceHandle: "database",
    targetHandle: "database",
  };
};

export const isCodeSentenceAnnotationEdge = (edge: Edge): edge is FloatingEdge => {
  return isDatabaseEdge(edge) && edge.source.startsWith("code-") && edge.target.startsWith("sentenceAnnotation-");
};

export const createSdocSentenceAnnotationEdge = ({
  sdocId,
  sentenceAnnotationId,
}: {
  sdocId: number;
  sentenceAnnotationId: number;
}): FloatingEdge => {
  return {
    ...defaultDatabaseEdgeOptions,
    id: `sdoc-${sdocId}-sentenceAnnotation-${sentenceAnnotationId}`,
    source: `sdoc-${sdocId}`,
    target: `sentenceAnnotation-${sentenceAnnotationId}`,
    sourceHandle: "database",
    targetHandle: "database",
  };
};

export const isSdocSentenceAnnotationEdge = (edge: Edge): edge is FloatingEdge => {
  return isDatabaseEdge(edge) && edge.source.startsWith("sdoc-") && edge.target.startsWith("sentenceAnnotation-");
};

export const createCodeBBoxAnnotationEdge = ({
  codeId,
  bboxAnnotationId,
}: {
  codeId: number;
  bboxAnnotationId: number;
}): FloatingEdge => {
  return {
    ...defaultDatabaseEdgeOptions,
    id: `code-${codeId}-bboxAnnotation-${bboxAnnotationId}`,
    source: `code-${codeId}`,
    target: `bboxAnnotation-${bboxAnnotationId}`,
    sourceHandle: "database",
    targetHandle: "database",
  };
};

export const isCodeBBoxAnnotationEdge = (edge: Edge): edge is FloatingEdge => {
  return isDatabaseEdge(edge) && edge.source.startsWith("code-") && edge.target.startsWith("bboxAnnotation-");
};

export const createSdocBBoxAnnotationEdge = ({
  sdocId,
  bboxAnnotationId,
}: {
  sdocId: number;
  bboxAnnotationId: number;
}): FloatingEdge => {
  return {
    ...defaultDatabaseEdgeOptions,
    id: `sdoc-${sdocId}-bboxAnnotation-${bboxAnnotationId}`,
    source: `sdoc-${sdocId}`,
    target: `bboxAnnotation-${bboxAnnotationId}`,
    sourceHandle: "database",
    targetHandle: "database",
  };
};

export const isSdocBBoxAnnotationEdge = (edge: Edge): edge is FloatingEdge => {
  return isDatabaseEdge(edge) && edge.source.startsWith("sdoc-") && edge.target.startsWith("bboxAnnotation-");
};

export const createMemoBBoxAnnotationEdge = ({
  memoId,
  bboxAnnotationId,
}: {
  memoId: number;
  bboxAnnotationId: number;
}): FloatingEdge => {
  return {
    ...defaultDatabaseEdgeOptions,
    id: `memo-${memoId}-bboxAnnotation-${bboxAnnotationId}`,
    source: `memo-${memoId}`,
    target: `bboxAnnotation-${bboxAnnotationId}`,
    sourceHandle: "database",
    targetHandle: "database",
  };
};

export const isMemoBBoxAnnotationEdge = (edge: Edge): edge is FloatingEdge => {
  return isDatabaseEdge(edge) && edge.source.startsWith("memo-") && edge.target.startsWith("bboxAnnotation-");
};

export const createMemoCodeEdge = ({ memoId, codeId }: { memoId: number; codeId: number }): FloatingEdge => {
  return {
    ...defaultDatabaseEdgeOptions,
    id: `memo-${memoId}-code-${codeId}`,
    source: `memo-${memoId}`,
    target: `code-${codeId}`,
    sourceHandle: "database",
    targetHandle: "database",
  };
};

export const isMemoCodeEdge = (edge: Edge): edge is FloatingEdge => {
  return isDatabaseEdge(edge) && edge.source.startsWith("memo-") && edge.target.startsWith("code-");
};

export const createMemoSentenceAnnotationEdge = ({
  memoId,
  sentenceAnnotationId,
}: {
  memoId: number;
  sentenceAnnotationId: number;
}): FloatingEdge => {
  return {
    ...defaultDatabaseEdgeOptions,
    id: `memo-${memoId}-sentenceAnnotation-${sentenceAnnotationId}`,
    source: `memo-${memoId}`,
    target: `sentenceAnnotation-${sentenceAnnotationId}`,
    sourceHandle: "database",
    targetHandle: "database",
  };
};

export const isMemoSentenceAnnotationEdge = (edge: Edge): edge is FloatingEdge => {
  return isDatabaseEdge(edge) && edge.source.startsWith("memo-") && edge.target.startsWith("sentenceAnnotation-");
};

export const createTagSdocEdge = ({ sdocId, tagId }: { sdocId: number; tagId: number }): FloatingEdge => {
  return {
    ...defaultDatabaseEdgeOptions,
    id: `tag-${tagId}-sdoc-${sdocId}`,
    source: `tag-${tagId}`,
    target: `sdoc-${sdocId}`,
    sourceHandle: "database",
    targetHandle: "database",
  };
};

export const isTagSdocEdge = (edge: Edge): edge is FloatingEdge => {
  return isDatabaseEdge(edge) && edge.source.startsWith("tag-") && edge.target.startsWith("sdoc-");
};

export const isTagSdocEdgeArray = (edges: Edge[]): edges is FloatingEdge[] => {
  return edges.every(isTagSdocEdge);
};
