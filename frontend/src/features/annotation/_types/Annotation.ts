import { BBoxAnnotationRead } from "@api/models/BBoxAnnotationRead";
import { SentenceAnnotationRead } from "@api/models/SentenceAnnotationRead";
import { SpanAnnotationRead } from "@api/models/SpanAnnotationRead";

export type Annotation = SpanAnnotationRead | BBoxAnnotationRead | SentenceAnnotationRead;
export type Annotations = SpanAnnotationRead[] | BBoxAnnotationRead[] | SentenceAnnotationRead[];
