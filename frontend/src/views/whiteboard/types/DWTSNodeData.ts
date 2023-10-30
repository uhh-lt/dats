import { BorderNodeData } from "./customnodes/BorderNodeData";
import { NoteNodeData } from "./customnodes/NoteNodeData";
import { TextNodeData } from "./customnodes/TextNodeData";
import { BBoxAnnotationNodeData } from "./dbnodes/BBoxAnnotationNodeData";
import { CodeNodeData } from "./dbnodes/CodeNodeData";
import { MemoNodeData } from "./dbnodes/MemoNodeData";
import { SdocNodeData } from "./dbnodes/SdocNodeData";
import { SpanAnnotationNodeData } from "./dbnodes/SpanAnnotationNodeData";
import { TagNodeData } from "./dbnodes/TagNodeData";

export type DWTSNodeData =
  | TextNodeData
  | NoteNodeData
  | BorderNodeData
  | SdocNodeData
  | MemoNodeData
  | CodeNodeData
  | TagNodeData
  | SpanAnnotationNodeData
  | BBoxAnnotationNodeData;
