/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

export type SpanEntityDocumentFrequency = {
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
  count: number;
};
