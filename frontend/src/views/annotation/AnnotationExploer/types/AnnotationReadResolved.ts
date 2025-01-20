import { BBoxAnnotationReadResolved } from "../../../../api/openapi/models/BBoxAnnotationReadResolved.ts";
import { SentenceAnnotationReadResolved } from "../../../../api/openapi/models/SentenceAnnotationReadResolved.ts";
import { SpanAnnotationReadResolved } from "../../../../api/openapi/models/SpanAnnotationReadResolved.ts";

export type AnnotationReadResolved =
  | SpanAnnotationReadResolved
  | BBoxAnnotationReadResolved
  | SentenceAnnotationReadResolved;
