import { type BBoxAnnotationNode } from "../_components/nodes/BBoxAnnotationNode";
import { type BorderNode } from "../_components/nodes/BorderNode";
import { type CodeNode } from "../_components/nodes/CodeNode";
import { type MemoNode } from "../_components/nodes/MemoNode";
import { type NoteNode } from "../_components/nodes/NoteNode";
import { type SdocNode } from "../_components/nodes/SdocNode";
import { type SentenceAnnotationNode } from "../_components/nodes/SentenceAnnotationNode";
import { type SpanAnnotationNode } from "../_components/nodes/SpanAnnotationNode";
import { type TagNode } from "../_components/nodes/TagNode";
import { type TextNode } from "../_components/nodes/TextNode";

export type DATSNode =
  | BBoxAnnotationNode
  | BorderNode
  | CodeNode
  | MemoNode
  | NoteNode
  | SdocNode
  | SentenceAnnotationNode
  | SpanAnnotationNode
  | TagNode
  | TextNode;

export type DATSCustomNode = BorderNode | NoteNode | TextNode;
