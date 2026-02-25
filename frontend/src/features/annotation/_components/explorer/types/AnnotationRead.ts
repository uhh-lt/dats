import { BBoxAnnotationRead } from "../../../../../api/openapi/models/BBoxAnnotationRead";
import { SentenceAnnotationRead } from "../../../../../api/openapi/models/SentenceAnnotationRead";
import { SpanAnnotationRead } from "../../../../../api/openapi/models/SpanAnnotationRead";

export type AnnotationRead = SpanAnnotationRead | BBoxAnnotationRead | SentenceAnnotationRead;
