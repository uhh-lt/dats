/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CodeRead } from "./CodeRead";
import type { SourceDocumentRead } from "./SourceDocumentRead";
export type SentenceAnnotationRow = {
  /**
   * ID of the SentenceAnnotation
   */
  id: number;
  /**
   * The Text the SentenceAnnotation spans.
   */
  text: string;
  /**
   * Code the SentenceAnnotation refers to
   */
  code: CodeRead;
  /**
   * User the SentenceAnnotation belongs to
   */
  user_id: number;
  /**
   * SourceDocument the SentenceAnnotation refers to
   */
  sdoc: SourceDocumentRead;
  /**
   * The TagIDs of the SourceDocument.
   */
  tag_ids: Array<number>;
  /**
   * The IDs of the Memos attached to the Annotation.
   */
  memo_ids: Array<number>;
  /**
   * Created timestamp of the SentenceAnnotation
   */
  created: string;
  /**
   * User of the SentenceAnnotation this one was copied from
   */
  source_user_id: number | null;
  /**
   * Code of the copied SentenceAnnotation at copy time
   */
  source_code_id: number | null;
};
