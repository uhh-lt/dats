/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { CodeRead } from "./CodeRead";

export type SpanAnnotationReadResolved = {
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
  span_text: string;
  /**
   * Code the SpanAnnotation refers to
   */
  code: CodeRead;
  /**
   * AnnotationDocument the SpanAnnotation refers to
   */
  annotation_document_id: number;
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
};
