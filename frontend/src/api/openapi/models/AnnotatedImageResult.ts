/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { BBoxAnnotationTableRow } from "./BBoxAnnotationTableRow";
export type AnnotatedImageResult = {
  /**
   * The total number of bbox_annotation_ids. Used for pagination.
   */
  total_results: number;
  /**
   * The Annotations.
   */
  data: Array<BBoxAnnotationTableRow>;
};
