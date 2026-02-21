import { BBoxAnnotationNodeData } from "../../../api/openapi/models/BBoxAnnotationNodeData.ts";
import { BorderNodeData } from "../../../api/openapi/models/BorderNodeData.ts";
import { CodeNodeData } from "../../../api/openapi/models/CodeNodeData.ts";
import { MemoNodeData } from "../../../api/openapi/models/MemoNodeData.ts";
import { NoteNodeData } from "../../../api/openapi/models/NoteNodeData.ts";
import { SdocNodeData } from "../../../api/openapi/models/SdocNodeData.ts";
import { SentenceAnnotationNodeData } from "../../../api/openapi/models/SentenceAnnotationNodeData.ts";
import { SpanAnnotationNodeData } from "../../../api/openapi/models/SpanAnnotationNodeData.ts";
import { TagNodeData } from "../../../api/openapi/models/TagNodeData.ts";
import { TextNodeData } from "../../../api/openapi/models/TextNodeData.ts";

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
