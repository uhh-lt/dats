import {
  DWTSNodeData,
  SdocNodeData,
  SpanAnnotationNodeData,
  TagNodeData,
  TextNodeData,
  BBoxAnnotationNodeData,
  MemoNodeData,
  CodeNodeData,
  NoteNodeData,
} from ".";
import { Node } from "reactflow";

export const isTagNode = (node: Node<DWTSNodeData>): node is Node<TagNodeData> => {
  return (node.data as TagNodeData).tagId !== undefined;
};

export const isSdocNode = (node: Node<DWTSNodeData>): node is Node<SdocNodeData> => {
  return (node.data as SdocNodeData).sdocId !== undefined;
};

export const isTextNode = (node: Node<DWTSNodeData>): node is Node<TextNodeData> => {
  let data = node.data as TextNodeData;
  return data.color !== undefined && data.text !== undefined && data.variant !== undefined;
};

export const isNoteNode = (node: Node<DWTSNodeData>): node is Node<NoteNodeData> => {
  let data = node.data as NoteNodeData;
  return (
    data.color !== undefined && data.text !== undefined && data.variant !== undefined && data.bgcolor !== undefined
  );
};

export const isSpanAnnotationNode = (node: Node<DWTSNodeData>): node is Node<SpanAnnotationNodeData> => {
  return (node.data as SpanAnnotationNodeData).spanAnnotationId !== undefined;
};

export const isBBoxAnnotationNode = (node: Node<DWTSNodeData>): node is Node<BBoxAnnotationNodeData> => {
  return (node.data as BBoxAnnotationNodeData).bboxAnnotationId !== undefined;
};

export const isMemoNode = (node: Node<DWTSNodeData>): node is Node<MemoNodeData> => {
  return (node.data as MemoNodeData).memoId !== undefined;
};

export const isCodeNode = (node: Node<DWTSNodeData>): node is Node<CodeNodeData> => {
  return (node.data as CodeNodeData).codeId !== undefined;
};
