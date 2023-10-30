import { Node } from "reactflow";
import {
  BBoxAnnotationNodeData,
  BorderData,
  CodeNodeData,
  DWTSNodeData,
  MemoNodeData,
  SdocNodeData,
  SpanAnnotationNodeData,
  TagNodeData,
  TextData,
} from ".";
import { BackgroundColorData } from "./base/BackgroundColorData";

export const hasBorderData = (node: Node<any>): node is Node<BorderData> => {
  let data = node.data as BorderData;
  return (
    data.borderRadius !== undefined &&
    data.borderColor !== undefined &&
    data.borderStyle !== undefined &&
    data.borderWidth !== undefined
  );
};

export const isBorderDataArray = (nodes: Node<any>[]): nodes is Node<BorderData>[] => {
  return nodes.every(hasBorderData);
};

export const hasTextData = (node: Node<any>): node is Node<TextData> => {
  let data = node.data as TextData;
  return (
    data.text !== undefined &&
    data.variant !== undefined &&
    data.color !== undefined &&
    data.horizontalAlign !== undefined &&
    data.verticalAlign !== undefined &&
    data.bold !== undefined &&
    data.italic !== undefined &&
    data.underline !== undefined
  );
};

// we exploit the fact that every custoom node has text data, but none of the database nodes
export const isCustomNode = (node: Node): boolean => {
  return hasTextData(node);
};

export const isTextDataArray = (nodes: Node<any>[]): nodes is Node<TextData>[] => {
  return nodes.every(hasTextData);
};

export const hasBackgroundColorData = (node: Node<any>): node is Node<BackgroundColorData> => {
  let data = node.data as BackgroundColorData;
  return data.bgcolor !== undefined && data.bgalpha !== undefined;
};

export const isBackgroundColorDataArray = (nodes: Node<any>[]): nodes is Node<BackgroundColorData>[] => {
  return nodes.every(hasBackgroundColorData);
};

export const isTagNode = (node: Node<DWTSNodeData>): node is Node<TagNodeData> => {
  return (node.data as TagNodeData).tagId !== undefined;
};

export const isSdocNode = (node: Node<DWTSNodeData>): node is Node<SdocNodeData> => {
  return (node.data as SdocNodeData).sdocId !== undefined;
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
