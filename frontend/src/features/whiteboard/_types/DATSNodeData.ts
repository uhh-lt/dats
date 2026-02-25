import { BBoxAnnotationNodeData } from "../../../api/openapi/models/BBoxAnnotationNodeData";
import { BorderNodeData } from "../../../api/openapi/models/BorderNodeData";
import { CodeNodeData } from "../../../api/openapi/models/CodeNodeData";
import { MemoNodeData } from "../../../api/openapi/models/MemoNodeData";
import { NoteNodeData } from "../../../api/openapi/models/NoteNodeData";
import { SdocNodeData } from "../../../api/openapi/models/SdocNodeData";
import { SentenceAnnotationNodeData } from "../../../api/openapi/models/SentenceAnnotationNodeData";
import { SpanAnnotationNodeData } from "../../../api/openapi/models/SpanAnnotationNodeData";
import { TagNodeData } from "../../../api/openapi/models/TagNodeData";
import { TextNodeData } from "../../../api/openapi/models/TextNodeData";

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
