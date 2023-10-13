import { DefaultEdgeOptions, Edge, MarkerType, Node, XYPosition } from "reactflow";
import { v4 as uuidv4 } from "uuid";
import {
  BBoxAnnotationReadResolvedCode,
  CodeRead,
  DocumentTagRead,
  MemoRead,
  SourceDocumentRead,
  SpanAnnotationReadResolved,
} from "../../api/openapi";
import {
  BBoxAnnotationNodeData,
  BorderNodeData,
  CodeNodeData,
  MemoNodeData,
  NoteNodeData,
  SdocNodeData,
  SpanAnnotationNodeData,
  TagNodeData,
  TextNodeData,
} from "./types";
import { theme } from "../../plugins/ReactMUI";

const positionOffset = 50;

export const defaultDatabaseEdgeOptions: DefaultEdgeOptions = {
  style: { strokeWidth: 3, stroke: theme.palette.grey[400] },
  type: "floating",
  markerEnd: {
    type: MarkerType.ArrowClosed,
    color: theme.palette.grey[400],
  },
};

export const isMemoNodeId = (nodeId: string): boolean => nodeId.startsWith("memo-");
export const isTagNodeId = (nodeId: string): boolean => nodeId.startsWith("tag-");
export const isSdocNodeId = (nodeId: string): boolean => nodeId.startsWith("sdoc-");
export const isCodeNodeId = (nodeId: string): boolean => nodeId.startsWith("code-");
export const isSpanAnnotationNodeId = (nodeId: string): boolean => nodeId.startsWith("spanAnnotation-");
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
  if (isCodeNodeId(sourceNodeId) && (isSpanAnnotationNodeId(targetNodeId) || isBBoxAnnotationNodeId(targetNodeId))) {
    return true;
  }

  return false;
};

export const createTextNode = ({ position }: { position?: XYPosition }): Node<TextNodeData> => {
  return {
    id: uuidv4(),
    data: {
      text: "test",
      variant: "h3",
      color: "#000000",
      bold: false,
      italic: false,
      underline: false,
      horizontalAlign: "left",
      verticalAlign: "top",
    },
    type: "text",
    position: { x: position?.x || 0, y: position?.y || 0 },
  };
};

export const createNoteNode = ({ position }: { position?: XYPosition }): Node<NoteNodeData> => {
  return {
    id: uuidv4(),
    data: {
      text: "test",
      variant: "h3",
      color: "#000000",
      bgcolor: "#ffffff",
      bgalpha: 255,
      bold: false,
      italic: false,
      underline: false,
      horizontalAlign: "left",
      verticalAlign: "top",
    },
    type: "note",
    position: { x: position?.x || 0, y: position?.y || 0 },
  };
};

export const createBorderNode = ({
  position,
  borderRadius,
}: {
  position?: XYPosition;
  borderRadius: string;
}): Node<BorderNodeData> => {
  return {
    id: uuidv4(),
    data: {
      text: "test",
      variant: "h3",
      color: "#000000",
      bgcolor: "#ffffff",
      bgalpha: 127,
      bold: false,
      italic: false,
      underline: false,
      horizontalAlign: "center",
      verticalAlign: "center",
      borderColor: "#000000",
      borderRadius: borderRadius,
      borderStyle: "solid",
      borderWidth: 1,
    },
    type: "border",
    position: { x: position?.x || 0, y: position?.y || 0 },
  };
};

export const createTagNodes = ({
  tags,
  position,
}: {
  tags: number[] | DocumentTagRead[];
  position?: XYPosition;
}): Node<TagNodeData>[] => {
  const tagIds = tags.map((tag) => (typeof tag === "number" ? tag : tag.id));
  return tagIds.map((tagId, index) => ({
    id: `tag-${tagId}`,
    type: "tag",
    data: { tagId },
    position: { x: (position?.x || 0) + index * positionOffset, y: (position?.y || 0) + index * positionOffset },
  }));
};

export const createMemoNodes = ({
  memos,
  position,
}: {
  memos: number[] | MemoRead[];
  position?: XYPosition;
}): Node<MemoNodeData>[] => {
  const memoIds = memos.map((memo) => (typeof memo === "number" ? memo : memo.id));
  return memoIds.map((memoId, index) => ({
    id: `memo-${memoId}`,
    type: "memo",
    data: { memoId },
    position: { x: (position?.x || 0) + index * positionOffset, y: (position?.y || 0) + index * positionOffset },
  }));
};

export const createSdocNodes = ({
  sdocs,
  position,
}: {
  sdocs: number[] | SourceDocumentRead[];
  position?: XYPosition;
}): Node<SdocNodeData>[] => {
  const sdocIds = sdocs.map((sdoc) => (typeof sdoc === "number" ? sdoc : sdoc.id));
  return sdocIds.map((sdocId, index) => ({
    id: `sdoc-${sdocId}`,
    type: "sdoc",
    data: { sdocId: sdocId },
    position: { x: (position?.x || 0) + index * positionOffset, y: (position?.y || 0) + index * positionOffset },
  }));
};

