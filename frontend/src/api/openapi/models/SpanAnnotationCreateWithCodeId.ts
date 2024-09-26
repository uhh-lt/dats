/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type SpanAnnotationCreateWithCodeId = {
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
   * User that created the SpanAnnotation
   */
  user_id: number;
  /**
   * SourceDocument the SpanAnnotation refers to
   */
  sdoc_id: number;
};
