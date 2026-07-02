import { BBoxAnnotationRead } from "@models/BBoxAnnotationRead";
import { SentenceAnnotationRead } from "@models/SentenceAnnotationRead";
import { SpanAnnotationRead } from "@models/SpanAnnotationRead";

export type AnnotationRead = SpanAnnotationRead | BBoxAnnotationRead | SentenceAnnotationRead;
