/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { SentenceAnnotationReadResolved } from "./SentenceAnnotationReadResolved";
export type SentenceAnnotationResult = {
  /**
   * ID of the source document
   */
  sdoc_id: number;
  /**
   * Suggested annotations
   */
  suggested_annotations: Array<SentenceAnnotationReadResolved>;
};
