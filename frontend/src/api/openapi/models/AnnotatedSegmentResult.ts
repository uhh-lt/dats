/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { AnnotationTableRow } from "./AnnotationTableRow";
export type AnnotatedSegmentResult = {
  /**
   * The total number of span_annotation_ids. Used for pagination.
   */
  total_results: number;
  /**
   * The Annotations.
   */
  data: Array<AnnotationTableRow>;
};
