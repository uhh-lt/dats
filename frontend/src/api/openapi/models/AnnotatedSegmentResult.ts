/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

export type AnnotatedSegmentResult = {
  /**
   * The total number of span_annotation_ids. Used for pagination.
   */
  total_results: number;
  /**
   * The SpanAnnotation IDs.
   */
  span_annotation_ids: Array<number>;
};
