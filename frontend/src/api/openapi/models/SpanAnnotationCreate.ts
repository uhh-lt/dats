/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

export type SpanAnnotationCreate = {
  /**
   * Begin of the SpanAnnotation in characters
   */
  begin: number;
  /**
   * End of the SpanAnnotation in characters
   */
  end: number;
  /**
   * Begin of the SpanAnnotation in tokens
   */
  begin_token: number;
  /**
   * End of the SpanAnnotation in tokens
   */
  end_token: number;
  /**
   * The SpanText the SpanAnnotation spans.
   */
  span_text: string;
  /**
   * CurrentCode the SpanAnnotation refers to
   */
  current_code_id: number;
  /**
   * AnnotationDocument the SpanAnnotation refers to
   */
  annotation_document_id: number;
};