export const createCodeNodes = ({
  codes,
  position,
}: {
  codes: CodeRead[];
  position?: XYPosition;
}): Node<CodeNodeData>[] => {
  return codes.map((code, index) => ({
    id: `code-${code.id}`,
    type: "code",
    data: { codeId: code.id, parentCodeId: code.parent_code_id },
    position: { x: (position?.x || 0) + index * positionOffset, y: (position?.y || 0) + index * positionOffset },
  }));
};

export const createSpanAnnotationNodes = ({
  spanAnnotations,
  position,
}: {
  spanAnnotations: number[] | SpanAnnotationReadResolved[];
  position?: XYPosition;
}): Node<SpanAnnotationNodeData>[] => {
  const spanAnnotationIds = spanAnnotations.map((span) => (typeof span === "number" ? span : span.id));
  return spanAnnotationIds.map((spanAnnotationId, index) => ({
    id: `spanAnnotation-${spanAnnotationId}`,
    type: "spanAnnotation",
    data: { spanAnnotationId },
    position: { x: (position?.x || 0) + index * positionOffset, y: (position?.y || 0) + index * positionOffset },
  }));
};

export const createBBoxAnnotationNodes = ({
  bboxAnnotations,
  position,
}: {
  bboxAnnotations: number[] | BBoxAnnotationReadResolvedCode[];
  position?: XYPosition;
}): Node<BBoxAnnotationNodeData>[] => {
  const bboxAnnotationIds = bboxAnnotations.map((bbox) => (typeof bbox === "number" ? bbox : bbox.id));
  return bboxAnnotationIds.map((bboxAnnotationId, index) => ({
    id: `bboxAnnotation-${bboxAnnotationId}`,
    type: "bboxAnnotation",
    data: { bboxAnnotationId },
    position: { x: (position?.x || 0) + index * positionOffset, y: (position?.y || 0) + index * positionOffset },
  }));
};

export const createCodeParentCodeEdge = ({ codeId, parentCodeId }: { codeId: number; parentCodeId: number }): Edge => {
  return {
    ...defaultDatabaseEdgeOptions,
    id: `code-${codeId}-code-${parentCodeId}`,
    source: `code-${codeId}`,
    target: `code-${parentCodeId}`,
    sourceHandle: "database",
    targetHandle: "database",
  };
};

export const isDatabaseEdge = (edge: Edge): boolean => {
  return edge.sourceHandle === "database" && edge.targetHandle === "database";
};

export const isCodeParentCodeEdge = (edge: Edge): boolean => {
  return isDatabaseEdge(edge) && edge.source.startsWith("code-") && edge.target.startsWith("code-");
};

export const createMemoSpanAnnotationEdge = ({
  memoId,
  spanAnnotationId,
}: {
  memoId: number;
  spanAnnotationId: number;
}): Edge => {
  return {
    ...defaultDatabaseEdgeOptions,
    id: `memo-${memoId}-spanAnnotation-${spanAnnotationId}`,
    source: `memo-${memoId}`,
    target: `spanAnnotation-${spanAnnotationId}`,
    sourceHandle: "database",
    targetHandle: "database",
  };
};

export const isMemoSpanAnnotationEdge = (edge: Edge): boolean => {
  return isDatabaseEdge(edge) && edge.source.startsWith("memo-") && edge.target.startsWith("spanAnnotation-");
};

export const createMemoSdocEdge = ({ memoId, sdocId }: { memoId: number; sdocId: number }): Edge => {
  return {
    ...defaultDatabaseEdgeOptions,
    id: `memo-${memoId}-sdoc-${sdocId}`,
    source: `memo-${memoId}`,
    target: `sdoc-${sdocId}`,
    sourceHandle: "database",
    targetHandle: "database",
  };
};

export const isMemoSdocEdge = (edge: Edge): boolean => {
  return isDatabaseEdge(edge) && edge.source.startsWith("memo-") && edge.target.startsWith("sdoc-");
};

export const createMemoTagEdge = ({ memoId, tagId }: { memoId: number; tagId: number }): Edge => {
  return {
    ...defaultDatabaseEdgeOptions,
    id: `memo-${memoId}-tag-${tagId}`,
    source: `memo-${memoId}`,
    target: `tag-${tagId}`,
    sourceHandle: "database",
    targetHandle: "database",
  };
};

export const isMemoTagEdge = (edge: Edge): boolean => {
  return isDatabaseEdge(edge) && edge.source.startsWith("memo-") && edge.target.startsWith("tag-");
};

