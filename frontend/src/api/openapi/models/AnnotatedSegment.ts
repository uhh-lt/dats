/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

export type AnnotatedSegment = {
  /**
   * The SourceDocument where the SpanAnnotation occurs.
   */
  sdoc_id: number;
  /**
   * The Tags of the Document
   */
  tag_ids: Array<number>;
  /**
   * The Span Annotation
   */
  span_annotation_id: number;
  /**
   * The Memo of the Annotation
   */
  memo_id?: number;
};
