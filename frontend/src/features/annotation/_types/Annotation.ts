import { BBoxAnnotationRead } from "@models/BBoxAnnotationRead";
import { SentenceAnnotationRead } from "@models/SentenceAnnotationRead";
import { SpanAnnotationRead } from "@models/SpanAnnotationRead";

export type Annotation = SpanAnnotationRead | BBoxAnnotationRead | SentenceAnnotationRead;
export type Annotations = SpanAnnotationRead[] | BBoxAnnotationRead[] | SentenceAnnotationRead[];
