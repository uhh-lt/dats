import { BBoxAnnotationRead } from "../../../api/openapi/models/BBoxAnnotationRead";
import { SentenceAnnotationRead } from "../../../api/openapi/models/SentenceAnnotationRead";
import { SpanAnnotationRead } from "../../../api/openapi/models/SpanAnnotationRead";

export type Annotation = SpanAnnotationRead | BBoxAnnotationRead | SentenceAnnotationRead;
export type Annotations = SpanAnnotationRead[] | BBoxAnnotationRead[] | SentenceAnnotationRead[];
