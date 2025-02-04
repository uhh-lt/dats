import { Node } from "reactflow";
import { DATSNodeData } from "./DATSNodeData.ts";
import { BackgroundColorData } from "./base/BackgroundColorData.ts";
import { BorderData } from "./base/BorderData.ts";
import { TextData } from "./base/TextData.ts";
import { BBoxAnnotationNodeData } from "./dbnodes/BBoxAnnotationNodeData.ts";
import { CodeNodeData } from "./dbnodes/CodeNodeData.ts";
import { MemoNodeData } from "./dbnodes/MemoNodeData.ts";
import { SdocNodeData } from "./dbnodes/SdocNodeData.ts";
import { SentenceAnnotationNodeData } from "./dbnodes/SentenceAnnotationNodeData.ts";
import { SpanAnnotationNodeData } from "./dbnodes/SpanAnnotationNodeData.ts";
import { TagNodeData } from "./dbnodes/TagNodeData.ts";

export const hasBorderData = (node: Node): node is Node<BorderData> => {
  const data = node.data as BorderData;
  return (
    data.borderRadius !== undefined &&
    data.borderColor !== undefined &&
    data.borderStyle !== undefined &&
    data.borderWidth !== undefined
  );
};

export const isBorderDataArray = (nodes: Node[]): nodes is Node<BorderData>[] => {
  return nodes.every(hasBorderData);
};

export const hasTextData = (node: Node): node is Node<TextData> => {
  const data = node.data as TextData;
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

export const isTextDataArray = (nodes: Node[]): nodes is Node<TextData>[] => {
  return nodes.every(hasTextData);
};

export const hasBackgroundColorData = (node: Node): node is Node<BackgroundColorData> => {
  const data = node.data as BackgroundColorData;
  return data.bgcolor !== undefined && data.bgalpha !== undefined;
};

export const isBackgroundColorDataArray = (nodes: Node[]): nodes is Node<BackgroundColorData>[] => {
  return nodes.every(hasBackgroundColorData);
};

export const isTagNode = (node: Node<DATSNodeData>): node is Node<TagNodeData> => {
  return (node.data as TagNodeData).tagId !== undefined;
};

export const isSdocNode = (node: Node<DATSNodeData>): node is Node<SdocNodeData> => {
  return (node.data as SdocNodeData).sdocId !== undefined;
};

export const isSpanAnnotationNode = (node: Node<DATSNodeData>): node is Node<SpanAnnotationNodeData> => {
  return (node.data as SpanAnnotationNodeData).spanAnnotationId !== undefined;
};

export const isSentenceAnnotationNode = (node: Node<DATSNodeData>): node is Node<SentenceAnnotationNodeData> => {
  return (node.data as SentenceAnnotationNodeData).sentenceAnnotationId !== undefined;
};

export const isBBoxAnnotationNode = (node: Node<DATSNodeData>): node is Node<BBoxAnnotationNodeData> => {
  return (node.data as BBoxAnnotationNodeData).bboxAnnotationId !== undefined;
};

export const isMemoNode = (node: Node<DATSNodeData>): node is Node<MemoNodeData> => {
  return (node.data as MemoNodeData).memoId !== undefined;
};

export const isCodeNode = (node: Node<DATSNodeData>): node is Node<CodeNodeData> => {
  return (node.data as CodeNodeData).codeId !== undefined;
};
