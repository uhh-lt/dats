/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { AnnotationReviewType } from "./AnnotationReviewType";
import type { BBoxAnnotationRead } from "./BBoxAnnotationRead";
import type { CodeRead } from "./CodeRead";
import type { SentenceAnnotationRead } from "./SentenceAnnotationRead";
import type { SpanAnnotationRead } from "./SpanAnnotationRead";
export type AnnotationReviewItem = {
  annotation_type: AnnotationReviewType;
  annotation: SpanAnnotationRead | SentenceAnnotationRead | BBoxAnnotationRead;
  assigned_code: CodeRead;
  current_code: CodeRead | null;
};
