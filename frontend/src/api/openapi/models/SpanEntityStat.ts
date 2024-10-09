/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type SpanEntityStat = {
  /**
   * The ID of the Code related to the SpanAnnotation
   */
  code_id: number;
  /**
   * The SpanText the SpanAnnotation spans
   */
  span_text: string;
  /**
   * Number of occurrences of the SpanEntity in a collection of SourceDocuments.
   */
  filtered_count: number;
  /**
   * Number of occurrences of the SpanEntity in a collection of SourceDocuments.
   */
  global_count: number;
};
