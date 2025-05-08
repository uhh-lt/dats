/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { BBoxAnnotationRead } from "./BBoxAnnotationRead";
import type { CodeRead } from "./CodeRead";
import type { DocumentTagRead } from "./DocumentTagRead";
import type { MemoRead } from "./MemoRead";
import type { SentenceAnnotationRead } from "./SentenceAnnotationRead";
import type { SourceDocumentRead } from "./SourceDocumentRead";
import type { SpanAnnotationRead } from "./SpanAnnotationRead";
export type WhiteboardData = {
  /**
   * List of source documents
   */
  sdocs: Array<SourceDocumentRead>;
  /**
   * List of codes
   */
  codes: Array<CodeRead>;
  /**
   * List of tags
   */
  tags: Array<DocumentTagRead>;
  /**
   * List of span annotations
   */
  span_annotations: Array<SpanAnnotationRead>;
  /**
   * List of sentence annotations
   */
  sent_annotations: Array<SentenceAnnotationRead>;
  /**
   * List of bbox annotations
   */
  bbox_annotations: Array<BBoxAnnotationRead>;
  /**
   * List of memos
   */
  memos: Array<MemoRead>;
};
