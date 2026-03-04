import { BBoxAnnotationNodeData } from "@api/models/BBoxAnnotationNodeData";
import { BorderNodeData } from "@api/models/BorderNodeData";
import { CodeNodeData } from "@api/models/CodeNodeData";
import { MemoNodeData } from "@api/models/MemoNodeData";
import { NoteNodeData } from "@api/models/NoteNodeData";
import { SdocNodeData } from "@api/models/SdocNodeData";
import { SentenceAnnotationNodeData } from "@api/models/SentenceAnnotationNodeData";
import { SpanAnnotationNodeData } from "@api/models/SpanAnnotationNodeData";
import { TagNodeData } from "@api/models/TagNodeData";
import { TextNodeData } from "@api/models/TextNodeData";

export type DATSNodeData =
  | TextNodeData
  | NoteNodeData
  | BorderNodeData
  | SdocNodeData
  | MemoNodeData
  | CodeNodeData
  | TagNodeData
  | SpanAnnotationNodeData
  | SentenceAnnotationNodeData
  | BBoxAnnotationNodeData;
