import { WhiteboardNodeType } from "@models/WhiteboardNodeType";
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
import { DATSCustomNode, DATSNode } from "./DATSNode";

export const isBBoxAnnotationNode = (value: DATSNode): value is BBoxAnnotationNode => {
  return value.type === WhiteboardNodeType.BBOX_ANNOTATION;
};

export const isBorderNode = (value: DATSNode): value is BorderNode => {
  return value.type === WhiteboardNodeType.BORDER;
};

export const isBorderNodeArray = (nodes: DATSNode[]): nodes is BorderNode[] => {
  return nodes.every(isBorderNode);
};

export const isCodeNode = (value: DATSNode): value is CodeNode => {
  return value.type === WhiteboardNodeType.CODE;
};

export const isMemoNode = (value: DATSNode): value is MemoNode => {
  return value.type === WhiteboardNodeType.MEMO;
};

export const isNoteNode = (value: DATSNode): value is NoteNode => {
  return value.type === WhiteboardNodeType.NOTE;
};

export const isSdocNode = (value: DATSNode): value is SdocNode => {
  return value.type === WhiteboardNodeType.SDOC;
};

export const isSentenceAnnotationNode = (value: DATSNode): value is SentenceAnnotationNode => {
  return value.type === WhiteboardNodeType.SENTENCE_ANNOTATION;
};

export const isSpanAnnotationNode = (value: DATSNode): value is SpanAnnotationNode => {
  return value.type === WhiteboardNodeType.SPAN_ANNOTATION;
};

export const isTagNode = (value: DATSNode): value is TagNode => {
  return value.type === WhiteboardNodeType.TAG;
};

export const isTextNode = (value: DATSNode): value is TextNode => {
  return value.type === WhiteboardNodeType.TEXT;
};

export const isTextNodeArray = (nodes: DATSNode[]): nodes is TextNode[] => {
  return nodes.every(isTextNode);
};

export const isCustomNode = (node: DATSNode): node is DATSCustomNode => {
  return isBorderNode(node) || isNoteNode(node) || isTextNode(node);
};

export const isCustomNodeArray = (nodes: DATSNode[]): nodes is DATSCustomNode[] => {
  return nodes.every(isCustomNode);
};

export const isNodeWithBackground = (node: DATSNode): node is BorderNode | NoteNode => {
  return isBorderNode(node) || isNoteNode(node);
};

export const isNodeWithBackgroundArray = (nodes: DATSNode[]): nodes is (BorderNode | NoteNode)[] => {
  return nodes.every(isNodeWithBackground);
};
