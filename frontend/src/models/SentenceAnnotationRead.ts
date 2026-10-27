/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type SentenceAnnotationRead = {
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
  code_id: number;
  /**
   * User that created the SentenceAnnotation
   */
  user_id: number;
  /**
   * SourceDocument the SentenceAnnotation refers to
   */
  sdoc_id: number;
  /**
   * Project the SentenceAnnotation belongs to
   */
  project_id: number;
  /**
   * Created timestamp of the SentenceAnnotation
   */
  created: string;
  /**
   * Updated timestamp of the SentenceAnnotation
   */
  updated: string;
  /**
   * SentenceAnnotation this one was copied from (provenance)
   */
  source_annotation_id: number | null;
  /**
   * User of the SentenceAnnotation this one was copied from
   */
  source_user_id: number | null;
  /**
   * Code of the copied SentenceAnnotation at copy time
   */
  source_code_id: number | null;
  /**
   * Memo IDs attached to the SentenceAnnotation
   */
  memo_ids: Array<number>;
};
