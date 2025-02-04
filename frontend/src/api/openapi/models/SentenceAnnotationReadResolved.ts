/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CodeRead } from "./CodeRead";
export type SentenceAnnotationReadResolved = {
  /**
   * Start sentence ID of the SentenceAnnotation
   */
  sentence_id_start: number;
  /**
   * End sentence ID of the SentenceAnnotation
   */
  sentence_id_end: number;
  /**
   * ID of the SentenceAnnotation
   */
  id: number;
  /**
   * Code the SentenceAnnotation refers to
   */
  code: CodeRead;
  /**
   * User the SpanAnnotation belongs to
   */
  user_id: number;
  /**
   * SourceDocument the SpanAnnotation refers to
   */
  sdoc_id: number;
  /**
   * Created timestamp of the SentenceAnnotation
   */
  created: string;
  /**
   * Updated timestamp of the SentenceAnnotation
   */
  updated: string;
};
