/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type SpanAnnotationRead = {
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
   * ID of the SpanAnnotation
   */
  id: number;
  /**
   * The SpanText the SpanAnnotation spans.
   */
  text: string;
  /**
   * Code the SpanAnnotation refers to
   */
  code_id: number;
  /**
   * User the SpanAnnotation belongs to
   */
  user_id: number;
  /**
   * SourceDocument the SpanAnnotation refers to
   */
  sdoc_id: number;
  /**
   * Created timestamp of the SpanAnnotation
   */
  created: string;
  /**
   * Updated timestamp of the SpanAnnotation
   */
  updated: string;
  /**
   * The group ids this span annotations belongs to
   */
  group_ids: Array<number>;
};
