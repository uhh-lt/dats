import { BorderNodeData } from "./customnodes/BorderNodeData.ts";
import { NoteNodeData } from "./customnodes/NoteNodeData.ts";
import { TextNodeData } from "./customnodes/TextNodeData.ts";
import { BBoxAnnotationNodeData } from "./dbnodes/BBoxAnnotationNodeData.ts";
import { CodeNodeData } from "./dbnodes/CodeNodeData.ts";
import { MemoNodeData } from "./dbnodes/MemoNodeData.ts";
import { SdocNodeData } from "./dbnodes/SdocNodeData.ts";
import { SpanAnnotationNodeData } from "./dbnodes/SpanAnnotationNodeData.ts";
import { TagNodeData } from "./dbnodes/TagNodeData.ts";

export type DATSNodeData =
  | TextNodeData
  | NoteNodeData
  | BorderNodeData
  | SdocNodeData
  | MemoNodeData
  | CodeNodeData
  | TagNodeData
  | SpanAnnotationNodeData
  | BBoxAnnotationNodeData;