export const createCodeSpanAnnotationEdge = ({
  codeId,
  spanAnnotationId,
}: {
  codeId: number;
  spanAnnotationId: number;
}): Edge => {
  return {
    ...defaultDatabaseEdgeOptions,
    id: `code-${codeId}-spanAnnotation-${spanAnnotationId}`,
    source: `code-${codeId}`,
    target: `spanAnnotation-${spanAnnotationId}`,
    sourceHandle: "database",
    targetHandle: "database",
  };
};

export const isCodeSpanAnnotationEdge = (edge: Edge): boolean => {
  return isDatabaseEdge(edge) && edge.source.startsWith("code-") && edge.target.startsWith("spanAnnotation-");
};

export const createSdocSpanAnnotationEdge = ({
  sdocId,
  spanAnnotationId,
}: {
  sdocId: number;
  spanAnnotationId: number;
}): Edge => {
  return {
    ...defaultDatabaseEdgeOptions,
    id: `sdoc-${sdocId}-spanAnnotation-${spanAnnotationId}`,
    source: `sdoc-${sdocId}`,
    target: `spanAnnotation-${spanAnnotationId}`,
    sourceHandle: "database",
    targetHandle: "database",
  };
};

export const isSdocSpanAnnotationEdge = (edge: Edge): boolean => {
  return isDatabaseEdge(edge) && edge.source.startsWith("sdoc-") && edge.target.startsWith("spanAnnotation-");
};

export const createCodeBBoxAnnotationEdge = ({
  codeId,
  bboxAnnotationId,
}: {
  codeId: number;
  bboxAnnotationId: number;
}): Edge => {
  return {
    ...defaultDatabaseEdgeOptions,
    id: `code-${codeId}-bboxAnnotation-${bboxAnnotationId}`,
    source: `code-${codeId}`,
    target: `bboxAnnotation-${bboxAnnotationId}`,
    sourceHandle: "database",
    targetHandle: "database",
  };
};

export const isCodeBBoxAnnotationEdge = (edge: Edge): boolean => {
  return isDatabaseEdge(edge) && edge.source.startsWith("code-") && edge.target.startsWith("bboxAnnotation-");
};

export const createSdocBBoxAnnotationEdge = ({
  sdocId,
  bboxAnnotationId,
}: {
  sdocId: number;
  bboxAnnotationId: number;
}): Edge => {
  return {
    ...defaultDatabaseEdgeOptions,
    id: `sdoc-${sdocId}-bboxAnnotation-${bboxAnnotationId}`,
    source: `sdoc-${sdocId}`,
    target: `bboxAnnotation-${bboxAnnotationId}`,
    sourceHandle: "database",
    targetHandle: "database",
  };
};

export const isSdocBBoxAnnotationEdge = (edge: Edge): boolean => {
  return isDatabaseEdge(edge) && edge.source.startsWith("sdoc-") && edge.target.startsWith("bboxAnnotation-");
};

export const createMemoBBoxAnnotationEdge = ({
  memoId,
  bboxAnnotationId,
}: {
  memoId: number;
  bboxAnnotationId: number;
}): Edge => {
  return {
    ...defaultDatabaseEdgeOptions,
    id: `memo-${memoId}-bboxAnnotation-${bboxAnnotationId}`,
    source: `memo-${memoId}`,
    target: `bboxAnnotation-${bboxAnnotationId}`,
    sourceHandle: "database",
    targetHandle: "database",
  };
};

export const isMemoBBoxAnnotationEdge = (edge: Edge): boolean => {
  return isDatabaseEdge(edge) && edge.source.startsWith("memo-") && edge.target.startsWith("bboxAnnotation-");
};

export const createMemoCodeEdge = ({ memoId, codeId }: { memoId: number; codeId: number }): Edge => {
  return {
    ...defaultDatabaseEdgeOptions,
    id: `memo-${memoId}-code-${codeId}`,
    source: `memo-${memoId}`,
    target: `code-${codeId}`,
    sourceHandle: "database",
    targetHandle: "database",
  };
};

export const isMemoCodeEdge = (edge: Edge): boolean => {
  return isDatabaseEdge(edge) && edge.source.startsWith("memo-") && edge.target.startsWith("code-");
};

export const createTagSdocEdge = ({ sdocId, tagId }: { sdocId: number; tagId: number }): Edge => {
  return {
    ...defaultDatabaseEdgeOptions,
    id: `tag-${tagId}-sdoc-${sdocId}`,
    source: `tag-${tagId}`,
    target: `sdoc-${sdocId}`,
    sourceHandle: "database",
    targetHandle: "database",
  };
};

export const isTagSdocEdge = (edge: Edge): boolean => {
  return isDatabaseEdge(edge) && edge.source.startsWith("tag-") && edge.target.startsWith("sdoc-");
};
