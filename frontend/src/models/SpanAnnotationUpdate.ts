/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type SpanAnnotationUpdate = {
  /**
   * Code the SpanAnnotation refers to
   */
  code_id?: number | null;
  /**
   * Begin of the SpanAnnotation in characters
   */
  begin?: number | null;
  /**
   * End of the SpanAnnotation in characters
   */
  end?: number | null;
  /**
   * Begin of the SpanAnnotation in tokens
   */
  begin_token?: number | null;
  /**
   * End of the SpanAnnotation in tokens
   */
  end_token?: number | null;
  /**
   * The SpanText the SpanAnnotation spans.
   */
  span_text?: string | null;
};
