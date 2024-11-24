/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { SentenceAnnotationReadResolved } from "./SentenceAnnotationReadResolved";
export type SentenceAnnotatorResult = {
  /**
   * A mapping of sentence IDs to their annotations
   */
  sentence_annotations: Record<string, Array<SentenceAnnotationReadResolved>>;
};
