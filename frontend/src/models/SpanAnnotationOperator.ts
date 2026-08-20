/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Filters by a single span annotation, given as a [code_id, span_text] pair.
 *
 * The column is an aggregated 2-D array of ``[code_id, span_text]`` string pairs
 * (e.g. ``subquery_dict.SPAN_ANNOTATIONS``), so membership is tested by checking
 * whether the pair is an element of that array.
 */
export enum SpanAnnotationOperator {
  SPAN_ANNOTATION_CONTAINS = "SPAN_ANNOTATION_CONTAINS",
  SPAN_ANNOTATION_NOT_CONTAINS = "SPAN_ANNOTATION_NOT_CONTAINS",
}
