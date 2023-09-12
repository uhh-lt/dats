import { BBoxAnnotationNodeData } from "./BBoxAnnotationNodeData";
import { CodeNodeData } from "./CodeNodeData";
import { MemoNodeData } from "./MemoNodeData";
import { SdocNodeData } from "./SdocNodeData";
import { SpanAnnotationNodeData } from "./SpanAnnotationNodeData";
import { TagNodeData } from "./TagNodeData";
import { TextNodeData } from "./TextNodeData";

export type DWTSNodeData =
  | TextNodeData
  | SdocNodeData
  | MemoNodeData
  | CodeNodeData
  | TagNodeData
  | SpanAnnotationNodeData
  | BBoxAnnotationNodeData;
