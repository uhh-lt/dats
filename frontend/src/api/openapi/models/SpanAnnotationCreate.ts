/* generated using openapi-typescript-codegen -- do not edit */
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
   * Code the SpanAnnotation refers to
   */
  code_id: number;
  /**
   * SourceDocument the SpanAnnotation refers to
   */
  sdoc_id: number;
};
