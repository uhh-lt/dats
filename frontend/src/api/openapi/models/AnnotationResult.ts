/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { SpanAnnotationReadResolved } from "./SpanAnnotationReadResolved";
export type AnnotationResult = {
  /**
   * ID of the source document
   */
  sdoc_id: number;
  /**
   * Suggested annotations
   */
  suggested_annotations: Array<SpanAnnotationReadResolved>;
};
